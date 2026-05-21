# Constrovet SEO and GEO Audit

Audit scope: `/home/taran/constrovet-website` public static site. Product app context was checked only for the public/demo app link and branded app-domain strategy.

GEO in this report means generative engine optimization: making pages easier for answer engines and LLM crawlers to summarize accurately from short, structured, evidence-safe content.

## Executive summary

Constrovet already has a solid static-site SEO foundation. The repository includes `robots.txt`, `sitemap.xml`, canonical tags, page-specific titles, meta descriptions, basic OpenGraph metadata, and partial JSON-LD schema. The sitemap covers every local HTML page: the homepage plus 14 files under `pages/`.

The main blockers are not missing baseline SEO files. They are answer-engine readiness, schema completeness, product URL branding, and evidence discipline. The site lacks `llms.txt`, several pages have no JSON-LD schema, visible FAQ sections are not represented as `FAQPage` schema, and the homepage still links to the raw Cloud Run product URL instead of a branded `app.constrovet.com` URL.

No duplicate titles were found. No missing image `alt` attributes or missing iframe `title` attributes were found in the audited local HTML. No fake client names, fake testimonials, fake audited-capital claims, or fake accuracy numbers were found in the audited local site. The current site does include evidence-safe language that client-specific logos, names, and testimonials are published only with approval.

Live checks showed `https://www.constrovet.com`, `/robots.txt`, and `/sitemap.xml` returning current expected content. `https://app.constrovet.com` did not resolve during the audit, while the raw Cloud Run product app returned HTTP 200 with `X-Robots-Tag: noindex, nofollow`.

## Critical issues

1. Missing `llms.txt`
   - Evidence: `test -f llms.txt` returned missing in `/home/taran/constrovet-website`.
   - Impact: answer engines do not get a concise, crawler-friendly summary of Constrovet, its public pages, permitted claims, founder-led attribution, and product/demo boundaries.
   - Recommendation: add `/llms.txt` with evidence-safe positioning, key URLs, app URL policy, founder/legal attribution after legal-name verification, and a clear note that demo/synthetic data must be labelled.

2. Homepage links to raw Cloud Run product URL
   - Evidence: `index.html:89` links to `https://prod-constrovet4mobile-759832881234.asia-south1.run.app`.
   - Impact: raw infrastructure URLs weaken brand trust, are poor for GEO citations, and conflict with the durable product mapping strategy.
   - Recommendation: map the product to `https://app.constrovet.com` first, then replace public CTAs with the branded URL.

3. `app.constrovet.com` currently does not resolve
   - Evidence: `curl -I -L https://app.constrovet.com` returned DNS resolution failure during audit.
   - Impact: switching links before DNS and Cloud Run domain mapping are ready would create a broken product CTA.
   - Recommendation: configure DNS and Cloud Run domain mapping, verify HTTPS, then update public site links.

4. Structured data is incomplete
   - Evidence: `client.html`, `team.html`, and `privacy.html` have no JSON-LD blocks. Several pages only have `BreadcrumbList` or page-specific schema.
   - Impact: search engines and answer engines get uneven entity context across public pages.
   - Recommendation: add schema only where claims are verified: `Organization`, `WebSite`, `SoftwareApplication`, `WebPage`, `Article`, `FAQPage`, `ContactPage`, and conservative `Person` schema for verified founder/advisor pages.

5. FAQ content is not marked up as `FAQPage`
   - Evidence: visible `.cv-faq` sections exist on cost leakage, overrun, ESG, schedule recovery, and financier due diligence pages, but no `FAQPage` or `Question` JSON-LD appears.
   - Impact: answer engines can read visible questions, but structured extraction is weaker.
   - Recommendation: add matching `FAQPage` schema for existing visible FAQs without inventing new answers.

6. Thin content risk on strategic pages
   - Evidence from local text extraction:
     - `pages/team.html`: about 82 words.
     - `pages/industries.html`: about 92 words.
     - `pages/contact.html`: about 99 words.
     - `pages/client.html`: about 154 words.
     - `pages/company.html`: about 168 words.
   - Impact: pages may be indexed but may not answer buyer or answer-engine questions deeply enough.
   - Recommendation: add short answer blocks, verified founder/legal context, use-case summaries, and FAQ sections without unsupported claims.

