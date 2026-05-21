# Search Console and Bing Webmaster Setup

Date: 2026-05-21

## Scope

Prepare and verify Constrovet search visibility for:

- `https://www.constrovet.com`
- `https://constrovet.com`
- `https://www.constrovet.com/sitemap.xml`
- `https://www.constrovet.com/robots.txt`
- `https://app.constrovet.com` once mapped

Do not invent verification codes. Use only verification records or meta tags issued inside Google Search Console or Bing Webmaster Tools.

## Verification Placeholder

The root homepage `index.html` contains a safe commented placeholder in the `<head>` for future HTML meta verification tags.

Preferred method for Constrovet is DNS TXT verification for the `constrovet.com` domain property. Use HTML meta verification only if DNS verification is not available.

## Google Search Console

1. Open Google Search Console.
2. Add a new property.
3. Choose a Domain property for `constrovet.com` when possible. This covers protocol and subdomain variations such as `https://www.constrovet.com`, `https://constrovet.com`, and future subdomains.
4. Copy the DNS TXT verification record issued by Search Console.
5. Add that TXT record at the active DNS provider for `constrovet.com`.
6. Wait for DNS propagation, then click Verify in Search Console.
7. After verification, open Sitemaps.
8. Submit:

   `https://www.constrovet.com/sitemap.xml`

9. Use URL Inspection for key URLs:

   - `https://www.constrovet.com/`
   - `https://www.constrovet.com/demo`
   - `https://www.constrovet.com/construction-cost-leakage-audit`
   - `https://www.constrovet.com/blog/`

10. For newly deployed or changed pages, use Request indexing after URL Inspection if the page is reachable and indexable.
11. Check Page indexing / coverage after Google has processed the sitemap.
12. Track queries and page performance in the Performance report after data begins appearing.

Notes:

- Request indexing does not guarantee immediate inclusion in search results.
- For many URLs, sitemap submission is the main discovery mechanism.
- Keep canonical URLs aligned with the `www.constrovet.com` public site unless a deliberate redirect/canonical policy changes.

## Bing Webmaster Tools

1. Open Bing Webmaster Tools.
2. Add `constrovet.com`.
3. Either import the verified Google Search Console property or verify ownership directly.
4. If verifying directly, use a DNS TXT record where possible. Use the HTML meta tag method only with the exact issued Bing verification value.
5. Submit:

   `https://www.constrovet.com/sitemap.xml`

6. Use Bing URL Inspection for key URLs:

   - `https://www.constrovet.com/`
   - `https://www.constrovet.com/demo`
   - `https://www.constrovet.com/construction-cost-leakage-audit`
   - `https://www.constrovet.com/blog/`

7. Check crawl, indexing, SEO, and markup feedback for inspected URLs.
8. Track discovered queries and page performance once Bing begins collecting data.

## Launch Checklist

### `https://www.constrovet.com`

- [ ] Returns HTTP 200 over HTTPS.
- [ ] Homepage canonical points to `https://www.constrovet.com/`.
- [ ] No placeholder verification meta tags are active.
- [ ] Google Search Console domain property verified.
- [ ] Bing Webmaster Tools ownership verified.
- [ ] Homepage inspected in Google URL Inspection.
- [ ] Homepage inspected in Bing URL Inspection.
- [ ] Request indexing submitted after deployment if needed.

### `https://constrovet.com`

- [ ] Redirects to `https://www.constrovet.com/`, or serves equivalent content with canonical pointing to `https://www.constrovet.com/`.
- [ ] No duplicate canonical conflict with the `www` site.
- [ ] Covered by the `constrovet.com` domain property.
- [ ] Tested after any DNS or hosting change.

### `sitemap.xml`

- [ ] Accessible at `https://www.constrovet.com/sitemap.xml`.
- [ ] Referenced in `robots.txt`.
- [ ] Submitted in Google Search Console.
- [ ] Submitted in Bing Webmaster Tools.
- [ ] Contains only public canonical URLs intended for indexing.
- [ ] Updated after publishing new blog or service pages.

### `robots.txt`

- [ ] Accessible at `https://www.constrovet.com/robots.txt`.
- [ ] Allows normal crawlers.
- [ ] Points to `https://www.constrovet.com/sitemap.xml`.
- [ ] Does not block the public pages submitted in the sitemap.

### `https://app.constrovet.com`

- [ ] DNS mapped to the Cloud Run product/demo service.
- [ ] HTTPS certificate provisioned.
- [ ] App loads without certificate warnings.
- [ ] Desired app robot policy confirmed. If the app should remain non-indexed, keep the app-level `noindex` behavior and do not add app URLs to the marketing sitemap.
- [ ] Public marketing CTAs use the branded app URL through the configured `APP_URL`.
- [ ] If monitoring is required, inspect `https://app.constrovet.com` separately after mapping.

## Reference Docs

- Google Search Console site ownership verification: https://support.google.com/webmasters/answer/9008080
- Google Search Console top tasks, sitemaps, coverage, and URL Inspection: https://support.google.com/webmasters/answer/10351509
- Google Search Central recrawl guidance: https://developers.google.com/search/docs/crawling-indexing/ask-google-to-recrawl
- Bing Webmaster Tools URL Inspection overview: https://blogs.bing.com/webmaster/september-2020/Introducing-the-Bing-Webmaster-Tools-URL-Inspection-Tool
