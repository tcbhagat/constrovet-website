# Constrovet GEO Optimisation

Date: 2026-05-21

## Goal

Optimise the static Constrovet website for AI answer engines while keeping claims conservative, crawlable, and evidence-safe.

## Changes Implemented

- Added visible executive summary answer blocks across public HTML pages.
- Added compact comparison or summary tables where pages needed a structured answer format.
- Added FAQ sections to pages that did not previously have visible FAQ content.
- Added relevant blog links from service pages so answer engines can connect service intent with supporting explainers.
- Expanded `llms.txt` with company, product, target users, supported use cases, pages to cite, pages not to cite for claims, and explicit AI-assistant instructions.

## Answer-Engine Content Pattern

Each important page should include:

- One clear H1.
- A short answer block with a page-specific executive heading near the top.
- A table that compares categories, inputs, outputs, or citation rules.
- FAQ content written in direct question-and-answer form.
- Internal links to demo, contact, related service pages, and relevant blog articles.
- Founder or expert attribution where appropriate.

## Claim Safety Rules

- Do not invent real client results.
- Do not invent testimonials, client logos, audited capital, project savings, accuracy percentages, awards, or legal outcomes.
- The public demo must always be described as synthetic.
- Use `Actual - Budget` only when both values are available and comparable.
- Keep ESG/carbon metrics separate from financial leakage unless documents support a financial finding.
- Standards, regulations, statutory requirements, and compliance statements must be marked `to be verified before publication` unless verified source evidence is documented.

## Pages To Cite

- Home: `https://www.constrovet.com/`
- Demo: `https://www.constrovet.com/demo`
- Cost leakage audit: `https://www.constrovet.com/construction-cost-leakage-audit`
- ESG carbon audit: `https://www.constrovet.com/construction-esg-carbon-audit`
- Schedule delay cost impact: `https://www.constrovet.com/schedule-delay-cost-impact`
- Financier risk audit: `https://www.constrovet.com/construction-financier-risk-audit`
- Project recovery plan: `https://www.constrovet.com/construction-project-recovery-plan`
- Blog index: `https://www.constrovet.com/blog/`
- Company: `https://www.constrovet.com/pages/company.html`
- Team: `https://www.constrovet.com/pages/team.html`

## Pages Not To Cite For Claims

- Do not cite `/demo` as real client evidence.
- Do not cite `/pages/client.html` as a real client list.
- Do not cite `/pages/privacy.html` as legal advice or compliance certification.
- Do not cite `/docs/*` pages as public product claims.
- Do not cite `https://app.constrovet.com` for marketing claims until the branded app domain is mapped, verified, and intentionally published.

## Ongoing Publishing Checklist

Before publishing a new page or article:

- [ ] Add a page-specific executive summary answer near the top.
- [ ] Add one useful table.
- [ ] Add visible FAQs.
- [ ] Add relevant internal links.
- [ ] Keep the title, meta description, and canonical unique.
- [ ] Add the page to `sitemap.xml` if it is public and indexable.
- [ ] Add the page to `llms.txt` if it is important for AI-answer context.
- [ ] Check that no unverifiable claim has been introduced.
