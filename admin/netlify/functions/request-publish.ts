import type { Config, Context } from "@netlify/functions";
import { getUser } from "@netlify/identity";

type PublishInput = {
  slug?: string;
};

const slugPattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

const githubHeaders = (token: string) => ({
  Accept: "application/vnd.github+json",
  Authorization: `Bearer ${token}`,
  "Content-Type": "application/json",
  "X-GitHub-Api-Version": "2022-11-28",
});

export default async (
  request: Request,
  _context: Context,
) => {
  if (request.method !== "POST") {
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

  let input: PublishInput;

  try {
    input = await request.json();
  } catch {
    return Response.json(
      { ok: false, message: "入力内容を読み取れませんでした" },
      { status: 400 },
    );
  }

  const slug = input.slug?.trim().toLowerCase() ?? "";

  if (
    !slug ||
    slug.length > 100 ||
    !slugPattern.test(slug)
  ) {
    return Response.json(
      { ok: false, message: "記事URLの形式が正しくありません" },
      { status: 400 },
    );
  }

  const token = Netlify.env.get("DIVERRA_GITHUB_TOKEN");
  const owner = Netlify.env.get("DIVERRA_GITHUB_OWNER");
  const repo = Netlify.env.get("DIVERRA_GITHUB_REPO");

  if (!token || !owner || !repo) {
    return Response.json(
      { ok: false, message: "サーバー設定が不足しています" },
      { status: 500 },
    );
  }

  const githubResponse = await fetch(
    `https://api.github.com/repos/${owner}/${repo}/actions/workflows/publish-approved-article.yml/dispatches`,
    {
      method: "POST",
      headers: githubHeaders(token),
      body: JSON.stringify({
        ref: "main",
        inputs: {
          slug,
          confirmation: "PUBLISH",
        },
      }),
    },
  );

  if (!githubResponse.ok) {
    const githubError = await githubResponse.text();
    console.error("GitHub Actions開始エラー", githubError);

    return Response.json(
      {
        ok: false,
        message: "GitHubの本番公開処理を開始できませんでした",
        githubStatus: githubResponse.status,
      },
      { status: 502 },
    );
  }

  return Response.json({
    ok: true,
    message: "本番公開処理を開始しました",
    slug,
  });
};

export const config: Config = {
  path: "/api/request-publish",
  method: "POST",
};
