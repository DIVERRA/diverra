import type { Config, Context } from "@netlify/functions";
import { getUser } from "@netlify/identity";

type DraftInput = {
  title?: string;
  description?: string;
  category?: string;
  body?: string;
};

const allowedCategories = new Set([
  "THAILAND",
  "KOREA",
  "TAIWAN",
  "TRAVEL",
]);

const yamlString = (value: string) => JSON.stringify(value);

const japanDate = () =>
  new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Tokyo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());

export default async (request: Request, _context: Context) => {
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

  let input: DraftInput;

  try {
    input = await request.json();
  } catch {
    return Response.json(
      { ok: false, message: "入力内容を読み取れませんでした" },
      { status: 400 },
    );
  }

  const title = input.title?.trim() ?? "";
  const description = input.description?.trim() ?? "";
  const category = input.category?.trim().toUpperCase() ?? "";
  const body = input.body?.trim() ?? "";

  if (!title || !description || !category || !body) {
    return Response.json(
      { ok: false, message: "必須項目をすべて入力してください" },
      { status: 400 },
    );
  }

  if (
    title.length > 180 ||
    description.length > 300 ||
    body.length > 100000 ||
    !allowedCategories.has(category)
  ) {
    return Response.json(
      { ok: false, message: "入力内容の形式を確認してください" },
      { status: 400 },
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

  const now = new Date();
  const date = japanDate();
  const slug = `draft-${date.replaceAll("-", "")}-${now
    .toISOString()
    .slice(11, 19)
    .replaceAll(":", "")}`;
  const readingTime = Math.max(1, Math.ceil(body.length / 500));
  const country = category === "TRAVEL" ? "GLOBAL" : category;

  const markdown = `---
title: ${yamlString(title)}
description: ${yamlString(description)}
slug: ${slug}
published: ${date}
modified: ${date}
category: ${category}
country: ${country}
reading_time: ${readingTime}
thumbnail: assets/images/diverra-hero-v2.png
thumbnail_alt: ${yamlString(`${title}のアイキャッチ画像`)}
keywords:
  - ${category}
draft: true
---

# ${title}

${body}
`;

  const articlePath = `content/articles/${slug}.md`;
  const githubResponse = await fetch(
    `https://api.github.com/repos/${owner}/${repo}/contents/${articlePath}`,
    {
      method: "PUT",
      headers: {
        Accept: "application/vnd.github+json",
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
        "X-GitHub-Api-Version": "2026-03-10",
      },
      body: JSON.stringify({
        message: `Save editorial draft: ${title}`,
        content: Buffer.from(markdown, "utf8").toString("base64"),
        branch,
      }),
    },
  );

  if (!githubResponse.ok) {
    return Response.json(
      {
        ok: false,
        message: "GitHubへ下書きを保存できませんでした",
        githubStatus: githubResponse.status,
      },
      { status: 502 },
    );
  }

  const result = await githubResponse.json();

  return Response.json({
    ok: true,
    message: "下書きを検証用ブランチへ保存しました",
    slug,
    path: articlePath,
    commitUrl: result.commit?.html_url ?? null,
  });
};

export const config: Config = {
  path: "/api/save-draft",
  method: "POST",
};
