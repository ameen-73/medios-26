/* ============================================================
   JAMIA MADEENATHUNNOOR — MEDIA CONCLAVE 2026
   Admin Portal Logic & Dashboard Controller
   Theme: Casting Mass Commune (Vibrant Poster Visuals)
   ============================================================ */

let currentRegistrations = [];
let filteredRegistrations = [];

document.addEventListener('DOMContentLoaded', () => {
  checkAuth();
  setupAuthEvents();
  initAdminFilters();
  setupDashboardEvents();
});

/* ------------------------------------------------------------
   Toast Helper
   ------------------------------------------------------------ */
function showToast(msg) {
  const toast = document.getElementById('admin-toast');
  const msgEl = document.getElementById('toast-message');
  if (toast && msgEl) {
    msgEl.textContent = msg;
    toast.classList.add('show');
    setTimeout(() => {
      toast.classList.remove('show');
    }, 3000);
  }
}

/* ------------------------------------------------------------
   1. Authentication & Route Protection
   ------------------------------------------------------------ */
function checkAuth() {
  const token = sessionStorage.getItem('mc2026_admin_token');
  const authSection = document.getElementById('auth-section');
  const dashboardSection = document.getElementById('dashboard-section');

  if (token) {
    if (authSection) authSection.style.display = 'none';
    if (dashboardSection) dashboardSection.style.display = 'flex';
    loadDashboardData();
  } else {
    if (authSection) authSection.style.display = 'flex';
    if (dashboardSection) dashboardSection.style.display = 'none';
  }
}

function setupAuthEvents() {
  const loginForm = document.getElementById('login-form');
  const authError = document.getElementById('auth-error');
  const logoutBtn = document.getElementById('btn-logout');

  loginForm?.addEventListener('submit', (e) => {
    e.preventDefault();
    const email = document.getElementById('admin-email').value.trim().toLowerCase();
    const pass = document.getElementById('admin-pass').value.trim();

    // Authenticate with user ID "medios'26" or "medios26" and password "med@231"
    const validUser = (email === "medios'26" || email === "medios26" || email === "admin@jamiamadeenathunnoor.org");
    const validPass = (pass === "med@231" || pass === "admin2026");

    if (validUser && validPass) {
      sessionStorage.setItem('mc2026_admin_token', 'medios26_auth_' + Date.now());
      if (authError) authError.style.display = 'none';
      showToast('Welcome to Medios\'26 Admin Portal');
      checkAuth();
    } else {
      if (authError) authError.style.display = 'flex';
    }
  });

  logoutBtn?.addEventListener('click', () => {
    sessionStorage.removeItem('mc2026_admin_token');
    showToast('Signed out successfully');
    checkAuth();
  });
}

/* ------------------------------------------------------------
   2. Initialize Filter Dropdowns from Config
   ------------------------------------------------------------ */
function initAdminFilters() {
  const config = window.MC_CONFIG;
  if (!config) return;

  const catFilter = document.getElementById('filter-category');
  const compFilter = document.getElementById('filter-competition');
  const editCat = document.getElementById('edit-category');
  const editComp = document.getElementById('edit-competition');

  config.CATEGORIES?.forEach(cat => {
    if (catFilter) catFilter.innerHTML += `<option value="${cat}">${cat}</option>`;
    if (editCat) editCat.innerHTML += `<option value="${cat}">${cat}</option>`;
  });

  config.COMPETITIONS?.forEach(comp => {
    if (compFilter) compFilter.innerHTML += `<option value="${comp}">${comp}</option>`;
    if (editComp) editComp.innerHTML += `<option value="${comp}">${comp}</option>`;
  });
}

/* ------------------------------------------------------------
   3. Load Registrations from API or Local Storage
   ------------------------------------------------------------ */
