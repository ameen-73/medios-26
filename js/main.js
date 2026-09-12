/**
 * JAMIA MADEENATHUNNOOR — MEDIA CONCLAVE 2026
 * Client Interactions & Registration Logic with Live Admin Sync
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

  // Broadcast channel for real-time tab-to-tab admin synchronization
  let syncChannel = null;
  try {
    if (typeof BroadcastChannel !== "undefined") {
      syncChannel = new BroadcastChannel("medios26_sync");
    }
  } catch (e) {
    console.warn("BroadcastChannel not supported", e);
  }

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

      // 1. Save to LocalStorage for instant persistence & admin linkage
      const storageKey = window.MC_CONFIG?.LOCAL_STORAGE_KEY || "medios26_registrations_v2";
      try {
        const stored = JSON.parse(localStorage.getItem(storageKey) || "[]");
        stored.unshift(record);
        localStorage.setItem(storageKey, JSON.stringify(stored));

        // Also save to backward-compatible key
        localStorage.setItem("medios26_registrations", JSON.stringify(stored));

        // Notify other open tabs (such as Admin panel) in real time
        if (syncChannel) {
          syncChannel.postMessage({ type: "NEW_REGISTRATION", data: record });
        }
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

      // 3. Display success message & Show WhatsApp Group Join Card
      const waGroupUrl = window.MC_CONFIG?.WHATSAPP_GROUP_URL || "https://chat.whatsapp.com/J3MuwpCT0JPCCyANZIxfWH";
      const waNumber = window.MC_CONFIG?.WHATSAPP_NUMBER || "7356217409";
      const paymentSummary = paymentMethod === "online"
        ? `Online — ₹${fee} proof uploaded`
        : `Pay ₹${fee} at the venue`;

      const waText = `*MEDIA CONCLAVE REGISTRATION*\nID: ${regId}\nName: ${name}\nCampus: ${campus}\nClass: ${className}\nPhone: ${phone}\nPayment: ${paymentSummary}`;
      const waUrl = `https://wa.me/91${waNumber}?text=${encodeURIComponent(waText)}`;

      const successMsg = paymentMethod === "online"
        ? `Registration and payment screenshot saved successfully! Registration ID: ${regId}`
        : `Registration saved! Your place is reserved. Please pay ₹${fee} at the venue. Registration ID: ${regId}`;

      setStatus(successMsg, "success", waGroupUrl);

      // Display dedicated post-registration card with Join WhatsApp Group button
      displaySuccessCard(record, waGroupUrl, waUrl);

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

  function displaySuccessCard(record, groupUrl, waOrganizerUrl) {
    let successCard = document.getElementById("registration-success-card");
    if (!successCard) {
      successCard = document.createElement("div");
      successCard.id = "registration-success-card";
      successCard.className = "registration-success-card";
      if (form && form.parentNode) {
        form.parentNode.insertBefore(successCard, form.nextSibling);
      }
    }

    const fee = record.amount || 69;
    const isOnline = record.paymentMethod === "online" || record.paid === "yes";

    successCard.innerHTML = `
      <div class="success-header-badge">
        <span class="success-icon">✓</span>
        <span>REGISTRATION CONFIRMED</span>
      </div>
      <h3>CLAIMED.<br/>SEE YOU THERE!</h3>
      <p class="success-subtext">Thank you for registering for Media Conclave 2026. Your place has been reserved.</p>

      <div class="reg-receipt-box">
        <div class="reg-receipt-row">
          <span class="label">Registration ID</span>
          <span class="value reg-id-val">${escapeHtml(record.id)}</span>
        </div>
        <div class="reg-receipt-row">
          <span class="label">Delegate</span>
          <span class="value">${escapeHtml(record.name)}</span>
        </div>
        <div class="reg-receipt-row">
          <span class="label">Campus & Class</span>
          <span class="value">${escapeHtml(record.campus)} (${escapeHtml(record.className)})</span>
        </div>
        <div class="reg-receipt-row">
          <span class="label">Payment</span>
          <span class="value status-tag">${isOnline ? `Paid Online (₹${fee})` : `Pay ₹${fee} at Venue`}</span>
        </div>
      </div>

      <!-- Join WhatsApp Group Button -->
      <div class="wa-group-cta-wrapper">
        <a href="${groupUrl}" target="_blank" rel="noopener noreferrer" class="wa-group-cta-btn" id="join-wa-group-btn">
          <div class="btn-content">
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path d="M12.04 2c-5.46 0-9.91 4.45-9.91 9.91 0 1.75.46 3.45 1.32 4.95L2.05 22l5.25-1.38c1.45.79 3.08 1.21 4.74 1.21 5.46 0 9.91-4.45 9.91-9.91 0-2.65-1.03-5.14-2.9-7.01A9.816 9.816 0 0 0 12.04 2zm.01 1.67c2.2 0 4.26.86 5.82 2.42a8.225 8.225 0 0 1 2.41 5.83c0 4.54-3.7 8.24-8.24 8.24-1.48 0-2.93-.4-4.2-1.15l-.3-.18-3.12.82.83-3.04-.2-.31a8.196 8.196 0 0 1-1.26-4.38c0-4.54 3.7-8.24 8.24-8.24h.02zm-3.5 3.6c-.2 0-.44.07-.67.33-.23.26-.88.86-.88 2.1s.9 2.44 1.03 2.61c.13.17 1.77 2.7 4.29 3.79.6.26 1.07.41 1.44.53.6.19 1.15.16 1.59.1.48-.07 1.49-.61 1.7-1.2.21-.59.21-1.09.15-1.2-.06-.11-.23-.17-.48-.3-.25-.12-1.49-.73-1.72-.82-.23-.08-.4-.13-.57.13-.17.25-.66.82-.81.99-.15.17-.3.19-.55.07-.25-.13-1.07-.39-2.03-1.25-.75-.67-1.26-1.5-1.41-1.75-.15-.26-.02-.4.11-.53.11-.11.25-.3.38-.45.12-.15.17-.26.25-.43.08-.17.04-.32-.02-.45-.06-.13-.57-1.37-.78-1.88-.2-.49-.41-.43-.57-.43z"/>
            </svg>
            <span>JOIN WHATSAPP GROUP</span>
          </div>
          <span class="btn-arrow">↗</span>
        </a>
        <div class="wa-group-explainer">
          <span class="pulse-dot"></span>
          <span><strong>Important:</strong> Tap the green button above to join the official WhatsApp group for schedules, seat numbers, and live event announcements.</span>
        </div>
      </div>

      <div class="success-actions-row">
        <button type="button" class="btn-secondary-reset" id="btn-register-another">
          + Register Another Delegate
        </button>
        <a href="${waOrganizerUrl}" target="_blank" rel="noopener noreferrer" class="btn-secondary-link" title="Notify Organizer on WhatsApp">
          <span>Notify Organizer</span> <span>↗</span>
        </a>
      </div>
    `;

    // Hide form, reveal success card
    if (form) form.style.display = "none";
    successCard.style.display = "flex";

    // Bind "Register Another"
    const anotherBtn = document.getElementById("btn-register-another");
    if (anotherBtn) {
      anotherBtn.addEventListener("click", () => {
        successCard.style.display = "none";
        if (form) {
          form.style.display = "block";
          form.reset();
        }
        setStatus("Your details and payment proof will be stored for the organizers.", "");
      });
    }

    // Smooth scroll into view
    successCard.scrollIntoView({ behavior: "smooth", block: "center" });
  }

  function setStatus(msg, type, waGroupUrl) {
    if (!formStatus) return;
    formStatus.className = `form-note ${type || ""}`;

    if (type === "success" && waGroupUrl) {
      formStatus.innerHTML = `
        <div>${escapeHtml(msg)}</div>
        <div>
          <a href="${waGroupUrl}" target="_blank" rel="noopener noreferrer" class="inline-wa-btn">
            Join Delegates WhatsApp Group ↗
          </a>
        </div>
      `;
    } else {
      formStatus.textContent = msg;
    }
  }

  function escapeHtml(str) {
    if (!str) return "";
    return String(str)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }
});
