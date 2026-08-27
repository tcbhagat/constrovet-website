const PDF_MIME = "application/pdf";
const IMAGE_MIMES = new Set(["image/jpeg", "image/png", "image/webp"]);
const PDF_JS_URL = "https://cdn.jsdelivr.net/npm/pdfjs-dist@4.10.38/build/pdf.min.mjs";
const PDF_WORKER_URL = "https://cdn.jsdelivr.net/npm/pdfjs-dist@4.10.38/build/pdf.worker.min.mjs";

export const documentSpecs = [
  { key: "policy", label: "Health insurance policy", accept: ".pdf,application/pdf", required: true },
  { key: "prescription", label: "Hospital prescription or treatment advice", accept: ".pdf,.jpg,.jpeg,.png,.webp,application/pdf,image/jpeg,image/png,image/webp", required: false, requirementLabel: "one or combined" },
  { key: "estimate", label: "Hospital estimate or package quotation", accept: ".pdf,.jpg,.jpeg,.png,.webp,application/pdf,image/jpeg,image/png,image/webp", required: false, requirementLabel: "one or combined" },
  { key: "preauthorization", label: "Cashless authorization or TPA response", accept: ".pdf,.jpg,.jpeg,.png,.webp,application/pdf,image/jpeg,image/png,image/webp", required: false }
];

export async function fingerprintFile(file) {
  const digest = await crypto.subtle.digest("SHA-256", await file.arrayBuffer());
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

export function validateDocument(file, spec, config) {
  if (!file) return "Select a file.";
  if (file.size > config.maxFileBytes) return `File must be smaller than ${Math.round(config.maxFileBytes / 1024 / 1024)} MB.`;
  if (spec.key === "policy" && file.type !== PDF_MIME) return "The policy must be a PDF.";
  if (file.type !== PDF_MIME && !IMAGE_MIMES.has(file.type)) return "Use PDF, JPG, PNG or WebP.";
  return "";
}

async function readPdf(file, progress) {
  progress(10, "Reading PDF");
  const pdfjs = await import(PDF_JS_URL);
  pdfjs.GlobalWorkerOptions.workerSrc = PDF_WORKER_URL;
  const data = await file.arrayBuffer();
  const pdf = await pdfjs.getDocument({ data }).promise;
  const pages = [];
  for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber += 1) {
    const page = await pdf.getPage(pageNumber);
    const content = await page.getTextContent();
    pages.push(content.items.map((item) => item.str).join(" "));
    progress(10 + Math.round((pageNumber / pdf.numPages) * 85), `Reading page ${pageNumber} of ${pdf.numPages}`);
  }
  return pages.join("\n");
}

async function readImage(file, progress) {
  if (!window.Tesseract) throw new Error("Image reader is still loading. Try again in a few seconds.");
  const result = await window.Tesseract.recognize(file, "eng", {
    logger(message) {
      if (message.status === "recognizing text") progress(Math.round((message.progress || 0) * 100), "Reading image text");
    }
  });
  return result.data.text || "";
}

export async function extractDocument(file, progress = () => {}) {
  const text = file.type === PDF_MIME ? await readPdf(file, progress) : await readImage(file, progress);
  progress(100, "Ready");
  return text.replace(/\u0000/g, " ").replace(/[ \t]+/g, " ").trim();
}

export function fileToData(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("Could not read the selected file."));
    reader.onload = () => resolve({ name: file.name, mimeType: file.type, size: file.size, base64: String(reader.result).split(",")[1] || "" });
    reader.readAsDataURL(file);
  });
}

function parseMoney(raw) {
  if (!raw) return 0;
  const normalized = String(raw).replace(/[^0-9.]/g, "");
  const value = Number(normalized);
  return Number.isFinite(value) ? Math.round(value) : 0;
}

function firstMoney(text, patterns) {
  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match) return parseMoney(match[1]);
  }
  return 0;
}