7. Heading structure needs cleanup
   - Evidence: `pages/industries.html` has one `h1`, zero `h2`, and four `h3` headings. `pages/how-it-works.html` uses `h3` process headings before the next `h2`.
   - Impact: semantic outline is less clear for crawlers, accessibility, and answer extraction.
   - Recommendation: insert appropriate `h2` section headings and keep card titles in a consistent hierarchy.

8. JS-injected navigation and footer create a crawler fallback risk
   - Evidence: `assets/js/main.js` fetches `assets/nav.html` and `assets/footer.html` into placeholders.
   - Impact: modern search crawlers can render JavaScript, but some LLM crawlers and simple link extractors may miss navigation and footer links in raw HTML.
   - Recommendation: keep the sitemap, but consider server-side/static inclusion or duplicate key crawl links in no-JS HTML for critical pages.

9. Contact form may be blocked by Content Security Policy
   - Evidence: `pages/contact.html:50` posts to `https://formsubmit.co/...`; `nginx.conf` sets `form-action 'self'`.
   - Impact: this is primarily a conversion/deployment risk, but failed contact submissions can reduce lead capture from SEO traffic.
   - Recommendation: allow the verified form endpoint in `form-action`, or move the form endpoint to same-origin infrastructure.

10. Legal entity spelling must be verified
   - Evidence: site copy uses `AInnoverse Tech Center LLP`; the implementation prompt says `AInnoverse Tech Centre LLP`.
   - Impact: inconsistent legal naming can weaken trust, entity matching, schema confidence, and compliance clarity.
   - Recommendation: verify the legal spelling from official incorporation evidence, then make the website, schema, footer, and `llms.txt` consistent.

## Quick wins

- Add `/llms.txt` with concise, evidence-safe answers:
  - What Constrovet is.
  - Who operates it.
  - Founder-led attribution.
  - What the product analyzes.
  - What claims are not made.
  - Public page index.
  - Product app URL policy: `app.constrovet.com`.
  - Demo data policy: synthetic demo data must be labelled.
- Configure `app.constrovet.com`, verify HTTPS, then replace the raw Cloud Run homepage CTA.
- Add `FAQPage` schema to pages that already have visible FAQs.
- Add JSON-LD to `client.html`, `team.html`, and `privacy.html`.
- Add `og:image` and matching Twitter image metadata to pages that currently use only summary card metadata.
- Fix `industries.html` and `how-it-works.html` heading hierarchy.
- Expand thin pages with short, structured, answer-engine-friendly copy.
- Resolve the legal spelling before changing schema or `llms.txt`.
- Adjust CSP `form-action` after confirming the desired contact form endpoint.

## Page-by-page findings

### Home: `/index.html`

- SEO status: title, meta description, canonical, OG tags, Twitter tags, and JSON-LD are present.
- Schema status: includes `Organization`, `SoftwareApplication`, and `WebSite`.
- Issues:
  - Raw Cloud Run product link at `index.html:89`.
  - No visible FAQ or `FAQPage` schema.
  - Legal name in schema uses `AInnoverse Tech Center LLP`; verify against the requested `Centre` spelling.
- Recommended changes:
  - Replace product CTA with `https://app.constrovet.com` after DNS is live.
  - Add a short "What is Constrovet?" answer block and homepage FAQ.
  - Keep claims limited to document-backed cost leakage, schedule slippage, ESG/carbon audit, and 7/30/90 recovery planning.

### Solution: `/pages/solution.html`

- SEO status: title, meta description, canonical, OG image, Twitter image, and JSON-LD are present.
- Schema status: currently uses `BreadcrumbList`.
- Issues:
  - No `SoftwareApplication`, `Service`, or `WebPage` schema on this product-solution page.
  - No visible FAQ section.
- Recommended changes:
  - Add evidence-safe product/service schema.
  - Add short answers for "What does Constrovet do?", "What evidence is needed?", and "What output does an executive receive?"

### Cost leakage audit: `/pages/construction-cost-leakage-audit.html`

- SEO status: title, meta description, canonical, OG image, Twitter image, and `Article` schema are present.
- GEO status: visible FAQ section exists.
- Issues:
  - FAQ is visible but not represented as `FAQPage` schema.
  - Article author/publisher is organization-only; founder attribution can be added only if verified and desired.
- Recommended changes:
  - Add `FAQPage` schema matching the visible FAQ.
  - Add a concise answer block defining leakage versus baseline budget.

### Cost overrun analysis: `/pages/construction-cost-overrun-analysis.html`

- SEO status: title, meta description, canonical, OG tags, Twitter tags, and `Article` schema are present.
- GEO status: visible FAQ section exists.
- Issues:
  - No `FAQPage` schema.
  - No `og:image` or Twitter image in the current metadata count.
