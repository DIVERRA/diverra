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
  const status = form.querySelector("[data-form-status]");
  const submitButton = form.querySelector('button[type="submit"]');

  const setStatus = (message, type = "info") => {
    if (!status) return;
    status.textContent = message;
    status.dataset.status = type;
  };

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    const endpoint = form.getAttribute("action") || "";

    if (!endpoint || !endpoint.startsWith("https://formspree.io/f/")) {
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
        throw new Error("Form submission failed");
      }

      form.reset();
      window.location.href = "/diverra/contact-complete.html";
    } catch (error) {
      setStatus("送信できませんでした。時間をおいて再度お試しいただくか、入力内容をご確認ください。", "error");
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
