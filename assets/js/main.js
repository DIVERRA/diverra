const navToggle = document.querySelector(".nav-toggle");
const siteNav = document.querySelector(".site-nav");

if (navToggle && siteNav) {
  navToggle.addEventListener("click", () => {
    const isOpen = siteNav.classList.toggle("is-open");
    navToggle.setAttribute("aria-expanded", String(isOpen));
  });
}

document.querySelectorAll(".js-copy-link").forEach((button) => {
  button.addEventListener("click", async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      button.textContent = "コピーしました";
      setTimeout(() => {
        button.textContent = "リンクをコピー";
      }, 1800);
    } catch {
      button.textContent = "URLをコピーしてください";
    }
  });
});

document.querySelectorAll(".js-formspree-form").forEach((form) => {
  if (form.dataset.formspreeBound === "true") return;
  form.dataset.formspreeBound = "true";

  const status = form.querySelector("[data-form-status]");
  const submitButton = form.querySelector('button[type="submit"]');
  const endpoint = "https://formspree.io/f/xykqrdbz";

  const setStatus = (message, type = "info") => {
    if (!status) return;
    status.textContent = message;
    status.dataset.status = type;
  };

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    const action = form.getAttribute("action") || "";

    if (action !== endpoint) {
      setStatus("送信先の設定がまだ完了していません。FormspreeのフォームIDを設定してください。", "error");
      return;
    }

    if (!form.checkValidity()) {
      form.reportValidity();
      setStatus("未入力の必須項目、または入力形式に誤りがあります。内容をご確認ください。", "error");
      return;
    }

    if (submitButton) {
      submitButton.disabled = true;
      submitButton.textContent = "送信中...";
    }
    setStatus("送信しています。少しだけお待ちください。", "info");

    try {
      const response = await fetch(endpoint, {
        method: "POST",
        body: new FormData(form),
        headers: { Accept: "application/json" }
      });

      if (!response.ok) {
        const data = await response.json().catch(() => null);
        console.error("Formspree error:", data);
        setStatus("送信できませんでした。入力内容を確認して、もう一度お試しください。", "error");
        return;
      }

      window.location.href = "/diverra/contact-complete.html";
    } catch (error) {
      console.error("Contact form error:", error);
      setStatus("通信エラーが発生しました。時間をおいて、もう一度お試しください。", "error");
    } finally {
      if (submitButton) {
        submitButton.disabled = false;
        submitButton.textContent = "お問い合わせを送信する";
      }
    }
  });
});

const revealTargets = document.querySelectorAll(
  ".card, .news-card, .article-header, .article-image, .article-cta, .post-nav a"
);

const articleContentTargets = document.querySelectorAll(
  ".content-layout, .article-page-layout, .article-body, .sidebar-box, .toc-box, .share-box, .post-nav"
);

const keepArticleContentVisible = () => {
  articleContentTargets.forEach((target) => {
    target.classList.remove("reveal");
    target.classList.add("is-visible");
  });
};

keepArticleContentVisible();

try {
  if ("IntersectionObserver" in window && !window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
    document.documentElement.classList.add("js-reveal-enabled");
    revealTargets.forEach((target) => target.classList.add("reveal"));
    keepArticleContentVisible();

    const revealObserver = new IntersectionObserver(
      (entries, observer) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          entry.target.classList.add("is-visible");
          observer.unobserve(entry.target);
        });
      },
      { rootMargin: "0px 0px -12% 0px", threshold: 0.08 }
    );

    revealTargets.forEach((target) => revealObserver.observe(target));
  } else {
    revealTargets.forEach((target) => target.classList.add("is-visible"));
  }
} catch (error) {
  document.documentElement.classList.remove("js-reveal-enabled");
  revealTargets.forEach((target) => target.classList.add("is-visible"));
  keepArticleContentVisible();
}

/* DIVERRA latest featured article */
document.addEventListener("DOMContentLoaded", async () => {
  const section = document.querySelector(".article-sample");
  if (!section) return;

  try {
    const response = await fetch("assets/data/articles.json", {
      cache: "no-store"
    });
    if (!response.ok) return;

    const articles = await response.json();
    if (!Array.isArray(articles) || articles.length === 0) return;

    const sortedArticles = [...articles].sort(
      (a, b) => new Date(b.date) - new Date(a.date)
    );
    const latest = sortedArticles[0];

    const title = section.querySelector(".article-head h2");
    const description = section.querySelector(".article-head p");
    const meta = section.querySelectorAll(".meta span");
    const currentVisual = section.querySelector(".article-visual");
    const readButton = section.querySelector(".featured-read-button");
    const storiesGrid = section.querySelector(".latest-stories-grid");

    if (title) title.innerHTML = latest.titleHtml || latest.title;
    if (description) description.textContent = latest.description;
    if (meta[0]) meta[0].textContent = latest.category;
    if (meta[1]) meta[1].textContent = latest.dateLabel;
    if (meta[2]) meta[2].textContent = latest.readingTime;
    if (readButton) readButton.href = latest.url;

    if (currentVisual) {
      const thumbnailLink = document.createElement("a");
      thumbnailLink.className = "article-visual featured-thumbnail";
      thumbnailLink.href = latest.url;
      thumbnailLink.setAttribute(
        "aria-label",
        `${latest.title}の記事を読む`
      );

      const thumbnail = document.createElement("img");
      thumbnail.src = latest.thumbnail;
      thumbnail.alt = latest.alt || latest.title;
      thumbnail.loading = "lazy";

      thumbnailLink.appendChild(thumbnail);
      currentVisual.replaceWith(thumbnailLink);
    }

    if (storiesGrid) {
      const stories = sortedArticles.slice(1, 4);
      storiesGrid.replaceChildren();

      stories.forEach((story) => {
        const card = document.createElement("a");
        card.className = "latest-story-card";
        card.href = story.url;

        const image = document.createElement("img");
        image.src = story.thumbnail;
        image.alt = story.alt || story.title;
        image.loading = "lazy";

        const body = document.createElement("span");
        body.className = "latest-story-body";

        const metaLine = document.createElement("small");
        metaLine.textContent = `${story.category} · ${story.dateLabel}`;

        const cardTitle = document.createElement("strong");
        cardTitle.textContent = story.title;

        body.append(metaLine, cardTitle);
        card.append(image, body);
        storiesGrid.appendChild(card);
      });
    }
  } catch (error) {
    console.error("最新記事を取得できませんでした。", error);
  }
});
