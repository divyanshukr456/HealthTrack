// Runs in <head> before first paint so the page never flashes the wrong theme.
(function () {
  var t = null;
  try { t = localStorage.getItem("ht-theme"); } catch (e) {}
  if (t !== "light" && t !== "dark") t = window.matchMedia && matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
  document.documentElement.setAttribute("data-theme", t);
})();
