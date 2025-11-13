# MG DIGITAL LEADS – CARWALE WEBHOOK GUIDE

-----------------------------------------------------------------------
1. OVERVIEW
-----------------------------------------------------------------------
This document provides the instructions CarWale must follow to deliver leads securely to Raam Group’s CRM via HTTPS webhook. Use directly or copy into Word for distribution.

-----------------------------------------------------------------------
2. PRODUCTION ACCESS
-----------------------------------------------------------------------
Endpoint (POST): https://raam-group-all-websites.onrender.com/admin/mg-digital-leads/source/carwale
Transport: HTTPS (TLS 1.2+)
Timeout: 10 seconds
Content-Type: application/json; charset=utf-8

-----------------------------------------------------------------------
3. AUTHENTICATION
-----------------------------------------------------------------------
Header: X-API-Key: raam-digital-2025-supersecret-carwale
Behaviour: Missing key → 401 Unauthorized, invalid key → 403 Forbidden.
Store the key securely and notify Raam Group immediately if exposed.

-----------------------------------------------------------------------
4. REQUEST FORMAT
-----------------------------------------------------------------------
Required Fields
  • customer_name (or name)
  • mobile (or phone_number)

Optional Fields (captured when present)
  • vehicle_model
  • page_url
  • campaign identifiers
  • additional attributes (recorded in payload JSON)

Sample JSON Body
{
  "customer_name": "Sunita Rao",
  "mobile": "9123456780",
  "vehicle_model": "Hyundai Creta",
  "page_url": "https://carwale.com/lead/456",
  "campaign": "Creta Test Drive"
}

-----------------------------------------------------------------------
5. RESPONSES
-----------------------------------------------------------------------
Success (HTTP 201)
{
  "message": "CarWale lead inserted successfully"
}

Error Responses
400 Bad Request – required fields missing (example: {"error":"Missing required fields: customer_name"})
401 Unauthorized – API key header not provided
403 Forbidden – API key invalid
500 Internal Server Error – unexpected server issue; retry with exponential backoff

-----------------------------------------------------------------------
6. DATA HANDLING
-----------------------------------------------------------------------
- Leads insert into table public."mg-digital-leads" with platform fixed to “CarWale”.
- Full payload is stored for audit purposes.
- Duplicate submissions are currently accepted (deduplication planned).

-----------------------------------------------------------------------
7. RATE LIMIT & RETRIES
-----------------------------------------------------------------------
- Soft limit: 120 requests per minute. Contact Raam Group if higher throughput is needed.
- On HTTP 5xx responses, retry up to three times using exponential backoff (e.g., 1s, 2s, 4s).

-----------------------------------------------------------------------
8. SUPPORT & CONTACT
-----------------------------------------------------------------------
Integration team email: integration@raamgroup.in
Support hotline: +91-XXXXXXXXXX
Maintenance window: Sundays 01:00–02:00 IST (advance notifications provided).

-----------------------------------------------------------------------
APPENDIX – TROUBLESHOOTING CHECKLIST
-----------------------------------------------------------------------
[ ] Verify HTTPS POST to the CarWale endpoint URL.
[ ] Set “Content-Type: application/json”.
[ ] Include “X-API-Key: raam-digital-2025-supersecret-carwale”.
[ ] Ensure required name/mobile fields are populated.
[ ] Capture Raam Group response body/status for records.

-----------------------------------------------------------------------
END OF DOCUMENT
-----------------------------------------------------------------------

