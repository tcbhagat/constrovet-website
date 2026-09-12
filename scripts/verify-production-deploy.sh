#!/usr/bin/env bash
set -euo pipefail

LIVE_URL="${LIVE_URL:-https://www.constrovet.com}"
LIVE_URL="${LIVE_URL%/}"
EXPECTED_LABEL="Founder: Prof. Taran C. Bhagat"

if repo_root="$(git rev-parse --show-toplevel 2>/dev/null)"; then
  cd "$repo_root"
fi

fail() {
  echo "FAIL: $*" >&2
  exit 1
}

status_for() {
  curl -sS -L -o /dev/null -w "%{http_code}" "$1"
}

sitemap_xml="$(curl -sS -L "${LIVE_URL}/sitemap.xml")"
mapfile -t sitemap_urls < <(grep -oE '<loc>[^<]+</loc>' <<<"$sitemap_xml" | sed -E 's#</?loc>##g')
(( ${#sitemap_urls[@]} > 0 )) || fail "${LIVE_URL}/sitemap.xml contains no URLs"

for published_url in "${sitemap_urls[@]}"; do
  [[ "$published_url" == https://www.constrovet.com/* ]] || fail "Unexpected sitemap origin: ${published_url}"
  path="${published_url#https://www.constrovet.com}"
  status="$(status_for "${LIVE_URL}${path}")"
  [[ "$status" == "200" ]] || fail "${LIVE_URL}${path} returned HTTP ${status}"
done

for path in "/llms.txt" "/robots.txt" "/assets/nav.html"; do
  status="$(status_for "${LIVE_URL}${path}")"
  [[ "$status" == "200" ]] || fail "${LIVE_URL}${path} returned HTTP ${status}"
done

home_html="$(curl -sS -L "${LIVE_URL}/")"
nav_html="$(curl -sS -L "${LIVE_URL}/assets/nav.html")"
public_discovery="${home_html}${nav_html}${sitemap_xml}"

if grep -Eqi "claim-companion|Claim Companion|Hospital Cost Estimate|ChallanSe|ssm-core-demo|CA Beta|CA statutory cockpit" <<<"$public_discovery"; then
  fail "Public construction discovery still links an unbundled product"
fi

company_html="$(curl -sS -L "${LIVE_URL}/pages/company.html")"
grep -Fq "$EXPECTED_LABEL" <<<"$company_html" || fail "${LIVE_URL}/pages/company.html does not contain '$EXPECTED_LABEL'"

if curl -sS -L "${LIVE_URL}" "${LIVE_URL}/demo" "${LIVE_URL}/app/" "${LIVE_URL}/boardroom/" | grep -E "app\\.constrovet\\.com|prod-constrovet|run\\.app" >/dev/null; then
  fail "Public entry pages still include legacy app.constrovet.com or raw Cloud Run links"
fi

echo "OK: GitHub Pages production routes verified"
echo "site: ${LIVE_URL}"
echo "routes: ${#sitemap_urls[@]} sitemap URLs plus /llms.txt /robots.txt /assets/nav.html"
