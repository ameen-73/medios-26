# Media Conclave 2026 — Official Website & Registration Portal

Official website and delegate registration portal for **Jamia Madeenathunnoor Media Conclave** (September 17–18, 2026 at Imam Suyuthi College of Integrated Studies, Tharuvana, Wayanad).

## Features

- **Brutalist Poster Visual Language**: High-impact editorial aesthetic with Google Fonts (`Archivo Black` & `Space Grotesk`), smooth responsive layout, glassmorphic navigation header, animated marquee ticker, and interactive hover effects.
- **Interactive Registration**:
  - Full details collection (Name, Campus Name, Class, Phone Number).
  - Choice of payment method:
    - **01 Pay Online**: UPI Scan & Pay with QR code (`₹69`), payment verification checkbox, and payment screenshot proof upload (up to 8 MB with instant preview).
    - **02 Pay at the Venue**: Reserve place and pay at the counter upon arrival.
  - Automated WhatsApp registration confirmation trigger to organizer (+91 7356217409).
  - Instant LocalStorage fallback + Google Apps Script backend integration.
- **Program Details & Gallery**:
  - Event schedule & location overview.
  - Interactive visual poster viewer with 3D hover effects.
- **Admin Control Desk** (`/admin/`):
  - Protected admin console (`medios'26` / `med@231`).
  - Real-time registration metrics (Total Registrations, Online Paid, Pay at Venue, Total Revenue).
  - Search and filter by name, campus, class, phone number, and payment method.
  - Full payment proof screenshot viewer modal with download option.
  - One-click CSV export for spreadsheet reporting.
  - Configuration manager for fee, WhatsApp notification number, and API endpoints.
- **Google Sheets & Drive Backend** (`backend/Code.gs`):
  - Serverless Google Apps Script backend handling registration data, automatic Drive folder creation for payment proof screenshots, and live stats calculation.

## Project Structure

```
├── assets/
│   ├── favicon.svg
│   ├── jamia-green-mark.png
│   ├── media-conclave-hero.webp
│   ├── payment-qr.jpg
│   └── program-poster.jpeg
├── css/
│   └── styles.css
├── js/
│   ├── config.js
│   └── main.js
├── register/
│   └── index.html
├── admin/
│   ├── index.html
│   ├── admin.css
│   └── admin.js
├── backend/
│   ├── Code.gs
│   └── README.md
├── index.html
└── package.json
```

## Running Locally

```bash
npm run dev
```
Or open [index.html](file:///d:/fintrack/medios26/index.html) directly in any modern browser.