- Recommended changes:
  - Add `FAQPage` schema.
  - Add a relevant OG/Twitter image.
  - Preserve the evidence-safe formula language: overrun is calculated as Actual - Budget when both values are available.

### ESG and carbon audit: `/pages/construction-esg-carbon-audit.html`

- SEO status: title, meta description, canonical, OG image, Twitter image, and `Article` schema are present.
- GEO status: visible FAQ section exists.
- Issues:
  - No `FAQPage` schema.
  - The page should avoid implying automatic certification or compliance unless evidence supports it.
- Recommended changes:
  - Add `FAQPage` schema from visible FAQs.
  - Add short answers separating ESG metrics from financial leakage.

### Schedule slippage recovery: `/pages/schedule-slippage-recovery.html`

- SEO status: title, meta description, canonical, OG tags, Twitter tags, and `Article` schema are present.
- GEO status: visible FAQ section exists.
- Issues:
  - No `FAQPage` schema.
  - No `og:image` or Twitter image in the current metadata count.
- Recommended changes:
  - Add `FAQPage` schema.
  - Add a clear short answer explaining 7/30/90 recovery actions.
  - Add OG/Twitter image metadata.

### Financier due diligence: `/pages/construction-due-diligence-financiers.html`

- SEO status: title, meta description, canonical, OG tags, Twitter tags, and `Article` schema are present.
- GEO status: visible FAQ section exists.
- Issues:
  - No `FAQPage` schema.
  - No `og:image` or Twitter image in the current metadata count.
- Recommended changes:
  - Add `FAQPage` schema.
  - Add short answers for lenders, developers, and board reviewers.
  - Keep positioning as decision support, not a replacement for lender/legal diligence.

### How it works: `/pages/how-it-works.html`

- SEO status: title, meta description, canonical, OG tags, Twitter tags, and `BreadcrumbList` schema are present.
- Issues:
  - The process card headings are `h3` before the next `h2`.
  - No FAQ section or workflow schema.
  - No `og:image` or Twitter image in the current metadata count.
- Recommended changes:
  - Add an `h2` before the process cards.
  - Add short answers for input, analysis, citation, output, and honesty-check behavior.
  - Consider `HowTo` only if the page is written as a real step-by-step process; otherwise use `WebPage` plus FAQ.

### Industries: `/pages/industries.html`

- SEO status: title, meta description, canonical, OG image, Twitter image, and `BreadcrumbList` schema are present.
- Issues:
  - Heading structure skips from `h1` to `h3`.
  - Thin content risk: about 92 extracted words.
  - No FAQ section.
- Recommended changes:
  - Add an `h2` section heading for industry use cases.
  - Expand each audience block with evidence-safe buyer questions.
  - Add FAQ for Indian SMB contractors, project managers, developers, financiers, and infrastructure stakeholders.

### Knowledge hub: `/pages/knowledge.html`

- SEO status: title, meta description, canonical, OG tags, Twitter tags, and `CollectionPage` schema are present.
- Issues:
  - No FAQ section.
  - No `og:image` or Twitter image in the current metadata count.
- Recommended changes:
  - Add a "short answers" section that links to the topic pages.
  - Add OG/Twitter image metadata.
  - Keep hub copy concise and evidence-safe.

### Company: `/pages/company.html`

- SEO status: title, meta description, canonical, OG image, Twitter image, and `Organization` schema are present.
- Issues:
  - Thin content risk: about 168 extracted words outside scripts/styles.
  - Legal name spelling must be verified before schema expansion.
  - Embedded credential media depends on Google Drive availability.
- Recommended changes:
  - Expand company facts only with verified legal evidence.
  - Add `sameAs` only when official profiles are confirmed.
  - Add founder-led credibility text that does not invent client outcomes or audited capital.

### Team: `/pages/team.html`

- SEO status: title, meta description, canonical, OG tags, and Twitter tags are present.
- Issues:
  - No JSON-LD schema.
  - Thin content risk: about 82 extracted words.
  - No `og:image` or Twitter image in the current metadata count.
- Recommended changes:
  - Add conservative `Person` schema only for verified people and roles.
  - Expand profiles with verified expertise only.
  - Add OG/Twitter image metadata.

### Client/use cases: `/pages/client.html`

