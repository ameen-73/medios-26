/**
 * JAMIA MADEENATHUNNOOR — MEDIA CONCLAVE 2026
 * Admin Portal Controller & Live Real-Time Data Sync
 */

const DEFAULT_USER = "medios'26";
const DEFAULT_PASS = "med@231";
const AUTH_KEY = "mc26_admin_authenticated";
const STORAGE_KEY = "medios26_registrations_v2";
const DELETED_KEY = "mc26_deleted_ids_v1";
const STATUS_OVERRIDES_KEY = "mc26_status_overrides_v1";

let registrations = [];
let syncChannel = null;

function getStatusOverrides() {
  try {
    return JSON.parse(localStorage.getItem(STATUS_OVERRIDES_KEY) || "{}");
  } catch {
    return {};
  }
}

function saveStatusOverride(id, status) {
  if (!id) return;
  try {
    const overrides = getStatusOverrides();
    overrides[String(id).trim()] = {
      status: status,
      updatedAt: new Date().toISOString()
    };
    localStorage.setItem(STATUS_OVERRIDES_KEY, JSON.stringify(overrides));
  } catch (e) {
    console.warn("Status override save error:", e);
  }
}

function showToast(message, type = "success") {
  let toast = document.getElementById("admin-toast");
  if (!toast) {
    toast = document.createElement("div");
    toast.id = "admin-toast";
    document.body.appendChild(toast);
  }
  toast.textContent = message;
  toast.className = `admin-toast show ${type}`;
  clearTimeout(toast._timeout);
  toast._timeout = setTimeout(() => {
    toast.className = "admin-toast";
  }, 2800);
}

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
      syncChannel = new BroadcastChannel("medios26_sync");
      syncChannel.onmessage = (event) => {
        if (event.data && (event.data.type === "NEW_REGISTRATION" || event.data.type === "STATUS_UPDATE")) {
          loadRegistrations();
        }
      };
    }
  } catch (e) {
    console.warn("BroadcastChannel error:", e);
  }

  // Also listen to window storage event for real-time update
  window.addEventListener("storage", (e) => {
    if (e.key === STORAGE_KEY || e.key === "medios26_registrations" || e.key === STATUS_OVERRIDES_KEY) {
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
  if (refreshBtn) {
    refreshBtn.addEventListener("click", () => {
      refreshBtn.textContent = "⏳ Loading…";
      loadRegistrations().finally(() => {
        refreshBtn.textContent = "🔄 Refresh";
      });
    });
  }
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
      const groupWhatsapp = document.getElementById("setting-group-whatsapp")?.value;
      const api = document.getElementById("setting-api").value;

      if (window.MC_CONFIG) {
        if (window.MC_CONFIG.EVENT) window.MC_CONFIG.EVENT.fee = Number(fee);
        window.MC_CONFIG.WHATSAPP_NUMBER = whatsapp;
        if (groupWhatsapp) window.MC_CONFIG.WHATSAPP_GROUP_URL = groupWhatsapp;
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

  function getDeletedIds() {
    try {
      return new Set(JSON.parse(localStorage.getItem(DELETED_KEY) || "[]"));
    } catch {
      return new Set();
    }
  }

  function addDeletedId(id) {
    if (!id) return;
    try {
      const set = getDeletedIds();
      set.add(String(id).trim());
      localStorage.setItem(DELETED_KEY, JSON.stringify(Array.from(set)));
    } catch (e) {
      console.warn("Deleted ID save error:", e);
    }
  }

  async function loadRegistrations() {
    const deletedIds = getDeletedIds();
    const overrides = getStatusOverrides();

    // 1. Fetch from LocalStorage
    let localData = [];
    try {
      localData = JSON.parse(localStorage.getItem(STORAGE_KEY) || localStorage.getItem("medios26_registrations") || "[]");
    } catch (e) {
      localData = [];
    }

    // Clean and filter local data
    localData = localData
      .map(cleanRecord)
      .filter(r => r && isValidRecord(r) && !deletedIds.has(String(r.id).trim()))
      .map(r => {
        if (overrides[r.id] && overrides[r.id].status) {
          r.status = overrides[r.id].status;
        }
        return r;
      });

    registrations = localData;

    // 2. Fetch from Google Apps Script Web App API if available
    if (window.MC_CONFIG?.API_BASE && !window.MC_CONFIG.API_BASE.includes("AKfycbx...")) {
      try {
        const res = await fetch(`${window.MC_CONFIG.API_BASE}?action=getRegistrations&_t=${Date.now()}`);
        const json = await res.json();
        if (json && json.status === "success" && Array.isArray(json.data)) {
          const remoteRecords = json.data
            .map(cleanRecord)
            .filter(r => r && isValidRecord(r) && !deletedIds.has(String(r.id).trim()))
            .map(r => {
              // Apply persistent status overrides if any exist locally
              if (overrides[r.id] && overrides[r.id].status) {
                r.status = overrides[r.id].status;
              }
              return r;
            });

          const merged = [...remoteRecords];

          // Include local-only unsynced records
          localData.forEach(item => {
            if (!merged.some(m => m.id === item.id)) {
              merged.unshift(item);
            }
          });

          registrations = merged;
          localStorage.setItem(STORAGE_KEY, JSON.stringify(registrations));
          localStorage.setItem("medios26_registrations", JSON.stringify(registrations));
        }
      } catch (err) {
        console.warn("Remote backend fetch error (using clean localStorage):", err);
      }
    }

    updateStats();
    renderTable();
  }

  function isValidRecord(r) {
    if (!r || !r.id) return false;
    const id = String(r.id).trim().toLowerCase();
    if (id === "registration id" || id === "reg id" || id === "id" || id === "undefined" || id === "null") {
      return false;
    }
    const name = String(r.name || "").trim().toLowerCase();
    if (name === "name" || name === "full name" || name === "fullname") {
      return false;
    }
    return true;
  }

  function formatImageUrl(url) {
    if (!url) return "";
    url = String(url).trim();
    if (url.startsWith("data:image")) return url;
    if (url.includes("Exception:") || url.includes("upload failed")) return "";

    const driveMatch = url.match(/\/d\/([a-zA-Z0-9_-]+)/) || url.match(/id=([a-zA-Z0-9_-]+)/);
    if (driveMatch && driveMatch[1]) {
      const fileId = driveMatch[1];
      return `https://drive.google.com/thumbnail?id=${fileId}&sz=w1200`;
    }
    return url;
  }

  /**
   * Universal Smart Record Cleaner:
   * Accurately detects and resolves swapped/shifted columns from legacy Google Sheets
   */
  function cleanRecord(r) {
    if (!r) return null;

    let id = String(r.id || r["Registration ID"] || r["id"] || "").trim();
    if (typeof id === "number") id = "MC26-" + id;

    let timestamp = r.timestamp || r["Timestamp"] || r.createdAt || "";
    if (timestamp === "Timestamp" || !isValidDate(timestamp)) {
      timestamp = new Date().toISOString();
    }

    let name = r.name || r["Full Name"] || r["Name"] || r.fullName || "";
    let campus = r.campus || r["Campus"] || r["Campus Name"] || r["Institution"] || "";
    let className = r.className || r["Class"] || r["Course / Class"] || r.class || "";
    let phone = String(r.phone || r["Phone"] || r["Phone Number"] || r.mobile || "").replace(/^'/, "").trim();
    let paymentMethod = (r.paymentMethod || r["Payment Method"] || "online").toLowerCase();
    let paid = (r.paid || (paymentMethod === "online" ? "yes" : "no")).toLowerCase();
    let amount = 69;
    let paymentProof = r.paymentProof || r["Payment Proof URL"] || r["Payment Proof"] || r.proof || "";
    let status = r.status || r["Status"] || "";

    // 1. Detect if shifted from legacy Google Sheet (where className was 69, campus was "yes", phone was class name)
    const isShifted = (className === 69 || className === "69" || campus.toLowerCase() === "yes" || campus.toLowerCase() === "online");

    if (isShifted) {
      // If phone holds "plustwo" or "5", that's the real class
      if (!/^\d{10}$/.test(phone)) {
        className = phone;
        phone = "";
      } else {
        className = "";
      }
      campus = "";
    }

    // 2. Cross-reference with LocalStorage data and overrides to restore true values
    try {
      const localDataList = JSON.parse(localStorage.getItem(STORAGE_KEY) || localStorage.getItem("medios26_registrations") || "[]");
      const localMatch = localDataList.find(item => item && String(item.id).trim() === id);
      if (localMatch) {
        if (localMatch.name) name = localMatch.name;
        if (localMatch.campus && localMatch.campus.toLowerCase() !== "yes") campus = localMatch.campus;
        if (localMatch.className && localMatch.className !== 69 && localMatch.className !== "69") className = localMatch.className;
        if (localMatch.phone && /^\d{10}$/.test(localMatch.phone)) phone = localMatch.phone;
        if (localMatch.paymentProof && localMatch.paymentProof.startsWith("data:image")) paymentProof = localMatch.paymentProof;
        if (localMatch.status) status = localMatch.status;
      }

      // Check status override map
      const overrides = getStatusOverrides();
      if (overrides[id] && overrides[id].status) {
        status = overrides[id].status;
      }
    } catch (e) {
      console.warn("Local storage cross-reference notice:", e);
    }

    // 3. Fallback phone finder across any object key if still missing
    if (!/^\d{10}$/.test(phone)) {
      for (let k in r) {
        const val = String(r[k] || "").replace(/^'/, "").trim();
        if (/^[6-9]\d{9}$/.test(val) || /^\d{10}$/.test(val)) {
          phone = val;
          break;
        }
      }
    }

    // Clean placeholders
    if (name === "Name" || name === "Full Name" || name === "Registration ID") name = "";
    if (campus === "Campus" || campus === "Institution" || campus === "yes" || campus === "online") campus = "";
    if (className === "Class" || className === "Course / Class" || className === "69" || className === 69) className = "";
    if (phone === "Phone" || phone === "Phone Number" || phone === "5" || phone === "plustwo") phone = "";

    paymentMethod = paymentMethod.includes("venue") ? "venue" : "online";
    status = (status === "STATUS" || !status) ? (paymentMethod === "venue" ? "Pending (Venue)" : "Verified") : status;

    return {
      id: id,
      timestamp: timestamp,
      name: name,
      campus: campus,
      className: className,
      phone: phone,
      paymentMethod: paymentMethod,
      paid: paid,
      amount: 69,
      paymentProof: formatImageUrl(paymentProof),
      rawProof: paymentProof,
      status: status
    };
  }

  function isValidDate(d) {
    if (!d) return false;
    const time = new Date(d).getTime();
    return !isNaN(time);
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
      const isVerified = (item.status || "").toLowerCase().includes("verified") || (item.status || "").toLowerCase().includes("confirmed");
      const isPending = !isVerified || (item.status || "").toLowerCase().includes("pending");

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

    filtered.forEach((r) => {
      const tr = document.createElement("tr");
      const isOnline = (r.paymentMethod || "").toLowerCase() === "online" || r.paid === "yes";
      const isVerified = (r.status || "").toLowerCase().includes("verified") || (r.status || "").toLowerCase().includes("confirmed");

      const hasProof = r.paymentProof && (r.paymentProof.startsWith("data:image") || r.paymentProof.startsWith("http"));
      const proofHtml = hasProof
        ? `<button class="btn-proof-thumb" onclick="window.viewProof('${escapeHtml(r.id)}')">📷 View</button>`
        : `<span style="color:#aaa; font-size:0.75rem;">None</span>`;

      const statusBadge = `
        <button 
          class="badge-status-btn ${isVerified ? 'badge-paid' : 'badge-venue'}" 
          onclick="window.toggleStatus('${escapeHtml(r.id)}')" 
          title="Click to toggle Verified / Pending status">
          ${isVerified ? '✓ Verified' : '⏳ Pending'} ⟳
        </button>
      `;

      // Name in solid black with bold weight
      const nameHtml = `
        <a href="javascript:void(0)" onclick="window.viewDetails('${escapeHtml(r.id)}')" style="color:#0c0b0b !important; font-weight:800; font-size:0.95rem; text-decoration:none; display:inline-block;">
          ${escapeHtml(r.name || 'Participant')}
        </a>
      `;

      tr.innerHTML = `
        <td><strong style="color:#0c0b0b;">${escapeHtml(r.id)}</strong></td>
        <td>${nameHtml}</td>
        <td style="color:#222; font-weight:600;">${escapeHtml(r.campus || '—')}</td>
        <td style="color:#222; font-weight:600;">${escapeHtml(r.className || '—')}</td>
        <td>
          <div style="display:flex; align-items:center; gap:6px;">
            ${r.phone ? `<a href="tel:${escapeHtml(r.phone)}" style="color:var(--o); font-weight:700;">${escapeHtml(r.phone)}</a>` : '<span style="color:#777;">—</span>'}
            ${r.phone ? `<a href="https://wa.me/91${escapeHtml(r.phone)}" target="_blank" title="Chat on WhatsApp" style="color:#25D366; font-size:0.9rem;">💬</a>` : ''}
          </div>
        </td>
        <td><span class="${isOnline ? 'badge-paid' : 'badge-venue'}">${isOnline ? 'ONLINE (₹69)' : 'VENUE (₹69)'}</span></td>
        <td>${proofHtml}</td>
        <td>${statusBadge}</td>
        <td style="color:#777; font-size:0.75rem;">${formatDate(r.timestamp)}</td>
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

  window.viewDetails = function (id) {
    const r = registrations.find(item => item.id === id);
    if (!r) return;

    const modal = document.getElementById("details-modal");
    const body = document.getElementById("details-modal-body");
    const isOnline = (r.paymentMethod || "").toLowerCase() === "online" || r.paid === "yes";
    const isVerified = (r.status || "").toLowerCase().includes("verified") || (r.status || "").toLowerCase().includes("confirmed");
    const hasProof = r.paymentProof && (r.paymentProof.startsWith("data:image") || r.paymentProof.startsWith("http"));

    body.innerHTML = `
      <div style="display:grid; grid-template-columns: 140px 1fr; gap: 8px 16px; margin-bottom: 20px;">
        <strong style="color:#aaa;">Registration ID:</strong> <span><b style="color:var(--y);">${escapeHtml(r.id)}</b></span>
        <strong style="color:#aaa;">Full Name:</strong> <span><strong style="color:#fff; font-size:1.1rem;">${escapeHtml(r.name || '—')}</strong></span>
        <strong style="color:#aaa;">Campus / College:</strong> <span><b style="color:#fff;">${escapeHtml(r.campus || '—')}</b></span>
        <strong style="color:#aaa;">Class / Course:</strong> <span><b style="color:#fff;">${escapeHtml(r.className || '—')}</b></span>
        <strong style="color:#aaa;">Phone Number:</strong> 
        <span>
          ${r.phone ? `<a href="tel:${escapeHtml(r.phone)}" style="color:var(--o); font-weight:700;">${escapeHtml(r.phone)}</a>` : '—'}
          ${r.phone ? `<a href="https://wa.me/91${escapeHtml(r.phone)}" target="_blank" style="background:#25D366; color:#fff; padding:2px 8px; border-radius:2px; margin-left:8px; font-size:0.75rem;">WhatsApp ↗</a>` : ''}
        </span>
        <strong style="color:#aaa;">Payment Mode:</strong> <span><b>${isOnline ? 'Online UPI (₹69)' : 'Pay at the Venue (₹69)'}</b></span>
        <strong style="color:#aaa;">Fee Amount:</strong> <span>₹${escapeHtml(String(r.amount || 69))}</span>
        <strong style="color:#aaa;">Verification Status:</strong> 
        <span>
          <button 
            class="badge-status-btn ${isVerified ? 'badge-paid' : 'badge-venue'}" 
            onclick="window.toggleStatus('${escapeHtml(r.id)}'); window.viewDetails('${escapeHtml(r.id)}');" 
            title="Click to toggle status">
            ${isVerified ? '✓ Verified' : '⏳ Pending'} ⟳ (Click to Toggle)
          </button>
        </span>
        <strong style="color:#aaa;">Registration Date:</strong> <span>${formatDate(r.timestamp)}</span>
      </div>

      ${hasProof ? `
        <div style="border-top: 1px solid rgba(255,255,255,0.1); padding-top: 15px; margin-top: 15px;">
          <strong style="display:block; margin-bottom:8px;">Uploaded Payment Proof Screenshot:</strong>
          <img src="${r.paymentProof}" alt="Proof" style="max-width:100%; max-height:380px; object-fit:contain; border:1px solid #444; background:#000; display:block; margin-bottom:10px;" onerror="this.style.display='none';">
          <div style="display:flex; gap:12px; align-items:center;">
            <a href="${r.paymentProof}" target="_blank" download="${r.id}_proof.jpg" style="color:var(--o); font-weight:700;">Open / Download Image ↗</a>
          </div>
        </div>
      ` : '<p style="color:#777; font-style:italic;">No payment screenshot uploaded (Venue payment or pending proof).</p>'}
    `;

    modal.style.display = "flex";
  };

  window.viewProof = function (id) {
    const r = registrations.find(item => item.id === id);
    if (!r || !r.paymentProof) return;

    const modal = document.getElementById("proof-modal");
    const img = document.getElementById("modal-proof-img");
    const info = document.getElementById("modal-reg-info");
    const download = document.getElementById("modal-download-btn");
    const waBtn = document.getElementById("modal-wa-btn");

    img.src = r.paymentProof;
    download.href = r.paymentProof;
    download.target = "_blank";
    download.download = `${r.id}_proof.jpg`;
    info.textContent = `Participant: ${r.name || 'Participant'} · Campus: ${r.campus || '—'} · Class: ${r.className || '—'} · Phone: ${r.phone || '—'} (ID: ${r.id})`;

    if (waBtn && r.phone) {
      waBtn.href = `https://wa.me/91${r.phone}?text=${encodeURIComponent(`Hi ${r.name || ''}, your registration (${r.id}) for Media Conclave 2026 has been verified.`)}`;
      waBtn.style.display = "inline-block";
    } else if (waBtn) {
      waBtn.style.display = "none";
    }

    modal.style.display = "flex";
  };

  window.toggleStatus = function (id) {
    const r = registrations.find(item => item.id === id);
    if (!r) return;

    const isCurrentlyVerified = (r.status || "").toLowerCase().includes("verified") || (r.status || "").toLowerCase().includes("confirmed");
    const newStatus = isCurrentlyVerified ? "Pending (Venue)" : "Verified";
    
    r.status = newStatus;
    saveStatusOverride(id, newStatus);
    saveAndSync();

    showToast(`Registration ${id} marked as ${newStatus}`, newStatus === "Verified" ? "success" : "warning");

    // Broadcast update across open browser tabs
    if (syncChannel) {
      try {
        syncChannel.postMessage({ type: "STATUS_UPDATE", id: id, status: newStatus });
      } catch (e) {}
    }

    // Async update to Google Apps Script
    syncStatusToBackend(id, newStatus);
  };

  function syncStatusToBackend(id, status) {
    if (!window.MC_CONFIG?.API_BASE || window.MC_CONFIG.API_BASE.includes("AKfycbx...")) return;
    
    // 1. GET with cache-busting
    const getUrl = `${window.MC_CONFIG.API_BASE}?action=updateStatus&id=${encodeURIComponent(id)}&status=${encodeURIComponent(status)}&_t=${Date.now()}`;
    fetch(getUrl, { mode: "no-cors", cache: "no-store" })
      .catch(err => console.warn("GET status update notice:", err));

    // 2. POST payload to guarantee update
    try {
      fetch(window.MC_CONFIG.API_BASE, {
        method: "POST",
        mode: "no-cors",
        headers: { "Content-Type": "text/plain" },
        body: JSON.stringify({
          action: "updateStatus",
          id: id,
          status: status
        })
      }).catch(() => {});
    } catch (e) {}
  }

  window.deleteRecord = function (id) {
    if (!confirm(`Are you sure you want to permanently delete registration record ${id}?`)) return;

    // 1. Add to permanent deleted blacklist
    addDeletedId(id);

    // 2. Remove from active state
    registrations = registrations.filter(r => r.id !== id);
    saveAndSync();

    // 3. Send remote delete command to Google Apps Script
    if (window.MC_CONFIG?.API_BASE && !window.MC_CONFIG.API_BASE.includes("AKfycbx...")) {
      fetch(`${window.MC_CONFIG.API_BASE}?action=deleteRegistration&id=${encodeURIComponent(id)}`, {
        mode: "no-cors"
      }).catch(err => console.warn("Remote delete warning:", err));
    }
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
      `"${(r.paymentProof || '').replace(/"/g, '""')}"`
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
      const groupWaInput = document.getElementById("setting-group-whatsapp");
      const apiInput = document.getElementById("setting-api");

      if (feeInput && window.MC_CONFIG.EVENT) feeInput.value = window.MC_CONFIG.EVENT.fee || 69;
      if (waInput) waInput.value = window.MC_CONFIG.WHATSAPP_NUMBER || "7356217409";
      if (groupWaInput) groupWaInput.value = window.MC_CONFIG.WHATSAPP_GROUP_URL || "https://chat.whatsapp.com/J3MuwpCT0JPCCyANZIxfWH";
      if (apiInput) apiInput.value = window.MC_CONFIG.API_BASE || "";
    }
  }

  function formatDate(isoStr) {
    if (!isoStr || !isValidDate(isoStr)) return "—";
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
