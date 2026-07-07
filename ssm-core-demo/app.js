(function () {
  "use strict";

  const config = window.SSM_CORE_DEMO_CONFIG || {};
  const apiBaseUrl = resolveApiBaseUrl(config.apiBaseUrl || "http://localhost:8000");
  const feedbackUrl = config.feedbackUrl || "/pages/contact.html";
  const passcodeKey = "ssmCoreDemoPasscode";
  const maxDefaultBlockedRows = 10;
  let latestBlockedRows = [];
  let showAllBlockedRows = false;

  const samples = {
    cleanInvoice: {
      transaction_type: "invoice",
      amount: "75000",
      entity_location: "Mumbai",
      tax_components: { gst_rate: 18, tds_rate: 1, sample_only: true, memo: "synthetic clean invoice" }
    },
    puneVendor: {
      transaction_type: "vendor_payment",
      amount: "250000",
      entity_location: "Pune",
      tax_components: { gst_rate: 18, tds_rate: 0, sample_only: true, memo: "synthetic vendor payment" }
    },
    mumbaiPayroll: {
      transaction_type: "payroll",
      amount: "125000",
      entity_location: "Mumbai",
      tax_components: { professional_tax: 200, sample_only: true, memo: "synthetic payroll" }
    },
    highValueInvoice: {
      transaction_type: "invoice",
      amount: "950000",
      entity_location: "Pune",
      tax_components: { gst_rate: 18, tds_rate: 1, sample_only: true, memo: "synthetic high value invoice" }
    }
  };

  const passcodePanel = document.getElementById("passcodePanel");
  const demoWorkbench = document.getElementById("demoWorkbench");
  const caPanel = document.getElementById("caPanel");
  const passcodeForm = document.getElementById("passcodeForm");
  const transactionForm = document.getElementById("transactionForm");
  const resultPanel = document.getElementById("resultPanel");
  const blockedRows = document.getElementById("blockedRows");
  const queueStatus = document.getElementById("queueStatus");
  const toggleBlockedRowsButton = document.getElementById("toggleBlockedRowsButton");
  const resetDemoQueueButton = document.getElementById("resetDemoQueueButton");
  const overrideResult = document.getElementById("overrideResult");

  document.getElementById("apiBaseLabel").textContent = apiBaseUrl;
  document.getElementById("feedbackLink").href = feedbackUrl;
  applyPasscodeFromPrivateLink();

  passcodeForm.addEventListener("submit", function (event) {
    event.preventDefault();
    const passcode = new FormData(passcodeForm).get("demoPasscode").toString().trim();
    if (!passcode) return;
    sessionStorage.setItem(passcodeKey, passcode);
    revealWorkbench();
    checkApiHealth();
    loadBlockedTransactions();
  });

  document.getElementById("clearPasscodeButton").addEventListener("click", function () {
    sessionStorage.removeItem(passcodeKey);
    passcodePanel.hidden = false;
    demoWorkbench.hidden = true;
    caPanel.hidden = true;
  });

  document.querySelectorAll("[data-scenario]").forEach(function (button) {
    button.addEventListener("click", function () {
      applyScenario(samples[button.dataset.scenario]);
    });
  });

  transactionForm.addEventListener("submit", async function (event) {
    event.preventDefault();
    const payload = readTransactionForm();
    if (!payload) return;

    setResult("Checking transaction...", "The API is evaluating current statutory rules.", "empty");
    try {
      const body = await apiFetch("/verify_transaction", {
        method: "POST",
        body: JSON.stringify(payload)
      });
      renderVerificationResult(body);
      if (body.status === "403_Block") {
        loadBlockedTransactions();
      }
    } catch (error) {
      setResult("API request failed", error.message, "block");
    }
  });

  document.getElementById("refreshBlockedButton").addEventListener("click", loadBlockedTransactions);
  toggleBlockedRowsButton.addEventListener("click", function () {
    showAllBlockedRows = !showAllBlockedRows;
    renderBlockedRows(latestBlockedRows);
  });
  resetDemoQueueButton.addEventListener("click", resetDemoQueue);

  document.getElementById("unlockForm").addEventListener("submit", async function (event) {
    event.preventDefault();
    const token = new FormData(event.currentTarget).get("unlockToken").toString().trim();
    if (!token) return;
    overrideResult.textContent = "Consuming unlock token...";
    try {
      const body = await apiFetch("/consume_unlock_token", {
        method: "POST",
        body: JSON.stringify({ token })
      });
      overrideResult.textContent = `Unlock token consumed for transaction ${body.transaction_id}.`;
      loadBlockedTransactions();
    } catch (error) {
      overrideResult.textContent = error.message;
    }
  });

  if (sessionStorage.getItem(passcodeKey)) {
    revealWorkbench();
    checkApiHealth();
    loadBlockedTransactions();
  }

  function revealWorkbench() {
    passcodePanel.hidden = true;
    demoWorkbench.hidden = false;
    caPanel.hidden = false;
  }

  async function checkApiHealth() {
    const status = document.getElementById("apiStatus");
    status.textContent = "Checking";
    try {
      const response = await fetch(`${apiBaseUrl}/health`, { cache: "no-store" });
      status.textContent = response.ok ? "Online" : `HTTP ${response.status}`;
    } catch (error) {
      status.textContent = "Offline";
    }
  }

  function applyScenario(sample) {
    transactionForm.elements.transaction_type.value = sample.transaction_type;
    transactionForm.elements.amount.value = sample.amount;
    transactionForm.elements.entity_location.value = sample.entity_location;
    transactionForm.elements.tax_components.value = JSON.stringify(sample.tax_components, null, 2);
  }

  function readTransactionForm() {
    const data = new FormData(transactionForm);
    let taxComponents;
    try {
      taxComponents = JSON.parse(data.get("tax_components").toString() || "{}");
    } catch (error) {
      setResult("Invalid tax JSON", "Fix the Tax components JSON before verifying.", "block");
      return null;
    }
    return {
      transaction_type: data.get("transaction_type").toString(),
      amount: data.get("amount").toString(),
      entity_location: data.get("entity_location").toString(),
      tax_components: taxComponents
    };
  }

  async function loadBlockedTransactions() {
    queueStatus.textContent = "Loading...";
    try {
      const body = await apiFetch("/get_blocked_transactions", { method: "GET" });
      latestBlockedRows = body.blocked_transactions || [];
      renderBlockedRows(latestBlockedRows);
    } catch (error) {
      blockedRows.innerHTML = `<tr><td colspan="5">${escapeHtml(error.message)}</td></tr>`;
      queueStatus.textContent = "Unavailable";
      toggleBlockedRowsButton.hidden = true;
    }
  }

  function renderVerificationResult(body) {
    if (body.status === "200_Approve") {
      setResult(
        "200_Approve",
        `Approval token: <span class="ssm-code">${escapeHtml(body.token || "")}</span>`,
        "approve"
      );
      return;
    }

    const rule = body.violated_rule || {};
    setResult(
      "403_Block",
      `Blocked by rule ${escapeHtml(rule.amendment_id || rule.id || "unknown")}. <span class="ssm-code">${escapeHtml(body.reason || "Rule condition matched transaction.")}</span>`,
      "block"
    );
  }

  function renderBlockedRows(rows) {
    if (!rows.length) {
      blockedRows.innerHTML = '<tr><td colspan="5">No blocked transactions found.</td></tr>';
      queueStatus.textContent = "0 blocked rows";
      toggleBlockedRowsButton.hidden = true;
      return;
    }
    const visibleRows = showAllBlockedRows ? rows : rows.slice(0, maxDefaultBlockedRows);
    const hiddenCount = Math.max(rows.length - visibleRows.length, 0);
    queueStatus.textContent = hiddenCount ? `${visibleRows.length} of ${rows.length} blocked rows` : `${rows.length} blocked rows`;
    toggleBlockedRowsButton.hidden = rows.length <= maxDefaultBlockedRows;
    toggleBlockedRowsButton.textContent = showAllBlockedRows ? "Show latest 10" : "Show all";

    blockedRows.innerHTML = visibleRows.map(function (row) {
      const payload = row.transaction_payload || {};
      const rule = row.violated_rule || {};
      const source = row.raw_pdf_source || {};
      const sourceLink = source.url ? `<a href="${escapeAttribute(source.url)}" target="_blank" rel="noopener">Source PDF</a>` : "No source URL";
      return `
        <tr>
          <td>
            <strong>${escapeHtml(payload.transaction_type || "transaction")}</strong><br>
            ${escapeHtml(payload.entity_location || "")} | INR ${escapeHtml(String(payload.amount || ""))}
          </td>
          <td><span class="ssm-status-pill">${escapeHtml(row.status || "blocked")}</span></td>
          <td>${escapeHtml(rule.amendment_id || rule.id || "unknown")}<br><span class="ssm-code">${escapeHtml(rule.condition_logic || "")}</span></td>
          <td>${sourceLink}<br>${escapeHtml(source.title || source.source || "")}</td>
          <td>
            <button type="button" class="ssm-button ssm-button--ghost" data-override-id="${escapeAttribute(row.transaction_id)}">Approve by CA</button>
          </td>
        </tr>
      `;
    }).join("");

    blockedRows.querySelectorAll("[data-override-id]").forEach(function (button) {
      button.addEventListener("click", function () {
        approveByCa(button.dataset.overrideId);
      });
    });
  }

  async function resetDemoQueue() {
    const operatorPasscode = window.prompt("Enter operator passcode to clear demo blocked rows.");
    if (!operatorPasscode) return;
    if (!window.confirm("Clear all DEMO blocked transaction rows for the next client test session?")) return;

    overrideResult.textContent = "Resetting demo queue...";
    try {
      const body = await apiFetch("/reset_demo_queue", {
        method: "POST",
        body: JSON.stringify({}),
        headers: { "X-SSM-Operator-Passcode": operatorPasscode }
      });
      showAllBlockedRows = false;
      overrideResult.textContent = `Demo queue reset. Deleted ${body.deleted || 0} rows.`;
      loadBlockedTransactions();
    } catch (error) {
      overrideResult.textContent = error.message;
    }
  }

  async function approveByCa(transactionId) {
    const signature = `demo-ca-signature-${Date.now()}-${transactionId}`.slice(0, 96);
    overrideResult.textContent = "Creating CA override...";
    try {
      const body = await apiFetch("/ca_override", {
        method: "POST",
        body: JSON.stringify({
          transaction_id: transactionId,
          ca_signature_hash: signature
        })
      });
      overrideResult.innerHTML = `Override approved. Unlock token: <span class="ssm-code">${escapeHtml(body.unlock_token || "")}</span>`;
      document.getElementById("unlockToken").value = body.unlock_token || "";
      loadBlockedTransactions();
    } catch (error) {
      overrideResult.textContent = error.message;
    }
  }

  async function apiFetch(path, options) {
    const passcode = sessionStorage.getItem(passcodeKey);
    const response = await fetch(`${apiBaseUrl}${path}`, {
      ...options,
      headers: {
        "Content-Type": "application/json",
        "X-SSM-Demo-Passcode": passcode,
        ...(options.headers || {})
      }
    });
    const text = await response.text();
    const body = text ? JSON.parse(text) : {};
    if (!response.ok) {
      throw new Error(body.detail || `API returned HTTP ${response.status}`);
    }
    return body;
  }

  function setResult(title, html, mode) {
    resultPanel.className = `ssm-result ssm-result--${mode}`;
    resultPanel.innerHTML = `<strong>${escapeHtml(title)}</strong><p>${html}</p>`;
  }

  function stripTrailingSlash(value) {
    return value.replace(/\/+$/, "");
  }

  function resolveApiBaseUrl(fallback) {
    const params = new URLSearchParams(window.location.search);
    const fromQuery = params.get("api");
    if (fromQuery && /^https:\/\/[-a-zA-Z0-9.]+trycloudflare\.com$/.test(fromQuery)) {
      sessionStorage.setItem("ssmCoreDemoApiBaseUrl", fromQuery);
      return stripTrailingSlash(fromQuery);
    }
    return stripTrailingSlash(sessionStorage.getItem("ssmCoreDemoApiBaseUrl") || fallback);
  }

  function applyPasscodeFromPrivateLink() {
    const hash = new URLSearchParams(window.location.hash.replace(/^#/, ""));
    const passcode = hash.get("passcode");
    if (!passcode) return;
    sessionStorage.setItem(passcodeKey, passcode);
    passcodeForm.elements.demoPasscode.value = passcode;
    const cleanUrl = `${window.location.pathname}${window.location.search}`;
    window.history.replaceState(null, document.title, cleanUrl);
  }

  function escapeHtml(value) {
    return String(value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  function escapeAttribute(value) {
    return escapeHtml(value).replace(/`/g, "&#096;");
  }
})();
