/* Progressive enhancement: content stays visible if JS or WAAPI is unavailable. */
(() => {
  if (!("IntersectionObserver" in window) || !("animate" in Element.prototype)) return;

  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
  const active = new Set();
  const easing = getComputedStyle(document.documentElement).getPropertyValue("--ease-out").trim();
  const targets = document.querySelectorAll(
    ".features .section-heading, .feature-main, .feature-row, " +
    ".workflow-section .section-heading, .steps li, .report-layout, .privacy, .start"
  );
  const observer = new IntersectionObserver((entries) => {
    for (const entry of entries) {
      if (!entry.isIntersecting) continue;
      observer.unobserve(entry.target);
      // Never move content while the user is reading with reduced motion enabled.
      if (reducedMotion.matches) continue;
      const animation = entry.target.animate(
        [
          { opacity: 0, transform: "translateY(12px)" },
          { opacity: 1, transform: "translateY(0)" },
        ],
        { duration: 500, easing }
      );
      active.add(animation);
      animation.finished.then(() => active.delete(animation), () => active.delete(animation));
    }
  }, { threshold: 0.15 });

  targets.forEach((target) => {
    // Don't replay an entrance for content already visible on load or anchor jumps.
    const rect = target.getBoundingClientRect();
    if (rect.top >= window.innerHeight) observer.observe(target);
  });

  reducedMotion.addEventListener("change", () => {
    if (reducedMotion.matches) {
      active.forEach((animation) => animation.cancel());
      active.clear();
    }
  });
})();
