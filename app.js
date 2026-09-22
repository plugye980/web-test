(function () {
  "use strict";

  var root = document.documentElement;
  var THEMES = ["dark", "light"];
  var STORE_KEY = "preview-theme";
  var reduced =
    window.matchMedia &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* ── 분할 선택 (테마 포함) ─────────────────────────────── */
  function layoutSegment(seg) {
    var thumb = seg.querySelector(".segment-thumb");
    var on = seg.querySelector(".segment-pick.is-on");
    if (!thumb || !on) return;
    thumb.style.width = on.offsetWidth + "px";
    thumb.style.transform = "translateX(" + (on.offsetLeft - on.parentElement.clientLeft - 5) + "px)";
  }

  var segments = Array.prototype.slice.call(document.querySelectorAll(".segment"));

  segments.forEach(function (seg) {
    var picks = Array.prototype.slice.call(seg.querySelectorAll(".segment-pick"));
    picks.forEach(function (btn) {
      btn.addEventListener("click", function () {
        picks.forEach(function (b) {
          b.classList.toggle("is-on", b === btn);
          b.setAttribute("aria-pressed", String(b === btn));
        });
        layoutSegment(seg);
        if (btn.dataset.themeSet) applyTheme(btn.dataset.themeSet);
      });
    });
  });

  function layoutAllSegments() {
    segments.forEach(layoutSegment);
  }

  window.addEventListener("resize", layoutAllSegments);
  if (document.fonts && document.fonts.ready) {
    document.fonts.ready.then(layoutAllSegments);
  }

  /* ── 테마 ──────────────────────────────────────────────── */
  function applyTheme(name) {
    if (THEMES.indexOf(name) === -1) return;
    root.setAttribute("data-theme", name);
    document.querySelectorAll("[data-theme-set]").forEach(function (btn) {
      var on = btn.dataset.themeSet === name;
      btn.classList.toggle("is-on", on);
      btn.setAttribute("aria-pressed", String(on));
    });
    layoutAllSegments();
    try {
      localStorage.setItem(STORE_KEY, name);
    } catch (e) {
      /* 저장 불가 환경은 무시 */
    }
  }

  var saved = null;
  try {
    saved = localStorage.getItem(STORE_KEY);
  } catch (e) {
    saved = null;
  }
  var prefersLight =
    window.matchMedia && window.matchMedia("(prefers-color-scheme: light)").matches;
  applyTheme(saved || (prefersLight ? "light" : "dark"));
  layoutAllSegments();

  /* ── 스위치 ────────────────────────────────────────────── */
  document.querySelectorAll(".switch").forEach(function (sw) {
    sw.addEventListener("click", function () {
      var on = !sw.classList.contains("is-on");
      sw.classList.toggle("is-on", on);
      sw.setAttribute("aria-checked", String(on));
      if (sw.getAttribute("aria-label") === "색수차") {
        document.querySelectorAll(".c-area .face, .gauge .value").forEach(function (el) {
          el.style.filter = on ? "" : "none";
        });
      }
    });
  });

  /* ── 구간 손잡이 ───────────────────────────────────────── */
  var VALUES = [34, 41, 38, 49, 58, 54, 63, 72, 69, 80, 86, 95];
  var MONTHS = VALUES.length;
  var PLOT_X0 = 30;
  var PLOT_W = 820;
  var PLOT_TOP = 51;   /* 값 95의 y */
  var PLOT_UNIT = 2.2; /* 값 1당 y 변화 */

  function valueAt(p) {
    var t = p * (MONTHS - 1);
    var i = Math.min(Math.floor(t), MONTHS - 2);
    var f = t - i;
    return VALUES[i] + (VALUES[i + 1] - VALUES[i]) * f;
  }

  function yAt(v) {
    return PLOT_TOP + (95 - v) * PLOT_UNIT;
  }

  function setupRail(rail, opts) {
    if (!rail) return;
    var knobs = Array.prototype.slice.call(rail.querySelectorAll(".knob"));
    var fill = rail.querySelector(".rail-fill");
    var pos = knobs.map(function (k) {
      return parseFloat(k.style.getPropertyValue("--p")) / 100;
    });

    function paint() {
      knobs.forEach(function (k, i) {
        k.style.setProperty("--p", (pos[i] * 100).toFixed(2) + "%");
      });
      if (fill) {
        if (knobs.length > 1) {
          fill.style.left = (pos[0] * 100).toFixed(2) + "%";
          fill.style.right = ((1 - pos[1]) * 100).toFixed(2) + "%";
        } else {
          fill.style.right = ((1 - pos[0]) * 100).toFixed(2) + "%";
        }
      }
      opts.onChange(pos, knobs);
    }

    function move(i, p) {
      p = Math.min(1, Math.max(0, p));
      if (knobs.length > 1) {
        if (i === 0) p = Math.min(p, pos[1] - 0.06);
        else p = Math.max(p, pos[0] + 0.06);
        p = Math.min(1, Math.max(0, p));
      }
      pos[i] = p;
      paint();
    }

    knobs.forEach(function (knob, i) {
      knob.addEventListener("pointerdown", function (e) {
        knob.setPointerCapture(e.pointerId);
        knob.classList.add("is-held");
      });
      knob.addEventListener("pointermove", function (e) {
        if (!knob.hasPointerCapture(e.pointerId)) return;
        var r = rail.getBoundingClientRect();
        move(i, (e.clientX - r.left) / r.width);
      });
      ["pointerup", "pointercancel"].forEach(function (type) {
        knob.addEventListener(type, function () {
          knob.classList.remove("is-held");
        });
      });
      knob.addEventListener("keydown", function (e) {
        var step = e.shiftKey ? 0.1 : 1 / (MONTHS - 1);
        if (e.key === "ArrowLeft" || e.key === "ArrowDown") {
          move(i, pos[i] - step);
          e.preventDefault();
        } else if (e.key === "ArrowRight" || e.key === "ArrowUp") {
          move(i, pos[i] + step);
          e.preventDefault();
        }
      });
    });

    paint();
  }

  var area = document.querySelector(".c-area");
  setupRail(document.getElementById("rangeRail"), {
    onChange: function (pos, knobs) {
      if (!area) return;
      var railBox = document.getElementById("rangeRail").getBoundingClientRect();
      var inset = railBox.width ? 13 / railBox.width : 0;
      ["a", "b"].forEach(function (key, i) {
        var x = PLOT_X0 + PLOT_W * (inset + pos[i] * (1 - 2 * inset));
        var v = valueAt(pos[i]);
        var line = area.querySelector(".cursor-" + key);
        var dot = area.querySelector(".cursor-dot-" + key);
        if (line) {
          line.setAttribute("x1", x.toFixed(1));
          line.setAttribute("x2", x.toFixed(1));
        }
        if (dot) {
          dot.setAttribute("cx", x.toFixed(1));
          dot.setAttribute("cy", yAt(v).toFixed(1));
        }
        var month = Math.round(pos[i] * (MONTHS - 1)) + 1;
        knobs[i].setAttribute("aria-valuenow", String(month));
        knobs[i].setAttribute("aria-valuetext", month + "월");
      });
      var read = document.getElementById("rangeRead");
      if (read) {
        var m1 = Math.round(pos[0] * (MONTHS - 1)) + 1;
        var m2 = Math.round(pos[1] * (MONTHS - 1)) + 1;
        var sum = 0;
        var n = 0;
        for (var m = m1; m <= m2; m++) {
          sum += VALUES[m - 1];
          n++;
        }
        read.innerHTML =
          m1 + "월 – " + m2 + "월 · 평균 <b>" + (sum / n).toFixed(1) + "</b>";
      }
    }
  });

  var soloRead = document.getElementById("soloRead");
  setupRail(document.getElementById("soloRail"), {
    onChange: function (pos, knobs) {
      var v = Math.round(pos[0] * 100);
      if (soloRead) soloRead.textContent = String(v);
      knobs[0].setAttribute("aria-valuenow", String(v));
    }
  });

  /* ── 스크롤 등장 ───────────────────────────────────────── */
  var items = Array.prototype.slice.call(document.querySelectorAll(".reveal"));

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

    var groups = new Map();
    items.forEach(function (el) {
      var parent = el.parentElement;
      var n = groups.get(parent) || 0;
      delays.set(el, Math.min(n * 80, 320));
      groups.set(parent, n + 1);
      observer.observe(el);
    });
  }
})();
