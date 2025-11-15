# MG DIGITAL LEADS – KNOWLARITY WEBHOOK GUIDE

-----------------------------------------------------------------------
1. OVERVIEW
-----------------------------------------------------------------------
This document outlines how Knowlarity should post call leads to Raam Group’s CRM via secure HTTPS webhook. Copy into a Word template or export directly to share with the Knowlarity team.

-----------------------------------------------------------------------
2. PRODUCTION ACCESS
-----------------------------------------------------------------------
Endpoint (POST): https://raam-group-all-websites.onrender.com/admin/mg-digital-leads/source/knowlarity
Transport: HTTPS (TLS 1.2+)
Timeout: 10 seconds
Content-Type: application/json; charset=utf-8

-----------------------------------------------------------------------
3. AUTHENTICATION
-----------------------------------------------------------------------
Header: X-API-Key: raam-digital-2025-supersecret-knowlarity
Behaviour: Missing key → 401 Unauthorized, invalid key → 403 Forbidden.
Store the key securely; notify Raam Group immediately if you believe it has been exposed.

-----------------------------------------------------------------------
4. REQUEST FORMAT
-----------------------------------------------------------------------
Required Fields
  • phone_number (preferred) or mobile / phone / msisdn

Optional Fields (captured when provided)
  • caller name
  • campaign identifiers
  • any additional metadata (stored in payload JSON)

Sample JSON Body (minimum payload)
{
  "phone_number": "9876543210"
}

Sample JSON Body (with extra context)
{
  "phone_number": "9876543210",
  "name": "Lead from IVR",
  "campaign": "Knowlarity Inbound Nov-2025"
}

-----------------------------------------------------------------------
5. RESPONSE CODES
-----------------------------------------------------------------------
Success (HTTP 201)
{
  "message": "Knowlarity lead inserted successfully"
}

Error Responses
400 Bad Request – missing phone number or invalid payload (example: {"error":"Missing required fields: phone_number"})
401 Unauthorized – API key header not supplied
403 Forbidden – API key invalid
500 Internal Server Error – unexpected server issue; retry with backoff

-----------------------------------------------------------------------
6. DATA HANDLING
-----------------------------------------------------------------------
- Leads insert into public."mg-digital-leads" with platform fixed to “Knowlarity”.
- Name defaults to “Knowlarity Lead <phone>” if no name arrives.
- Complete payload JSON is archived for audit purposes.
- Duplicate submissions are allowed (deduplication planned for future).

-----------------------------------------------------------------------
7. RATE LIMIT & RETRIES
-----------------------------------------------------------------------
- Soft limit: 120 requests per minute. Coordinate with Raam Group if higher throughput is anticipated.
- On HTTP 5xx responses, retry up to three times with exponential backoff (e.g., 1s, 2s, 4s).

-----------------------------------------------------------------------
8. SUPPORT & CONTACT
-----------------------------------------------------------------------
Integration team email: integration@raamgroup.in
Support hotline: +91-XXXXXXXXXX
Maintenance window: Sundays 01:00–02:00 IST (notification sent prior to any planned downtime).

-----------------------------------------------------------------------
APPENDIX – TROUBLESHOOTING CHECKLIST
-----------------------------------------------------------------------
[ ] Confirm HTTPS POST to the Knowlarity endpoint URL.
[ ] Set “Content-Type: application/json”.
[ ] Include “X-API-Key: raam-digital-2025-supersecret-knowlarity”.
[ ] Ensure phone number field is present and non-empty.
[ ] Log Raam Group response body/status for operational visibility.

-----------------------------------------------------------------------
END OF DOCUMENT
-----------------------------------------------------------------------


