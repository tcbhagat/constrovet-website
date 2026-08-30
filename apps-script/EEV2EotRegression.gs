// EEV2-002B regression — safe to run manually in Apps Script TEST project.

function eev2RunEotRegression() {
  const sample = [
    "Delay Analysis ID: PROJ-69266",
    "Generated: 23-Feb-2026",
    "TOTAL DELAY THIS MONTH 32",
    "Extension of Time (EOT) Status",
    "EOT Ref Basis Days Claimed Days Approved Status",
    "EOT-01/2026 Monsoon / Force Majeure 6 7 Under Review",
    "EOT-02/2026 Client-caused delay 7 — Submitted"
  ].join(" ");

  const evidence = eev2ExtractEotEvidence(
    "M08_DelayAnalysis_BAD.pdf",
    "Workspace OCR",
    sample
  );

  const entries = (evidence && evidence.eot_entries) || [];
  const eot1 = entries.find((item) => item.eot_reference === "EOT-01/2026") || {};
  const eot2 = entries.find((item) => item.eot_reference === "EOT-02/2026") || {};
  const findings = eev2EotEvidenceToFindings(evidence);
  const verifierIssues = findings.map((finding) => verifyBoardroomFinding(finding));
  const rendered = findings.map((item) => item.statement).join("\n");

  const checks = [
    ["classified_eot_register", evidence && evidence.document_type === "EOT_REGISTER"],
    ["two_eot_entries", entries.length === 2],
    ["eot1_reference_exact", eot1.eot_reference === "EOT-01/2026"],
    ["eot1_basis_exact", /Monsoon \/ Force Majeure/i.test(eot1.basis || "")],
    ["eot1_claimed_6", eot1.days_claimed === 6],
    ["eot1_approved_7", eot1.days_approved === 7],
    ["eot1_under_review", eot1.status === "UNDER_REVIEW"],
    ["eot1_flags_approved_exceeds_claimed", (eot1.consistency_flags || []).indexOf("APPROVED_DAYS_EXCEED_CLAIMED_DAYS") >= 0],
    ["eot1_flags_approved_while_under_review", (eot1.consistency_flags || []).indexOf("APPROVED_DAYS_PRESENT_WHILE_STATUS_UNDER_REVIEW") >= 0],
    ["eot2_reference_exact", eot2.eot_reference === "EOT-02/2026"],
    ["eot2_basis_client_delay", /Client-caused delay/i.test(eot2.basis || "")],
    ["eot2_claimed_7", eot2.days_claimed === 7],
    ["eot2_approved_not_stated", eot2.days_approved === null],
    ["eot2_submitted", eot2.status === "SUBMITTED"],
    ["entitlement_not_established", evidence && evidence.entitlement_conclusion === "NOT_ESTABLISHED"],
    ["critical_path_entitlement_not_established", evidence && evidence.critical_path_entitlement === "NOT_ESTABLISHED"],
    ["compensability_not_established", evidence && evidence.compensability_conclusion === "NOT_ESTABLISHED"],
    ["no_auto_entitlement_language", !/entitled to|approved entitlement|compensable entitlement|recoverable/i.test(rendered)],
    ["findings_preserve_guardrail", findings.length === 2 && findings.every((item) => item.recoverability_guardrail === "NOT_ESTABLISHED")],
    ["findings_pass_live_verifier", verifierIssues.every((issues) => issues.length === 0)]
  ];

  const result = {
    ticket: "EEV2-002B",
    ok: checks.every((item) => item[1] === true),
    checks: checks.map((item) => ({ check: item[0], pass: item[1] === true })),
    evidence,
    findings
  };

  console.log("EEV2-002B EOT REGRESSION");
  console.log(JSON.stringify(result, null, 2));
  if (!result.ok) throw new Error("EEV2-002B regression FAILED. See execution log.");
  console.log("EEV2-002B EOT REGRESSION PASS: ok=true");
  return result;
}
