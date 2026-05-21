# Final SEO/GEO Validation

Date: 2026-05-21

## Summary

Final pre-deployment SEO/GEO validation passed for the current static Constrovet website working tree.

One deployment-facing issue was found and fixed during validation: the blog index is directory-backed, so nginx serves it at `/blog/`. The canonical URL, sitemap entry, navigation links, breadcrumbs, `llms.txt`, and setup docs were normalized to `https://www.constrovet.com/blog/`.

## Pass/Fail Table

| Check | Result | Evidence |
|---|---:|---|
| Local build | PASS | `docker build -t constrovet-seo-validation .` completed successfully. |
| Static validation command | PASS | Custom static validator completed with `STATIC_VALIDATION_PASS`. |
| Nginx/container smoke test | PASS | Docker-served routes returned HTTP 200 for `/`, `/demo`, `/blog/`, service pages, `sitemap.xml`, `robots.txt`, and `llms.txt`. |
| Broken internal links | PASS | Internal link resolver found no broken local links across public HTML and shared nav/footer. |
| Sitemap URLs | PASS | `sitemap.xml` parsed successfully with 25 canonical URLs matching 25 public HTML pages. |
| `robots.txt` sitemap path | PASS | `robots.txt` contains `Sitemap: https://www.constrovet.com/sitemap.xml` and does not block all crawlers. |
| Canonical URLs | PASS | Every public HTML page has one canonical URL using `https://www.constrovet.com`. Canonicals map to local pages. |
| Title uniqueness | PASS | No duplicate page titles found across public HTML pages. |
| Meta description uniqueness | PASS | No duplicate meta descriptions found across public HTML pages. |
| Image alt text | PASS | No missing non-empty `alt` attributes found on public/shared HTML images. |
| JSON-LD parse | PASS | JSON-LD blocks parsed successfully on public pages. |
| GEO direct answer blocks | PASS | Every public HTML page includes an `In one paragraph:` answer block. |
| GEO tables | PASS | Every public HTML page includes at least one comparison or summary table. |
| FAQ content | PASS | Every public HTML page includes visible FAQ content or FAQ-oriented structured content. |
| Fake team names | PASS | No invented team names detected by validation. Public team references are limited to names already present on the site. |
| Fake client testimonials | PASS | No fake testimonials detected. Existing testimonial-related wording is used only to prohibit unapproved client/testimonial claims. |
| Fake audited capital | PASS | No audited-capital claim detected. Existing mentions are negative safety statements. |
| Fake accuracy numbers | PASS | No accuracy percentage or performance-number claim detected. |
| Raw Cloud Run URL | PASS | Raw Cloud Run URL appears only in `assets/js/main.js` fallback config and setup/audit docs, not as a public CTA href. |

## Validation Commands Run

```bash
git diff --check
docker build -t constrovet-seo-validation .
```

A custom Python static validator checked:

- Public HTML count and sitemap URL count.
- Internal links.
- Sitemap URL to local-page mapping.
- `robots.txt` sitemap declaration.
- Canonical URL presence and mapping.
- Title and meta description uniqueness.
- Image alt text and iframe titles.
- JSON-LD parseability.
- GEO direct-answer/table/FAQ presence.
- Claim-risk patterns for testimonials, audited capital, and accuracy numbers.
- Raw Cloud Run URL placement.

Container smoke test:

```bash
docker run --rm -d -p 8096:8080 constrovet-seo-validation
curl http://127.0.0.1:8096/
curl http://127.0.0.1:8096/demo
curl http://127.0.0.1:8096/blog/
curl http://127.0.0.1:8096/sitemap.xml
curl http://127.0.0.1:8096/robots.txt
curl http://127.0.0.1:8096/llms.txt
```

## Files Changed During Validation

- `assets/nav.html`
- `assets/footer.html`
- `sitemap.xml`
- `blog/index.html`
- `blog/documents-needed-for-construction-cost-leakage-audit.html`
- `blog/boq-vs-actual-cost-overrun.html`
- `blog/construction-carbon-audit-india.html`
- `llms.txt`
- `docs/geo-optimisation.md`
- `docs/search-console-setup.md`
- `docs/final-seo-geo-validation.md`

## Deployment Command

Primary deployment path is the existing Cloud Build trigger on push to `main`.

```bash
git push origin main
```

Manual fallback only if Cloud Build is unavailable:

```bash
gcloud config set project gen-lang-client-0006884360

gcloud run deploy constrovet-site \
  --source . \
  --platform managed \
  --region asia-southeast1 \
  --allow-unauthenticated \
  --port 8080
```

## Manual Post-Deployment Steps

1. Run production verification:

   ```bash
   bash scripts/verify-production-deploy.sh
   ```

2. Open and inspect:

   - `https://www.constrovet.com/`
   - `https://www.constrovet.com/demo`
   - `https://www.constrovet.com/blog/`
   - `https://www.constrovet.com/sitemap.xml`
   - `https://www.constrovet.com/robots.txt`
   - `https://www.constrovet.com/llms.txt`

3. Submit or refresh `https://www.constrovet.com/sitemap.xml` in Google Search Console and Bing Webmaster Tools.

4. Use URL Inspection / Request Indexing for:

   - Home
   - Demo
   - Blog index
   - Five root service pages
   - Three initial blog articles

5. Verify `https://constrovet.com` redirects or canonicalizes cleanly to the `www` site.

6. After `https://app.constrovet.com` is mapped, verify HTTPS, desired robot policy, and branded app CTA behavior.

7. Run Rich Results Test on the homepage, demo page, root service pages, and blog articles after deployment.
