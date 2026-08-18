(function () {
  "use strict";

  const SCRIPT_URL = "https://script.google.com/macros/s/AKfycbztIOGwyzfkpUXawfjPv0GezE1DeCGiHxD8t3EoRtpCxB6thN2IT39rJKR8P6-n-mIRqg/exec";
  const form = document.getElementById("claim-form");
  const button = document.getElementById("submit-button");
  const status = document.getElementById("form-status");

  if (!form || !button || !status) return;

  function setStatus(state, message) {
    status.dataset.state = state;
    status.textContent = message;
  }

  function payloadFromForm() {
    const values = new FormData(form);
    return {
      patientName: values.get("patientName"),
      email: values.get("email"),
      providerName: values.get("providerName"),
      policyNumber: values.get("policyNumber"),
      sumInsured: values.get("sumInsured"),
      treatmentName: values.get("treatmentName"),
      estimatedCost: values.get("estimatedCost"),
      proposedHospital: values.get("proposedHospital"),
      roomCategory: values.get("roomCategory"),
      phone: "",
      ageGroup: "30-45",
      policyType: "Individual",
      roomRentLimit: 0,
      copayPercent: 0,
      waitingPeriod: 0,
      preExisting: "",
      exclusions: "",
      networkHospitals: "",
      validFrom: "",
      validUntil: "",
      treatmentCode: "",
      hospitalType: "Network",
      urgency: "Planned"
    };
  }

  form.addEventListener("submit", async function (event) {
    event.preventDefault();
    if (!form.reportValidity() || button.disabled) return;

    button.disabled = true;
    button.textContent = "Processing your request…";
    setStatus("processing", "Submitting your details for processing. Please keep this page open.");

    try {
      await fetch(SCRIPT_URL, {
        method: "POST",
        mode: "no-cors",
        headers: { "Content-Type": "text/plain;charset=UTF-8" },
        body: JSON.stringify(payloadFromForm())
      });
      setStatus("accepted", "Your request was submitted for processing. Please check your email for any report or follow-up.");
      button.textContent = "Request Submitted";
      form.reset();
    } catch (_error) {
      setStatus("error", "We could not submit your request. Please check your connection and try again.");
      button.disabled = false;
      button.textContent = "Generate Cost-Lock Pass";
    }
  });
})();