- SEO status: title, meta description, canonical, OG tags, and Twitter tags are present.
- Issues:
  - No JSON-LD schema.
  - Thin content risk: about 154 extracted words.
  - No `og:image` or Twitter image in the current metadata count.
  - The testimonial-styled block is evidence-safe but could be misread as a testimonial module.
- Recommended changes:
  - Use `WebPage` or `ItemList` schema for use cases.
  - Keep the current approved-only disclaimer.
  - Avoid adding logos, names, or testimonials without source approval.

### Contact: `/pages/contact.html`

- SEO status: title, meta description, canonical, OG tags, Twitter tags, and `ContactPage` schema are present.
- Issues:
  - Thin content risk: about 99 extracted words.
  - CSP `form-action 'self'` conflicts with the FormSubmit endpoint.
  - No `og:image` or Twitter image in the current metadata count.
- Recommended changes:
  - Fix CSP or form infrastructure before relying on SEO lead capture.
  - Add short answer copy about what to include in an audit discussion.
  - Add OG/Twitter image metadata if this page is shared externally.

### Privacy: `/pages/privacy.html`

- SEO status: title, meta description, canonical, OG tags, and Twitter tags are present.
- Issues:
  - No JSON-LD schema.
  - No `og:image` or Twitter image in the current metadata count.
  - No explicit noindex. This is not necessarily wrong, but privacy pages usually do not need high search priority.
- Recommended changes:
  - Add `WebPage` schema if kept indexable.
  - Consider whether privacy should remain in sitemap with low priority or be excluded from search focus.
  - Do not add data-security claims beyond documented practices.

## Recommended file changes

These are recommended future implementation changes. They were not made in this audit.

- `llms.txt`
  - Create a root-level LLM crawler summary with verified brand, legal, founder, product, audience, public pages, app URL, demo-data, and claim-safety policy.

- `index.html`
  - Replace the raw Cloud Run app link only after `app.constrovet.com` resolves and serves HTTPS.
  - Add a short-answer homepage section and FAQ.

- `pages/*.html`
  - Add page-appropriate JSON-LD schema to pages missing it.
  - Add `FAQPage` JSON-LD for existing visible FAQs.
  - Add missing OG/Twitter image metadata where appropriate.
  - Expand thin pages with structured answer blocks.
  - Fix heading hierarchy on `industries.html` and `how-it-works.html`.

- `nginx.conf`
  - Update `form-action` only after the desired production contact-form endpoint is confirmed.

- `sitemap.xml`
  - Keep the sitemap synchronized with every public HTML page.
  - Add `llms.txt` discovery separately through robots or site root conventions if desired; it is not normally included as a sitemap URL.

- `robots.txt`
  - Keep the sitemap declaration.
  - Optionally add a comment or route convention for `llms.txt` after it exists.

- Product app configuration
  - Configure `app.constrovet.com` for the product/demo app.
  - Keep demo data labelled as synthetic when public.
  - Maintain noindex/nofollow on app pages unless the product app is intentionally meant to be indexed.

## Risks

- Unverified claims: adding fake clients, fake testimonials, audited-capital numbers, accuracy percentages, or unsupported performance metrics would create brand, legal, and GEO trust risk.
- Broken app CTA: replacing the homepage app link before `app.constrovet.com` is live would break the product path.
- Contact conversion failure: CSP currently appears to block the external FormSubmit action.
- Entity mismatch: `Center` versus `Centre` must be resolved before schema and `llms.txt` use the legal name.
- Crawl completeness: JS-injected nav/footer may be missed by basic crawlers even though the sitemap mitigates page discovery.
- External media dependency: Unsplash and Google Drive assets can affect previews, render speed, and reliability.
- Over-indexing the app: the raw product app returns `noindex, nofollow`; changing that without a clear search strategy may expose non-marketing app states.

## Implementation order

1. Verify legal entity spelling and app-domain ownership.
2. Configure `app.constrovet.com`, verify DNS, HTTPS, Cloud Run routing, and desired robot policy.
3. Add `/llms.txt` with evidence-safe, founder-led, synthetic-demo-aware guidance.
4. Replace raw Cloud Run links with the branded app URL after step 2 passes.
5. Add missing JSON-LD and `FAQPage` schema using only visible page content.
6. Expand thin pages with structured short answers and buyer-specific questions.
7. Fix heading hierarchy on `industries.html` and `how-it-works.html`.
8. Add missing OG/Twitter images.
9. Fix the contact form CSP or endpoint.
10. Re-run sitemap, metadata, structured data, live HTTP, and app-domain checks before deployment.
