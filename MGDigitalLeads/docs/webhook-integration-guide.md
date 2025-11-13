# MG Digital Leads Webhook Integration Guide

This document is ready to export as PDF and share with CarDekho / CarWale integration teams.

---

## 1. Overview

Raam Group aggregates digital leads into a unified CRM. CarDekho and CarWale push leads via HTTPS webhooks secured with API keys. Each partner receives a unique endpoint and shared secret.

---

## 2. Production Environment

- **Base URL:** `https://raam-group-all-websites.onrender.com`
- **API Version:** v1 (implicit in current routes)
- **Timeout:** 10 seconds
- **Accepted Content-Type:** `application/json; charset=utf-8`

---

## 3. Authentication

- **Scheme:** Static API key provided by Raam Group.
- **Header:** `X-API-Key: <partner-specific-secret>`
- Keys are unique per partner; rotate on request.
- Requests without valid keys return `401 Unauthorized` (missing) or `403 Forbidden` (invalid).


### 3.1 Key Distribution

| Partner   | Header Name | Environment Variable              | Production Value*                               |
|-----------|-------------|-----------------------------------|-------------------------------------------------|
| CarDekho  | `X-API-Key` | `LEAD_API_KEY_CARDEKHO`           | `raam-digital-2025-supersecret-cardekho`        |
| CarWale   | `X-API-Key` | `LEAD_API_KEY_CARWALE`            | `raam-digital-2025-supersecret-carwale`         |

\*Distribute the value securely; rotate immediately if leaked.

> **Security Reminder:** Send keys out-of-band (encrypted email or password-protected document). Do not include in ticketing systems.

---

## 4. Endpoints

### 4.1 CarDekho Lead Webhook

- **Method:** `POST`
- **URL:** `https://raam-group-all-websites.onrender.com/admin/mg-digital-leads/source/cardekho`
- **Required Headers:**
  - `Content-Type: application/json`
  - `X-API-Key: <CarDekho key>`
- **Required Fields:** `name`, `phone_number`
- **Optional Fields:** `car_model`, `lead_url`, `source`, `campaign`, any other properties (stored in payload)

#### Sample Request
```json
{
  "name": "Ravi Kumar",
  "phone_number": "9876543210",
  "car_model": "Tata Nexon EV",
  "lead_url": "https://cardekho.com/leads/123",
  "campaign": "EV Awareness Q4",
  "utm_source": "cardekho_ads"
}
```

#### Success Response
```json
{
  "message": "CarDekho lead inserted successfully"
}
```
- **HTTP Status:** `201 Created`

#### Error Responses
| Status | Example Body | Explanation |
|--------|--------------|-------------|
| 400 | `{"error":"Missing required fields: name"}` | Required fields empty or missing |
| 401 | `{"error":"Missing API key"}` | Header absent |
| 403 | `{"error":"Invalid API key"}` | Key mismatch |
| 500 | `{"error":"Internal server error"}` | Unexpected server issue |

### 4.2 CarWale Lead Webhook

- **Method:** `POST`
- **URL:** `https://raam-group-all-websites.onrender.com/admin/mg-digital-leads/source/carwale`
- **Required Headers:**
  - `Content-Type: application/json`
  - `X-API-Key: <CarWale key>`
- **Required Fields:** `customer_name` or `name`, `mobile` or `phone_number`
- **Optional Fields:** `vehicle_model`, `page_url`, `campaign`, additional fields captured in payload.

#### Sample Request
```json
{
  "customer_name": "Sunita Rao",
  "mobile": "9123456780",
  "vehicle_model": "Hyundai Creta",
  "page_url": "https://carwale.com/lead/456",
  "campaign": "Creta Test Drive"
}
```

#### Success Response
```json
{
  "message": "CarWale lead inserted successfully"
}
```
- **HTTP Status:** `201 Created`

#### Error Responses
Same as CarDekho endpoint.

---

## 5. Field Mapping & Validation

| Internal Column | CarDekho Field(s)                         | CarWale Field(s)                          | Required |
|-----------------|-------------------------------------------|-------------------------------------------|----------|
| `platform`      | Hardcoded to `"CarDekho"`                 | Hardcoded to `"CarWale"`                  | ✔ (auto) |
| `name`          | `name`, `customer_name`, `contact_name`   | `customer_name`, `name`, `contact_name`   | ✔        |
| `phone_number`  | `phone_number`, `mobile`, `phone`         | `mobile`, `phone_number`, `phone`         | ✔        |
| `car_model`     | `car_model`, `vehicle_model`, `model`     | `vehicle_model`, `car_model`, `model`     | ✖        |
| `lead_url`      | `lead_url`, `page_url`, `lead_detail_url` | `page_url`, `lead_url`, `url`             | ✖        |
| `payload`       | Entire JSON body                          | Entire JSON body                          | ✔ (auto) |

- Unknown fields are retained inside `payload` for audit.
- Missing required fields trigger HTTP 400.

---

## 6. Rate Limits & Reliability

- **Soft limit:** 120 requests/minute per partner. Contact support if bursts exceed this.
- **Retries:** Please retry on 5xx responses with exponential backoff.
- **Idempotency:** If duplicate leads are sent, CRM stores duplicates unless identical `platform` and `phone_number` already exist within same minute (future enhancement).

---

## 7. Monitoring & Support

- **Logging:** All requests log timestamp, partner, status code. Invalid attempts are flagged.
- **Alerting:** 5xx rates trigger alerts to Raam Group team.
- **Support Contact:** `support@raamgroup.in` | +91-XXXXXXXXXX
- **Maintenance Window:** Sundays 01:00–02:00 IST (communication sent beforehand).

---

## 8. Security Checklist

- [ ] Serve endpoints via HTTPS only.
- [ ] Validate `X-API-Key` per request.
- [ ] Rotate keys on schedule or incident.
- [ ] Store keys in environment variables (`CARDEKHO_API_KEY`, `CARWALE_API_KEY`).
- [ ] Monitor access logs for anomalies.
- [ ] Provide separate keys for staging environments if required.

---

## 9. Change Management

- **Versioning:** Endpoints are stable; any breaking change results in new path `/v2/...` with prior notice.
- **Communications:** Partners notified via email at least 7 days before schema changes.
- **Contact:** Integration manager – `integration@raamgroup.in`.

---

*End of document — exportable to PDF for distribution.*

