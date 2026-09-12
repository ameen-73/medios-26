/**
 * JAMIA MADEENATHUNNOOR — MEDIA CONCLAVE 2026
 * Admin Portal Script
 */

const DEFAULT_USER = "medios'26";
const DEFAULT_PASS = "med@231";
const AUTH_KEY = "mc26_admin_authenticated";

let registrations = [];

document.addEventListener("DOMContentLoaded", () => {
  // Elements
  const authSection = document.getElementById("auth-section");
  const adminSection = document.getElementById("admin-section");
  const loginForm = document.getElementById("login-form");
  const authError = document.getElementById("auth-error");
  const logoutBtn = document.getElementById("logout-btn");
  const refreshBtn = document.getElementById("refresh-btn");
  const exportBtn = document.getElementById("export-csv-btn");
  const searchInput = document.getElementById("search-input");
  const filterPayment = document.getElementById("filter-payment");
  const navReg = document.getElementById("nav-reg");
  const navSettings = document.getElementById("nav-settings");
  const tabReg = document.getElementById("tab-registrations");
  const tabSettings = document.getElementById("tab-settings");
  const proofModal = document.getElementById("proof-modal");
  const modalCloseBtn = document.getElementById("modal-close-btn");
  const saveSettingsBtn = document.getElementById("save-settings-btn");

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
  if (exportBtn) exportBtn.addEventListener("click", exportToCSV);

  // Search & Filter
  if (searchInput) searchInput.addEventListener("input", renderTable);
  if (filterPayment) filterPayment.addEventListener("change", renderTable);

  // Proof Modal Close
  if (modalCloseBtn) {
    modalCloseBtn.addEventListener("click", () => {
      proofModal.style.display = "none";
    });
  }
  if (proofModal) {
    proofModal.addEventListener("click", (e) => {
      if (e.target === proofModal) proofModal.style.display = "none";
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
    // 1. Load from localStorage
    const localData = JSON.parse(localStorage.getItem(window.MC_CONFIG?.LOCAL_STORAGE_KEY || "medios26_registrations_v2") || "[]");
    registrations = localData;

    // 2. Fetch from Google Apps Script Web App if configured
    if (window.MC_CONFIG?.API_BASE && !window.MC_CONFIG.API_BASE.includes("AKfycbx...")) {
      try {
        const res = await fetch(`${window.MC_CONFIG.API_BASE}?action=getRegistrations`);
        const json = await res.json();
        if (json && json.status === "success" && Array.isArray(json.data)) {
          // Merge remote records with local records avoiding duplicates
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
        console.warn("Backend fetch failed, using local storage:", err);
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
      phone: r.phone || r["Phone"] || r["Phone Number"] || "",
      paymentMethod: (r.paymentMethod || r["Payment Method"] || "online").toLowerCase(),
      paid: r.paid || r["Paid"] || (r.paymentMethod === "online" ? "yes" : "no"),
      amount: r.amount || r["Amount"] || 69,
      paymentProof: r.paymentProof || r["Payment Proof"] || "",
      status: r.status || r["Status"] || "Verified"
    };
  }

  function updateStats() {
    const total = registrations.length;
    const online = registrations.filter(r => r.paymentMethod === "online" || r.paid === "yes").length;
    const venue = registrations.filter(r => r.paymentMethod === "venue" && r.paid !== "yes").length;
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

      const matchFilter = filter === "all" ||
        (filter === "online" && (item.paymentMethod === "online" || item.paid === "yes")) ||
        (filter === "venue" && item.paymentMethod === "venue" && item.paid !== "yes");

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
      const isOnline = r.paymentMethod === "online" || r.paid === "yes";

      const proofHtml = r.paymentProof
        ? `<button class="btn-proof-thumb" onclick="window.viewProof(${idx})">📷 View Proof</button>`
        : `<span style="color:#aaa; font-size:0.75rem;">None</span>`;

      tr.innerHTML = `
        <td><strong>${escapeHtml(r.id)}</strong></td>
        <td>${escapeHtml(r.name)}</td>
        <td>${escapeHtml(r.campus)}</td>
        <td>${escapeHtml(r.className)}</td>
        <td><a href="tel:${escapeHtml(r.phone)}" style="color:var(--o); font-weight:600;">${escapeHtml(r.phone)}</a></td>
        <td><span class="${isOnline ? 'badge-paid' : 'badge-venue'}">${isOnline ? 'ONLINE (₹69)' : 'VENUE (₹69)'}</span></td>
        <td>${proofHtml}</td>
        <td>${escapeHtml(r.status || 'Verified')}</td>
        <td style="color:#777; font-size:0.75rem;">${formatDate(r.timestamp)}</td>
        <td>
          <button class="btn-delete" onclick="window.deleteRecord('${escapeHtml(r.id)}')">✕</button>
        </td>
      `;
      tbody.appendChild(tr);
    });
  }

  window.viewProof = function(index) {
    const r = registrations[index];
    if (!r || !r.paymentProof) return;

    const modal = document.getElementById("proof-modal");
    const img = document.getElementById("modal-proof-img");
    const info = document.getElementById("modal-reg-info");
    const download = document.getElementById("modal-download-btn");

    img.src = r.paymentProof;
    download.href = r.paymentProof;
    download.download = `${r.id}_proof.jpg`;
    info.textContent = `Participant: ${r.name} (${r.phone}) · ID: ${r.id}`;
    modal.style.display = "flex";
  };

  window.deleteRecord = function(id) {
    if (!confirm(`Are you sure you want to remove registration ${id}?`)) return;

    registrations = registrations.filter(r => r.id !== id);
    localStorage.setItem(window.MC_CONFIG?.LOCAL_STORAGE_KEY || "medios26_registrations_v2", JSON.stringify(registrations));
    updateStats();
    renderTable();
  };

  function exportToCSV() {
    if (registrations.length === 0) {
      alert("No registration records to export.");
      return;
    }

    const headers = ["Registration ID", "Timestamp", "Name", "Campus", "Class", "Phone", "Payment Method", "Paid", "Amount", "Status"];
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
      r.status
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
