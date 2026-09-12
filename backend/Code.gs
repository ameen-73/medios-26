/**
 * ============================================================
 * JAMIA MADEENATHUNNOOR — MEDIA CONCLAVE 2026
 * Google Apps Script Web App Backend & Google Sheets Integration
 * ============================================================
 * 
 * SETUP INSTRUCTIONS:
 * 1. Create a new Google Spreadsheet (e.g. "Media Conclave 2026 Registrations").
 * 2. Go to Extensions > Apps Script.
 * 3. Replace all code in Code.gs with this file content.
 * 4. Click "Deploy" > "New deployment".
 * 5. Select type: "Web app".
 * 6. Set Description: "Media Conclave 2026 API".
 * 7. Execute as: "Me" (your Google account).
 * 8. Who has access: "Anyone" (allows website to submit registrations).
 * 9. Click "Deploy", authorize permissions, and copy the Web App URL.
 * 10. Paste the Web App URL into window.MC_CONFIG.API_BASE in js/config.js.
 */

const SHEET_NAME = "Registrations";
const ADMIN_USERNAME = "medios'26";
const ADMIN_PASSWORD = "med@231"; // Updated admin password

const HEADERS = [
  "Registration ID",
  "Timestamp",
  "Full Name",
  "Email",
  "Phone",
  "Gender",
  "Date of Birth",
  "Institution",
  "Course / Class",
  "District",
  "Category",
  "Competition",
  "Accommodation",
  "Food Preference",
  "Message",
  "Status"
];

/**
 * Handle HTTP GET requests (Fetch registrations, stats, single record)
 */
function doGet(e) {
  try {
    const action = e.parameter.action || "getRegistrations";
    const sheet = getOrCreateSheet();

    if (action === "getRegistrations") {
      const data = getAllRegistrations(sheet);
      return jsonResponse({ status: "success", data: data });
    }

    if (action === "getRegistrationById") {
      const id = e.parameter.id;
      const record = getRegistrationById(sheet, id);
      if (record) {
        return jsonResponse({ status: "success", data: record });
      } else {
        return jsonResponse({ status: "error", message: "Registration not found" });
      }
    }

    if (action === "getStats") {
      const stats = calculateStats(sheet);
      return jsonResponse({ status: "success", data: stats });
    }

    return jsonResponse({ status: "error", message: "Invalid action" });
  } catch (error) {
    return jsonResponse({ status: "error", message: error.toString() });
  }
}

/**
 * Handle HTTP POST requests (Create, update, delete registrations)
 */
function doPost(e) {
  try {
    let payload = {};
    if (e.postData && e.postData.contents) {
      payload = JSON.parse(e.postData.contents);
    } else {
      payload = e.parameter;
    }

    const action = payload.action || "createRegistration";
    const sheet = getOrCreateSheet();

    if (action === "createRegistration") {
      const data = payload.data || payload;
      const newId = data.id || ("MC2026-" + Math.floor(1000 + Math.random() * 9000));
      const timestamp = data.timestamp || new Date().toISOString();

      const row = [
        newId,
        timestamp,
        data.fullName || "",
        data.email || "",
        data.phone || "",
        data.gender || "",
        data.dob || "",
        data.institution || "",
        data.course || "",
        data.district || "",
        data.category || "",
        data.competition || "",
        data.accommodation || "No",
        data.food || "",
        data.message || "",
        data.status || "Confirmed"
      ];

      sheet.appendRow(row);
      return jsonResponse({
        status: "success",
        message: "Registration created successfully",
        id: newId
      });
    }

    if (action === "updateRegistration") {
      const data = payload.data;
      const updated = updateRegistration(sheet, data);
      if (updated) {
        return jsonResponse({ status: "success", message: "Registration updated" });
      } else {
        return jsonResponse({ status: "error", message: "Registration not found" });
      }
    }

    if (action === "deleteRegistration") {
      const id = payload.id;
      const deleted = deleteRegistrationById(sheet, id);
      if (deleted) {
        return jsonResponse({ status: "success", message: "Registration deleted" });
      } else {
        return jsonResponse({ status: "error", message: "Registration not found" });
      }
    }

    return jsonResponse({ status: "error", message: "Unknown action" });
  } catch (error) {
    return jsonResponse({ status: "error", message: error.toString() });
  }
}

/**
 * Ensure sheet exists and has proper headers
 */
