(function () {
  const root = document.querySelector("[data-cv-local-analyzer]");
  if (!root) return;

  const input = root.querySelector("#cv-analysis-files");
  const runButton = root.querySelector("[data-cv-run-analysis]");
  const clearButton = root.querySelector("[data-cv-clear-analysis]");
  const statusEl = root.querySelector("[data-cv-analysis-status]");
  const filesEl = root.querySelector("[data-cv-analysis-files]");
  const summaryEl = root.querySelector("[data-cv-analysis-summary]");
  const jsonEl = root.querySelector("[data-cv-analysis-json]");
  const downloadJson = root.querySelector("[data-cv-download-json]");
  const downloadMd = root.querySelector("[data-cv-download-md]");

  const MAX_FILES = 10;
  const MAX_BYTES = 15 * 1024 * 1024;
  let latestOutput = null;
  let latestMarkdown = "";

  if (window.pdfjsLib) {
    window.pdfjsLib.GlobalWorkerOptions.workerSrc =
      "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js";
  }

  input.addEventListener("change", () => {
    latestOutput = null;
    latestMarkdown = "";
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
    jsonEl.textContent = "{}";
    summaryEl.textContent = "Select files and run analysis to generate cited findings.";
    setStatus("No files selected.");
    setDownloads(false);
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
    return {
      findings: dedupeFindings(findings).slice(0, 80),
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
      const budget = valueNear(lower, span, /budget|boq|planned|estimate|contract value|baseline/);
      const actual = valueNear(lower, span, /actual|spent|cost incurred|paid|invoice|expenditure|consumption/);

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
      if (/budget|boq|planned|estimate|contract/.test(key)) budget = value;
      if (/actual|spent|cost|paid|invoice|expenditure/.test(key)) actual = value;
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
    return /budget|boq|actual|overrun|delay|penalty|wastage|waste|rework|idle|excess|consumption|invoice|paid|spent|carbon|energy|water|diesel|fuel|electricity|emission|scope|days?|₹|inr|rs\.?/i.test(lower);
  }

  function isLeakage(lower) {
    return /overrun|penalty|wastage|rework|delay|idle|excess|delayed po|consumption|cost variance|actual exceeds|spent more/.test(lower);
  }

  function isEsg(lower) {
    return /carbon|waste diversion|energy|water|fuel|diesel|electricity|emission|scope 1|scope 2|scope 3/.test(lower);
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
    </div>`;
  }

  function buildMarkdown(output) {
    const lines = ["# Constrovet Browser Analysis Report", "", "## Findings", ""];
    output.findings.forEach((item, index) => {
      const citation = item.citations[0];
      lines.push(`### ${index + 1}. ${item.financial_category}`);
      lines.push(`- Statement: ${item.statement}`);
      lines.push(`- Amount INR: ${item.amount_inr}`);
      lines.push(`- Days: ${item.days}`);
      lines.push(`- Confidence: ${item.confidence}`);
      lines.push(`- Citation: ${citation.file} (${citation.page_or_sheet}) - "${citation.quoted_span}"`, "");
    });
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
