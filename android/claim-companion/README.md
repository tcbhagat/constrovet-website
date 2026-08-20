# Claim Companion Android app

The Android package is a Trusted Web Activity for the installable Claim Companion PWA.

- Package: `com.constrovet.claimcompanion`
- Minimum Android: API 23
- Compile and target API: 36
- Android Browser Helper: 2.7.3
- Production URL: `https://www.constrovet.com/claim-companion/`

## Before Play testing

1. Create an Organization Play Console account for AInnoverse Tech Centre LLP.
2. Create the app and enable Play App Signing.
3. Replace the fingerprint placeholder in `assetlinks.template.json` with the Play signing SHA-256 certificate fingerprint.
4. Publish the completed file as `/.well-known/assetlinks.json` on `www.constrovet.com`.
5. Verify the relationship with Google's Digital Asset Links tool.
6. Build a signed AAB through the release workflow and upload it to Internal testing first.

Until Digital Asset Links is deployed, Android Browser Helper safely falls back to a browser Custom Tab rather than a verified full-screen TWA.
