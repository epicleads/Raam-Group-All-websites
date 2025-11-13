# MG DIGITAL LEADS WEBHOOK INTEGRATION GUIDE

This document provides all details required for CarDekho and CarWale to post leads securely into Raam Group’s CRM. Copy the sections into your MS Word template and export as PDF.

-----------------------------------------------------------------------
1. OVERVIEW
-----------------------------------------------------------------------
Raam Group aggregates digital leads into a central CRM. CarDekho and CarWale post leads via HTTPS webhooks protected with API keys. Each partner receives a dedicated endpoint and secret.

-----------------------------------------------------------------------
2. PRODUCTION ENVIRONMENT
-----------------------------------------------------------------------
Base URL: https://raam-group-all-websites.onrender.com
API Version: v1 (implicit in current routes)
Timeout: 10 seconds
Accepted Content-Type: application/json; charset=utf-8

-----------------------------------------------------------------------
3. AUTHENTICATION
-----------------------------------------------------------------------
Scheme: Static API key (per partner)
Header: X-API-Key: <partner-specific-secret>
Behaviour: Missing key → 401 Unauthorized, invalid key → 403 Forbidden

3.1 KEY DISTRIBUTION
Partner   | Header       | Environment Variable     | Production Value*
----------|--------------|--------------------------|-----------------------------------------
CarDekho  | X-API-Key    | LEAD_API_KEY_CARDEKHO    | raam-digital-2025-supersecret-cardekho
CarWale   | X-API-Key    | LEAD_API_KEY_CARWALE     | raam-digital-2025-supersecret-carwale

*Distribute secrets securely (encrypted email or password-protected document). Rotate immediately if compromised.

Security reminder: Never include API keys in tickets or shared documents without protection.

-----------------------------------------------------------------------
4. ENDPOINTS
-----------------------------------------------------------------------
4.1 CARDEKHO LEAD WEBHOOK
Method: POST
URL: https://raam-group-all-websites.onrender.com/admin/mg-digital-leads/source/cardekho
Required Headers:
  • Content-Type: application/json
  • X-API-Key: <CarDekho key>
Required Fields: name, phone_number
Optional Fields: car_model, lead_url, source, campaign, other attributes (all captured in payload)

Sample Request:
{
  "name": "Ravi Kumar",
  "phone_number": "9876543210",
  "car_model": "Tata Nexon EV",
  "lead_url": "https://cardekho.com/leads/123",
  "campaign": "EV Awareness Q4",
  "utm_source": "cardekho_ads"
}

Success Response (HTTP 201):
{
  "message": "CarDekho lead inserted successfully"
}

Error Responses:
400 Bad Request – {"error":"Missing required fields: name"}
401 Unauthorized – {"error":"Missing API key"}
403 Forbidden – {"error":"Invalid API key"}
500 Internal Server Error – {"error":"Internal server error"}

4.2 CARWALE LEAD WEBHOOK
Method: POST
URL: https://raam-group-all-websites.onrender.com/admin/mg-digital-leads/source/carwale
Required Headers:
  • Content-Type: application/json
  • X-API-Key: <CarWale key>
Required Fields: customer_name (or name), mobile (or phone_number)
Optional Fields: vehicle_model, page_url, campaign, additional fields (captured in payload)

Sample Request:
{
  "customer_name": "Sunita Rao",
  "mobile": "9123456780",
  "vehicle_model": "Hyundai Creta",
  "page_url": "https://carwale.com/lead/456",
  "campaign": "Creta Test Drive"
}

Success Response (HTTP 201):
{
  "message": "CarWale lead inserted successfully"
}

Error Responses: identical to CarDekho endpoint.

-----------------------------------------------------------------------
5. FIELD MAPPING & VALIDATION
-----------------------------------------------------------------------
Internal Column | CarDekho Fields                        | CarWale Fields                         | Required
----------------|----------------------------------------|----------------------------------------|---------
platform        | Hardcoded “CarDekho”                   | Hardcoded “CarWale”                    | Yes
name            | name, customer_name, contact_name      | customer_name, name, contact_name      | Yes
phone_number    | phone_number, mobile, phone            | mobile, phone_number, phone            | Yes
car_model       | car_model, vehicle_model, model        | vehicle_model, car_model, model        | No
lead_url        | lead_url, page_url, lead_detail_url    | page_url, lead_url, url                | No
payload         | Entire JSON body                       | Entire JSON body                       | Yes (auto)

- Unknown fields are preserved in payload for audit.
- Missing required fields result in HTTP 400.

-----------------------------------------------------------------------
6. RATE LIMITS & RELIABILITY
-----------------------------------------------------------------------
Soft limit: 120 requests per minute per partner (contact us if you expect higher bursts).
Retries: Please implement exponential backoff on HTTP 5xx responses.
Idempotency: Duplicate payloads will create duplicate leads (deduplication roadmap item).

-----------------------------------------------------------------------
7. MONITORING & SUPPORT
-----------------------------------------------------------------------
Logging: All requests log timestamp, partner, status code, and validation status.
Alerting: Elevated 5xx error rates trigger on-call alerts.
Support Contact: support@raamgroup.in | +91-XXXXXXXXXX
Maintenance Window: Sundays 01:00–02:00 IST (advance notice provided).

-----------------------------------------------------------------------
8. SECURITY CHECKLIST
-----------------------------------------------------------------------
[ ] HTTPS only (enforced by Render)
[ ] Validate X-API-Key on every request
[ ] Store API keys in environment variables (LEAD_API_KEY_CARDEKHO / LEAD_API_KEY_CARWALE)
[ ] Rotate keys periodically or upon incident
[ ] Monitor access logs for anomalies
[ ] Optional: provide separate staging keys if required

-----------------------------------------------------------------------
9. CHANGE MANAGEMENT
-----------------------------------------------------------------------
Versioning: Breaking changes roll out on new route (e.g., /admin/mg-digital-leads/v2/...) with prior notice.
Communications: Integration partners receive email notices at least 7 days before schema changes.
Primary Contact: integration@raamgroup.in

-----------------------------------------------------------------------
END OF DOCUMENT
-----------------------------------------------------------------------