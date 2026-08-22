import type { Config, Context } from "@netlify/functions";
import { getUser } from "@netlify/identity";

type GitHubFile = {
  name: string;
  path: string;
  type: string;
};

const githubHeaders = (token: string) => ({
  Accept: "application/vnd.github+json",
  Authorization: `Bearer ${token}`,
  "X-GitHub-Api-Version": "2022-11-28",
});

const frontmatterValue = (text: string, key: string) => {
  const match = text.match(
    new RegExp(`^${key}:[\\t ]*(.+)$`, "m"),
  );

  if (!match) return "";

  const value = match[1].trim();

  try {
    return value.startsWith('"') ? JSON.parse(value) : value;
  } catch {
    return value.replace(/^["']|["']$/g, "");
  }
};

export default async (
  request: Request,
  _context: Context,
) => {
  if (request.method !== "GET") {
    return Response.json(
      { ok: false, message: "Method not allowed" },
      { status: 405 },
    );
  }

  const user = await getUser();

  if (!user) {
    return Response.json(
      { ok: false, message: "ログインが必要です" },
      { status: 401 },
    );
  }

  const token = Netlify.env.get("DIVERRA_GITHUB_TOKEN");
  const owner = Netlify.env.get("DIVERRA_GITHUB_OWNER");
  const repo = Netlify.env.get("DIVERRA_GITHUB_REPO");
  const branch = Netlify.env.get("DIVERRA_GITHUB_BRANCH");

  if (!token || !owner || !repo || !branch) {
    return Response.json(
      { ok: false, message: "サーバー設定が不足しています" },
      { status: 500 },
    );
  }

  const directoryResponse = await fetch(
    `https://api.github.com/repos/${owner}/${repo}/contents/content/articles?ref=${encodeURIComponent(branch)}`,
    { headers: githubHeaders(token) },
  );

  if (directoryResponse.status === 404) {
    return Response.json({ ok: true, drafts: [] });
  }

  if (!directoryResponse.ok) {
    return Response.json(
      { ok: false, message: "下書き一覧を取得できませんでした" },
      { status: 502 },
    );
  }

  const files = (await directoryResponse.json()) as GitHubFile[];

  const markdownFiles = files
    .filter(
      (file) =>
        file.type === "file" &&
        file.name.endsWith(".md"),
    )
    .slice(0, 100);

  const drafts = (
    await Promise.all(
      markdownFiles.map(async (file) => {
        const response = await fetch(
          `https://api.github.com/repos/${owner}/${repo}/contents/${file.path}?ref=${encodeURIComponent(branch)}`,
          { headers: githubHeaders(token) },
        );

        if (!response.ok) return null;

        const result = await response.json();
        const markdown = Buffer.from(
          String(result.content || "").replace(/\n/g, ""),
          "base64",
        ).toString("utf8");

        if (!/^draft:[ \t]*true$/m.test(markdown)) {
          return null;
        }

        return {
          title: frontmatterValue(markdown, "title"),
          slug: frontmatterValue(markdown, "slug"),
          description: frontmatterValue(markdown, "description"),
          category: frontmatterValue(markdown, "category"),
          modified: frontmatterValue(markdown, "modified"),
          thumbnail: frontmatterValue(markdown, "thumbnail"),
          path: file.path,
        };
      }),
    )
  )
    .filter(Boolean)
    .sort((a, b) =>
      String(b?.modified || "").localeCompare(
        String(a?.modified || ""),
      ),
    );

  return Response.json({
    ok: true,
    drafts,
  });
};

export const config: Config = {
  path: "/api/list-drafts",
  method: "GET",
};
