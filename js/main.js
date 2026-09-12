/* ============================================================
   JAMIA MADEENATHUNNOOR — MEDIA CONCLAVE 2026
   Client-Side Application & Form Logic
   ============================================================ */

document.addEventListener('DOMContentLoaded', () => {
  initDropdowns();
  initCountdown();
  initNavigation();
  initRegistrationForm();
  initScheduleTabs();
  seedSampleRegistrationsIfEmpty();
});

/* ------------------------------------------------------------
   1. Populate Dropdown Selects from Config
   ------------------------------------------------------------ */
function initDropdowns() {
  const config = window.MC_CONFIG;
  if (!config) return;

  populateSelect('district', config.DISTRICTS);
  populateSelect('category', config.CATEGORIES);
  populateSelect('competition', config.COMPETITIONS);
  populateSelect('food', config.FOOD_PREFERENCES);
}

function populateSelect(elementId, items) {
  const select = document.getElementById(elementId);
  if (!select || !Array.isArray(items)) return;

  items.forEach(item => {
    const opt = document.createElement('option');
    opt.value = item;
    opt.textContent = item;
    select.appendChild(opt);
  });
}

/* ------------------------------------------------------------
   2. Live Countdown Timer
   ------------------------------------------------------------ */
function initCountdown() {
  const targetDate = new Date(window.MC_CONFIG?.EVENT?.dateISO || '2026-09-17T09:00:00+05:30').getTime();

  const daysEl = document.getElementById('cd-days');
  const hoursEl = document.getElementById('cd-hours');
  const minsEl = document.getElementById('cd-mins');
  const secsEl = document.getElementById('cd-secs');

  if (!daysEl || !hoursEl || !minsEl || !secsEl) return;

  function updateTimer() {
    const now = new Date().getTime();
    const distance = targetDate - now;

    if (distance < 0) {
      daysEl.textContent = '00';
      hoursEl.textContent = '00';
      minsEl.textContent = '00';
      secsEl.textContent = '00';
      return;
    }

    const days = Math.floor(distance / (1000 * 60 * 60 * 24));
    const hours = Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const mins = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));
    const secs = Math.floor((distance % (1000 * 60)) / 1000);

    daysEl.textContent = String(days).padStart(2, '0');
    hoursEl.textContent = String(hours).padStart(2, '0');
    minsEl.textContent = String(mins).padStart(2, '0');
    secsEl.textContent = String(secs).padStart(2, '0');
  }

  updateTimer();
  setInterval(updateTimer, 1000);
}

/* ------------------------------------------------------------
   3. Header Navigation, Scroll Spy & Mobile Menu
   ------------------------------------------------------------ */
function initNavigation() {
  const header = document.getElementById('navbar');
  const hamburger = document.getElementById('hamburger');
  const mobileMenu = document.getElementById('mobile-menu');
  const mobileClose = document.getElementById('mobile-close');
  const mobileLinks = document.querySelectorAll('.mobile-link');
  const desktopLinks = document.querySelectorAll('.desktop-nav a');
  const sections = document.querySelectorAll('main section, header');

  // Scroll glassmorphism effect
  window.addEventListener('scroll', () => {
    if (window.scrollY > 50) {
      header.classList.add('scrolled');
    } else {
      header.classList.remove('scrolled');
    }

    // Scroll spy for active link
    let current = '';
    const scrollPosition = window.scrollY + 120;

    sections.forEach(section => {
      const sectionTop = section.offsetTop;
      const sectionHeight = section.offsetHeight;
      if (scrollPosition >= sectionTop && scrollPosition < sectionTop + sectionHeight) {
        current = section.getAttribute('id');
      }
    });

    desktopLinks.forEach(link => {
      link.classList.remove('active');
      if (link.getAttribute('href') === `#${current}`) {
        link.classList.add('active');
      }
    });
  });

  // Mobile menu toggle
  function openMobileMenu() {
    mobileMenu.classList.add('open');
    mobileMenu.setAttribute('aria-hidden', 'false');
    hamburger.setAttribute('aria-expanded', 'true');
    document.body.style.overflow = 'hidden';
  }

  function closeMobileMenu() {
    mobileMenu.classList.remove('open');
    mobileMenu.setAttribute('aria-hidden', 'true');
    hamburger.setAttribute('aria-expanded', 'false');
    document.body.style.overflow = '';
  }

  hamburger?.addEventListener('click', openMobileMenu);
  mobileClose?.addEventListener('click', closeMobileMenu);
  mobileLinks.forEach(link => link.addEventListener('click', closeMobileMenu));
}

/* ------------------------------------------------------------
   4. Schedule Day Tab Switcher
   ------------------------------------------------------------ */
