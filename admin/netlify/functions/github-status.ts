import type { Config, Context } from "@netlify/functions";
import { getUser } from "@netlify/identity";

export default async (request: Request, _context: Context) => {
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

  const response = await fetch(
    `https://api.github.com/repos/${owner}/${repo}/branches/${encodeURIComponent(branch)}`,
    {
      headers: {
        Accept: "application/vnd.github+json",
        Authorization: `Bearer ${token}`,
        "X-GitHub-Api-Version": "2026-03-10",
      },
    },
  );

  if (!response.ok) {
    return Response.json(
      {
        ok: false,
        message: "GitHubへ接続できませんでした",
        githubStatus: response.status,
      },
      { status: 502 },
    );
  }

  return Response.json({
    ok: true,
    repository: `${owner}/${repo}`,
    branch,
    authenticated: true,
  });
};

export const config: Config = {
  path: "/api/github-status",
  method: "GET",
};
