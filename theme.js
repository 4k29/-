(function () {
  "use strict";

  var STORAGE_KEY = "4k29-theme";
  var GA_ID = "G-KK7MDCLBGT";
  var FAVICON_URL = "/4k29/favicon.png?v=20260910";
  var root = document.documentElement;
  var mobileQuery = window.matchMedia ? window.matchMedia("(max-width: 560px)") : null;

  function ensureAnalytics() {
    if (typeof window.gtag === "function") return;

    window.dataLayer = window.dataLayer || [];
    window.gtag = function () { window.dataLayer.push(arguments); };

    var script = document.createElement("script");
    script.async = true;
    script.src = "https://www.googletagmanager.com/gtag/js?id=" + encodeURIComponent(GA_ID);
    document.head.appendChild(script);

    window.gtag("js", new Date());
    window.gtag("config", GA_ID, { send_page_view: true });
  }

  function trackEvent(name, params) {
    if (typeof window.gtag !== "function") return;
    window.gtag("event", name, params || {});
  }

  function mountFavicon() {
    var icon = document.querySelector('link[rel="icon"]');
    if (!icon) {
      icon = document.createElement("link");
      icon.rel = "icon";
      document.head.appendChild(icon);
    }
    icon.type = "image/png";
    icon.href = FAVICON_URL;
  }

  function getContentContext() {
    var path = window.location.pathname;
    var base = "/4k29";

    if (path === base + "/notes/" || path === base + "/notes") {
      return { type: "archive", section: "notes" };
    }
    if (path.indexOf(base + "/notes/") === 0 && path.indexOf("/editor/") === -1) {
      return { type: "note", section: "notes" };
    }
    if (path === base + "/memory/" || path === base + "/memory") {
      return { type: "archive", section: "memory" };
    }
    if (path.indexOf(base + "/memory/") === 0 && path.indexOf("/editor/") === -1) {
      return { type: "memory", section: "memory" };
    }
    if (path === base + "/" || path === base) {
      return { type: "home", section: "home" };
    }
    if (path.indexOf(base + "/sitemap") === 0) {
      return { type: "sitemap", section: "sitemap" };
    }
    return { type: "page", section: "other" };
  }

  function mountAnalytics() {
    var context = getContentContext();

    trackEvent("content_view", {
      content_type: context.type,
      content_section: context.section,
      page_path: window.location.pathname,
      page_title: document.title
    });

    document.querySelectorAll("a.row-item, .note-index-item > a").forEach(function (link) {
      link.addEventListener("click", function () {
        trackEvent("content_open", {
          link_url: link.href,
          link_text: (link.textContent || "").trim().replace(/\s+/g, " ").slice(0, 100),
          source_section: context.section
        });
      });
    });

    var shareLink = document.querySelector(".article-share a");
    if (shareLink) {
      shareLink.addEventListener("click", function () {
        trackEvent("note_share", {
          method: "x",
          page_path: window.location.pathname,
          page_title: document.title
        });
      });
    }

    if (context.type === "note") {
      var sent50 = false;
      var sent90 = false;
      window.addEventListener("scroll", function () {
        var doc = document.documentElement;
        var maxScroll = Math.max(doc.scrollHeight - window.innerHeight, 1);
        var progress = Math.min((window.scrollY || 0) / maxScroll, 1);

        if (!sent50 && progress >= 0.5) {
          sent50 = true;
          trackEvent("read_depth", {
            percent_scrolled: 50,
            page_path: window.location.pathname,
            page_title: document.title
          });
        }
        if (!sent90 && progress >= 0.9) {
          sent90 = true;
          trackEvent("read_depth", {
            percent_scrolled: 90,
            page_path: window.location.pathname,
            page_title: document.title
          });
        }
      }, { passive: true });
    }
  }

  function systemTheme() {
    return window.matchMedia && window.matchMedia("(prefers-color-scheme: light)").matches
      ? "light"
      : "dark";
  }

  function storedTheme() {
    try {
      var value = window.localStorage.getItem(STORAGE_KEY);
      return value === "light" || value === "dark" ? value : "";
    } catch (error) {
      return "";
    }
  }

  function iconMarkup(theme) {
    if (theme === "dark") {
      return '<svg class="theme-toggle-icon" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><circle cx="12" cy="12" r="3.25"></circle><path d="M12 2.75v2.1M12 19.15v2.1M4.46 4.46l1.49 1.49M18.05 18.05l1.49 1.49M2.75 12h2.1M19.15 12h2.1M4.46 19.54l1.49-1.49M18.05 5.95l1.49-1.49"></path></svg>';
    }
    return '<svg class="theme-toggle-icon" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M20.1 14.6A8.35 8.35 0 0 1 9.4 3.9 8.5 8.5 0 1 0 20.1 14.6Z"></path></svg>';
  }

  function applyTheme(theme) {
    root.dataset.theme = theme;
    var button = document.getElementById("theme-toggle");
    if (!button) return;

    var nextTheme = theme === "light" ? "dark" : "light";
    button.dataset.currentTheme = theme;
    button.innerHTML = iconMarkup(theme);
    button.setAttribute("aria-label", nextTheme === "light"
      ? "ライトモードに切り替える"
      : "ダークモードに切り替える");
    button.setAttribute("title", nextTheme === "light"
      ? "ライトモード"
      : "ダークモード");
  }

  function saveTheme(theme) {
    try {
      window.localStorage.setItem(STORAGE_KEY, theme);
    } catch (error) {
      // Keep the selected theme for this page even when storage is unavailable.
    }
  }

  function placeToggle(button) {
    var nav = document.querySelector(".global-header .global-nav");
    if (mobileQuery && mobileQuery.matches && nav) {
      if (button.parentNode !== nav) nav.appendChild(button);
      return;
    }

    if (button.parentNode !== document.body) document.body.appendChild(button);
  }

  function mountToggle() {
    if (document.getElementById("theme-toggle")) return;

    var button = document.createElement("button");
    button.id = "theme-toggle";
    button.className = "theme-toggle";
    button.type = "button";
    document.body.appendChild(button);

    placeToggle(button);
    applyTheme(root.dataset.theme || systemTheme());

    button.addEventListener("click", function () {
      var current = root.dataset.theme || systemTheme();
      var next = current === "light" ? "dark" : "light";
      applyTheme(next);
      saveTheme(next);
      trackEvent("theme_change", { theme: next });
    });

    if (mobileQuery) {
      if (typeof mobileQuery.addEventListener === "function") {
        mobileQuery.addEventListener("change", function () { placeToggle(button); });
      } else if (typeof mobileQuery.addListener === "function") {
        mobileQuery.addListener(function () { placeToggle(button); });
      }
    }
  }

  function mountHeaderReveal() {
    var header = document.querySelector(".global-header");
    if (!header) return;

    var lastY = Math.max(window.scrollY || 0, 0);
    var ticking = false;
    var topZone = 72;
    var delta = 3;

    function updateHeader() {
      var currentY = Math.max(window.scrollY || 0, 0);
      header.classList.toggle("is-scrolled", currentY > 8);

      if (currentY <= topZone) {
        header.classList.remove("is-hidden");
      } else if (currentY > lastY + delta) {
        header.classList.add("is-hidden");
      } else if (currentY < lastY - delta) {
        header.classList.remove("is-hidden");
      }

      lastY = currentY;
      ticking = false;
    }

    updateHeader();

    window.addEventListener("scroll", function () {
      if (ticking) return;
      ticking = true;
      window.requestAnimationFrame(updateHeader);
    }, { passive: true });
  }

  function mountUi() {
    mountFavicon();
    mountToggle();
    mountHeaderReveal();
    mountAnalytics();
  }

  ensureAnalytics();
  applyTheme(storedTheme() || systemTheme());

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", mountUi, { once: true });
  } else {
    mountUi();
  }
}());
