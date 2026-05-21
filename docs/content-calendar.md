# Constrovet Content Calendar

Date: 2026-05-21

## Publishing Rules

- Publish one evidence-safe article per week.
- Each article should include title, meta description, canonical URL, H1, short answer, practical checklist, example table, FAQ, internal links, and founder/expert attribution.
- Do not add legal advice, client names, testimonials, audited-capital claims, accuracy percentages, or unverifiable performance claims.
- Cite standards or regulations only after verification. If verification is pending, write: "to be verified before publication."
- Keep public examples synthetic unless real project data is authorized and clearly approved for publication.

## 12 Weekly Topics

| Week | Working title | Primary theme | Verification note |
|---|---|---|---|
| 1 | Documents Needed for a Construction Cost Leakage Audit | Cost leakage evidence pack | Published initial article |
| 2 | BOQ vs Actual Cost Overrun: How to Read the Difference | Budget versus actual cost | Published initial article |
| 3 | Construction Carbon Audit in India: Records to Prepare | ESG and carbon records | Published initial article |
| 4 | How to Separate Baseline Budget from Cost Leakage | Cost classification | No external standard needed |
| 5 | Delayed Purchase Orders and Construction Schedule Cost Impact | Procurement delay | Use only project-record logic |
| 6 | What Counts as Evidence in a Construction Overrun Review | Audit evidence quality | No legal advice |
| 7 | 7-Day Recovery Actions After a Cost Leakage Finding | Executive recovery | Keep actions evidence-backed |
| 8 | 30-Day Construction Cost Control Cleanup Checklist | Cost governance | No unverifiable savings claims |
| 9 | 90-Day Controls for Project Cost Leakage Prevention | Process controls | Avoid accuracy claims |
| 10 | ESG Records Contractors Should Keep During Construction | ESG documentation | Standards/regulations to be verified before publication |
| 11 | Financier Construction Project Risk Audit: Document Checklist | Financier due diligence | Avoid lender/legal advice |
| 12 | How to Read a Synthetic Constrovet Executive Demo Report | Product education | Clearly label synthetic data |

## Lightweight Publishing Workflow

1. Create a new static HTML article in `blog/` using the existing article structure.
2. Use an extensionless canonical URL such as `https://www.constrovet.com/blog/article-slug`.
3. Add the article to `blog/index.html`.
4. Add the URL to `sitemap.xml`.
5. Add the article to `llms.txt` if it is important for AI answer-engine context.
6. Run local validation for HTML structure, JSON-LD, sitemap XML, and internal links before deployment.
