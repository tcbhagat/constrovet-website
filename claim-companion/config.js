window.CLAIM_COMPANION_CONFIG = Object.freeze({
  apiUrl: "",
  publicBaseUrl: "https://www.constrovet.com/claim-companion/",
  maxFileBytes: 8 * 1024 * 1024,
  maxTotalBytes: 20 * 1024 * 1024,
  demoMode: new URLSearchParams(window.location.search).get("demo") === "1"
});
