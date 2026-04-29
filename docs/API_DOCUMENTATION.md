# DocPlus API Documentation

Base URL:

```text
http://localhost/docplus/api/index.php
```

All request and response bodies use JSON. For XAMPP compatibility, examples use `?route=...`.

Clean path format also works when Apache provides `PATH_INFO`:

```text
http://localhost/docplus/api/index.php/patients
```

## Authentication

Protected endpoints require:

```http
Authorization: Bearer YOUR_API_TOKEN
Content-Type: application/json
```

If your local Apache/XAMPP does not forward the `Authorization` header, use this fallback header:

```http
X-API-Token: YOUR_API_TOKEN
```

### 1. Request OTP

```http
POST /api/index.php?route=auth/request-otp
```

```json
{
  "mobile": "9431426600"
}
```

Local development response includes `demo_otp`. In production, connect an SMS provider and remove OTP from the response.

### 2. Verify OTP

```http
POST /api/index.php?route=auth/verify-otp
```

```json
{
  "mobile": "9431426600",
  "otp": "123456"
}
```

Response:

```json
{
  "success": true,
  "token": "dp_xxxxxxxxx",
  "doctor": {
    "id": "2",
    "mobile": "9431426600"
  }
}
```

## Doctor Profile

### Get Profile

```http
GET /api/index.php?route=profile
```

### Update Profile

```http
PUT /api/index.php?route=profile
```

```json
{
  "name": "Dr. Sharma",
  "qualification": "MBBS, MD",
  "specialization": "General Physician",
  "fee": 500,
  "fee_repeat_days": 7,
  "clinic_name": "DocPlus Clinic",
  "clinic_address": "Main Road"
}
```

## Patient Categories

### List Categories

```http
GET /api/index.php?route=categories&q=general&page=1&limit=20
```

### Get Category

```http
GET /api/index.php?route=categories/1
```

### Create Category

```http
POST /api/index.php?route=categories
```

```json
{
  "name": "Diabetes",
  "description": "Diabetes follow-up patients"
}
```

### Update Category

```http
PUT /api/index.php?route=categories/1
```

```json
{
  "name": "General",
  "description": "Walk-in and regular patients"
}
```

### Delete Category

```http
DELETE /api/index.php?route=categories/1
```

## Patients

### List Patients

```http
GET /api/index.php?route=patients&q=jonas&page=1&limit=20
```

### Get Patient

```http
GET /api/index.php?route=patients/2
```

### Patient Profile With Ledger and History

```http
GET /api/index.php?route=patients/2/profile
```

### Create Patient

```http
POST /api/index.php?route=patients
```

```json
{
  "category_id": 1,
  "name": "Jonas Campbell",
  "age": 34,
  "gender": "Male",
  "mobile": "9876543210",
  "address": "Clinic Road"
}
```

### Update Patient

```http
PUT /api/index.php?route=patients/2
```

```json
{
  "category_id": 1,
  "name": "Jonas Campbell",
  "age": 35,
  "gender": "Male",
  "mobile": "9876543210",
  "address": "Updated address"
}
```

### Delete Patient

```http
DELETE /api/index.php?route=patients/2
```

## Appointments

### List Appointments

```http
GET /api/index.php?route=appointments&from=2026-04-01&to=2026-04-30&q=jonas&page=1&limit=20
```

### Get Appointment

```http
GET /api/index.php?route=appointments/10
```

### Create Appointment

```http
POST /api/index.php?route=appointments
```

```json
{
  "patient_id": 2,
  "appointment_type": "Old",
  "appointment_date": "2026-04-29",
  "fee": 500,
  "next_followup_date": "2026-05-06",
  "remarks": "Routine follow-up"
}
```

### Update Appointment

```http
PUT /api/index.php?route=appointments/10
```

```json
{
  "patient_id": 2,
  "appointment_type": "Old",
  "appointment_date": "2026-04-29",
  "fee": 500,
  "next_followup_date": "2026-05-06",
  "remarks": "Updated remarks"
}
```

### Delete Appointment

```http
DELETE /api/index.php?route=appointments/10
```

## Campaigns

### List Campaign Logs

```http
GET /api/index.php?route=campaigns&page=1&limit=20
```

### Create Campaign Log

```http
POST /api/index.php?route=campaigns
```

```json
{
  "category_id": 1,
  "channel": "WhatsApp",
  "message": "Clinic will remain open tomorrow from 10 AM."
}
```

The API stores the campaign request and recipient count. Replace the placeholder provider logic in `api/index.php` with your WhatsApp/SMS API.

## Reports

### Income and Appointment Report

```http
GET /api/index.php?route=reports&from=2026-04-01&to=2026-04-30
```

Response includes:

- `summary.total_income`
- `summary.total_appointments`
- `new_patients`
- `old_patients`
- `daily`

## Calendar

### Month Events

```http
GET /api/index.php?route=calendar&month=2026-04
```

Returns appointment events for the selected month.

## Common Response Format

List endpoints return:

```json
{
  "success": true,
  "data": [],
  "meta": {
    "total": 0,
    "page": 1,
    "limit": 20,
    "pages": 1
  }
}
```

Errors return:

```json
{
  "success": false,
  "message": "Required fields are missing.",
  "errors": ["name"]
}
```

## cURL Example

```bash
curl -X GET "http://localhost/docplus/api/index.php?route=patients" \
  -H "Authorization: Bearer YOUR_API_TOKEN"
```
