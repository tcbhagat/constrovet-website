(function () {
  const root = document.querySelector("[data-cv-local-analyzer]");
  if (!root) return;

  const input = root.querySelector("#cv-analysis-files");
  const runButton = root.querySelector("[data-cv-run-analysis]");
  const clearButton = root.querySelector("[data-cv-clear-analysis]");
  const statusEl = root.querySelector("[data-cv-analysis-status]");
  const filesEl = root.querySelector("[data-cv-analysis-files]");
  const summaryEl = root.querySelector("[data-cv-analysis-summary]");
  const rationaleEl = root.querySelector("[data-cv-analysis-rationale]");
  const jsonEl = root.querySelector("[data-cv-analysis-json]");
  const rationaleButton = root.querySelector("[data-cv-toggle-rationale]");
  const downloadJson = root.querySelector("[data-cv-download-json]");
  const downloadMd = root.querySelector("[data-cv-download-md]");
  const geminiLink = root.querySelector("[data-cv-open-gemini]");

  const MAX_FILES = 10;
  const MAX_BYTES = 15 * 1024 * 1024;
  const CASH_HIGH = 5000000;
  const CASH_MEDIUM = 500000;
  const CONSTRUCTION_SIGNAL_RE = /budget|boq|actual|overrun|delay|penalty|ld|liquidated damages|eot|extension of time|variation|change order|debit note|wastage|waste|rework|idle|idle plant|idle labour|idle equipment|excess|consumption|invoice|ra bill|running account|ipc|interim payment|paid|spent|escalation|reconciliation|retention|deduction|back charge|delayed po|purchase order delay|carbon|energy|water|diesel|fuel|electricity|emission|scope|days?|₹|inr|rs\.?/i;
  const BASELINE_RE = /budget|boq|planned|estimate|contract value|contract sum|baseline|ra bill|running account|ipc|interim payment|cumulative work done|advance recovery/;
  const ACTUAL_RE = /actual|spent|cost incurred|paid|invoice|expenditure|consumption|debit note|deduction|back charge/;
  const LEAKAGE_RE = /overrun|cost variance|actual exceeds|spent more|ld|liquidated damages|penalty|wastage|rework|idle|idle plant|idle labour|idle equipment|excess|delay|delayed|slippage|late|behind schedule|purchase order delay|debit note|back charge|deduction|consumption variance|material variance|price escalation|escalation claim|reconciliation gap|unreconciled|delay cost/;
  const ESG_RE = /carbon|waste diversion|energy|water|fuel|diesel|electricity|emission|scope 1|scope 2|scope 3/;
  let latestOutput = null;
  let latestMarkdown = "";

  if (window.pdfjsLib) {
    window.pdfjsLib.GlobalWorkerOptions.workerSrc =
      "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js";
  }

  input.addEventListener("change", () => {
    latestOutput = null;
    latestMarkdown = "";
    resetResults();
    renderSelectedFiles();
    setDownloads(false);
  });

  runButton.addEventListener("click", async () => {
    const files = Array.from(input.files || []);
    const validation = validateFiles(files);
    if (validation) {
      setStatus(validation, true);
      return;
    }

    setStatus("Reading files in this browser session...");
    setDownloads(false);
    latestOutput = null;
    latestMarkdown = "";

    try {
      const documents = [];
      for (const file of files) documents.push(await readDocument(file));
      latestOutput = buildOutput(documents);
      latestMarkdown = buildMarkdown(latestOutput);
      jsonEl.textContent = JSON.stringify(latestOutput, null, 2);
      summaryEl.innerHTML = summaryHtml(latestOutput);
      rationaleEl.innerHTML = rationaleHtml(latestOutput);
      rationaleEl.hidden = true;
      rationaleButton.textContent = "Citations and Rationale";
      setStatus(`Analysis complete: ${latestOutput.findings.length} cited findings from ${documents.length} file(s).`);
      setDownloads(true);
    } catch (error) {
      setStatus(error instanceof Error ? error.message : String(error), true);
    }
  });

  clearButton.addEventListener("click", () => {
    input.value = "";
    latestOutput = null;
    latestMarkdown = "";
    filesEl.innerHTML = "";
    resetResults();
    setStatus("No files selected.");
    setDownloads(false);
  });

  function resetResults() {
    jsonEl.textContent = "{}";
    rationaleEl.innerHTML = "";
    rationaleEl.hidden = true;
    rationaleButton.textContent = "Citations and Rationale";
    summaryEl.textContent = "Select files and run analysis to generate cited findings.";
  }

  rationaleButton.addEventListener("click", () => {
    if (!latestOutput) return;
    const nextHidden = !rationaleEl.hidden;
    rationaleEl.hidden = nextHidden;
    rationaleButton.textContent = nextHidden ? "Citations and Rationale" : "Hide Citations and Rationale";
  });

  downloadJson.addEventListener("click", () => {
    if (latestOutput) download("executive_synthesis.json", JSON.stringify(latestOutput, null, 2), "application/json");
  });

  downloadMd.addEventListener("click", () => {
    if (latestMarkdown) download("executive_report.md", latestMarkdown, "text/markdown");
  });

  function validateFiles(files) {
    if (!files.length) return "Choose at least one PDF or CSV file.";
    if (files.length > MAX_FILES) return `Choose ${MAX_FILES} files or fewer.`;
    for (const file of files) {
      const name = file.name.toLowerCase();
      const allowed = name.endsWith(".pdf") || name.endsWith(".csv") || file.type === "application/pdf" || file.type === "text/csv";
      if (!allowed) return `${file.name} is not a PDF or CSV file.`;
      if (file.size > MAX_BYTES) return `${file.name} is larger than 15 MB.`;
    }
    return "";
  }

  function renderSelectedFiles() {
    const files = Array.from(input.files || []);
    if (!files.length) {
      filesEl.innerHTML = "";
      setStatus("No files selected.");
      return;
    }
    filesEl.innerHTML = files
      .map((file) => `<li><strong>${escapeHtml(file.name)}</strong><span>${formatBytes(file.size)}</span></li>`)
      .join("");
    setStatus(`${files.length} file(s) ready for browser analysis.`);
  }

  async function readDocument(file) {
    const lower = file.name.toLowerCase();
    if (lower.endsWith(".csv") || file.type === "text/csv") {
      return { file: file.name, type: "csv", pages: parseCsvPages(await file.text()) };
    }
    if (!window.pdfjsLib) throw new Error("PDF parser did not load. Check the browser connection and retry, or use CSV files.");
    const pdf = await window.pdfjsLib.getDocument({ data: await file.arrayBuffer() }).promise;
    const pages = [];
    for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber += 1) {
      const page = await pdf.getPage(pageNumber);
      const content = await page.getTextContent();
      const text = content.items.map((item) => item.str || "").join(" ").replace(/\s+/g, " ").trim();
      pages.push({ label: `Page ${pageNumber}`, text });
    }
    return { file: file.name, type: "pdf", pages };
  }

  function parseCsvPages(text) {
    const rows = parseCsv(text);
    if (!rows.length) return [{ label: "CSV", text: "" }];
    const headers = rows[0].map((value) => value.trim());
    return rows.slice(1).map((row, index) => ({
      label: `CSV row ${index + 2}`,
      text: headers.map((header, i) => `${header || `Column ${i + 1}`}: ${row[i] || ""}`).join(" | "),
      headers,
      row
    }));
  }

  function parseCsv(text) {
    const rows = [];
    let row = [];
    let value = "";
    let quoted = false;
    for (let i = 0; i < text.length; i += 1) {
      const char = text[i];
      const next = text[i + 1];
      if (char === '"' && quoted && next === '"') {
        value += '"';
        i += 1;
      } else if (char === '"') {
        quoted = !quoted;
      } else if (char === "," && !quoted) {
        row.push(value.trim());
        value = "";
      } else if ((char === "\n" || char === "\r") && !quoted) {
        if (char === "\r" && next === "\n") i += 1;
        row.push(value.trim());
        if (row.some(Boolean)) rows.push(row);
        row = [];
        value = "";
      } else {
        value += char;
      }
    }
    row.push(value.trim());
    if (row.some(Boolean)) rows.push(row);
    return rows;
  }

  function buildOutput(documents) {
    const findings = [];
    const documentsNotProcessed = [];
    for (const document of documents) {
      let found = 0;
      for (const page of document.pages) {
        if (!page.text) continue;
        const pageFindings = extractFindings(document.file, page.label, page.text, page);
        found += pageFindings.length;
        findings.push(...pageFindings);
      }
      if (!found) documentsNotProcessed.push(`${document.file}: no cost, schedule, or ESG signal found by deterministic browser scan.`);
    }
    const citedFindings = scoreFindings(dedupeFindings(findings).slice(0, 80));
    const modelAuditTrail = {
      analysis_mode: "browser_deterministic_rules",
      execution_layer: "GitHub Pages static page",
      file_handling: "Files are read in the browser session and are not uploaded to a server.",
      xai_method: [
        "Evidence windows are selected from rows or sentences containing construction cost, schedule, leakage, commercial-control, or ESG keywords.",
        "Financial categories are assigned by deterministic keyword rules.",
        "When budget and actual are both cited and actual is greater than budget, overrun is calculated as Actual - Budget.",
        "Risk score combines cash impact, category, urgency, evidence quality, and confidence; it does not create new facts.",
        "Confidence is higher when structured budget and actual evidence is present, and lower when only narrative keyword evidence is present.",
        "Gemini and other LLM verification are not run inside this static free-tier dashboard."
      ]
    };
    const executiveBrief = buildExecutiveBrief(citedFindings, documentsNotProcessed);
    return {
      findings: citedFindings,
      executive_brief: executiveBrief,
      top_5_actions: buildTopExecutiveActions(citedFindings),
      recoverable_cost_exposure: buildRecoverableCostExposure(citedFindings),
      immediate_control_failures: buildImmediateControlFailures(citedFindings),
      missing_evidence_blocking_recovery: buildMissingEvidenceBlockingRecovery(citedFindings, documentsNotProcessed),
      executive_action_plan: buildExecutiveActionPlan(citedFindings),
      rationale: buildRationale(citedFindings, modelAuditTrail),
      model_audit_trail: modelAuditTrail,
      gemini_verifier_result: {
        status: "NOT_RUN",
        reason: "The static browser dashboard does not call Gemini. Download this JSON and use the optional Colab verifier for Gemini-backed executive wording and support checks.",
        allowed_input_policy: "Send only findings, cited spans, calculations, action plan, and honesty check to Gemini."
      },
      honesty_check: {
        missing_evidence: [
          "Browser analysis is deterministic and keyword based; review citations before using findings for decisions.",
          "Gemini/LLM verification is not run in this static free-tier dashboard."
        ],
        documents_not_processed: documentsNotProcessed,
        assumptions: [
          "Files were processed locally in the browser and were not uploaded to a server.",
          "Amounts are interpreted as INR when the source line uses INR, Rs, or rupee symbols."
        ]
      }
    };
  }

  function extractFindings(file, pageOrSheet, text, page) {
    const findings = [];
    if (page.headers && page.row) {
      const rowFinding = csvBudgetActualFinding(file, pageOrSheet, text, page.headers, page.row);
      if (rowFinding) findings.push(rowFinding);
    }
    for (const span of evidenceWindows(text)) {
      const lower = span.toLowerCase();
      const budget = valueNear(lower, span, BASELINE_RE);
      const actual = valueNear(lower, span, ACTUAL_RE);

      if (budget !== null) {
        findings.push(finding(`Baseline budget evidence of INR ${formatInr(budget)} is cited.`, "BASELINE_BUDGET", budget, 0, file, pageOrSheet, span, budget, 0, 0, "MEDIUM"));
      }
      if (budget !== null && actual !== null && actual > budget) {
        findings.push(finding(`Actual exceeds budget by INR ${formatInr(actual - budget)}.`, "LEAKAGE_AND_OVERRUN", actual - budget, 0, file, pageOrSheet, span, budget, actual, actual - budget, "HIGH"));
      }
      if (isLeakage(lower)) {
        const amount = firstAmount(span) || Math.max(actual || 0, 0);
        const days = firstDays(span);
        findings.push(finding(`Potential leakage or overrun signal: ${shortStatement(span)}`, "LEAKAGE_AND_OVERRUN", amount, days, file, pageOrSheet, span, budget || 0, actual || 0, actual && budget ? actual - budget : 0, amount || days ? "MEDIUM" : "LOW"));
      } else if (isEsg(lower)) {
        findings.push(finding(`ESG metric signal: ${shortStatement(span)}`, "ESG_METRIC", firstAmount(span) || 0, firstDays(span), file, pageOrSheet, span, 0, 0, 0, "MEDIUM"));
      }
    }
    return findings;
  }

  function csvBudgetActualFinding(file, pageOrSheet, span, headers, row) {
    let budget = null;
    let actual = null;
    headers.forEach((header, index) => {
      const key = header.toLowerCase();
      const value = parseAmount(row[index] || "");
      if (value === null) return;
      if (/budget|boq|planned|estimate|contract|baseline/.test(key)) budget = value;
      if (/actual|spent|cost incurred|cost to date|paid amount|payment amount|expenditure|debit amount|deduction amount|back charge amount/.test(key)) actual = value;
    });
    if (budget === null || actual === null || actual <= budget) return null;
    return finding(`CSV row shows Actual - Budget overrun of INR ${formatInr(actual - budget)}.`, "LEAKAGE_AND_OVERRUN", actual - budget, 0, file, pageOrSheet, span, budget, actual, actual - budget, "HIGH");
  }

  function evidenceWindows(text) {
    return text.replace(/\s+/g, " ")
      .split(/(?<=[.!?])\s+|\s+\|\s+|;\s+/)
      .map((part) => part.trim())
      .filter((part) => part.length > 12 && signalWords(part.toLowerCase()))
      .slice(0, 40);
  }

  function signalWords(lower) {
    return CONSTRUCTION_SIGNAL_RE.test(lower);
  }

  function isLeakage(lower) {
    return LEAKAGE_RE.test(lower);
  }

  function isEsg(lower) {
    return ESG_RE.test(lower);
  }

  function valueNear(lower, original, keywordRegex) {
    if (!keywordRegex.test(lower)) return null;
    const value = firstAmount(original);
    return value || null;
  }

  function firstAmount(text) {
    const match = /(?:₹|INR|Rs\.?)\s*([0-9][0-9,]*(?:\.[0-9]+)?)\s*(crore|cr|lakh|lac)?/i.exec(text);
    if (!match) return 0;
    let value = Number(match[1].replace(/,/g, ""));
    const unit = (match[2] || "").toLowerCase();
    if (unit === "crore" || unit === "cr") value *= 10000000;
    if (unit === "lakh" || unit === "lac") value *= 100000;
    return value;
  }

  function parseAmount(value) {
    const amount = firstAmount(value);
    if (amount) return amount;
    const numeric = String(value).replace(/,/g, "").match(/-?\d+(?:\.\d+)?/);
    return numeric ? Number(numeric[0]) : null;
  }

  function firstDays(text) {
    const match = text.match(/(\d+(?:\.\d+)?)\s*(?:day|days)\b/i);
    return match ? Number(match[1]) : 0;
  }

  function finding(statement, category, amount, days, file, pageOrSheet, span, budget, actual, difference, confidence) {
    return {
      statement,
      financial_category: category,
      amount_inr: Number(amount || 0),
      days: Number(days || 0),
      citations: [{ file, page_or_sheet: pageOrSheet, quoted_span: span.slice(0, 500) }],
      calculation: {
        budget: Number(budget || 0),
        actual: Number(actual || 0),
        difference: Number(difference || 0),
        formula: "Actual - Budget"
      },
      confidence
    };
  }

  function dedupeFindings(findings) {
    const seen = new Set();
    return findings.filter((item) => {
      const citation = item.citations[0];
      const key = `${item.financial_category}|${item.statement}|${citation.file}|${citation.page_or_sheet}|${citation.quoted_span}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }

  function scoreFindings(findings) {
    return findings.map((item) => {
      const score = riskScore(item);
      return {
        ...item,
        risk_score: score,
        severity: severity(score),
        recoverability: recoverability(item),
        evidence_quality: evidenceQuality(item),
        cash_impact: cashImpact(item.amount_inr),
        urgency: urgency(item),
        control_theme: controlTheme(item)
      };
    });
  }

  function riskScore(item) {
    let score = 0;
    const amount = Number(item.amount_inr || 0);
    if (item.financial_category === "LEAKAGE_AND_OVERRUN") score += 25;
    if (item.financial_category === "ESG_METRIC") score += 8;
    if (amount >= CASH_HIGH) score += 35;
    else if (amount >= CASH_MEDIUM) score += 25;
    else if (amount > 0) score += 15;
    if (Number(item.days || 0) >= 30) score += 15;
    else if (Number(item.days || 0) > 0) score += 10;
    if (item.calculation.actual > item.calculation.budget && item.calculation.budget > 0) score += 15;
    if (item.confidence === "HIGH") score += 10;
    if (item.confidence === "MEDIUM") score += 5;
    if (evidenceQuality(item) === "STRUCTURED_ACTUAL_BUDGET") score += 10;
    return Math.min(100, score);
  }

  function severity(score) {
    if (score >= 75) return "CRITICAL";
    if (score >= 55) return "HIGH";
    if (score >= 30) return "MEDIUM";
    return "LOW";
  }

  function recoverability(item) {
    if (item.financial_category !== "LEAKAGE_AND_OVERRUN") return "LOW";
    if (item.amount_inr > 0 && item.confidence === "HIGH") return "HIGH";
    if (item.amount_inr > 0 || item.days > 0) return "MEDIUM";
    return "UNKNOWN";
  }

  function evidenceQuality(item) {
    if (item.calculation.actual > item.calculation.budget && item.calculation.budget > 0) return "STRUCTURED_ACTUAL_BUDGET";
    if (item.amount_inr > 0) return "CITED_AMOUNT";
    if (item.days > 0) return "CITED_DAYS";
    if (item.citations?.[0]?.quoted_span) return "CITED_NARRATIVE";
    return "MISSING";
  }

  function cashImpact(amount) {
    if (amount >= CASH_HIGH) return "HIGH";
    if (amount >= CASH_MEDIUM) return "MEDIUM";
    if (amount > 0) return "LOW";
    return "NONE";
  }

  function urgency(item) {
    if (item.financial_category === "LEAKAGE_AND_OVERRUN" && (item.amount_inr >= CASH_MEDIUM || item.days > 0)) return "IMMEDIATE";
    if (item.financial_category === "LEAKAGE_AND_OVERRUN") return "30_DAYS";
    if (item.financial_category === "ESG_METRIC") return "90_DAYS";
    return "MONITOR";
  }

  function controlTheme(item) {
    const lower = item.citations?.[0]?.quoted_span?.toLowerCase() || "";
    if (/ld|liquidated damages|delay|eot|extension of time/.test(lower)) return "schedule_recovery";
    if (/wastage|rework|idle|excess|consumption|material variance/.test(lower)) return "site_execution_control";
    if (/po|purchase order|variation|debit note|invoice|ra bill|ipc|reconciliation/.test(lower)) return "commercial_control";
    if (item.financial_category === "ESG_METRIC") return "esg_monitoring";
    if (item.financial_category === "BASELINE_BUDGET") return "baseline_context";
    return "project_control";
  }

  function buildExecutiveBrief(findings, documentsNotProcessed) {
    const ranked = rankFindings(findings);
    const leakage = findings.filter((item) => item.financial_category === "LEAKAGE_AND_OVERRUN");
    const totalLeakage = leakage.reduce((sum, item) => sum + Number(item.amount_inr || 0), 0);
    const critical = findings.filter((item) => item.severity === "CRITICAL").length;
    const high = findings.filter((item) => item.severity === "HIGH").length;
    return {
      headline: leakage.length
        ? `Cited leakage/overrun exposure totals INR ${formatInr(totalLeakage)} across ${leakage.length} finding(s).`
        : "No cited leakage/overrun exposure was proven by this browser run.",
      decision_focus: ranked[0] ? `Start with Finding ${findings.indexOf(ranked[0]) + 1}: ${ranked[0].statement}` : "Improve source evidence before executive action.",
      critical_or_high_count: critical + high,
      total_cited_leakage_inr: totalLeakage,
      documents_with_no_signal: documentsNotProcessed.length,
      caveat: "Actions remain decision-support only and must be reviewed against cited evidence before commercial, legal, or recovery steps."
    };
  }

  function buildTopExecutiveActions(findings) {
    return rankFindings(findings).slice(0, 5).map((item, index) => ({
      rank: index + 1,
      title: actionTitle(item),
      action: actionText(item),
      source_finding_index: findings.indexOf(item) + 1,
      risk_score: item.risk_score,
      severity: item.severity,
      recoverability: item.recoverability,
      evidence_quality: item.evidence_quality
    }));
  }

  function actionTitle(item) {
    if (item.financial_category === "LEAKAGE_AND_OVERRUN" && item.calculation.actual > item.calculation.budget) return "Recover or contain actual-over-budget exposure";
    if (item.financial_category === "LEAKAGE_AND_OVERRUN") return "Validate and contain leakage signal";
    if (item.financial_category === "ESG_METRIC") return "Track ESG metric separately";
    return "Use baseline value as context, not leakage";
  }

  function actionText(item) {
    if (item.financial_category === "LEAKAGE_AND_OVERRUN" && item.amount_inr > 0) {
      return `Assign an owner to validate INR ${formatInr(item.amount_inr)} cited exposure and prepare recovery or avoidance action.`;
    }
    if (item.financial_category === "LEAKAGE_AND_OVERRUN" && item.days > 0) {
      return `Validate ${item.days} cited delay day(s), then connect delay ownership and cost support before recovery action.`;
    }
    if (item.financial_category === "ESG_METRIC") return "Keep the ESG metric in the monitoring pack unless separate financial evidence supports a cost finding.";
    return "Use this as approved context for variance review; do not count it as leakage.";
  }

  function buildRecoverableCostExposure(findings) {
    const items = rankFindings(findings).filter((item) => item.financial_category === "LEAKAGE_AND_OVERRUN" && item.amount_inr > 0);
    return {
      total_cited_amount_inr: items.reduce((sum, item) => sum + Number(item.amount_inr || 0), 0),
      item_count: items.length,
      high_recoverability_count: items.filter((item) => item.recoverability === "HIGH").length,
      finding_indexes: items.slice(0, 10).map((item) => findings.indexOf(item) + 1)
    };
  }

  function buildImmediateControlFailures(findings) {
    return rankFindings(findings)
      .filter((item) => item.financial_category === "LEAKAGE_AND_OVERRUN" && item.urgency === "IMMEDIATE")
      .slice(0, 5)
      .map((item) => ({
        source_finding_index: findings.indexOf(item) + 1,
        control_theme: item.control_theme,
        severity: item.severity,
        action: actionText(item)
      }));
  }

  function buildMissingEvidenceBlockingRecovery(findings, documentsNotProcessed) {
    const gaps = [];
    if (!findings.some((item) => item.calculation.budget > 0 && item.calculation.actual > 0)) gaps.push("Comparable Budget and Actual values were not found for every suspected variance.");
    if (!findings.some((item) => item.citations?.[0]?.file && item.citations?.[0]?.page_or_sheet)) gaps.push("Every executive recovery action needs file and page/sheet traceability.");
    documentsNotProcessed.forEach((item) => gaps.push(item));
    if (!gaps.length) gaps.push("No blocking evidence gap was detected by the deterministic scan; still review source citations before decisions.");
    return gaps;
  }

  function buildExecutiveActionPlan(findings) {
    const ranked = rankFindings(findings);
    const leakage = ranked.filter((item) => item.financial_category === "LEAKAGE_AND_OVERRUN");
    const schedule = ranked.filter((item) => item.days > 0);
    const esg = ranked.filter((item) => item.financial_category === "ESG_METRIC");
    const baseline = ranked.filter((item) => item.financial_category === "BASELINE_BUDGET");
    const primary = leakage[0] || schedule[0] || esg[0] || baseline[0] || null;

    return {
      "7_days": [
        action(
          "Validate cited evidence and assign owners",
          primary ? `Review the highest-priority cited item: ${primary.statement}` : "No cited cost, schedule, or ESG finding was extracted; review the source files and add clearer budget, actual, delay, or ESG records.",
          primary ? [findings.indexOf(primary) + 1] : [],
          primary ? "HIGH" : "LOW"
        ),
        action(
          "Stop immediate leakage signals",
          leakage[0] ? `Freeze avoidable spend, rework, penalty, idle-resource, excess-consumption, or overrun exposure tied to: ${leakage[0].statement}` : "No cited leakage or overrun signal was extracted in this run.",
          leakage[0] ? [findings.indexOf(leakage[0]) + 1] : [],
          leakage[0] ? leakage[0].confidence : "LOW"
        ),
        action(
          "Reconcile budget and actual values",
          leakage.find((item) => item.calculation.actual > item.calculation.budget) ? "Check supporting invoices, payment records, BOQ lines, and approvals for the cited Actual - Budget variance." : "No positive Actual - Budget overrun was extracted from the selected files.",
          leakage.find((item) => item.calculation.actual > item.calculation.budget) ? [findings.indexOf(leakage.find((item) => item.calculation.actual > item.calculation.budget)) + 1] : [],
          leakage.find((item) => item.calculation.actual > item.calculation.budget) ? "HIGH" : "LOW"
        )
      ],
      "30_days": [
        action(
          "Recover or avoid documented cost exposure",
          leakage.length ? `Prioritize commercial recovery for ${leakage.length} cited leakage/overrun item(s), starting with INR ${formatInr(leakage[0].amount_inr)}.` : "No cited recoverable cost exposure was extracted; strengthen input records before commercial recovery action.",
          leakage.slice(0, 3).map((item) => findings.indexOf(item) + 1),
          leakage.length ? leakage[0].confidence : "LOW"
        ),
        action(
          "Correct procurement, material, and execution controls",
          leakage.length ? "Use cited leakage causes to update approval thresholds, material consumption checks, rework controls, and delayed-PO escalation." : "No cited control failure was extracted; treat this as a data-quality gap, not proof that no leakage exists.",
          leakage.slice(0, 3).map((item) => findings.indexOf(item) + 1),
          leakage.length ? "MEDIUM" : "LOW"
        ),
        action(
          "Update forecast with schedule and ESG evidence",
          (schedule[0] || esg[0]) ? "Reflect cited delay days and ESG metrics separately from cost leakage in the next project review." : "No cited schedule-day or ESG metric signal was extracted from this run.",
          [schedule[0], esg[0]].filter(Boolean).map((item) => findings.indexOf(item) + 1),
          (schedule[0] || esg[0]) ? "MEDIUM" : "LOW"
        )
      ],
      "90_days": [
        action(
          "Institutionalize recurrence controls",
          leakage.length ? "Convert the cited leakage patterns into monthly variance checks, exception approvals, and closeout evidence requirements." : "First improve evidence capture, then define recurrence controls from the next cited leakage review.",
          leakage.slice(0, 5).map((item) => findings.indexOf(item) + 1),
          leakage.length ? "MEDIUM" : "LOW"
        ),
        action(
          "Track closure metrics",
          ranked.length ? "Track cited risk value, unresolved overrun count, delay days, ESG metrics, and missing-evidence items until closure." : "Track missing-evidence items until the dashboard can extract cited findings.",
          ranked.slice(0, 5).map((item) => findings.indexOf(item) + 1),
          ranked.length ? "MEDIUM" : "LOW"
        ),
        action(
          "Prepare executive review pack",
          ranked.length ? "Use the downloaded JSON and Markdown report as the evidence index for management review; keep citations attached to every action." : "Prepare a revised document set with budget, actual, invoice, schedule, and ESG records before the next review.",
          ranked.slice(0, 5).map((item) => findings.indexOf(item) + 1),
          ranked.length ? "MEDIUM" : "LOW"
        )
      ]
    };
  }

  function action(title, recommendation, sourceFindingIndexes, confidence) {
    return {
      title,
      recommendation,
      source_finding_indexes: sourceFindingIndexes,
      confidence
    };
  }

  function buildRationale(findings, modelAuditTrail) {
    return {
      method: modelAuditTrail.xai_method,
      ranked_finding_indexes: rankFindings(findings).map((item) => findings.indexOf(item) + 1),
      citation_count: findings.reduce((sum, item) => sum + item.citations.length, 0),
      limitations: [
        "This browser dashboard is decision-support only.",
        "It does not certify recovery, compliance, contract entitlement, or legal liability.",
        "Unsupported amounts, dates, causes, and actions are not inferred."
      ]
    };
  }

  function rankFindings(findings) {
    return [...findings].sort((a, b) => {
      const categoryScore = categoryRank(b) - categoryRank(a);
      if (categoryScore) return categoryScore;
      const riskScoreDelta = Number(b.risk_score || 0) - Number(a.risk_score || 0);
      if (riskScoreDelta) return riskScoreDelta;
      const amountScore = Number(b.amount_inr || 0) - Number(a.amount_inr || 0);
      if (amountScore) return amountScore;
      const daysScore = Number(b.days || 0) - Number(a.days || 0);
      if (daysScore) return daysScore;
      return confidenceRank(b.confidence) - confidenceRank(a.confidence);
    });
  }

  function categoryRank(item) {
    if (item.financial_category === "LEAKAGE_AND_OVERRUN") return 4;
    if (Number(item.days || 0) > 0) return 3;
    if (item.financial_category === "ESG_METRIC") return 2;
    if (item.financial_category === "BASELINE_BUDGET") return 1;
    return 0;
  }

  function confidenceRank(value) {
    if (value === "HIGH") return 3;
    if (value === "MEDIUM") return 2;
    if (value === "LOW") return 1;
    return 0;
  }

  function summaryHtml(output) {
    const counts = output.findings.reduce((acc, item) => {
      acc[item.financial_category] = (acc[item.financial_category] || 0) + 1;
      return acc;
    }, {});
    const total = output.findings.reduce((sum, item) => sum + (item.financial_category === "LEAKAGE_AND_OVERRUN" ? item.amount_inr : 0), 0);
    return `<div class="cv-upload-dashboard__metrics">
      <span><strong>${output.findings.length}</strong> findings</span>
      <span><strong>${counts.LEAKAGE_AND_OVERRUN || 0}</strong> leakage/overrun</span>
      <span><strong>${counts.ESG_METRIC || 0}</strong> ESG</span>
      <span><strong>INR ${formatInr(total)}</strong> cited risk</span>
    </div>
    <div class="cv-executive-stack">
      <section class="cv-executive-section cv-executive-section--brief">
        <h3>Executive Brief</h3>
        <p>${escapeHtml(output.executive_brief.headline)}</p>
        <p>${escapeHtml(output.executive_brief.decision_focus)}</p>
      </section>
      ${topActionsHtml(output.top_5_actions)}
      ${exposureHtml(output.recoverable_cost_exposure)}
      ${controlFailuresHtml(output.immediate_control_failures)}
      ${missingEvidenceHtml(output.missing_evidence_blocking_recovery)}
    </div>
    <div class="cv-action-plan">
      <h3>7/30/90 Executive Action Plan</h3>
      <p>${escapeHtml(executiveLead(output))}</p>
      ${actionPeriodHtml("7 days", output.executive_action_plan["7_days"])}
      ${actionPeriodHtml("30 days", output.executive_action_plan["30_days"])}
      ${actionPeriodHtml("90 days", output.executive_action_plan["90_days"])}
    </div>`;
  }

  function executiveLead(output) {
    const leakage = output.findings.filter((item) => item.financial_category === "LEAKAGE_AND_OVERRUN");
    if (leakage.length) {
      const total = leakage.reduce((sum, item) => sum + Number(item.amount_inr || 0), 0);
      return `Prioritize ${leakage.length} cited leakage/overrun item(s) with INR ${formatInr(total)} cited exposure, then close schedule, ESG, and missing-evidence gaps.`;
    }
    if (output.findings.length) return "No leakage overrun was proven by the extracted evidence; review baseline, ESG, schedule, and missing-evidence items before decisions.";
    return "No cited findings were extracted. Improve the input files with clear budget, actual, invoice, delay, or ESG evidence and rerun analysis.";
  }

  function topActionsHtml(actions) {
    if (!actions.length) return `<section class="cv-executive-section"><h3>Top 5 Executive Actions</h3><p>No cited executive action was extracted. Improve input evidence and rerun analysis.</p></section>`;
    return `<section class="cv-executive-section">
      <h3>Top 5 Executive Actions</h3>
      <ol class="cv-executive-list">
        ${actions.map((item) => `<li>
          <strong>${escapeHtml(item.title)}</strong>
          <span>${escapeHtml(item.action)}</span>
          <em>Finding ${item.source_finding_index} | Risk ${item.risk_score}/100 | ${escapeHtml(item.severity)} | ${escapeHtml(item.evidence_quality)}</em>
        </li>`).join("")}
      </ol>
    </section>`;
  }

  function exposureHtml(exposure) {
    return `<section class="cv-executive-section">
      <h3>Recoverable Cost Exposure</h3>
      <div class="cv-risk-table">
        <span><strong>INR ${formatInr(exposure.total_cited_amount_inr)}</strong> cited amount</span>
        <span><strong>${exposure.item_count}</strong> exposure item(s)</span>
        <span><strong>${exposure.high_recoverability_count}</strong> high recoverability</span>
      </div>
    </section>`;
  }

  function controlFailuresHtml(items) {
    const body = items.length ? `<ol class="cv-executive-list">
      ${items.map((item) => `<li>
        <strong>${escapeHtml(item.control_theme.replaceAll("_", " "))}</strong>
        <span>${escapeHtml(item.action)}</span>
        <em>Finding ${item.source_finding_index} | ${escapeHtml(item.severity)}</em>
      </li>`).join("")}
    </ol>` : `<p>No immediate control failure was proven by cited leakage evidence.</p>`;
    return `<section class="cv-executive-section"><h3>Immediate Control Failures</h3>${body}</section>`;
  }

  function missingEvidenceHtml(items) {
    return `<section class="cv-executive-section">
      <h3>Missing Evidence Blocking Recovery</h3>
      <ul class="cv-executive-list">
        ${items.map((item) => `<li><span>${escapeHtml(item)}</span></li>`).join("")}
      </ul>
    </section>`;
  }

  function actionPeriodHtml(label, actions) {
    return `<section class="cv-action-period">
      <h4>${escapeHtml(label)}</h4>
      <ol>
        ${actions.map((item) => `<li>
          <strong>${escapeHtml(item.title)}</strong>
          <span>${escapeHtml(item.recommendation)}</span>
          <em>${item.source_finding_indexes.length ? `Finding ${item.source_finding_indexes.join(", ")}` : "No cited finding extracted"} | ${escapeHtml(item.confidence)}</em>
        </li>`).join("")}
      </ol>
    </section>`;
  }

  function rationaleHtml(output) {
    const findingsHtml = output.findings.length ? output.findings.map((item, index) => {
      const citation = item.citations[0];
      return `<article class="cv-rationale-item">
        <h4>Finding ${index + 1}: ${escapeHtml(item.financial_category)}</h4>
        <p>${escapeHtml(item.statement)}</p>
        <dl>
          <div><dt>Amount</dt><dd>INR ${formatInr(item.amount_inr)}</dd></div>
          <div><dt>Days</dt><dd>${escapeHtml(item.days)}</dd></div>
          <div><dt>Risk</dt><dd>${escapeHtml(item.risk_score)}/100; ${escapeHtml(item.severity)} severity; ${escapeHtml(item.recoverability)} recoverability.</dd></div>
          <div><dt>Evidence</dt><dd>${escapeHtml(item.evidence_quality)}; cash impact ${escapeHtml(item.cash_impact)}; urgency ${escapeHtml(item.urgency)}; theme ${escapeHtml(item.control_theme)}.</dd></div>
          <div><dt>Confidence</dt><dd>${escapeHtml(item.confidence)}</dd></div>
          <div><dt>Calculation</dt><dd>Budget INR ${formatInr(item.calculation.budget)}; actual INR ${formatInr(item.calculation.actual)}; difference INR ${formatInr(item.calculation.difference)} using ${escapeHtml(item.calculation.formula)}.</dd></div>
          <div><dt>Citation</dt><dd>${escapeHtml(citation.file)} (${escapeHtml(citation.page_or_sheet)}): "${escapeHtml(citation.quoted_span)}"</dd></div>
        </dl>
      </article>`;
    }).join("") : `<p>No cited findings were extracted from the selected files.</p>`;

    return `<div class="cv-rationale-panel">
      <h3>Citations and Rationale</h3>
      <section>
        <h4>xAI Method</h4>
        <ul>${output.model_audit_trail.xai_method.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}</ul>
      </section>
      <section>
        <h4>Honesty Check</h4>
        <ul>
          ${output.honesty_check.missing_evidence.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}
          ${output.honesty_check.documents_not_processed.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}
          ${output.honesty_check.assumptions.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}
        </ul>
      </section>
      <section>
        <h4>Evidence</h4>
        ${findingsHtml}
      </section>
    </div>`;
  }

  function buildMarkdown(output) {
    const lines = [
      "# Constrovet Executive Cost Intelligence Memo",
      "",
      "## One-Page Executive Brief",
      "",
      output.executive_brief.headline,
      output.executive_brief.decision_focus,
      output.executive_brief.caveat,
      "",
      "## Top 5 Executive Actions",
      ""
    ];
    if (output.top_5_actions.length) {
      output.top_5_actions.forEach((item) => {
        lines.push(`- ${item.rank}. ${item.title}: ${item.action}`);
        lines.push(`  - Finding: ${item.source_finding_index}`);
        lines.push(`  - Risk: ${item.risk_score}/100 | Severity: ${item.severity} | Recoverability: ${item.recoverability} | Evidence: ${item.evidence_quality}`);
      });
    } else {
      lines.push("- No cited action was extracted; improve budget, actual, invoice, delay, and ESG records before executive decision.");
    }
    lines.push(
      "",
      "## Recoverable Cost Exposure",
      "",
      `- Total cited amount INR: ${output.recoverable_cost_exposure.total_cited_amount_inr}`,
      `- Exposure items: ${output.recoverable_cost_exposure.item_count}`,
      `- High recoverability items: ${output.recoverable_cost_exposure.high_recoverability_count}`,
      `- Finding indexes: ${output.recoverable_cost_exposure.finding_indexes.join(", ") || "None"}`,
      "",
      "## Immediate Control Failures",
      ""
    );
    if (output.immediate_control_failures.length) {
      output.immediate_control_failures.forEach((item) => {
        lines.push(`- Finding ${item.source_finding_index}: ${item.control_theme} | ${item.severity} | ${item.action}`);
      });
    } else {
      lines.push("- No immediate control failure was proven by cited leakage evidence.");
    }
    lines.push("", "## Missing Evidence Blocking Recovery", "");
    output.missing_evidence_blocking_recovery.forEach((item) => lines.push(`- ${item}`));
    lines.push("", "## 7/30/90 Executive Action Plan", "");
    Object.entries(output.executive_action_plan).forEach(([period, actions]) => {
      lines.push(`### ${period.replace("_", " ")}`, "");
      actions.forEach((item) => {
        lines.push(`- ${item.title}: ${item.recommendation}`);
        lines.push(`  - Source findings: ${item.source_finding_indexes.length ? item.source_finding_indexes.join(", ") : "None extracted"}`);
        lines.push(`  - Confidence: ${item.confidence}`);
      });
      lines.push("");
    });
    lines.push("## Risk Table", "");
    output.findings.forEach((item, index) => {
      lines.push(`- Finding ${index + 1}: ${item.financial_category} | INR ${item.amount_inr} | ${item.days} day(s) | Risk ${item.risk_score}/100 | ${item.severity} | ${item.recoverability} | ${item.evidence_quality}`);
    });
    lines.push("", "## Citations Appendix", "");
    output.findings.forEach((item, index) => {
      const citation = item.citations[0];
      lines.push(`### ${index + 1}. ${item.financial_category}`);
      lines.push(`- Statement: ${item.statement}`);
      lines.push(`- Amount INR: ${item.amount_inr}`);
      lines.push(`- Days: ${item.days}`);
      lines.push(`- Risk score: ${item.risk_score}`);
      lines.push(`- Severity: ${item.severity}`);
      lines.push(`- Recoverability: ${item.recoverability}`);
      lines.push(`- Evidence quality: ${item.evidence_quality}`);
      lines.push(`- Confidence: ${item.confidence}`);
      lines.push(`- Citation: ${citation.file} (${citation.page_or_sheet}) - "${citation.quoted_span}"`, "");
    });
    lines.push("## Citations And Rationale", "");
    output.model_audit_trail.xai_method.forEach((item) => lines.push(`- ${item}`));
    lines.push("## Honesty Check", "");
    output.honesty_check.missing_evidence.forEach((item) => lines.push(`- ${item}`));
    output.honesty_check.documents_not_processed.forEach((item) => lines.push(`- ${item}`));
    output.honesty_check.assumptions.forEach((item) => lines.push(`- ${item}`));
    return `${lines.join("\n")}\n`;
  }

  function shortStatement(span) {
    return span.length > 140 ? `${span.slice(0, 137)}...` : span;
  }

  function download(name, content, type) {
    const blob = new Blob([content], { type });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = name;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  }

  function setStatus(message, isError) {
    statusEl.textContent = message;
    statusEl.classList.toggle("is-error", Boolean(isError));
  }

  function setDownloads(enabled) {
    downloadJson.disabled = !enabled;
    downloadMd.disabled = !enabled;
    rationaleButton.disabled = !enabled;
    if (geminiLink) geminiLink.hidden = !enabled;
  }

  function formatBytes(bytes) {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }

  function formatInr(value) {
    return Math.round(value || 0).toLocaleString("en-IN");
  }

  function escapeHtml(value) {
    return String(value)
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }
})();