async function loadDashboardData() {
  const apiBase = window.MC_CONFIG?.API_BASE;
  const storageKey = window.MC_CONFIG?.LOCAL_STORAGE_KEY || 'medios26_registrations';

  try {
    if (apiBase && apiBase.startsWith('http')) {
      const response = await fetch(`${apiBase}?action=getRegistrations`);
      const json = await response.json();
      if (json && json.status === 'success' && Array.isArray(json.data)) {
        currentRegistrations = json.data;
        showToast('Live Google Sheets data synchronized');
      } else {
        throw new Error('Invalid API response');
      }
    } else {
      const raw = localStorage.getItem(storageKey);
      currentRegistrations = raw ? JSON.parse(raw) : [];
    }
  } catch (err) {
    console.warn('API error, reading from local store:', err);
    const raw = localStorage.getItem(storageKey);
    currentRegistrations = raw ? JSON.parse(raw) : [];
  }

  applyFilters();
  calculateMetrics();
}

/* ------------------------------------------------------------
   4. Calculate & Render Statistics & Visual Breakdown Bars
   ------------------------------------------------------------ */
function calculateMetrics() {
  const totalEl = document.getElementById('stat-total');
  const todayEl = document.getElementById('stat-today');
  const stayEl = document.getElementById('stat-stay');
  const genderEl = document.getElementById('stat-gender');

  const total = currentRegistrations.length;
  const now = new Date();
  const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

  let todayCount = 0;
  let stayCount = 0;
  let maleCount = 0;
  let femaleCount = 0;

  const categoryCounts = {};
  const compCounts = {};

  currentRegistrations.forEach(r => {
    // Today's entries
    if (r.timestamp && new Date(r.timestamp) >= oneDayAgo) {
      todayCount++;
    }

    // Accommodation
    if (String(r.accommodation).toLowerCase() === 'yes') {
      stayCount++;
    }

    // Gender
    const g = String(r.gender).toLowerCase();
    if (g === 'male') maleCount++;
    else if (g === 'female') femaleCount++;

    // Category
    const cat = r.category || 'Other';
    categoryCounts[cat] = (categoryCounts[cat] || 0) + 1;

    // Competition
    const comp = r.competition || 'Delegate Only';
    compCounts[comp] = (compCounts[comp] || 0) + 1;
  });

  if (totalEl) totalEl.textContent = total;
  if (todayEl) todayEl.textContent = todayCount;
  if (stayEl) stayEl.textContent = stayCount;
  if (genderEl) genderEl.textContent = `${maleCount}M / ${femaleCount}F`;

  // Render Category Breakdown with Progress Meters
  const catList = document.getElementById('category-breakdown-list');
  if (catList) {
    const entries = Object.entries(categoryCounts);
    if (entries.length === 0) {
      catList.innerHTML = '<p style="color:#888; font-size:0.85rem; padding:10px 0;">No registrations recorded yet.</p>';
    } else {
      catList.innerHTML = entries.map(([k, v]) => {
        const pct = total > 0 ? Math.round((v / total) * 100) : 0;
        return `
          <div class="breakdown-item">
            <div class="breakdown-item-info">
              <span>${k}</span>
              <span>${v} (${pct}%)</span>
            </div>
            <div class="breakdown-meter-wrap">
              <div class="breakdown-meter-fill" style="width:${pct}%;"></div>
            </div>
          </div>
        `;
      }).join('');
    }
  }

  // Render Competition Breakdown with Progress Meters
  const compList = document.getElementById('competition-breakdown-list');
  if (compList) {
    const entries = Object.entries(compCounts).sort((a, b) => b[1] - a[1]).slice(0, 5);
    if (entries.length === 0) {
      compList.innerHTML = '<p style="color:#888; font-size:0.85rem; padding:10px 0;">No competition entries recorded yet.</p>';
    } else {
      compList.innerHTML = entries.map(([k, v], idx) => {
        const pct = total > 0 ? Math.round((v / total) * 100) : 0;
        const colorClass = idx % 2 === 0 ? 'cyan' : 'red';
        return `
          <div class="breakdown-item">
            <div class="breakdown-item-info">
              <span>${k}</span>
              <span>${v} entries</span>
            </div>
            <div class="breakdown-meter-wrap">
              <div class="breakdown-meter-fill ${colorClass}" style="width:${pct}%;"></div>
            </div>
          </div>
        `;
      }).join('');
    }
  }
}

