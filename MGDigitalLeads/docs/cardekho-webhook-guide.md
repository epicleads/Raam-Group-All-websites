# MG DIGITAL LEADS – CARDEKHO WEBHOOK GUIDE

-----------------------------------------------------------------------
1. OVERVIEW
-----------------------------------------------------------------------
This document explains how CarDekho should post leads to Raam Group’s CRM via secure HTTPS webhook. Use this guide as-is or copy into your Word template for PDF export.

-----------------------------------------------------------------------
2. PRODUCTION ACCESS
-----------------------------------------------------------------------
Endpoint (POST): https://raam-group-all-websites.onrender.com/admin/mg-digital-leads/source/cardekho
Transport: HTTPS (TLS 1.2+)
Timeout: 10 seconds
Content-Type: application/json; charset=utf-8

-----------------------------------------------------------------------
3. AUTHENTICATION
-----------------------------------------------------------------------
Header: X-API-Key: raam-digital-2025-supersecret-cardekho
Behaviour: Missing key → 401 Unauthorized, invalid key → 403 Forbidden.
Keep the key confidential; notify Raam Group immediately if compromised.

-----------------------------------------------------------------------
4. REQUEST FORMAT
-----------------------------------------------------------------------
Required Fields
  • name
  • phone_number

Optional Fields (captured when present)
  • car_model
  • lead_url
  • campaign / utm parameters
  • any additional attributes (stored in payload JSON)

Sample JSON Body
{
  "name": "Ravi Kumar",
  "phone_number": "9876543210",
  "car_model": "Tata Nexon EV",
  "lead_url": "https://cardekho.com/leads/123",
  "campaign": "EV Awareness Q4",
  "utm_source": "cardekho_ads"
}

-----------------------------------------------------------------------
5. RESPONSES
-----------------------------------------------------------------------
Success (HTTP 201)
{
  "message": "CarDekho lead inserted successfully"
}

Error Responses
400 Bad Request – required fields missing (example: {"error":"Missing required fields: name"})
401 Unauthorized – API key header not supplied
403 Forbidden – API key invalid
500 Internal Server Error – unexpected server issue; retry with exponential backoff

-----------------------------------------------------------------------
6. DATA HANDLING
-----------------------------------------------------------------------
- Leads insert into table public."mg-digital-leads" with platform fixed to “CarDekho”.
- Raw payload is persisted for audit and future enhancements.
- Duplicate submissions are accepted (deduplication enhancement on roadmap).

-----------------------------------------------------------------------
7. RATE LIMIT & RETRIES
-----------------------------------------------------------------------
- Soft limit: 120 requests per minute. Contact Raam Group if you expect higher volume.
- On HTTP 5xx, retry up to three times using exponential backoff (e.g., 1s, 2s, 4s).

-----------------------------------------------------------------------
8. SUPPORT & CONTACT
-----------------------------------------------------------------------
Integration team email: integration@raamgroup.in
Support hotline: +91-XXXXXXXXXX
Maintenance window: Sundays 01:00–02:00 IST (advance notice sent when work is planned).

-----------------------------------------------------------------------
APPENDIX – TROUBLESHOOTING CHECKLIST
-----------------------------------------------------------------------
[ ] Confirm HTTPS POST to the correct URL.
[ ] Include “Content-Type: application/json”.
[ ] Include “X-API-Key: raam-digital-2025-supersecret-cardekho”.
[ ] Ensure name and phone_number fields are populated.
[ ] Log Raam Group response body/status for audit.

-----------------------------------------------------------------------
END OF DOCUMENT
-----------------------------------------------------------------------

