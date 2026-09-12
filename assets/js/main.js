/* ================================================================
   CONSTROVET — SHARED JS  (assets/js/main.js)
   Handles:
   1. Nav & footer injection
   2. Mobile hamburger toggle
   3. Active nav link highlight
   4. Branded app URL handling
   ================================================================ */

(function () {
  "use strict";

  const APP_URL = "/app/";

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

  /* Resolve path depth — pages/, blog/, and app/ are one level deep. */
  const isNested =
    window.location.pathname.includes("/pages/") ||
    window.location.pathname.includes("/blog/") ||
    window.location.pathname.includes("/app/") ||
    window.location.pathname.includes("/boardroom/") ||
    window.location.pathname.includes("/ssm-core-demo/");
  const base = isNested ? "../assets/" : "assets/";

  Promise.all([
    loadPartial("#cv-nav-placeholder",    base + "nav.html"),
    loadPartial("#cv-footer-placeholder", base + "footer.html"),
  ]).then(() => {
    configureAppLinks();
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
    const currentPath = normalizePath(window.location.pathname);
    const activePath = activeNavPath(currentPath);
    document.querySelectorAll(".cv-nav__links a, .cv-nav__drawer a").forEach(a => {
      const hrefPath = normalizePath(new URL(a.getAttribute("href") || "/", window.location.origin).pathname);
      if (hrefPath === activePath) {
        a.classList.add("active");
        a.setAttribute("aria-current", "page");
      }
    });
  }

  function activeNavPath(currentPath) {
    const servicePaths = new Set([
      "/construction-cost-leakage-audit",
      "/construction-cost-leakage-audit.html",
      "/construction-esg-carbon-audit",
      "/construction-esg-carbon-audit.html",
      "/schedule-delay-cost-impact",
      "/schedule-delay-cost-impact.html",
      "/construction-financier-risk-audit",
      "/construction-financier-risk-audit.html",
      "/construction-project-recovery-plan",
      "/construction-project-recovery-plan.html",
      "/pages/construction-cost-leakage-audit.html",
      "/pages/construction-cost-overrun-analysis.html",
      "/pages/construction-esg-carbon-audit.html",
      "/pages/schedule-slippage-recovery.html",
      "/pages/construction-due-diligence-financiers.html",
      "/pages/how-it-works.html",
      "/pages/industries.html"
    ]);

    if (servicePaths.has(currentPath)) return "/pages/solution.html";
    if (currentPath === "/blog" || currentPath.startsWith("/blog/")) {
      return "/pages/knowledge.html";
    }
    if (currentPath === "/pages/team.html" || currentPath === "/pages/client.html") {
      return "/pages/company.html";
    }
    return currentPath;
  }

  function normalizePath(pathname) {
    const path = pathname || "/";
    return path === "/" ? "/" : path.replace(/\/+$/, "");
  }

  function setFooterYear() {
    const year = document.getElementById("cv-year");
    if (year) year.textContent = new Date().getFullYear();
  }

  function configureAppLinks() {
    document.querySelectorAll("[data-cv-app-link]").forEach(a => {
      a.href = APP_URL;
      a.removeAttribute("target");
      a.removeAttribute("rel");
      a.setAttribute("aria-label", "Try the Constrovet analyzer");
    });
  }

})();
