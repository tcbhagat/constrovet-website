function config() { return window.CLAIM_COMPANION_CONFIG || {}; }

async function post(payload) {
  const current = config();
  if (current.demoMode) {
    await new Promise((resolve) => setTimeout(resolve, 450));
    return { ok: true, demo: true, reference: `CC-DEMO-${Date.now().toString().slice(-8)}` };
  }
  if (!current.apiUrl) throw new Error("The secure service is not configured yet.");
  await fetch(current.apiUrl, {
    method: "POST",
    mode: "no-cors",
    headers: { "Content-Type": "text/plain;charset=UTF-8" },
    body: JSON.stringify(payload)
  });
  return { ok: true, accepted: true };
}

export async function requestMagicLink({ name, email }) {
  return post({ action: "REQUEST_MAGIC_LINK", name, email, consentAt: new Date().toISOString() });
}

export async function submitCostLock(payload) {
  return post({ action: "SUBMIT_COST_LOCK", ...payload });
}
