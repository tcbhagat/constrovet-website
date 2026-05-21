# Constrovet SEO/GEO Change Log

Date: 2026-05-21

## Summary

Implemented the technical SEO foundation for the static Constrovet public website without changing the visual design system or navigation structure.

## Files changed

- `robots.txt`
- `sitemap.xml`
- `llms.txt`
- `index.html`
- `assets/footer.html`
- `pages/company.html`
- `pages/contact.html`
- `pages/client.html`
- `pages/team.html`
- `pages/privacy.html`
- `pages/solution.html`
- `pages/how-it-works.html`
- `pages/industries.html`
- `pages/knowledge.html`
- `pages/construction-cost-leakage-audit.html`
- `pages/construction-cost-overrun-analysis.html`
- `pages/construction-esg-carbon-audit.html`
- `pages/schedule-slippage-recovery.html`
- `pages/construction-due-diligence-financiers.html`
- `docs/seo-geo-change-log.md`

## Changes made

- Confirmed crawler access in `robots.txt` and retained the sitemap pointer.
- Updated `sitemap.xml` to include all public HTML pages with current lastmod dates.
- Added `llms.txt` for AI answer engines with evidence-safe positioning, public page URLs, app-domain policy, and synthetic demo data guidance.
- Preserved unique page titles, meta descriptions, and canonical URLs across public pages.
- Added missing OpenGraph and Twitter image metadata to pages that previously only had summary cards.
- Added or expanded JSON-LD for Organization, WebSite, SoftwareApplication, WebPage, CollectionPage, ContactPage, Article, FAQPage, BreadcrumbList, ItemList, and Person where supported by existing visible content.
- Added BreadcrumbList JSON-LD to public subpages.
- Preserved meaningful image alt text; no missing image alt attributes were found during validation.
- Replaced the homepage CTA label with "Open Constrovet Executive Demo"; app URL handling is now centralized for the branded app subdomain.
- Normalized public legal entity text used in metadata/schema/footer to `AInnoverse Tech Centre LLP` as requested.

## Claims policy

No client names, client logos, testimonials, audited-capital amounts, accuracy percentages, awards, or unverifiable performance claims were added.

## Manual follow-up

- Configure DNS and Cloud Run domain mapping for `https://app.constrovet.com/`.
- Verify the branded app CTA resolves to `https://app.constrovet.com/` after the custom domain is live.
- Submit `https://www.constrovet.com/sitemap.xml` in Google Search Console and Bing Webmaster Tools after deployment.
- Run Google Rich Results Test on the homepage and key topic pages after deployment.
- Verify contact-form behavior against the current Content Security Policy before relying on SEO lead capture.

## Service page expansion

Added five root-level, crawlable service pages with extensionless canonical URLs:

- `https://www.constrovet.com/construction-cost-leakage-audit`
- `https://www.constrovet.com/construction-esg-carbon-audit`
- `https://www.constrovet.com/schedule-delay-cost-impact`
- `https://www.constrovet.com/construction-financier-risk-audit`
- `https://www.constrovet.com/construction-project-recovery-plan`

Each page includes a unique title, meta description, canonical URL, H1, direct answer, problem section, Constrovet workflow explanation, required documents, example output table, 7/30/90 action relevance, five-question FAQ, FAQPage JSON-LD, internal links to the demo section, contact page, and related service pages.

Updated `sitemap.xml`, `llms.txt`, shared navigation, and footer links so the new service pages are discoverable without changing the visual design system.

## Public synthetic demo page

Added `https://www.constrovet.com/demo` via `demo.html` as a crawlable static demo page for the marketing site.

The page clearly labels the project as synthetic with the required statement: "This is a synthetic demonstration project. No real client data is shown."

The page includes:

- Executive summary for the Synthetic Mid-Rise Commercial Building Project.
- Synthetic baseline budget, leakage exposure, schedule delay, ESG findings, and documents-reviewed metrics.
- Leakage findings table, schedule-delay-to-cost impact section, ESG/carbon findings, and evidence citation examples.
- 7-day, 30-day, and 90-day action sections.
- Real pilot requirements and CTA links to request access or open the live app.
- Product, SoftwareApplication, WebPage, BreadcrumbList, and FAQPage JSON-LD.

Updated `sitemap.xml`, `llms.txt`, homepage CTAs, shared navigation, footer, and root-level service-page demo links so visitors and crawlers reach the static synthetic demo before the live app.

## Branded app subdomain preparation

Prepared the marketing site for `https://app.constrovet.com` without changing backend app behavior or deployment secrets.

- Centralized app CTA destination handling in `assets/js/main.js` with `APP_URL`, `APP_URL_FALLBACK`, and `USE_APP_URL_FALLBACK`.
- Removed raw Cloud Run hrefs from public-facing HTML CTAs.
- Updated visible CTA labels to "Open Constrovet Executive Demo" and "Request Pilot Access" where they are public action buttons or app links.
- Added `docs/app-subdomain-setup.md` with Cloud Run domain mapping, DNS, HTTPS certificate, redirect, canonical, and rollback guidance.

## Lightweight SEO content engine

Added a static `/blog` structure for weekly Constrovet knowledge articles without adding backend behavior.

- Added `blog/index.html` as the crawlable blog index.
- Added initial articles:
  - `https://www.constrovet.com/blog/documents-needed-for-construction-cost-leakage-audit`
  - `https://www.constrovet.com/blog/boq-vs-actual-cost-overrun`
  - `https://www.constrovet.com/blog/construction-carbon-audit-india`
- Each article includes title, meta description, canonical URL, H1, short answer, practical checklist, example table, FAQ, FAQPage JSON-LD, internal links, and founder/expert attribution.
- Updated shared navigation, footer, knowledge hub links, `sitemap.xml`, and `llms.txt`.
- Added `docs/content-calendar.md` with 12 weekly article topics and publishing rules.

Content rules remain evidence-safe: no legal advice, no unverifiable performance claims, and standards/regulations should be marked "to be verified before publication" unless verified source evidence is documented.

## Search console preparation

Prepared the site for Google Search Console and Bing Webmaster Tools verification.

- Added an inactive, commented verification placeholder section in the root `index.html` head.
- Did not add or invent any active verification codes.
- Added `docs/search-console-setup.md` with DNS TXT verification, sitemap submission, URL inspection, indexing request, coverage, query tracking, and launch checklists for `www`, non-`www`, sitemap, robots, and `app.constrovet.com`.

## GEO / AI answer-engine optimisation

Optimised public HTML pages for AI answer engines.

- Added visible executive summary answer blocks across public pages.
- Added comparison or summary tables where pages needed structured extraction support.
- Added FAQ sections to pages that previously lacked visible FAQ content.
- Added relevant blog links from service pages.
- Expanded `llms.txt` with company, product, target users, supported use cases, pages to cite, pages not to cite for claims, and AI-assistant rules.
- Added `docs/geo-optimisation.md` with the durable GEO publishing checklist and citation policy.
