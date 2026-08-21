window.CLAIM_COMPANION_CONFIG = Object.freeze({
  apiUrl: "https://script.google.com/macros/s/AKfycbwuNozIoVaXR2vj6bzCm59cb2qQe9QOmUuWRCxlmYlo2eFibOM5vXgRqgdoUsva39cJ/exec",
  publicBaseUrl: "https://www.constrovet.com/claim-companion/",
  maxFileBytes: 8 * 1024 * 1024,
  maxTotalBytes: 20 * 1024 * 1024,
  demoMode: new URLSearchParams(window.location.search).get("demo") === "1"
});
