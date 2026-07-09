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
