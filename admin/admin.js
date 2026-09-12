/**
 * JAMIA MADEENATHUNNOOR — MEDIA CONCLAVE 2026
 * Admin Portal Controller & Live Real-Time Data Sync
 */

const DEFAULT_USER = "medios'26";
const DEFAULT_PASS = "med@231";
const AUTH_KEY = "mc26_admin_authenticated";
const STORAGE_KEY = "medios26_registrations_v2";

let registrations = [];

document.addEventListener("DOMContentLoaded", () => {
  // Elements
  const authSection = document.getElementById("auth-section");
  const adminSection = document.getElementById("admin-section");
  const loginForm = document.getElementById("login-form");
  const authError = document.getElementById("auth-error");
  const logoutBtn = document.getElementById("logout-btn");
  const refreshBtn = document.getElementById("refresh-btn");
  const exportCsvBtn = document.getElementById("export-csv-btn");
  const exportJsonBtn = document.getElementById("export-json-btn");
  const searchInput = document.getElementById("search-input");
  const filterPayment = document.getElementById("filter-payment");
  const navReg = document.getElementById("nav-reg");
  const navSettings = document.getElementById("nav-settings");
  const tabReg = document.getElementById("tab-registrations");
  const tabSettings = document.getElementById("tab-settings");
  const proofModal = document.getElementById("proof-modal");
  const modalCloseBtn = document.getElementById("modal-close-btn");
  const detailsModal = document.getElementById("details-modal");
  const detailsCloseBtn = document.getElementById("details-close-btn");
  const saveSettingsBtn = document.getElementById("save-settings-btn");

  // Real-time broadcast channel listener for live sync across tabs
  try {
    if (typeof BroadcastChannel !== "undefined") {
      const syncChannel = new BroadcastChannel("medios26_sync");
      syncChannel.onmessage = (event) => {
        if (event.data && event.data.type === "NEW_REGISTRATION") {
          loadRegistrations();
        }
      };
    }
  } catch (e) {
    console.warn("BroadcastChannel error:", e);
  }

  // Also listen to window storage event for real-time update
  window.addEventListener("storage", (e) => {
    if (e.key === STORAGE_KEY || e.key === "medios26_registrations") {
      loadRegistrations();
    }
  });

  // Check auth state
  if (sessionStorage.getItem(AUTH_KEY) === "true") {
    showAdminDashboard();
  }

  // Handle Login
  if (loginForm) {
    loginForm.addEventListener("submit", (e) => {
      e.preventDefault();
      const user = document.getElementById("admin-email").value.trim();
      const pass = document.getElementById("admin-pass").value.trim();

      if (user === DEFAULT_USER && pass === DEFAULT_PASS) {
        sessionStorage.setItem(AUTH_KEY, "true");
        authError.style.display = "none";
        showAdminDashboard();
      } else {
        authError.style.display = "block";
      }
    });
  }

  // Handle Logout
  if (logoutBtn) {
    logoutBtn.addEventListener("click", () => {
      sessionStorage.removeItem(AUTH_KEY);
      adminSection.style.display = "none";
      authSection.style.display = "flex";
    });
  }

  // Navigation tabs
  if (navReg && navSettings) {
    navReg.addEventListener("click", () => {
      navReg.classList.add("active");
      navSettings.classList.remove("active");
      tabReg.style.display = "block";
      tabSettings.style.display = "none";
    });

    navSettings.addEventListener("click", () => {
      navSettings.classList.add("active");
      navReg.classList.remove("active");
      tabSettings.style.display = "block";
      tabReg.style.display = "none";
    });
  }

  // Refresh & Export
  if (refreshBtn) refreshBtn.addEventListener("click", loadRegistrations);
  if (exportCsvBtn) exportCsvBtn.addEventListener("click", exportToCSV);
  if (exportJsonBtn) exportJsonBtn.addEventListener("click", exportToJSON);

  // Search & Filter
  if (searchInput) searchInput.addEventListener("input", renderTable);
  if (filterPayment) filterPayment.addEventListener("change", renderTable);

  // Modals Close
  if (modalCloseBtn) modalCloseBtn.addEventListener("click", () => { proofModal.style.display = "none"; });
  if (detailsCloseBtn) detailsCloseBtn.addEventListener("click", () => { detailsModal.style.display = "none"; });
  
  if (proofModal) {
    proofModal.addEventListener("click", (e) => {
      if (e.target === proofModal) proofModal.style.display = "none";
    });
  }
  if (detailsModal) {
    detailsModal.addEventListener("click", (e) => {
      if (e.target === detailsModal) detailsModal.style.display = "none";
    });
  }

  // Save Settings
  if (saveSettingsBtn) {
    saveSettingsBtn.addEventListener("click", () => {
      const fee = document.getElementById("setting-fee").value;
      const whatsapp = document.getElementById("setting-whatsapp").value;
      const api = document.getElementById("setting-api").value;

      if (window.MC_CONFIG) {
        if (window.MC_CONFIG.EVENT) window.MC_CONFIG.EVENT.fee = Number(fee);
        window.MC_CONFIG.WHATSAPP_NUMBER = whatsapp;
        window.MC_CONFIG.API_BASE = api;
      }
      alert("Settings updated successfully!");
    });
  }

  function showAdminDashboard() {
    authSection.style.display = "none";
    adminSection.style.display = "grid";
    loadRegistrations();
    loadSettings();
  }

  async function loadRegistrations() {
    // 1. Fetch from LocalStorage
    let localData = [];
    try {
      localData = JSON.parse(localStorage.getItem(STORAGE_KEY) || localStorage.getItem("medios26_registrations") || "[]");
    } catch (e) {
      localData = [];
    }
    registrations = localData;

    // 2. Fetch from Google Apps Script Web App API if available
    if (window.MC_CONFIG?.API_BASE && !window.MC_CONFIG.API_BASE.includes("AKfycbx...")) {
      try {
        const res = await fetch(`${window.MC_CONFIG.API_BASE}?action=getRegistrations`);
        const json = await res.json();
        if (json && json.status === "success" && Array.isArray(json.data)) {
          const remoteIds = new Set(json.data.map(r => r.id || r["Registration ID"]));
          const merged = [...json.data.map(mapApiRecord)];
          
          localData.forEach(item => {
            if (!remoteIds.has(item.id)) {
              merged.unshift(item);
            }
          });
          registrations = merged;
        }
      } catch (err) {
        console.warn("Remote backend fetch error (using localStorage):", err);
      }
    }

    updateStats();
    renderTable();
  }

  function mapApiRecord(r) {
    return {
      id: r.id || r["Registration ID"] || "MC26-" + Math.floor(1000 + Math.random() * 9000),
      timestamp: r.timestamp || r["Timestamp"] || new Date().toISOString(),
      name: r.name || r["Name"] || r["Full Name"] || "",
      campus: r.campus || r["Campus"] || r["Campus Name"] || "",
      className: r.className || r["Class"] || r["Course / Class"] || "",
      phone: String(r.phone || r["Phone"] || r["Phone Number"] || "").replace(/^'/, ""),
      paymentMethod: (r.paymentMethod || r["Payment Method"] || "online").toLowerCase(),
      paid: r.paid || r["Paid"] || (r.paymentMethod === "online" ? "yes" : "no"),
      amount: r.amount || r["Amount"] || 69,
      paymentProof: r.paymentProof || r["Payment Proof URL"] || "",
      status: r.status || r["Status"] || "Verified",
      createdAt: r.createdAt || new Date(r.timestamp || Date.now()).toLocaleString()
    };
  }

  function updateStats() {
    const total = registrations.length;
    const online = registrations.filter(r => (r.paymentMethod || "").toLowerCase() === "online" || r.paid === "yes").length;
    const venue = registrations.filter(r => (r.paymentMethod || "").toLowerCase() === "venue" && r.paid !== "yes").length;
    const revenue = online * (window.MC_CONFIG?.EVENT?.fee || 69);

    document.getElementById("stat-total").textContent = total;
    document.getElementById("stat-online").textContent = online;
    document.getElementById("stat-venue").textContent = venue;
    document.getElementById("stat-revenue").textContent = `₹${revenue.toLocaleString()}`;
    document.getElementById("reg-count-badge").textContent = total;
  }

  function renderTable() {
    const query = (searchInput?.value || "").toLowerCase().trim();
    const filter = filterPayment?.value || "all";
    const tbody = document.getElementById("table-body");
    const emptyState = document.getElementById("empty-state");
    const showingCount = document.getElementById("showing-count");

    if (!tbody) return;
    tbody.innerHTML = "";

    const filtered = registrations.filter(item => {
      const matchQuery = !query ||
        (item.name && item.name.toLowerCase().includes(query)) ||
        (item.campus && item.campus.toLowerCase().includes(query)) ||
        (item.className && item.className.toLowerCase().includes(query)) ||
        (item.phone && item.phone.includes(query)) ||
        (item.id && item.id.toLowerCase().includes(query));

      const isOnline = (item.paymentMethod || "").toLowerCase() === "online" || item.paid === "yes";
      const isVenue = (item.paymentMethod || "").toLowerCase() === "venue" && item.paid !== "yes";
      const isVerified = (item.status || "").toLowerCase().includes("verified");
      const isPending = (item.status || "").toLowerCase().includes("pending");

      let matchFilter = true;
      if (filter === "online") matchFilter = isOnline;
      else if (filter === "venue") matchFilter = isVenue;
      else if (filter === "verified") matchFilter = isVerified;
      else if (filter === "pending") matchFilter = isPending;

      return matchQuery && matchFilter;
    });

    showingCount.textContent = filtered.length;

    if (filtered.length === 0) {
      emptyState.style.display = "block";
      return;
    } else {
      emptyState.style.display = "none";
    }

    filtered.forEach((r, idx) => {
      const tr = document.createElement("tr");
      const isOnline = (r.paymentMethod || "").toLowerCase() === "online" || r.paid === "yes";
      const isVerified = (r.status || "").toLowerCase().includes("verified");

      const proofHtml = r.paymentProof
        ? `<button class="btn-proof-thumb" onclick="window.viewProof('${escapeHtml(r.id)}')">📷 View</button>`
        : `<span style="color:#aaa; font-size:0.75rem;">None</span>`;

      const statusBadge = `<span class="${isVerified ? 'badge-paid' : 'badge-venue'}" style="cursor:pointer;" onclick="window.toggleStatus('${escapeHtml(r.id)}')" title="Click to toggle status">${escapeHtml(r.status || (isOnline ? 'Verified' : 'Pending'))} ⟳</span>`;

      tr.innerHTML = `
        <td><strong>${escapeHtml(r.id)}</strong></td>
        <td>
          <a href="javascript:void(0)" onclick="window.viewDetails('${escapeHtml(r.id)}')" style="color:#fff; font-weight:700; text-decoration:underline;">
            ${escapeHtml(r.name)}
          </a>
        </td>
        <td>${escapeHtml(r.campus)}</td>
        <td>${escapeHtml(r.className)}</td>
        <td>
          <div style="display:flex; align-items:center; gap:6px;">
            <a href="tel:${escapeHtml(r.phone)}" style="color:var(--o); font-weight:600;">${escapeHtml(r.phone)}</a>
            <a href="https://wa.me/91${escapeHtml(r.phone)}" target="_blank" title="Chat on WhatsApp" style="color:#25D366; font-size:0.9rem;">💬</a>
          </div>
        </td>
        <td><span class="${isOnline ? 'badge-paid' : 'badge-venue'}">${isOnline ? 'ONLINE (₹69)' : 'VENUE (₹69)'}</span></td>
        <td>${proofHtml}</td>
        <td>${statusBadge}</td>
        <td style="color:#888; font-size:0.75rem;">${formatDate(r.timestamp)}</td>
        <td>
          <div style="display:flex; gap:6px; align-items:center;">
            <button class="btn-proof-thumb" onclick="window.viewDetails('${escapeHtml(r.id)}')">👁 Details</button>
            <button class="btn-delete" onclick="window.deleteRecord('${escapeHtml(r.id)}')">✕</button>
          </div>
        </td>
      `;
      tbody.appendChild(tr);
    });
  }

  window.viewDetails = function(id) {
    const r = registrations.find(item => item.id === id);
    if (!r) return;

    const modal = document.getElementById("details-modal");
    const body = document.getElementById("details-modal-body");
    const isOnline = (r.paymentMethod || "").toLowerCase() === "online" || r.paid === "yes";

    body.innerHTML = `
      <div style="display:grid; grid-template-columns: 140px 1fr; gap: 8px 16px; margin-bottom: 20px;">
        <strong style="color:#aaa;">Registration ID:</strong> <span><b style="color:var(--y);">${escapeHtml(r.id)}</b></span>
        <strong style="color:#aaa;">Full Name:</strong> <span><strong>${escapeHtml(r.name)}</strong></span>
        <strong style="color:#aaa;">Campus / College:</strong> <span>${escapeHtml(r.campus)}</span>
        <strong style="color:#aaa;">Class / Course:</strong> <span>${escapeHtml(r.className)}</span>
        <strong style="color:#aaa;">Phone Number:</strong> 
        <span>
          <a href="tel:${escapeHtml(r.phone)}" style="color:var(--o); font-weight:700;">${escapeHtml(r.phone)}</a>
          <a href="https://wa.me/91${escapeHtml(r.phone)}" target="_blank" style="background:#25D366; color:#fff; padding:2px 8px; border-radius:2px; margin-left:8px; font-size:0.75rem;">WhatsApp ↗</a>
        </span>
        <strong style="color:#aaa;">Payment Mode:</strong> <span><b>${isOnline ? 'Online UPI (₹69)' : 'Pay at the Venue (₹69)'}</b></span>
        <strong style="color:#aaa;">Fee Amount:</strong> <span>₹${escapeHtml(String(r.amount || 69))}</span>
        <strong style="color:#aaa;">Status:</strong> <span>${escapeHtml(r.status || 'Verified')}</span>
        <strong style="color:#aaa;">Registration Date:</strong> <span>${formatDate(r.timestamp)}</span>
      </div>

      ${r.paymentProof ? `
        <div style="border-top: 1px solid rgba(255,255,255,0.1); padding-top: 15px; margin-top: 15px;">
          <strong style="display:block; margin-bottom:8px;">Uploaded Payment Proof Screenshot:</strong>
          <img src="${r.paymentProof}" alt="Proof" style="max-width:100%; max-height:350px; object-fit:contain; border:1px solid #444; background:#000; display:block; margin-bottom:10px;">
          <a href="${r.paymentProof}" download="${r.id}_proof.jpg" style="color:var(--o); font-weight:700;">Download Image File ↗</a>
        </div>
      ` : '<p style="color:#777; font-style:italic;">No payment screenshot uploaded (Venue payment).</p>'}
    `;

    modal.style.display = "flex";
  };

  window.viewProof = function(id) {
    const r = registrations.find(item => item.id === id);
    if (!r || !r.paymentProof) return;

    const modal = document.getElementById("proof-modal");
    const img = document.getElementById("modal-proof-img");
    const info = document.getElementById("modal-reg-info");
    const download = document.getElementById("modal-download-btn");
    const waBtn = document.getElementById("modal-wa-btn");

    img.src = r.paymentProof;
    download.href = r.paymentProof;
    download.download = `${r.id}_proof.jpg`;
    info.textContent = `Participant: ${r.name} · Campus: ${r.campus} · Phone: ${r.phone} (ID: ${r.id})`;
    if (waBtn) waBtn.href = `https://wa.me/91${r.phone}?text=${encodeURIComponent(`Hi ${r.name}, your registration (${r.id}) for Media Conclave 2026 has been verified.`)}`;
    
    modal.style.display = "flex";
  };

  window.toggleStatus = function(id) {
    const r = registrations.find(item => item.id === id);
    if (!r) return;

    if ((r.status || "").toLowerCase().includes("verified")) {
      r.status = "Pending (Venue)";
    } else {
      r.status = "Verified";
    }

    saveAndSync();
  };

  window.deleteRecord = function(id) {
    if (!confirm(`Are you sure you want to permanently delete registration record ${id}?`)) return;

    registrations = registrations.filter(r => r.id !== id);
    saveAndSync();
  };

  function saveAndSync() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(registrations));
    localStorage.setItem("medios26_registrations", JSON.stringify(registrations));
    updateStats();
    renderTable();
  }

  function exportToCSV() {
    if (registrations.length === 0) {
      alert("No registration records found to export.");
      return;
    }

    const headers = ["Registration ID", "Timestamp", "Full Name", "Campus", "Class", "Phone Number", "Payment Method", "Paid", "Amount", "Status", "Payment Proof URL"];
    const rows = registrations.map(r => [
      r.id,
      r.timestamp,
      `"${(r.name || '').replace(/"/g, '""')}"`,
      `"${(r.campus || '').replace(/"/g, '""')}"`,
      `"${(r.className || '').replace(/"/g, '""')}"`,
      `"${(r.phone || '').replace(/"/g, '""')}"`,
      r.paymentMethod,
      r.paid,
      r.amount || 69,
      r.status,
      `"${(r.paymentProof && !r.paymentProof.startsWith('data:') ? r.paymentProof : (r.paymentProof ? 'Base64 Encoded Image' : 'None')).replace(/"/g, '""')}"`
    ]);

    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map(e => e.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `Media_Conclave_2026_Registrations_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  function exportToJSON() {
    if (registrations.length === 0) {
      alert("No registration records found to export.");
      return;
    }

    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(registrations, null, 2));
    const link = document.createElement("a");
    link.setAttribute("href", dataStr);
    link.setAttribute("download", `Media_Conclave_2026_Registrations_${new Date().toISOString().slice(0, 10)}.json`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  function loadSettings() {
    if (window.MC_CONFIG) {
      const feeInput = document.getElementById("setting-fee");
      const waInput = document.getElementById("setting-whatsapp");
      const apiInput = document.getElementById("setting-api");

      if (feeInput && window.MC_CONFIG.EVENT) feeInput.value = window.MC_CONFIG.EVENT.fee || 69;
      if (waInput) waInput.value = window.MC_CONFIG.WHATSAPP_NUMBER || "8943318613";
      if (apiInput) apiInput.value = window.MC_CONFIG.API_BASE || "";
    }
  }

  function formatDate(isoStr) {
    if (!isoStr) return "";
    try {
      const d = new Date(isoStr);
      return d.toLocaleDateString("en-IN", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
    } catch {
      return isoStr;
    }
  }

  function escapeHtml(str) {
    if (!str) return "";
    return String(str).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  }
});
