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

  function applyTheme(theme) {
    root.dataset.theme = theme;
    var button = document.getElementById("theme-toggle");
    if (!button) return;

    var nextTheme = theme === "light" ? "dark" : "light";
    button.textContent = theme === "light" ? "☾" : "☀";
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
      // The selected theme still applies for this page even if storage is blocked.
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
