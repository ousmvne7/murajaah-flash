(function () {
  "use strict";

  const SPRITE = "assets/icons/lucide.svg?v=8";

  const rules = [
    [".home-profile-btn > svg, .journal-profile-btn > svg", "user-round"],
    [".page-back-btn > svg, .hifdh-back > svg, .review-intro-head-icon > svg", "arrow-left"],
    [".home-arch-icon > svg", "book-open"],
    [".greeting-icon > svg", "moon-star"],
    [".streak > svg", "flame"],
    ["#startReviewBtn > svg, .intro-start-btn > svg, .hifdh-start-btn > svg, .hifdh-start-btn span > svg", "play"],
    [".review-mode-card .home-mode-icon > svg", "book-open"],
    [".hifdh-mode-card .home-mode-icon > svg", "brain"],
    [".home-mode-arrow > svg", "chevron-right"],
    [".home-quick-grid > button:nth-child(1) > svg", "circle-plus"],
    [".home-quick-grid > button:nth-child(2) > svg", "bookmark-check"],
    [".home-quick-grid > button:nth-child(3) > svg", "chart-no-axes-column-increasing"],
    [".library-header > .library-header-btn:not(.page-back-btn) > svg", "list-filter"],
    [".library-search > svg", "search"],
    [".library-search-settings > svg", "sliders-horizontal"],
    [".library-stat-total .library-stat-icon > svg", "library-big"],
    [".library-stat-mastered .library-stat-icon > svg", "circle-check-big"],
    [".library-stat-reinforce .library-stat-icon > svg", "circle-dashed"],
    [".library-stat-due .library-stat-icon > svg", "refresh-ccw"],
    [".library-list-head button > svg", "arrow-up-down"],
    [".library-help-icon > svg", "circle-question-mark"],
    [".library-add-btn > svg", "circle-plus"],
    [".library-card-icon > svg, .empty-icon > svg", "book-open"],
    [".library-card-delete > svg", "trash-2"],
    [".passage-card-icon > svg, .picker-target-icon > svg", "book-open-text"],
    [".first-review-icon > svg", "calendar-clock"],
    [".picker-arrow > svg", "chevron-right"],
    [".audio-step-icon > svg", "mic"],
    [".heading-bubble > svg", "bookmark"],
    [".difficulty-chip[data-difficulty='transition'] svg", "link-2"],
    [".difficulty-chip[data-difficulty='beginning'] svg", "rotate-ccw"],
    [".difficulty-chip[data-difficulty='similar'] svg", "copy"],
    [".difficulty-chip[data-difficulty='forgotten'] svg", "bookmark"],
    ["#deleteAudioBtn > svg", "trash-2"],
    [".settings-list .setting-row:nth-child(2) .setting-icon > svg", "brain"],
    [".settings-list .setting-row:nth-child(3) .setting-icon > svg", "lock-keyhole"],
    [".journal-next button > svg", "chevron-right"],
    [".journal-entry-delete > svg", "trash-2"],
    [".journal-add-icon > svg", "calendar-plus"],
    ["#journalHistoryToggle > svg", "chevron-right"],
    [".bottom-nav .nav-btn[data-screen='home'] > svg", "house"],
    [".bottom-nav .nav-btn[data-screen='review'] > svg", "book-open"],
    [".bottom-nav .nav-btn[data-screen='hifdh'] > svg", "brain"],
    [".bottom-nav .nav-btn[data-screen='journal'] > svg", "chart-no-axes-column-increasing"],
    [".review-quick-actions > button:nth-child(1) .review-quick-icon > svg", "bookmark-check"],
    [".review-quick-actions > button:nth-child(2) .review-quick-icon > svg", "circle-plus"],
    [".review-session-back > svg, .summary-back-btn > svg", "arrow-left"],
    [".review-daily-meta > span > svg", "refresh-ccw"],
    ["#reviewAudioBtn > svg, #hifdhAudioIcon > svg, #elanAudioBtn > svg", "play"],
    [".reveal-btn-icon, .hifdh-reveal-icon > svg", "circle-arrow-right"],
    [".summary-icon > svg", "trophy"],
    [".hifdh-select-icon > svg", "list"],
    [".hifdh-stage-tabs > span:nth-child(1) > svg", "mic"],
    [".hifdh-stage-tabs > span:nth-child(2) > svg", "list"],
    [".hifdh-setup-heading > span > svg", "book-open"],
    [".hifdh-settings-title > span > svg", "list"],
    [".hifdh-chevron", "chevron-down"],
    [".hifdh-picker-search > svg", "search"],
    [".hifdh-picker-book > svg", "book-open"],
    [".hifdh-picker-footer > svg", "wand-sparkles"],
    [".hifdh-objective-card > span > svg", "target"],
    [".hifdh-progress-tip > span > svg", "chart-no-axes-column-increasing"],
    [".hifdh-picker-close > svg, .quran-picker-head button > svg, .journal-form-head > button > svg", "x"],
    [".hifdh-question-meta-icon > svg", "target"],
    [".translation-toggle > svg", "languages"],
    [".quran-picker-confirm > svg", "check"],
  ];

  function setIcon(svg, name) {
    if (!svg || svg.dataset.mfIcon === name) return;

    svg.dataset.mfIcon = name;
    svg.classList.add("mf-icon");
    svg.setAttribute("viewBox", "0 0 24 24");
    svg.setAttribute("fill", "none");
    svg.setAttribute("stroke", "currentColor");
    svg.setAttribute("stroke-width", "2");
    svg.setAttribute("stroke-linecap", "round");
    svg.setAttribute("stroke-linejoin", "round");
    svg.setAttribute("aria-hidden", "true");
    svg.innerHTML = `<use href="${SPRITE}#lucide-${name}"></use>`;
  }

  function renderSelector(selector, name) {
    document.querySelectorAll(selector).forEach((node) => {
      const svg = node instanceof SVGElement ? node : node.querySelector("svg");
      setIcon(svg, name);
    });
  }

  function renderStatefulIcons() {
    const recordButton = document.getElementById("recordBtn");
    const recordIcon = recordButton?.querySelector("svg");
    setIcon(recordIcon, recordButton?.textContent.includes("Arrêter") ? "square" : "mic");

    const previewButton = document.getElementById("previewAudioBtn");
    const previewIcon = previewButton?.querySelector("svg");
    setIcon(previewIcon, previewButton?.dataset.audioState === "pause" ? "pause" : "play");

    document.querySelectorAll("#elanAudioBtn, #hifdhAudioIcon, #reviewAudioBtn").forEach((button) => {
      const icon = button.querySelector("svg");
      const isPlaying = button.classList.contains("playing") || button.dataset.state === "pause";
      setIcon(icon, isPlaying ? "pause" : "play");
    });

    document.querySelectorAll(".hifdh-picker-item").forEach((button) => {
      const icon = button.querySelector(".hifdh-picker-state svg");
      setIcon(icon, button.getAttribute("aria-pressed") === "true" ? "check" : "chevron-right");
    });
  }

  function renderAll() {
    rules.forEach(([selector, name]) => renderSelector(selector, name));
    renderStatefulIcons();
  }

  let scheduled = false;
  function scheduleRender() {
    if (scheduled) return;
    scheduled = true;
    requestAnimationFrame(() => {
      scheduled = false;
      renderAll();
    });
  }

  window.MurajaahIcons = Object.freeze({ render: setIcon, renderAll });

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", renderAll, { once: true });
  } else {
    renderAll();
  }

  new MutationObserver(scheduleRender).observe(document.documentElement, {
    childList: true,
    subtree: true,
  });
})();