function getOrCreateSheet() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName(SHEET_NAME);
  
  if (!sheet) {
    sheet = ss.insertSheet(SHEET_NAME);
    sheet.appendRow(HEADERS);
    // Format header row
    const headerRange = sheet.getRange(1, 1, 1, HEADERS.length);
    headerRange.setBackground("#0b0a09");
    headerRange.setFontColor("#f4531e");
    headerRange.setFontWeight("bold");
    sheet.setFrozenRows(1);
  } else if (sheet.getLastRow() === 0) {
    sheet.appendRow(HEADERS);
    const headerRange = sheet.getRange(1, 1, 1, HEADERS.length);
    headerRange.setBackground("#0b0a09");
    headerRange.setFontColor("#f4531e");
    headerRange.setFontWeight("bold");
    sheet.setFrozenRows(1);
  }
  
  return sheet;
}

/**
 * Get all registrations as JSON objects
 */
function getAllRegistrations(sheet) {
  const values = sheet.getDataRange().getValues();
  if (values.length <= 1) return [];

  const results = [];
  for (let i = 1; i < values.length; i++) {
    const row = values[i];
    results.push({
      id: row[0],
      timestamp: row[1],
      fullName: row[2],
      email: row[3],
      phone: row[4],
      gender: row[5],
      dob: row[6],
      institution: row[7],
      course: row[8],
      district: row[9],
      category: row[10],
      competition: row[11],
      accommodation: row[12],
      food: row[13],
      message: row[14],
      status: row[15]
    });
  }
  return results.reverse(); // Most recent first
}

/**
 * Find single registration by ID
 */
function getRegistrationById(sheet, id) {
  const values = sheet.getDataRange().getValues();
  for (let i = 1; i < values.length; i++) {
    if (String(values[i][0]) === String(id)) {
      const row = values[i];
      return {
        id: row[0],
        timestamp: row[1],
        fullName: row[2],
        email: row[3],
        phone: row[4],
        gender: row[5],
        dob: row[6],
        institution: row[7],
        course: row[8],
        district: row[9],
        category: row[10],
        competition: row[11],
        accommodation: row[12],
        food: row[13],
        message: row[14],
        status: row[15]
      };
    }
  }
  return null;
}

/**
 * Update an existing registration
 */
function updateRegistration(sheet, data) {
  const values = sheet.getDataRange().getValues();
  for (let i = 1; i < values.length; i++) {
    if (String(values[i][0]) === String(data.id)) {
      const rowNum = i + 1;
      if (data.fullName !== undefined) sheet.getRange(rowNum, 3).setValue(data.fullName);
      if (data.email !== undefined) sheet.getRange(rowNum, 4).setValue(data.email);
      if (data.phone !== undefined) sheet.getRange(rowNum, 5).setValue(data.phone);
      if (data.institution !== undefined) sheet.getRange(rowNum, 8).setValue(data.institution);
      if (data.category !== undefined) sheet.getRange(rowNum, 11).setValue(data.category);
      if (data.competition !== undefined) sheet.getRange(rowNum, 12).setValue(data.competition);
      if (data.accommodation !== undefined) sheet.getRange(rowNum, 13).setValue(data.accommodation);
      if (data.status !== undefined) sheet.getRange(rowNum, 16).setValue(data.status);
      return true;
    }
  }
  return false;
}

/**
 * Delete a registration row by ID
 */
function deleteRegistrationById(sheet, id) {
  const values = sheet.getDataRange().getValues();
  for (let i = 1; i < values.length; i++) {
    if (String(values[i][0]) === String(id)) {
      sheet.deleteRow(i + 1);
      return true;
    }
  }
  return false;
}

/**
 * Calculate aggregated statistics
 */
function calculateStats(sheet) {
  const registrations = getAllRegistrations(sheet);
  const total = registrations.length;
  let accommodationCount = 0;
  let male = 0;
  let female = 0;

  registrations.forEach(r => {
    if (String(r.accommodation).toLowerCase() === "yes") accommodationCount++;
    if (String(r.gender).toLowerCase() === "male") male++;
    if (String(r.gender).toLowerCase() === "female") female++;
  });

  return {
    totalRegistrations: total,
    accommodationRequired: accommodationCount,
    maleCount: male,
    femaleCount: female
  };
}

/**
 * Helper to build JSON responses with proper headers
 */
function jsonResponse(data) {
  return ContentService.createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}
