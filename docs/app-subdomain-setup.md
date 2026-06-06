# Constrovet App Subdomain Setup

Date: 2026-06-06

## Goal

Serve the Constrovet product/demo app from:

`https://app.constrovet.com`

Previous temporary Cloud Run service URL:

`https://prod-constrovet4mobile-759832881234.asia-south1.run.app`

The public marketing site should use the branded app URL in visible CTAs. The raw Cloud Run URL is no longer the public app path and may return `421` because the app rejects unexpected hosts.

## Marketing Site Config

The static website centralizes app CTA behavior in:

`assets/js/main.js`

Current constant:

```js
const APP_URL = "https://app.constrovet.com";
```

Use `APP_URL` for the active destination. Do not restore the raw Cloud Run URL in public CTAs unless the branded app domain is unavailable and a rollback is explicitly approved.

## Cloud Run Mapping Status

`https://app.constrovet.com` is the expected public app URL. Use these steps only if the mapping is broken or must be recreated.

1. Open Google Cloud Console for the project that hosts the Constrovet product/demo app.
2. Go to Cloud Run and select the service currently served by the temporary Cloud Run URL.
3. Open custom domain mapping for the service.
4. Add the custom domain:

   `app.constrovet.com`

5. Confirm the target service and region match the existing app deployment.
6. Do not alter deployment secrets, service environment variables, IAM bindings, or backend app behavior while adding the domain mapping.

## DNS Record

1. Open the DNS provider or domain registrar for `constrovet.com`.
2. Add the DNS record requested by Cloud Run for `app.constrovet.com`.
3. Use the exact record type and value shown by Cloud Run. Depending on Google Cloud guidance, this may be a CNAME or Google-managed DNS target.
4. Save the record and wait for DNS propagation.

## HTTPS Certificate

1. In Cloud Run domain mapping, verify that certificate provisioning starts after DNS is visible.
2. Wait until the managed HTTPS certificate status is active.
3. Test:

   ```bash
   curl -I https://app.constrovet.com
   ```

4. Confirm the response uses HTTPS without certificate warnings.

## Redirects and Canonical Behavior

After the custom domain is active:

1. Test `https://app.constrovet.com` in a browser.
2. Confirm the product/demo app loads normally.
3. Confirm any HTTP request redirects to HTTPS.
4. Confirm the app keeps its intended robot policy. If the app should not be indexed, preserve `noindex` behavior in the app deployment.
5. Confirm public marketing CTAs labelled "Open Live Dashboard" route to the branded domain.
6. Keep marketing-site canonicals on `https://www.constrovet.com/...`; do not set marketing page canonicals to the app subdomain.

## Operational Checks

- Keep `APP_URL` as `https://app.constrovet.com`.
- Keep public dashboard CTA hrefs on `https://app.constrovet.com`.
- Run health checks against `https://app.constrovet.com/api/health`.
- Treat `421` from the raw Cloud Run hostname as expected host-hardening behavior unless an explicit monitoring exception is approved.