function inferHospitalName(text) {
  const compact = String(text || "").replace(/\s+/g, " ").trim();
  const labelled = compact.match(/(?:hospital\s*&\s*city|proposed hospital|hospital name)\s*[:\-]?\s*([A-Za-z][A-Za-z0-9&.,'() -]{2,120}?)(?=\s+(?:primary diagnosis|selected room|expected length|recommended admission|advised procedure|patient name|attending doctor|surgical\s*\/\s*medical advice|itemized|doctor['’]s|$))/i);
  if (labelled) return labelled[1].trim().slice(0, 160);
  const lines = String(text || "").split(/\n+/).map((line) => line.trim()).filter(Boolean);
  for (const line of lines) {
    if (/^(?:provisional\s+)?hospital\s+(?:cost\s+)?estimate|^hospital\s+(?:treatment|prescription|advice)/i.test(line)) continue;
    const match = line.match(/([A-Za-z][A-Za-z0-9&.,'() -]{2,120}?(?:hospital|medical centre|medical center|clinic|nursing home))/i);
    if (match && !/^(?:hospital|clinic|nursing home)$/i.test(match[1].trim())) return match[1].replace(/^(?:hospital|provider|facility)\s*[:\-]?\s*/i, "").trim().slice(0, 160);
  }
  return "";
}

function inferHospitalEmail(text) {
  const match = String(text || "").match(/\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/i);
  return match ? match[0].toLowerCase() : "";
}

function inferStayDays(text) {
  const compact = String(text || "").replace(/\s+/g, " ");
  return Number((compact.match(/(?:expected stay|length of stay|stay)[^\d]{0,30}(\d{1,3})\s*days?/i) || [])[1] || 0);
}

function inferRoomCategory(text) {
  const compact = String(text || "").replace(/\s+/g, " ");
  if (/deluxe\s+suite/i.test(compact)) return "Deluxe suite";
  if (/deluxe\s+room/i.test(compact)) return "Deluxe room";
  if (/(?:single\s+)?private\s+room/i.test(compact)) return "Private room";
  if (/(?:shared|twin[- ]?sharing)\s+room/i.test(compact)) return "Shared room";
  if (/general\s+ward/i.test(compact)) return "General ward";
  return "";
}

export function inferPolicyFields(text) {
  const compact = String(text || "").replace(/\s+/g, " ");
  const waiting = compact.match(/(?:pre[- ]?existing disease|ped|waiting period|specific waiting)[^.;]{0,100}?(?:\d{1,3}\s*(?:months?|years?)\s*waiting|waiting\s*(?:period)?\s*(?:of)?\s*\d{1,3}\s*(?:months?|years?))\)?/i);
  const policyPeriod = compact.match(/policy\s+period\s*[:\-]?\s*(\d{1,2}[\/.-]\d{1,2}[\/.-]\d{2,4}\s*(?:to|-|until)\s*\d{1,2}[\/.-]\d{1,2}[\/.-]\d{2,4})/i);
  return {
    sumInsured: firstMoney(compact, [/(?:sum insured|sum assured|coverage amount)[^₹\d]{0,40}(?:₹|rs\.?|inr)?\s*([\d,]+(?:\.\d+)?)/i]),
    roomLimit: firstMoney(compact, [/(?:room rent|room limit|room category)[^₹\d]{0,60}(?:₹|rs\.?|inr)?\s*([\d,]+(?:\.\d+)?)(?:\s*\/\s*day|\s*per day|\s*daily)/i]),
    copayPercent: Number((compact.match(/(?:co[- ]?pay(?:ment)?)[^%\d]{0,35}(\d{1,3}(?:\.\d+)?)\s*%/i) || [])[1] || 0),
    deductible: firstMoney(compact, [/(?:deductible|policy excess)[^₹\d]{0,40}(?:₹|rs\.?|inr)?\s*([\d,]+(?:\.\d+)?)/i]),
    waitingNote: waiting ? waiting[0].trim() : "",
    policyPeriod: policyPeriod ? policyPeriod[1].trim() : "",
    proportionateScalingApplies: /proportion(?:al|ate)\s+scal(?:e|ing)\s+appl/i.test(compact)
  };
}

export function inferEstimateFields(text) {
  const compact = String(text || "").replace(/\s+/g, " ");
  return {
    estimatedBill: firstMoney(compact, [/(?:grand total|total estimated|estimated total|package amount|net amount|total amount)[^₹\d]{0,35}(?:₹|rs\.?|inr)?\s*([\d,]+(?:\.\d+)?)/i]),
    actualRoomRate: firstMoney(compact, [/(?:room rent|room charges?|private room)[^₹\n]{0,100}?(?:@\s*)?(?:₹|rs\.?|inr)\s*([\d,]+(?:\.\d+)?)(?:\s*\/\s*day|\s*per day|\s*daily)/i]),
    nonPayables: firstMoney(compact, [
      /(?:estimated\s+)?non[- ]?payables?[^₹\d]{0,35}(?:₹|rs\.?|inr)?\s*([\d,]+(?:\.\d+)?)/i,
      /non[- ]?medical[^₹\d]{0,35}(?:₹|rs\.?|inr)?\s*([\d,]+(?:\.\d+)?)/i,
      /consumables[^₹\d]{0,35}(?:₹|rs\.?|inr)?\s*([\d,]+(?:\.\d+)?)/i
    ]),
    hospitalName: inferHospitalName(text),
    hospitalEmail: inferHospitalEmail(text),
    stayDays: inferStayDays(text),
    roomCategory: inferRoomCategory(text)
  };
}

export function inferPrescriptionFields(text) {
  const lines = String(text || "").split(/\n+/).map((line) => line.trim()).filter(Boolean);
  const compact = lines.join(" ").replace(/\s+/g, " ");
  const labelledProcedure = compact.match(/(?:surgical\s*\/\s*medical\s+advice|recommended\s+procedure|advised\s+procedure)\s*[:\-]?\s*([A-Za-z0-9][A-Za-z0-9&.,'()\/ -]{2,160}?)(?=\s+(?:recommended admission|expected length|primary diagnosis|hospital\s*&\s*city|proposed hospital|patient name|attending doctor|doctor['’]s|itemized|$))/i);
  if (labelledProcedure) return {
    procedureName: labelledProcedure[1].trim().slice(0, 160),
    hospitalName: inferHospitalName(text),
    hospitalEmail: inferHospitalEmail(text),
    stayDays: inferStayDays(text),
    roomCategory: inferRoomCategory(text)
  };
  const priorities = [/surgical\s*\/\s*medical\s+advice/i, /recommended\s+procedure/i, /advised\s+procedure/i, /\bprocedure\b/i, /surgery|operation|advised|day care/i, /diagnosis/i];
  const label = /^(surgical\s*\/\s*medical\s+advice|recommended\s+procedure|advised\s+procedure|procedure|surgery|operation|advised|provisional\s+diagnosis|primary\s+diagnosis|diagnosis)\s*[:\-]?\s*/i;
  for (const pattern of priorities) {
    const index = lines.findIndex((line) => pattern.test(line));
    if (index < 0) continue;
    const inline = lines[index].replace(label, "").trim();
    const procedureName = inline || lines[index + 1] || "";
    if (procedureName) return {
      procedureName: procedureName.slice(0, 160),
      hospitalName: inferHospitalName(text),
      hospitalEmail: inferHospitalEmail(text),
      stayDays: inferStayDays(text),
      roomCategory: inferRoomCategory(text)
    };
  }
  return {
    procedureName: "",
    hospitalName: inferHospitalName(text),
    hospitalEmail: inferHospitalEmail(text),
    stayDays: inferStayDays(text),
    roomCategory: inferRoomCategory(text)
  };
}

export function classifyHospitalDocument(text) {
  const prescription = inferPrescriptionFields(text);
  const estimate = inferEstimateFields(text);
  const roles = [];
  if (prescription.procedureName) roles.push("prescription");
  if (estimate.estimatedBill) roles.push("estimate");
  return { roles, prescription, estimate };
}
