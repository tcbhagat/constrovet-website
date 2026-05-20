#!/usr/bin/env bash
set -euo pipefail

PROJECT_ID="gen-lang-client-0006884360"
REGION="asia-southeast1"
SERVICE_NAME="constrovet-site"
TRIGGER_ID="89b8aca5-e812-4e7d-9392-552100669b0f"
LIVE_URL="https://www.constrovet.com"
COMPANY_URL="${LIVE_URL}/pages/company.html"
EXPECTED_LABEL="Founder: Prof. Taran C. Bhagat"

if repo_root="$(git rev-parse --show-toplevel 2>/dev/null)"; then
  cd "$repo_root"
fi

expected_commit="${1:-$(git rev-parse HEAD)}"
latest_build_id="$(gcloud builds list \
  --project="$PROJECT_ID" \
  --filter="trigger_id=$TRIGGER_ID" \
  --limit=1 \
  --format='value(id)')"

if [[ -z "$latest_build_id" ]]; then
  echo "No Cloud Build runs found for trigger $TRIGGER_ID" >&2
  exit 1
fi

build_status="$(gcloud builds describe "$latest_build_id" \
  --project="$PROJECT_ID" \
  --format='value(status)')"
build_commit="$(gcloud builds describe "$latest_build_id" \
  --project="$PROJECT_ID" \
  --format='value(substitutions.COMMIT_SHA)')"
service_commit="$(gcloud run services describe "$SERVICE_NAME" \
  --project="$PROJECT_ID" \
  --region="$REGION" \
  --format='value(metadata.labels.commit-sha)')"
service_image="$(gcloud run services describe "$SERVICE_NAME" \
  --project="$PROJECT_ID" \
  --region="$REGION" \
  --format='value(spec.template.spec.containers[0].image)')"
traffic_percent="$(gcloud run services describe "$SERVICE_NAME" \
  --project="$PROJECT_ID" \
  --region="$REGION" \
  --format='value(status.traffic[0].percent)')"
traffic_latest="$(gcloud run services describe "$SERVICE_NAME" \
  --project="$PROJECT_ID" \
  --region="$REGION" \
  --format='value(status.traffic[0].latestRevision)')"
site_status="$(curl -sS -o /dev/null -w '%{http_code}' "$LIVE_URL")"
company_html="$(curl -sS -L "$COMPANY_URL")"

fail() {
  echo "FAIL: $*" >&2
  exit 1
}

[[ "$build_status" == "SUCCESS" ]] || fail "latest build $latest_build_id is $build_status"
[[ "$build_commit" == "$expected_commit" ]] || fail "latest build commit $build_commit does not match $expected_commit"
[[ "$service_commit" == "$expected_commit" ]] || fail "Cloud Run commit label $service_commit does not match $expected_commit"
[[ "$service_image" == *":$expected_commit" ]] || fail "Cloud Run image is not tagged with $expected_commit"
[[ "$traffic_percent" == "100" ]] || fail "Cloud Run traffic is $traffic_percent%, expected 100%"
[[ "$traffic_latest" == "True" || "$traffic_latest" == "true" ]] || fail "Cloud Run traffic is not routed to latest revision"
[[ "$site_status" == "200" ]] || fail "$LIVE_URL returned HTTP $site_status"
grep -Fq "$EXPECTED_LABEL" <<<"$company_html" || fail "$COMPANY_URL does not contain '$EXPECTED_LABEL'"

echo "OK: production deploy verified"
echo "commit: $expected_commit"
echo "build: $latest_build_id"
echo "image: $service_image"
echo "traffic: ${traffic_percent}% latest"
echo "site: $LIVE_URL HTTP $site_status"
