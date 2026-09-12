/**
 * JAMIA MADEENATHUNNOOR — MEDIA CONCLAVE 2026
 * Client Interactions & Registration Logic
 */

document.addEventListener("DOMContentLoaded", () => {
  const form = document.getElementById("registration-form");
  const payOptions = document.querySelectorAll('input[name="paymentMethod"]');
  const onlineStep = document.getElementById("online-payment-step");
  const venueStep = document.getElementById("venue-payment-step");
  const proofUpload = document.getElementById("proof-upload-section");
  const paidCheckbox = document.getElementById("paid-checkbox");
  const proofInput = document.getElementById("paymentProof");
  const proofPreview = document.getElementById("proof-preview");
  const proofFileName = document.getElementById("proof-file-name");
  const proofImg = document.getElementById("proof-img");
  const submitBtn = document.getElementById("submit-btn");
  const formStatus = document.getElementById("form-status");

  // Default payment mode is online
  let currentPaymentMethod = "online";
  let base64ProofData = "";
  let proofFileType = "";

  // Handle payment method switch
  payOptions.forEach(radio => {
    radio.addEventListener("change", (e) => {
      currentPaymentMethod = e.target.value;
      
      // Update radio card styling
      document.querySelectorAll(".pay-option").forEach(card => card.classList.remove("selected"));
      e.target.closest(".pay-option").classList.add("selected");

      if (currentPaymentMethod === "online") {
        if (onlineStep) onlineStep.style.display = "grid";
        if (proofUpload) proofUpload.style.display = "block";
        if (venueStep) venueStep.style.display = "none";
        if (paidCheckbox) paidCheckbox.required = true;
        if (proofInput) proofInput.required = true;
        if (formStatus) formStatus.textContent = "Your details and payment proof will be stored for the organizers.";
      } else {
        if (onlineStep) onlineStep.style.display = "none";
        if (proofUpload) proofUpload.style.display = "none";
        if (venueStep) venueStep.style.display = "flex";
        if (paidCheckbox) paidCheckbox.required = false;
        if (proofInput) proofInput.required = false;
        if (formStatus) formStatus.textContent = "No payment screenshot is needed for venue payment.";
      }
    });
  });

  // Handle proof image upload & preview
  if (proofInput) {
    proofInput.addEventListener("change", function () {
      const file = this.files[0];
      if (!file) {
        base64ProofData = "";
        if (proofPreview) proofPreview.style.display = "none";
        return;
      }

      // Check max size: 8MB
      if (file.size > 8 * 1024 * 1024) {
        alert("Selected file is larger than 8 MB. Please choose a smaller file.");
        this.value = "";
        base64ProofData = "";
        if (proofPreview) proofPreview.style.display = "none";
        return;
      }

      proofFileType = file.type || "image/jpeg";
      const reader = new FileReader();
      reader.onload = function (e) {
        base64ProofData = e.target.result;
        if (proofImg) proofImg.src = base64ProofData;
        if (proofFileName) proofFileName.textContent = `${file.name} (${(file.size / 1024).toFixed(1)} KB)`;
        if (proofPreview) proofPreview.style.display = "flex";
      };
      reader.readAsDataURL(file);
    });
  }

  // Handle Form Submission
  if (form) {
    form.addEventListener("submit", async (e) => {
      e.preventDefault();

      const name = (document.getElementById("name")?.value || "").trim();
      const campus = (document.getElementById("campus")?.value || "").trim();
      const className = (document.getElementById("className")?.value || "").trim();
      const phone = (document.getElementById("phone")?.value || "").trim();
      const paymentMethod = currentPaymentMethod;
      const isPaidOnline = paymentMethod === "online" && paidCheckbox?.checked;

      if (!name || !campus || !className || !phone) {
        setStatus("Please fill in all required fields.", "error");
        return;
      }

      if (!/^\d{10}$/.test(phone)) {
        setStatus("Please enter a valid 10-digit mobile number.", "error");
        return;
      }

      if (paymentMethod === "online" && !isPaidOnline) {
        setStatus("Please confirm your online payment of ₹69.", "error");
        return;
      }

      // Disable button & show saving state
      if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.innerHTML = `SAVING… <span>↗</span>`;
      }
      setStatus("Processing your registration…", "");

      const regId = "MC26-" + Math.floor(1000 + Math.random() * 9000);
      const timestamp = new Date().toISOString();
      const fee = window.MC_CONFIG?.EVENT?.fee || 69;

      const record = {
        id: regId,
        timestamp: timestamp,
        name: name,
        campus: campus,
        className: className,
        phone: phone,
        paymentMethod: paymentMethod,
        paid: paymentMethod === "online" ? "yes" : "no",
        amount: fee,
        paymentProof: base64ProofData || "",
        status: paymentMethod === "online" ? "Verified" : "Pending (Venue)",
        createdAt: new Date().toLocaleString()
      };

      // 1. Save to LocalStorage for instant persistence
      try {
        const stored = JSON.parse(localStorage.getItem(window.MC_CONFIG.LOCAL_STORAGE_KEY) || "[]");
        stored.unshift(record);
        localStorage.setItem(window.MC_CONFIG.LOCAL_STORAGE_KEY, JSON.stringify(stored));
      } catch (err) {
        console.warn("LocalStorage save warning:", err);
      }

      // 2. Submit to Google Apps Script backend if configured
      let backendSuccess = false;
      if (window.MC_CONFIG?.API_BASE && !window.MC_CONFIG.API_BASE.includes("AKfycbx...")) {
        try {
          const res = await fetch(window.MC_CONFIG.API_BASE, {
            method: "POST",
            headers: {
              "Content-Type": "text/plain;charset=utf-8"
            },
            body: JSON.stringify({
              action: "createRegistration",
              data: record
            })
          });
          if (res.ok) {
            backendSuccess = true;
          }
        } catch (apiErr) {
          console.warn("Backend API sync warning (saved locally):", apiErr);
        }
      }

      // 3. Display success message
      const successMsg = paymentMethod === "online"
        ? `Registration and payment screenshot saved successfully! Registration ID: ${regId}`
        : `Registration saved! Your place is reserved. Please pay ₹${fee} at the venue. Registration ID: ${regId}`;
      
      setStatus(successMsg, "success");

      // 4. WhatsApp confirmation trigger
      const waNumber = window.MC_CONFIG?.WHATSAPP_NUMBER || "8943318613";
      const paymentSummary = paymentMethod === "online"
        ? `Online — ₹${fee} proof uploaded`
        : `Pay ₹${fee} at the venue`;

      const waText = `*MEDIA CONCLAVE REGISTRATION*\nID: ${regId}\nName: ${name}\nCampus: ${campus}\nClass: ${className}\nPhone: ${phone}\nPayment: ${paymentSummary}`;
      const waUrl = `https://wa.me/91${waNumber}?text=${encodeURIComponent(waText)}`;

      // Open WhatsApp in background / new tab
      setTimeout(() => {
        window.open(waUrl, "_blank");
      }, 800);

      // Reset form
      form.reset();
      if (proofPreview) proofPreview.style.display = "none";
      base64ProofData = "";

      if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.innerHTML = `COMPLETE REGISTRATION <span>↗</span>`;
      }
    });
  }

  function setStatus(msg, type) {
    if (!formStatus) return;
    formStatus.textContent = msg;
    formStatus.className = `form-note ${type || ""}`;
  }
});
