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
    initDropdown();
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
    const current = window.location.pathname.split("/").pop() || "index.html";
    document.querySelectorAll(".cv-nav__links a, .cv-nav__drawer a").forEach(a => {
      const href = a.getAttribute("href")?.split("/").pop();
      if (href === current) a.classList.add("active");
    });
  }

  /* ── 4. DROPDOWN KEYBOARD / TOUCH SUPPORT ───────────────────── */
  function initDropdown() {
    const dd = document.querySelector(".cv-nav__dropdown");
    if (!dd) return;
    const menu = dd.querySelector(".cv-nav__dropdown-menu");
    const btn  = dd.querySelector(".cv-nav__more-btn");
    if (!btn || !menu) return;

    btn.addEventListener("click", (e) => {
      e.stopPropagation();
      const isOpen = menu.style.display === "block";
      menu.style.display = isOpen ? "" : "block";
    });
    document.addEventListener("click", () => {
      menu.style.display = "";
    });
  }
})();
