(function () {
  "use strict";

  var STORAGE_KEY = "4k29-theme";
  var root = document.documentElement;

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

  function mountToggle() {
    if (document.getElementById("theme-toggle")) return;

    var button = document.createElement("button");
    button.id = "theme-toggle";
    button.className = "theme-toggle";
    button.type = "button";
    document.body.appendChild(button);

    applyTheme(root.dataset.theme || systemTheme());

    button.addEventListener("click", function () {
      var current = root.dataset.theme || systemTheme();
      var next = current === "light" ? "dark" : "light";
      applyTheme(next);
      saveTheme(next);
    });
  }

  applyTheme(storedTheme() || systemTheme());

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", mountToggle, { once: true });
  } else {
    mountToggle();
  }
}());
