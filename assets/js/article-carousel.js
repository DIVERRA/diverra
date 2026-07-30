window.addEventListener("load", () => {
  const grid = document.querySelector(".latest-stories-grid");
  const previousButton = document.querySelector(
    ".latest-stories-arrow.is-prev"
  );
  const nextButton = document.querySelector(
    ".latest-stories-arrow.is-next"
  );
  const progressBar = document.querySelector(
    ".latest-stories-progress span"
  );

  if (!grid) return;

  const updateControls = () => {
    const maximumScroll = grid.scrollWidth - grid.clientWidth;
    const visibleRatio = Math.min(
      1,
      grid.clientWidth / Math.max(1, grid.scrollWidth)
    );
    const scrollRatio =
      maximumScroll > 0 ? grid.scrollLeft / maximumScroll : 1;
    const progress =
      visibleRatio + (1 - visibleRatio) * Math.max(0, scrollRatio);

    if (progressBar) {
      progressBar.style.transform =
        `scaleX(${Math.max(0, Math.min(1, progress))})`;
    }

    if (previousButton) {
      previousButton.disabled = grid.scrollLeft <= 2;
    }

    if (nextButton) {
      nextButton.disabled =
        maximumScroll <= 2 || grid.scrollLeft >= maximumScroll - 2;
    }
  };

  const scrollStories = (direction) => {
    const firstCard = grid.querySelector(".latest-story-card");
    if (!firstCard) return;

    const gap = Number.parseFloat(getComputedStyle(grid).gap) || 0;
    grid.scrollBy({
      left: direction * (firstCard.getBoundingClientRect().width + gap),
      behavior: "smooth"
    });
  };

  previousButton?.addEventListener(
    "click",
    () => scrollStories(-1)
  );
  nextButton?.addEventListener(
    "click",
    () => scrollStories(1)
  );
  grid.addEventListener("scroll", updateControls, { passive: true });
  window.addEventListener("resize", updateControls);

  setTimeout(updateControls, 300);
});