function initScheduleTabs() {
  window.switchDayTab = function(dayNumber) {
    const tab1 = document.getElementById('tab-day1');
    const tab2 = document.getElementById('tab-day2');
    const panel1 = document.getElementById('panel-day1');
    const panel2 = document.getElementById('panel-day2');

    if (dayNumber === 1) {
      tab1.classList.add('active');
      tab1.setAttribute('aria-selected', 'true');
      tab2.classList.remove('active');
      tab2.setAttribute('aria-selected', 'false');

      panel1.classList.add('active');
      panel2.classList.remove('active');
    } else {
      tab2.classList.add('active');
      tab2.setAttribute('aria-selected', 'true');
      tab1.classList.remove('active');
      tab1.setAttribute('aria-selected', 'false');

      panel2.classList.add('active');
      panel1.classList.remove('active');
    }
  };
}

/* ------------------------------------------------------------
   5. Registration Form Validation & Submission
   ------------------------------------------------------------ */
function initRegistrationForm() {
  const form = document.getElementById('registration-form');
  const submitBtn = document.getElementById('submit-reg-btn');
  const modal = document.getElementById('confirmation-modal');
  const closeBtn = document.getElementById('conf-close-btn');
  const dismissBtn = document.getElementById('conf-dismiss-btn');

  if (!form) return;

  // Real-time input clearing of error states
  form.querySelectorAll('.form-input, .form-select, .form-textarea').forEach(input => {
    input.addEventListener('input', () => {
      const parent = input.closest('.form-group');
      if (parent) parent.classList.remove('has-error');
    });
  });

  form.addEventListener('submit', async (e) => {
    e.preventDefault();

    // Validate fields
    let isValid = true;
    const fields = [
      { id: 'fullName', validate: val => val.trim().length >= 3 },
      { id: 'email', validate: val => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val.trim()) },
      { id: 'phone', validate: val => /^[0-9+ -]{8,15}$/.test(val.trim()) },
      { id: 'gender', validate: val => !!val },
      { id: 'dob', validate: val => !!val },
      { id: 'institution', validate: val => val.trim().length >= 2 },
      { id: 'course', validate: val => val.trim().length >= 2 },
      { id: 'district', validate: val => !!val },
      { id: 'category', validate: val => !!val },
      { id: 'competition', validate: val => !!val },
      { id: 'food', validate: val => !!val }
    ];

    fields.forEach(f => {
      const el = document.getElementById(f.id);
      const group = document.getElementById(`group-${f.id}`);
      if (!el || !f.validate(el.value)) {
        if (group) group.classList.add('has-error');
        isValid = false;
      } else {
        if (group) group.classList.remove('has-error');
      }
    });

    if (!isValid) {
      const firstError = form.querySelector('.form-group.has-error');
      if (firstError) {
        firstError.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
      return;
    }

    // Set loading state
    submitBtn.classList.add('loading');
    submitBtn.disabled = true;

    // Build payload
    const formData = new FormData(form);
    const regId = 'MC2026-' + Math.floor(1000 + Math.random() * 9000);
    const timestamp = new Date().toISOString();

    const registrationData = {
      id: regId,
      timestamp: timestamp,
      fullName: formData.get('fullName')?.trim() || '',
      email: formData.get('email')?.trim() || '',
      phone: formData.get('phone')?.trim() || '',
      gender: formData.get('gender') || '',
      dob: formData.get('dob') || '',
      institution: formData.get('institution')?.trim() || '',
      course: formData.get('course')?.trim() || '',
      district: formData.get('district') || '',
      category: formData.get('category') || '',
      competition: formData.get('competition') || '',
      accommodation: formData.get('accommodation') || 'No',
      food: formData.get('food') || '',
      message: formData.get('message')?.trim() || '',
      status: 'Confirmed'
    };

    try {
      // 1. Submit to Google Apps Script Web App API if configured
      const apiBase = window.MC_CONFIG?.API_BASE;
      if (apiBase && apiBase.startsWith('http')) {
        await fetch(apiBase, {
          method: 'POST',
          mode: 'no-cors', // Standard for Google Apps Script Web App redirection
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            action: 'createRegistration',
            data: registrationData
          })
        });
      }

      // 2. Always persist to local demo storage so Admin works immediately
      saveToLocalStorage(registrationData);

      // 3. Populate confirmation modal & pass
      populateConfirmationPass(registrationData);

      // 4. Reset form & show modal
      form.reset();
      modal.classList.add('open');
    } catch (err) {
      console.warn('Network error or API offline, falling back to local registration store:', err);
      saveToLocalStorage(registrationData);
      populateConfirmationPass(registrationData);
      form.reset();
      modal.classList.add('open');
    } finally {
      submitBtn.classList.remove('loading');
      submitBtn.disabled = false;
    }
  });

  // Modal close handlers
  function closeModal() {
    modal.classList.remove('open');
  }

  closeBtn?.addEventListener('click', closeModal);
  dismissBtn?.addEventListener('click', closeModal);
  modal?.addEventListener('click', (e) => {
    if (e.target === modal) closeModal();
  });
}

