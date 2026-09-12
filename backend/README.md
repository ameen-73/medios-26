# Media Conclave 2026 — Google Sheets Backend Integration

This project uses **Google Sheets** as its database and **Google Apps Script** as a serverless Web App API.

---

## 🚀 5-Minute Quick Setup Guide

### Step 1: Create a Google Spreadsheet
1. Open [Google Sheets](https://sheets.new) in your browser.
2. Name the spreadsheet: `Media Conclave 2026 Registrations`.

### Step 2: Add the Apps Script Code
1. In your spreadsheet, click **Extensions** > **Apps Script**.
2. Rename the project to `MediaConclave2026-Backend`.
3. In the script editor, delete any existing code in `Code.gs` and paste the entire contents of [`backend/Code.gs`](file:///d:/fintrack/medios26/backend/Code.gs).
4. Click the **Save** icon (💾) or press `Ctrl + S`.

### Step 3: Deploy as Web App
1. In the top right corner, click **Deploy** > **New deployment**.
2. Click the gear icon next to "Select type" and choose **Web app**.
3. Fill in the deployment configuration:
   - **Description**: `Media Conclave 2026 API v1`
   - **Execute as**: `Me (your-email@gmail.com)`
   - **Who has access**: `Anyone` *(Crucial: allows the public registration form to submit entries)*
4. Click **Deploy**.
5. Grant permissions if prompted by Google:
   - Click **Authorize access**.
   - Choose your Google account.
   - Click **Advanced** > **Go to MediaConclave2026-Backend (unsafe)**.
   - Click **Allow**.
6. Copy the generated **Web App URL** (starts with `https://script.google.com/macros/s/.../exec`).

### Step 4: Connect to the Frontend
1. Open [`js/config.js`](file:///d:/fintrack/medios26/js/config.js).
2. Set `API_BASE` to your copied Web App URL:
   ```javascript
   window.MC_CONFIG = {
     API_BASE: "https://script.google.com/macros/s/AKfycb.../exec",
     // ...
   };
   ```
3. Save the file. Your website is now live-connected with Google Sheets!

---

## 🔒 Security & Offline Mode
- **Zero Frontend Credentials**: Google Sheet credentials and API keys are never exposed in client-side code.
- **Offline & Demo Mode**: If no `API_BASE` is configured or the network is offline, the website automatically uses browser local storage and seeds realistic sample data so that the public registration and admin dashboard remain 100% functional for local testing and demos.