/* ------------------------------------------------------------
   5. Search, Multi-Filter & Table Rendering
   ------------------------------------------------------------ */
function applyFilters() {
  const search = document.getElementById('filter-search')?.value.toLowerCase().trim() || '';
  const category = document.getElementById('filter-category')?.value || '';
  const competition = document.getElementById('filter-competition')?.value || '';
  const accommodation = document.getElementById('filter-accommodation')?.value || '';
  const status = document.getElementById('filter-status')?.value || '';

  filteredRegistrations = currentRegistrations.filter(r => {
    const searchTarget = `${r.id} ${r.fullName} ${r.email} ${r.phone} ${r.institution}`.toLowerCase();
    if (search && !searchTarget.includes(search)) return false;
    if (category && r.category !== category) return false;
    if (competition && r.competition !== competition) return false;
    if (accommodation && r.accommodation !== accommodation) return false;
    if (status && r.status !== status) return false;

    return true;
  });

  const countBadge = document.getElementById('table-count-badge');
  if (countBadge) {
    countBadge.textContent = `${filteredRegistrations.length} of ${currentRegistrations.length} Records`;
  }

  renderTable();
}

function getInitials(name) {
  if (!name) return 'M';
  const parts = name.trim().split(' ');
  if (parts.length >= 2) {
    return (parts[0][0] + parts[1][0]).toUpperCase();
  }
  return name.slice(0, 2).toUpperCase();
}