function populateConfirmationPass(data) {
  const regIdEl = document.getElementById('pass-reg-id');
  const nameEl = document.getElementById('pass-name');
  const instEl = document.getElementById('pass-institution');
  const compEl = document.getElementById('pass-competition');
  const badgeEl = document.getElementById('pass-category-badge');

  if (regIdEl) regIdEl.textContent = data.id;
  if (nameEl) nameEl.textContent = data.fullName;
  if (instEl) instEl.textContent = data.institution + (data.district ? ` (${data.district})` : '');
  if (compEl) compEl.textContent = data.competition;
  if (badgeEl) badgeEl.textContent = (data.category || 'DELEGATE') + ' PASS';
}

function saveToLocalStorage(record) {
  const key = window.MC_CONFIG?.LOCAL_STORAGE_KEY || 'medios26_registrations';
  let existing = [];
  try {
    const raw = localStorage.getItem(key);
    if (raw) existing = JSON.parse(raw);
  } catch (e) {
    existing = [];
  }

  existing.unshift(record);
  localStorage.setItem(key, JSON.stringify(existing));
}

/* ------------------------------------------------------------
   6. Seed Sample Registrations if storage is empty
   ------------------------------------------------------------ */
function seedSampleRegistrationsIfEmpty() {
  const key = window.MC_CONFIG?.LOCAL_STORAGE_KEY || 'medios26_registrations';
  const existing = localStorage.getItem(key);
  if (!existing || JSON.parse(existing).length === 0) {
    const samples = [
      {
        id: "MC2026-7842",
        timestamp: "2026-09-10T10:15:00.000Z",
        fullName: "Mohammed Ameen",
        email: "ameen.m@gmail.com",
        phone: "9847123456",
        gender: "Male",
        dob: "2003-04-12",
        institution: "Farook College, Calicut",
        course: "BA English & Media",
        district: "Kozhikode",
        category: "Student",
        competition: "News Report Writing",
        accommodation: "Yes",
        food: "Non-Vegetarian",
        message: "Excited for the investigative journalism workshop.",
        status: "Confirmed"
      },
      {
        id: "MC2026-9214",
        timestamp: "2026-09-10T11:45:00.000Z",
        fullName: "Aysha Fathima",
        email: "aysha.fathima@outlook.com",
        phone: "9745892110",
        gender: "Female",
        dob: "2002-08-25",
        institution: "Wayanad Muslim Arts College",
        course: "BSc Computer Science",
        district: "Wayanad",
        category: "Student",
        competition: "Photography & Photojournalism",
        accommodation: "No",
        food: "Vegetarian",
        message: "Carrying Sony A7III for photojournalism contest.",
        status: "Confirmed"
      },
      {
        id: "MC2026-3108",
        timestamp: "2026-09-10T14:20:00.000Z",
        fullName: "Dr. K. Ramachandran",
        email: "ramachandran.media@uoc.ac.in",
        phone: "9447330011",
        gender: "Male",
        dob: "1984-11-03",
        institution: "University of Calicut",
        course: "Assistant Professor, Dept of MCJ",
        district: "Malappuram",
        category: "Faculty / Academic",
        competition: "Delegate Only (No Competition)",
        accommodation: "Yes",
        food: "Vegetarian",
        message: "Bringing 6 student delegates from MCJ department.",
        status: "Confirmed"
      },
      {
        id: "MC2026-5531",
        timestamp: "2026-09-11T09:10:00.000Z",
        fullName: "Hiba Noureen",
        email: "hibanoureen.pod@gmail.com",
        phone: "9946112233",
        gender: "Female",
        dob: "2001-02-18",
        institution: "Independent Creator",
        course: "Audio Producer",
        district: "Ernakulam / Kochi",
        category: "Freelance Creator / Podcaster",
        competition: "Podcast & Audio Production",
        accommodation: "Yes",
        food: "Non-Vegetarian",
        message: "Submitted sample audio documentary reel.",
        status: "Confirmed"
      },
      {
        id: "MC2026-6419",
        timestamp: "2026-09-11T12:00:00.000Z",
        fullName: "Bilal Shamsudheen",
        email: "bilal.shams@gmail.com",
        phone: "9495123000",
        gender: "Male",
        dob: "2004-06-30",
        institution: "Jamia Madeenathunnoor",
        course: "Integrated Studies 3rd Year",
        district: "Malappuram",
        category: "Student",
        competition: "National Media Quiz",
        accommodation: "No",
        food: "Non-Vegetarian",
        message: "Representing campus quiz team.",
        status: "Pending"
      }
    ];
    localStorage.setItem(key, JSON.stringify(samples));
  }
}
