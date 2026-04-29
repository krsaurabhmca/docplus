# DocPlus Clinic SaaS

Core PHP and MySQLi procedural clinic management application for doctors.

## Setup

1. Copy this folder to `C:\xampp\htdocs\docplus`.
2. Start Apache and MySQL in XAMPP.
3. Import `database.sql` in phpMyAdmin or run it in MySQL.
4. Open `http://localhost/docplus`.

## Demo

The OTP is displayed on the verify screen for local testing. Replace the OTP insert section in `index.php` with your SMS provider API call when ready.

## Included Modules

- Doctor mobile OTP signup/login
- Doctor profile with qualification, specialization, fee, and fee repeat days
- Patient management
- Patient category management
- New/old appointments with fee, follow-up date, and remarks
- Patient profile, visit history, ledger total, WhatsApp, and call actions
- Category-wise WhatsApp/Text campaign log ready for third-party API integration
- Income report, appointment report, calendar, and new/old patient analysis
