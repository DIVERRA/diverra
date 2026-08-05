import type { Config, Context } from "@netlify/functions";
import { getUser } from "@netlify/identity";

type ThumbnailInput = {
  name?: string;
  type?: string;
  data?: string;
};

type DraftInput = {
  title?: string;
  description?: string;
  category?: string;
  body?: string;
  thumbnail?: ThumbnailInput | null;
};

const allowedCategories = new Set([
  "THAILAND",
  "KOREA",
  "TAIWAN",
  "TRAVEL",
]);

const imageExtensions: Record<string, string> = {
  "image/png": "png",
  "image/jpeg": "jpg",
  "image/webp": "webp",
};

const yamlString = (value: string) => JSON.stringify(value);

const japanDate = () =>
  new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Tokyo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());

const githubHeaders = (token: string) => ({
  Accept: "application/vnd.github+json",
  Authorization: `Bearer ${token}`,
  "Content-Type": "application/json",
  "X-GitHub-Api-Version": "2026-03-10",
});

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

  const thumbnailName =
    input.thumbnail?.name?.trim().toLowerCase() ?? "";
  const suppliedThumbnailType =
    input.thumbnail?.type?.trim().toLowerCase() ?? "";
  const inferredThumbnailType =
    thumbnailName.endsWith(".png")
      ? "image/png"
      : thumbnailName.endsWith(".jpg") ||
          thumbnailName.endsWith(".jpeg")
        ? "image/jpeg"
        : thumbnailName.endsWith(".webp")
          ? "image/webp"
          : "";
  const thumbnailType =
    suppliedThumbnailType || inferredThumbnailType;
  const thumbnailData = input.thumbnail?.data ?? "";
  const hasThumbnail = Boolean(thumbnailData);

  if (
    hasThumbnail &&
    (
      !imageExtensions[thumbnailType] ||
      thumbnailData.length > 5600000 ||
      !/^[A-Za-z0-9+/=]+$/.test(thumbnailData)
    )
  ) {
    return Response.json(
      {
        ok: false,
        message: "サムネイルは4MB以内のPNG・JPEG・WebPを選択してください",
      },
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

  let thumbnailPath = "assets/images/diverra-hero-v2.png";

  if (hasThumbnail) {
    const extension = imageExtensions[thumbnailType];
    thumbnailPath = `assets/images/editorial/${slug}.${extension}`;

    const imageResponse = await fetch(
      `https://api.github.com/repos/${owner}/${repo}/contents/${thumbnailPath}`,
      {
        method: "PUT",
        headers: githubHeaders(token),
        body: JSON.stringify({
          message: `Upload editorial thumbnail: ${title}`,
          content: thumbnailData,
          branch,
        }),
      },
    );

    if (!imageResponse.ok) {
      return Response.json(
        {
          ok: false,
          message: "サムネイルをGitHubへ保存できませんでした",
          githubStatus: imageResponse.status,
        },
        { status: 502 },
      );
    }
  }

  const markdown = `---
title: ${yamlString(title)}
description: ${yamlString(description)}
slug: ${slug}
published: ${date}
modified: ${date}
category: ${category}
country: ${country}
reading_time: ${readingTime}
thumbnail: ${thumbnailPath}
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
      headers: githubHeaders(token),
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

  return Response.json({
    ok: true,
    message: hasThumbnail
      ? "画像付き下書きを検証用ブランチへ保存しました"
      : "下書きを保存しましたが、画像は送信されていません",
    slug,
    path: articlePath,
    thumbnail: thumbnailPath,
    thumbnailSaved: hasThumbnail,
  });
};

export const config: Config = {
  path: "/api/save-draft",
  method: "POST",
};
