/**
 * ============================================================
 * JAMIA MADEENATHUNNOOR — MEDIA CONCLAVE 2026
 * Google Apps Script Web App Backend & Google Sheets Integration
 * ============================================================
 * 
 * SETUP INSTRUCTIONS:
 * 1. Create a new Google Spreadsheet (e.g., "Media Conclave 2026 Registrations").
 * 2. Go to Extensions > Apps Script.
 * 3. Replace all code in Code.gs with this file content.
 * 4. Click "Deploy" > "New deployment".
 * 5. Select type: "Web app".
 * 6. Set Description: "Media Conclave 2026 API".
 * 7. Execute as: "Me" (your Google account).
 * 8. Who has access: "Anyone" (allows website submissions).
 * 9. Click "Deploy", authorize permissions, and copy the Web App URL.
 * 10. Paste the Web App URL into window.MC_CONFIG.API_BASE in js/config.js.
 */

const SHEET_NAME = "Registrations";
const DRIVE_FOLDER_NAME = "Media_Conclave_2026_Payment_Proofs";
const ADMIN_USERNAME = "medios'26";
const ADMIN_PASSWORD = "med@231";

const HEADERS = [
  "Registration ID",
  "Timestamp",
  "Name",
  "Campus",
  "Class",
  "Phone",
  "Payment Method",
  "Paid",
  "Amount",
  "Payment Proof URL",
  "Status"
];

/**
 * Handle HTTP GET requests
 */
function doGet(e) {
  try {
    const action = e.parameter.action || "getRegistrations";
    const sheet = getOrCreateSheet();

    if (action === "getRegistrations") {
      const data = getAllRegistrations(sheet);
      return jsonResponse({ status: "success", data: data });
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
 * Handle HTTP POST requests
 */
function doPost(e) {
  try {
    let payload = {};
    if (e.postData && e.postData.contents) {
      try {
        payload = JSON.parse(e.postData.contents);
      } catch (parseErr) {
        payload = e.parameter;
      }
    } else {
      payload = e.parameter;
    }

    const action = payload.action || "createRegistration";
    const sheet = getOrCreateSheet();

    if (action === "createRegistration") {
      const data = payload.data || payload;
      const newId = data.id || ("MC26-" + Math.floor(1000 + Math.random() * 9000));
      const timestamp = data.timestamp || new Date().toISOString();

      let proofUrl = "";
      if (data.paymentProof && data.paymentProof.startsWith("data:image")) {
        proofUrl = saveBase64ImageToDrive(data.paymentProof, `${newId}_${data.name || 'proof'}`);
      } else if (data.paymentProof) {
        proofUrl = data.paymentProof;
      }

      const row = [
        newId,
        timestamp,
        data.name || "",
        data.campus || "",
        data.className || "",
        data.phone ? "'" + data.phone : "",
        data.paymentMethod || "online",
        data.paid || "yes",
        data.amount || 69,
        proofUrl,
        data.status || (data.paymentMethod === "online" ? "Verified" : "Pending (Venue)")
      ];

      sheet.appendRow(row);

      return jsonResponse({
        status: "success",
        message: "Registration created successfully",
        id: newId,
        proofUrl: proofUrl
      });
    }

    return jsonResponse({ status: "error", message: "Invalid action" });
  } catch (error) {
    return jsonResponse({ status: "error", message: error.toString() });
  }
}

/**
 * Save Base64 image to Google Drive folder and return viewable URL
 */
function saveBase64ImageToDrive(base64Data, filename) {
  try {
    const splitData = base64Data.split(",");
    const contentType = splitData[0].match(/:(.*?);/)[1];
    const byteCharacters = Utilities.base64Decode(splitData[1]);
    const blob = Utilities.newBlob(byteCharacters, contentType, filename);

    let folder;
    const folders = DriveApp.getFoldersByName(DRIVE_FOLDER_NAME);
    if (folders.hasNext()) {
      folder = folders.next();
    } else {
      folder = DriveApp.createFolder(DRIVE_FOLDER_NAME);
      folder.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
    }

    const file = folder.createFile(blob);
    file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
    return file.getUrl();
  } catch (err) {
    return "Base64 upload failed: " + err.toString();
  }
}

/**
 * Retrieve or initialize the Registrations sheet
 */
function getOrCreateSheet() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName(SHEET_NAME);
  if (!sheet) {
    sheet = ss.insertSheet(SHEET_NAME);
    sheet.appendRow(HEADERS);
    sheet.getRange(1, 1, 1, HEADERS.length).setFontWeight("bold").setBackground("#f0521f").setFontColor("#ffffff");
    sheet.setFrozenRows(1);
  }
  return sheet;
}

/**
 * Retrieve all registrations formatted as objects
 */
function getAllRegistrations(sheet) {
  const data = sheet.getDataRange().getValues();
  if (data.length <= 1) return [];

  const headers = data[0];
  const rows = data.slice(1);

  return rows.map((row) => {
    let obj = {};
    headers.forEach((h, index) => {
      let val = row[index];
      if (val instanceof Date) {
        val = val.toISOString();
      }
      obj[h] = val;
    });
    return {
      id: obj["Registration ID"],
      timestamp: obj["Timestamp"],
      name: obj["Name"],
      campus: obj["Campus"],
      className: obj["Class"],
      phone: String(obj["Phone"] || "").replace(/^'/, ""),
      paymentMethod: obj["Payment Method"],
      paid: obj["Paid"],
      amount: obj["Amount"],
      paymentProof: obj["Payment Proof URL"],
      status: obj["Status"]
    };
  });
}

/**
 * Calculate registration statistics
 */
function calculateStats(sheet) {
  const records = getAllRegistrations(sheet);
  const total = records.length;
  const online = records.filter(r => r.paymentMethod === "online" || r.paid === "yes").length;
  const venue = records.filter(r => r.paymentMethod === "venue").length;

  return {
    total: total,
    onlinePaid: online,
    payAtVenue: venue,
    totalRevenue: online * 69
  };
}

/**
 * Standard JSON response helper with CORS headers
 */
function jsonResponse(data) {
  return ContentService.createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}
