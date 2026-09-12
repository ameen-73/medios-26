/**
 * ============================================================
 * JAMIA MADEENATHUNNOOR — MEDIA CONCLAVE 2026
 * Google Apps Script Web App Backend & Google Sheets Integration
 * ============================================================
 * 
 * SETUP INSTRUCTIONS:
 * 1. Open your Google Spreadsheet (Extensions > Apps Script).
 * 2. Replace all code in Code.gs with this file content.
 * 3. Click "Deploy" > "Manage deployments" > Edit > "New version" > Deploy.
 *    (Or "Deploy" > "New deployment" > Web App > Execute as: Me > Access: Anyone).
 */

const SHEET_NAME = "Registrations";
const DRIVE_FOLDER_NAME = "Media_Conclave_2026_Payment_Proofs";
const ADMIN_USERNAME = "medios'26";
const ADMIN_PASSWORD = "med@231";

// Standard canonical headers for the sheet
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
    const action = (e && e.parameter && e.parameter.action) ? e.parameter.action : "getRegistrations";
    const sheet = getOrCreateSheet();

    if (action === "getRegistrations") {
      const data = getAllRegistrations(sheet);
      return jsonResponse({ status: "success", data: data });
    }

    if (action === "deleteRegistration") {
      const id = e.parameter.id;
      const result = deleteRegistrationById(sheet, id);
      return jsonResponse(result);
    }

    if (action === "updateStatus") {
      const id = e.parameter.id;
      const status = e.parameter.status;
      const result = updateStatusById(sheet, id, status);
      return jsonResponse(result);
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
    if (e && e.postData && e.postData.contents) {
      try {
        payload = JSON.parse(e.postData.contents);
      } catch (parseErr) {
        payload = e.parameter || {};
      }
    } else if (e && e.parameter) {
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
        data.phone ? "'" + String(data.phone).replace(/^'/, '') : "",
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

    if (action === "deleteRegistration") {
      const id = payload.id;
      const result = deleteRegistrationById(sheet, id);
      return jsonResponse(result);
    }

    if (action === "updateStatus") {
      const id = payload.id;
      const status = payload.status;
      const result = updateStatusById(sheet, id, status);
      return jsonResponse(result);
    }

    return jsonResponse({ status: "error", message: "Invalid action: " + action });
  } catch (error) {
    return jsonResponse({ status: "error", message: error.toString() });
  }
}

/**
 * Permanently delete a registration row by ID
 */
function deleteRegistrationById(sheet, id) {
  if (!id) return { status: "error", message: "Missing ID" };

  const data = sheet.getDataRange().getValues();
  for (let i = 1; i < data.length; i++) {
    const rowId = String(data[i][0]).trim();
    if (rowId === String(id).trim()) {
      sheet.deleteRow(i + 1);
      return { status: "success", message: "Row deleted successfully", id: id };
    }
  }
  return { status: "error", message: "ID not found: " + id };
}

/**
 * Update registration status by ID
 */
function updateStatusById(sheet, id, newStatus) {
  if (!id) return { status: "error", message: "Missing ID" };

  const data = sheet.getDataRange().getValues();
  const headers = data[0];
  let statusColIndex = headers.findIndex(h => String(h).toLowerCase().includes("status"));
  if (statusColIndex === -1) statusColIndex = 10; // default column 11 (0-indexed 10)

  for (let i = 1; i < data.length; i++) {
    const rowId = String(data[i][0]).trim();
    if (rowId === String(id).trim()) {
      sheet.getRange(i + 1, statusColIndex + 1).setValue(newStatus);
      return { status: "success", message: "Status updated", id: id, status: newStatus };
    }
  }
  return { status: "error", message: "ID not found: " + id };
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
    sheet = ss.getActiveSheet();
  }
  return sheet;
}

/**
 * Retrieve all registrations with header-normalization
 */
function getAllRegistrations(sheet) {
  const data = sheet.getDataRange().getValues();
  if (data.length <= 1) return [];

  const rawHeaders = data[0].map(h => String(h).trim().toLowerCase());
  const rows = data.slice(1);

  let list = [];

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    if (!row || row.length === 0 || !row[0]) continue;

    // Skip if row is accidentally header repeat
    const idVal = String(row[0]).trim();
    if (idVal.toLowerCase() === "registration id" || idVal.toLowerCase() === "reg id") {
      continue;
    }

    let obj = {};
    rawHeaders.forEach((h, index) => {
      let val = row[index];
      if (val instanceof Date) {
        val = val.toISOString();
      }
      obj[h] = val;
    });

    // Flexible column resolution supporting both old & new sheets
    const regId = idVal;
    const timestamp = obj["timestamp"] || row[1] || new Date().toISOString();
    
    // Resolve Name
    const name = obj["name"] || obj["full name"] || obj["fullname"] || row[2] || "";
    
    // Resolve Campus / Institution
    const campus = obj["campus"] || obj["institution"] || obj["campus name"] || obj["college"] || (rawHeaders.includes("institution") ? obj["institution"] : (row[3] || row[7] || ""));
    
    // Resolve Class
    const className = obj["class"] || obj["course / class"] || obj["course/class"] || obj["course"] || (rawHeaders.includes("course / class") ? obj["course / class"] : (row[4] || row[8] || ""));
    
    // Resolve Phone
    let phone = String(obj["phone"] || obj["phone number"] || obj["mobile"] || (rawHeaders.includes("phone") ? obj["phone"] : row[5]) || "").replace(/^'/, "").trim();
    
    // Resolve Payment Method & Status
    const paymentMethod = String(obj["payment method"] || obj["payment"] || (obj["category"] ? "online" : "online")).toLowerCase();
    const paid = String(obj["paid"] || "yes").toLowerCase();
    const amount = Number(obj["amount"] || 69);
    const proof = obj["payment proof url"] || obj["payment proof"] || obj["proof"] || (row.length > 9 ? row[9] : "") || "";
    const status = obj["status"] || (paymentMethod === "online" ? "Verified" : "Pending (Venue)");

    list.push({
      id: regId,
      timestamp: timestamp,
      name: name,
      campus: campus,
      className: className,
      phone: phone,
      paymentMethod: paymentMethod,
      paid: paid,
      amount: amount,
      paymentProof: proof,
      status: status
    });
  }

  return list;
}

/**
 * Calculate registration statistics
 */
function calculateStats(sheet) {
  const records = getAllRegistrations(sheet);
  const total = records.length;
  const online = records.filter(r => (r.paymentMethod || "").toLowerCase() === "online" || r.paid === "yes").length;
  const venue = records.filter(r => (r.paymentMethod || "").toLowerCase() === "venue").length;

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
