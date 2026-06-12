#!/usr/bin/env bash
set -euo pipefail

LIVE_URL="${LIVE_URL:-https://www.constrovet.com}"
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

for path in "/" "/demo" "/app/" "/llms.txt" "/sitemap.xml" "/robots.txt"; do
  status="$(status_for "${LIVE_URL}${path}")"
  [[ "$status" == "200" ]] || fail "${LIVE_URL}${path} returned HTTP ${status}"
done

company_html="$(curl -sS -L "${LIVE_URL}/pages/company.html")"
grep -Fq "$EXPECTED_LABEL" <<<"$company_html" || fail "${LIVE_URL}/pages/company.html does not contain '$EXPECTED_LABEL'"

if curl -sS -L "${LIVE_URL}" "${LIVE_URL}/demo" "${LIVE_URL}/app/" | grep -E "app\\.constrovet\\.com|prod-constrovet|run\\.app" >/dev/null; then
  fail "Public entry pages still include legacy app.constrovet.com or raw Cloud Run links"
fi

echo "OK: GitHub Pages production routes verified"
echo "site: ${LIVE_URL}"
echo "routes: / /demo /app/ /llms.txt /sitemap.xml /robots.txt"