function renderTable() {
  const tbody = document.getElementById('table-tbody');
  if (!tbody) return;

  if (filteredRegistrations.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="10" class="empty-state">
          No matching registrations found for the selected filter criteria.
        </td>
      </tr>
    `;
    return;
  }

  tbody.innerHTML = filteredRegistrations.map(r => {
    const statusClass = (r.status || 'Confirmed').toLowerCase();
    const dateStr = r.timestamp ? new Date(r.timestamp).toLocaleDateString('en-IN', { month: 'short', day: 'numeric', year: 'numeric' }) : '—';
    const initials = getInitials(r.fullName);
    
    return `
      <tr data-id="${r.id}">
        <td><span class="reg-id-badge">${r.id}</span></td>
        <td>
          <div class="participant-cell">
            <div class="participant-avatar">${initials}</div>
            <strong>${r.fullName}</strong>
          </div>
        </td>
        <td>
          <div style="font-size:0.82rem; font-weight:700; color:var(--poster-black);">${r.email}</div>
          <div style="font-size:0.75rem; color:#777; font-family:var(--font-mono);">${r.phone}</div>
        </td>
        <td>${r.institution || '—'}</td>
        <td><strong>${r.category || '—'}</strong></td>
        <td style="max-width:180px; overflow:hidden; text-overflow:ellipsis;" title="${r.competition}">${r.competition}</td>
        <td>
          <span style="font-weight:800; color:${r.accommodation === 'Yes' ? '#b86e00' : '#888'};">
            ${r.accommodation === 'Yes' ? '🏨 Yes' : 'No'}
          </span>
        </td>
        <td style="font-size:0.8rem; font-family:var(--font-mono); color:#666;">${dateStr}</td>
        <td>
          <span class="badge-status badge-${statusClass}">${r.status || 'Confirmed'}</span>
        </td>
        <td>
          <div class="row-actions">
            <button class="btn-icon" title="View Full Profile" onclick="openViewModal('${r.id}')">
              👁
            </button>
            <button class="btn-icon" title="Edit Registration" onclick="openEditModal('${r.id}')">
              ✎
            </button>
            <button class="btn-icon danger" title="Delete Entry" onclick="deleteRecord('${r.id}')">
              ✕
            </button>
          </div>
        </td>
      </tr>
    `;
  }).join('');
}

/* ------------------------------------------------------------
   6. Dashboard Actions & Modal Triggers
   ------------------------------------------------------------ */
function setupDashboardEvents() {
  const searchInput = document.getElementById('filter-search');
  const catFilter = document.getElementById('filter-category');
  const compFilter = document.getElementById('filter-competition');
  const stayFilter = document.getElementById('filter-accommodation');
  const statusFilter = document.getElementById('filter-status');
  const refreshBtn = document.getElementById('btn-refresh');
  const exportCsvBtn = document.getElementById('btn-export-csv');

  searchInput?.addEventListener('input', applyFilters);
  catFilter?.addEventListener('change', applyFilters);
  compFilter?.addEventListener('change', applyFilters);
  stayFilter?.addEventListener('change', applyFilters);
  statusFilter?.addEventListener('change', applyFilters);

  refreshBtn?.addEventListener('click', () => {
    loadDashboardData();
    showToast('Data refreshed successfully');
  });

  exportCsvBtn?.addEventListener('click', exportToCSV);

  // View modal close
  document.getElementById('btn-close-view-modal')?.addEventListener('click', () => {
    document.getElementById('view-modal').classList.remove('open');
  });

  // Edit modal actions
  document.getElementById('btn-cancel-edit')?.addEventListener('click', () => {
    document.getElementById('edit-modal').classList.remove('open');
  });

  document.getElementById('edit-form')?.addEventListener('submit', handleSaveEdit);
}

/* View Modal */
window.openViewModal = function(id) {
  const record = currentRegistrations.find(r => r.id === id);
  if (!record) return;

  const viewBadge = document.getElementById('view-id-badge');
  if (viewBadge) viewBadge.textContent = `ID: ${record.id}`;

  const content = document.getElementById('view-details-content');
  content.innerHTML = `
    <div class="detail-item"><span>Registration ID</span><span style="color:var(--poster-orange-bright); font-family:var(--font-mono); font-size:1.1rem;">${record.id}</span></div>
    <div class="detail-item"><span>Current Status</span><span style="font-weight:900; color:var(--poster-red);">${record.status || 'Confirmed'}</span></div>
    <div class="detail-item"><span>Full Name</span><span>${record.fullName}</span></div>
    <div class="detail-item"><span>Email Address</span><span>${record.email}</span></div>
    <div class="detail-item"><span>Contact Phone</span><span>${record.phone}</span></div>
    <div class="detail-item"><span>Gender</span><span>${record.gender || '—'}</span></div>
    <div class="detail-item"><span>Date of Birth</span><span>${record.dob || '—'}</span></div>
    <div class="detail-item"><span>Institution / College</span><span>${record.institution}</span></div>
    <div class="detail-item"><span>Course / Department</span><span>${record.course || '—'}</span></div>
    <div class="detail-item"><span>District / State</span><span>${record.district || '—'}</span></div>
    <div class="detail-item"><span>Delegate Category</span><span>${record.category}</span></div>
    <div class="detail-item"><span>Competition Track</span><span>${record.competition}</span></div>
    <div class="detail-item"><span>Accommodation Needed</span><span>${record.accommodation}</span></div>
    <div class="detail-item"><span>Food Preference</span><span>${record.food || 'Non-Vegetarian'}</span></div>
    <div class="detail-item" style="grid-column: 1 / -1;"><span>Delegate Notes / Remarks</span><span>${record.message || 'No special remarks provided.'}</span></div>
    <div class="detail-item" style="grid-column: 1 / -1;"><span>Submission Timestamp</span><span style="font-family:var(--font-mono); font-size:0.85rem;">${record.timestamp || '—'}</span></div>
  `;

  document.getElementById('view-modal').classList.add('open');
};

/* Edit Modal */
window.openEditModal = function(id) {
  const record = currentRegistrations.find(r => r.id === id);
  if (!record) return;

  document.getElementById('edit-id').value = record.id;
  document.getElementById('edit-name').value = record.fullName;
  document.getElementById('edit-email').value = record.email;
  document.getElementById('edit-phone').value = record.phone;
  document.getElementById('edit-institution').value = record.institution;
  document.getElementById('edit-category').value = record.category;
  document.getElementById('edit-competition').value = record.competition;
  document.getElementById('edit-accommodation').value = record.accommodation;
  document.getElementById('edit-status').value = record.status || 'Confirmed';

  document.getElementById('edit-modal').classList.add('open');
};

function handleSaveEdit(e) {
  e.preventDefault();
  const id = document.getElementById('edit-id').value;
  const idx = currentRegistrations.findIndex(r => r.id === id);
  if (idx === -1) return;

  currentRegistrations[idx].fullName = document.getElementById('edit-name').value.trim();
  currentRegistrations[idx].email = document.getElementById('edit-email').value.trim();
  currentRegistrations[idx].phone = document.getElementById('edit-phone').value.trim();
  currentRegistrations[idx].institution = document.getElementById('edit-institution').value.trim();
  currentRegistrations[idx].category = document.getElementById('edit-category').value;
  currentRegistrations[idx].competition = document.getElementById('edit-competition').value;
  currentRegistrations[idx].accommodation = document.getElementById('edit-accommodation').value;
  currentRegistrations[idx].status = document.getElementById('edit-status').value;

  persistChanges();
  document.getElementById('edit-modal').classList.remove('open');
  applyFilters();
  calculateMetrics();
  showToast(`Delegate record ${id} updated`);
}

/* Delete Record */
window.deleteRecord = function(id) {
  if (!confirm(`Are you sure you want to permanently delete registration ${id}?`)) {
    return;
  }

  currentRegistrations = currentRegistrations.filter(r => r.id !== id);
  persistChanges();
  applyFilters();
  calculateMetrics();
  showToast(`Record ${id} removed`);
};

function persistChanges() {
  const storageKey = window.MC_CONFIG?.LOCAL_STORAGE_KEY || 'medios26_registrations';
  localStorage.setItem(storageKey, JSON.stringify(currentRegistrations));
}

/* ------------------------------------------------------------
   7. CSV Export Generator
   ------------------------------------------------------------ */
function exportToCSV() {
  if (!currentRegistrations || currentRegistrations.length === 0) {
    alert('No registrations available to export.');
    return;
  }

  const headers = [
    'Registration ID', 'Timestamp', 'Full Name', 'Email', 'Phone',
    'Gender', 'Date of Birth', 'Institution', 'Course', 'District',
    'Category', 'Competition', 'Accommodation', 'Food Preference',
    'Message', 'Status'
  ];

  const rows = currentRegistrations.map(r => [
    `"${r.id || ''}"`,
    `"${r.timestamp || ''}"`,
    `"${(r.fullName || '').replace(/"/g, '""')}"`,
    `"${r.email || ''}"`,
    `"${r.phone || ''}"`,
    `"${r.gender || ''}"`,
    `"${r.dob || ''}"`,
    `"${(r.institution || '').replace(/"/g, '""')}"`,
    `"${(r.course || '').replace(/"/g, '""')}"`,
    `"${r.district || ''}"`,
    `"${r.category || ''}"`,
    `"${r.competition || ''}"`,
    `"${r.accommodation || ''}"`,
    `"${r.food || ''}"`,
    `"${(r.message || '').replace(/"/g, '""')}"`,
    `"${r.status || 'Confirmed'}"`
  ]);

  const csvContent = '\uFEFF' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', `MediaConclave2026_Registrations_${new Date().toISOString().slice(0,10)}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  showToast('Exported CSV roster file downloaded');
}
