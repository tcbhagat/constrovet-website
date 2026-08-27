function config() { return window.CLAIM_COMPANION_CONFIG || {}; }

async function post(payload) {
  const current = config();
  if (current.demoMode) {
    await new Promise((resolve) => setTimeout(resolve, 450));
    return { ok: true, demo: true, reference: `CC-DEMO-${Date.now().toString().slice(-8)}` };
  }
  if (!current.apiUrl) throw new Error("The secure service is not configured yet.");
  const request = fetch(current.apiUrl, {
    method: "POST",
    mode: "no-cors",
    headers: { "Content-Type": "text/plain;charset=UTF-8" },
    body: JSON.stringify(payload)
  });
  let timeoutId;
  const timeout = new Promise((resolve) => { timeoutId = setTimeout(() => resolve("pending"), 45000); });
  const outcome = await Promise.race([request.then(() => "accepted"), timeout]);
  clearTimeout(timeoutId);
  return { ok: true, accepted: true, processing: outcome === "pending" };
}

export async function requestMagicLink({ name, email }) {
  return post({ action: "REQUEST_MAGIC_LINK", name, email, consentAt: new Date().toISOString() });
}

function statusKey() {
  return Array.from(crypto.getRandomValues(new Uint8Array(16)), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

function readSubmissionStatus(reference, key) {
  const current = config();
  return new Promise((resolve, reject) => {
    const callback = `ccStatus${crypto.getRandomValues(new Uint32Array(1))[0].toString(16)}`;
    const script = document.createElement("script");
    const cleanup = () => { delete window[callback]; script.remove(); };
    const timer = setTimeout(() => { cleanup(); reject(new Error("Status check timed out.")); }, 10000);
    window[callback] = (result) => { clearTimeout(timer); cleanup(); resolve(result); };
    script.onerror = () => { clearTimeout(timer); cleanup(); reject(new Error("Status service is temporarily unavailable.")); };
    const query = new URLSearchParams({ action: "submission-status", reference, statusKey: key, callback });
    script.src = `${current.apiUrl}?${query}`;
    document.head.appendChild(script);
  });
}

async function waitForSubmission(reference, key) {
  const deadline = Date.now() + 45000;
  let last = { status: "NOT_FOUND" };
  while (Date.now() < deadline) {
    try {
      last = await readSubmissionStatus(reference, key);
      if (last.status === "COMPLETED") return { ok: true, reference };
      if (last.status === "FAILED") throw new Error(last.message || "The report could not be generated.");
    } catch (error) {
      if (!/Status (?:check|service)/.test(error.message)) throw error;
    }
    await new Promise((resolve) => setTimeout(resolve, 1500));
  }
  const pending = last.status === "PROCESSING";
  const error = new Error(pending
    ? `Report ${reference} is still processing. Do not submit it again; check your email shortly.`
    : "The request was not accepted. Check your connection and try again.");
  error.pending = pending;
  throw error;
}

export async function submitCostLock(payload) {
  if (config().demoMode) return post({ action: "SUBMIT_COST_LOCK", ...payload });
  const key = payload.statusKey || statusKey();
  const request = post({ action: "SUBMIT_COST_LOCK", ...payload, statusKey: key });
  request.catch(() => {});
  return waitForSubmission(payload.reference, key);
}
