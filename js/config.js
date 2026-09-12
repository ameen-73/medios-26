/* ============================================================
   JAMIA MADEENATHUNNOOR — MEDIOS'26
   Configuration & Constant Registry
   ============================================================ */
window.MC_CONFIG = {
  // Replace with your deployed Google Apps Script Web App URL
  // Example: "https://script.google.com/macros/s/AKfycbx.../exec"
  API_BASE: "https://script.google.com/macros/s/AKfycbxgpElqbe6d4vIJGAi49LqQYCfwtQcYOvcTQ6uFYITjeTZeM355mHlAK-Bb9QVY1-llZA/exec",

  EVENT: {
    name: "Medios'26",
    fullName: "Medios'26 — Media Conclave",
    theme: "Casting Mass Commune",
    dateISO: "2026-09-17T09:00:00+05:30", // IST opening
    dateLabel: "September 17–18, 2026",
    venue: "Imam Suyuthi College of Integrated Studies",
    venueDetail: "(Paleri Usthad Academy), Tharuvana, Wayanad, Kerala",
    organizer: "Jamia Madeenathunnoor",
    website: "jamiamadeenathunnoor.org",
    email: "info@jamiamadeenathunnoor.org",
    phone: "+91 94470 00000",
    address: "Knowledge Garden, Malappuram, Calicut, Kerala – 673580"
  },

  CATEGORIES: [
    "Student",
    "Faculty / Academic",
    "Media Professional / Journalist",
    "Freelance Creator / Podcaster",
    "Alumni",
    "Delegate / Guest"
  ],

  COMPETITIONS: [
    "News Report Writing",
    "Short Film Competition",
    "Photography & Photojournalism",
    "Podcast & Audio Production",
    "Graphic Design & Editorial Layout",
    "Feature & Investigative Writing",
    "Social Media & Reels Campaign",
    "National Media Quiz",
    "Delegate Only (No Competition)"
  ],

  DISTRICTS: [
    "Wayanad", "Kozhikode", "Malappuram", "Kannur", "Kasaragod",
    "Palakkad", "Thrissur", "Ernakulam / Kochi", "Kottayam", "Idukki",
    "Alappuzha", "Pathanamthitta", "Kollam", "Thiruvananthapuram",
    "Other State / Outside Kerala", "International Delegate"
  ],

  LOCAL_STORAGE_KEY: "medios26_registrations"
};
