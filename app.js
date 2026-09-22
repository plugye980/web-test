(function () {
  "use strict";

  var root = document.documentElement;
  var THEMES = ["dark", "light"];
  var STORE_KEY = "preview-theme";

  /* 테마 — 저장값이 없으면 시스템 설정을 따른다 */
  var picks = Array.prototype.slice.call(
    document.querySelectorAll("[data-theme-set]")
  );

  function applyTheme(name) {
    if (THEMES.indexOf(name) === -1) return;
    root.setAttribute("data-theme", name);
    picks.forEach(function (btn) {
      var on = btn.dataset.themeSet === name;
      btn.classList.toggle("is-on", on);
      btn.setAttribute("aria-pressed", String(on));
    });
    try {
      localStorage.setItem(STORE_KEY, name);
    } catch (e) {
      /* 저장 불가 환경은 무시 */
    }
  }

  picks.forEach(function (btn) {
    btn.addEventListener("click", function () {
      applyTheme(btn.dataset.themeSet);
    });
  });

  var saved = null;
  try {
    saved = localStorage.getItem(STORE_KEY);
  } catch (e) {
    saved = null;
  }

  var prefersLight =
    window.matchMedia && window.matchMedia("(prefers-color-scheme: light)").matches;
  applyTheme(saved || (prefersLight ? "light" : "dark"));

  /* 스크롤 등장 */
  var items = Array.prototype.slice.call(document.querySelectorAll(".reveal"));
  var reduced =
    window.matchMedia &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  if (reduced || !("IntersectionObserver" in window)) {
    items.forEach(function (el) {
      el.classList.add("is-in");
    });
  } else {
    var delays = new WeakMap();
    var observer = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          if (!entry.isIntersecting) return;
          var el = entry.target;
          el.style.transitionDelay = (delays.get(el) || 0) + "ms";
          el.classList.add("is-in");
          observer.unobserve(el);
        });
      },
      { threshold: 0.08, rootMargin: "0px 0px -6% 0px" }
    );

    /* 형제 요소는 순차적으로 */
    var groups = new Map();
    items.forEach(function (el) {
      var parent = el.parentElement;
      var n = groups.get(parent) || 0;
      delays.set(el, Math.min(n * 90, 360));
      groups.set(parent, n + 1);
      observer.observe(el);
    });
  }

  /* 커서를 따라가는 옅은 빛 */
  var aura = document.querySelector(".aura");
  if (aura && !reduced && window.matchMedia("(pointer: fine)").matches) {
    var targetX = 50;
    var targetY = 30;
    var x = 50;
    var y = 30;
    var raf = null;

    var step = function () {
      x += (targetX - x) * 0.07;
      y += (targetY - y) * 0.07;
      aura.style.setProperty("--mx", x.toFixed(2) + "%");
      aura.style.setProperty("--my", y.toFixed(2) + "%");
      if (Math.abs(targetX - x) > 0.05 || Math.abs(targetY - y) > 0.05) {
        raf = requestAnimationFrame(step);
      } else {
        raf = null;
      }
    };

    window.addEventListener(
      "pointermove",
      function (e) {
        targetX = (e.clientX / window.innerWidth) * 100;
        targetY = (e.clientY / window.innerHeight) * 100;
        aura.classList.add("is-lit");
        if (raf === null) raf = requestAnimationFrame(step);
      },
      { passive: true }
    );
  }
})();
