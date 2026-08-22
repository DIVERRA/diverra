type DraftSummary = {
  title: string;
  slug: string;
  description: string;
  category: string;
  modified: string;
};

export async function loadDraftList() {
  const container =
    document.querySelector<HTMLDivElement>("#draft-list");
  const message =
    document.querySelector<HTMLParagraphElement>(
      "#draft-list-status",
    );

  if (!container || !message) return;

  message.textContent = "下書きを読み込んでいます…";

  try {
    const response = await fetch("/api/list-drafts", {
      credentials: "include",
    });

    const result = await response.json() as {
      ok?: boolean;
      message?: string;
      drafts?: DraftSummary[];
    };

    if (!response.ok || !result.ok) {
      throw new Error(
        result.message ?? "下書き一覧を取得できませんでした",
      );
    }

    const drafts = result.drafts ?? [];
    container.replaceChildren();

    if (drafts.length === 0) {
      message.textContent = "保存済みの下書きはありません。";
      return;
    }

    for (const draft of drafts) {
      const card = document.createElement("article");
      card.className = "draft-card";

      const title = document.createElement("h3");
      title.textContent = draft.title || draft.slug;

      const meta = document.createElement("p");
      meta.className = "draft-meta";
      meta.textContent = [
        draft.category,
        draft.modified ? `更新 ${draft.modified}` : "",
      ].filter(Boolean).join(" / ");

      const slug = document.createElement("p");
      slug.className = "draft-slug";
      slug.textContent = `URL: ${draft.slug}`;

      const description = document.createElement("p");
      description.textContent = draft.description;

      const preview = document.createElement("a");
      preview.className = "button button-small";
      preview.href =
        "https://diverra-article-preview.netlify.app/preview/" +
        encodeURIComponent(draft.slug) +
        "/";
      preview.target = "_blank";
      preview.rel = "noopener noreferrer";
      preview.textContent = "公開前確認";

      card.append(title, meta, slug, description, preview);
      container.append(card);
    }

    message.textContent = `${drafts.length}件の下書きがあります。`;
  } catch (error) {
    console.error("下書き一覧エラー", error);

    message.textContent =
      error instanceof Error
        ? `取得エラー：${error.message}`
        : "下書き一覧を取得できませんでした。";
  }
}
