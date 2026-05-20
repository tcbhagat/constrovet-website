/* ================================================================
   CONSTROVET — SHARED JS  (assets/js/main.js)
   Handles:
   1. Nav & footer injection
   2. Mobile hamburger toggle
   3. Active nav link highlight
   ================================================================ */

(function () {
  "use strict";

  /* ── 1. INJECT NAV & FOOTER ─────────────────────────────────── */
  async function loadPartial(selector, url) {
    const el = document.querySelector(selector);
    if (!el) return;
    if (el.innerHTML.trim()) return;
    try {
      const res = await fetch(url);
      if (!res.ok) throw new Error("Fetch failed: " + url);
      el.innerHTML = await res.text();
    } catch (e) {
      console.warn("Partial load error:", e);
    }
  }

  /* Resolve path depth — pages/ is one level deep, index.html is root */
  const isRoot = !window.location.pathname.includes("/pages/");
  const base   = isRoot ? "assets/" : "../assets/";

  Promise.all([
    loadPartial("#cv-nav-placeholder",    base + "nav.html"),
    loadPartial("#cv-footer-placeholder", base + "footer.html"),
  ]).then(() => {
    initHamburger();
    highlightActiveLink();
    setFooterYear();
    // Re-run lucide if available
    if (window.lucide) lucide.createIcons();
  });

  /* ── 2. HAMBURGER ───────────────────────────────────────────── */
  function initHamburger() {
    const btn    = document.getElementById("cv-hamburger");
    const drawer = document.getElementById("cv-drawer");
    if (!btn || !drawer) return;
    btn.addEventListener("click", () => {
      drawer.classList.toggle("open");
    });
    // Close on link click
    drawer.querySelectorAll("a").forEach(a => {
      a.addEventListener("click", () => drawer.classList.remove("open"));
    });
  }

  /* ── 3. ACTIVE LINK HIGHLIGHT ───────────────────────────────── */
  function highlightActiveLink() {
    const currentPath = window.location.pathname;
    const current = currentPath === "/" ? "index.html" : (currentPath.split("/").pop() || "index.html");
    document.querySelectorAll(".cv-nav__links a, .cv-nav__drawer a").forEach(a => {
      const hrefPath = new URL(a.getAttribute("href") || "/", window.location.origin).pathname;
      const href = hrefPath === "/" ? "index.html" : hrefPath.split("/").pop();
      if (href === current) a.classList.add("active");
    });
  }

  function setFooterYear() {
    const year = document.getElementById("cv-year");
    if (year) year.textContent = new Date().getFullYear();
  }

})();
