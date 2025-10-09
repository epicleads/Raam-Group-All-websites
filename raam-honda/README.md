# Raam Honda - Backend Lead Management System

## 🎯 Overview

Backend API for managing leads from Raam Honda website. Supports both **Test Drive** and **General Enquiry** forms, storing all data in a single Supabase table.

---

## 📋 Table of Contents

1. [Setup Instructions](#setup-instructions)
2. [Database Schema](#database-schema)
3. [API Endpoints](#api-endpoints)
4. [Frontend Integration](#frontend-integration)
5. [Testing](#testing)

---

## 🚀 Setup Instructions

### **Step 1: Create Supabase Table**

1. Go to your Supabase project dashboard
2. Navigate to **SQL Editor**
3. Run the SQL from `SUPABASE_SCHEMA.sql`
4. Table `honda_leads` will be created with all indexes and policies

### **Step 2: Configure Environment Variables**

Create `.env` file in Backend directory:

```env
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_KEY=your-service-role-key-here
PORT=5000
```

### **Step 3: Install Dependencies**

```bash
npm install express @supabase/supabase-js dotenv cors
```

### **Step 4: Add Route to Server**

In your main `server.js` or `app.js`:

```javascript
const hondaLeadsRouter = require('./raam-honda/honda_leads');

// Routes
app.use('/admin/raam-honda/leads', hondaLeadsRouter);
```

### **Step 5: Start Server**

```bash
npm start
# or
node server.js
```

Server should start on `http://localhost:5000`

---

## 📊 Database Schema

### **Table: `honda_leads`**

| Column | Type | Required | Default | Description |
|--------|------|----------|---------|-------------|
| `id` | UUID | Auto | gen_random_uuid() | Primary key |
| `name` | VARCHAR(255) | ✅ Yes | - | Customer full name |
| `phone_number` | VARCHAR(15) | ✅ Yes | - | 10-digit mobile number |
| `preferred_model` | VARCHAR(100) | ❌ No | NULL | Honda model (Activa, Dio, etc.) |
| `location` | VARCHAR(255) | ❌ No | NULL | Preferred showroom location |
| `service_type` | VARCHAR(50) | ❌ No | 'general_enquiry' | 'test_drive' or 'general_enquiry' |
| `lead_source_page` | VARCHAR(100) | ❌ No | 'unknown' | Page where lead originated |
| `enquiry_type` | VARCHAR(100) | ❌ No | NULL | Type of enquiry (for general form) |
| `message` | TEXT | ❌ No | NULL | Customer message (for general form) |
| `created_at` | TIMESTAMPTZ | Auto | NOW() | Lead creation timestamp |
| `updated_at` | TIMESTAMPTZ | Auto | NOW() | Last update timestamp |

### **Indexes:**
- ✅ `idx_honda_leads_phone` - Fast phone number lookups
- ✅ `idx_honda_leads_created_at` - Fast date sorting
- ✅ `idx_honda_leads_service_type` - Filter by service type
- ✅ `idx_honda_leads_source_page` - Analytics by source page

---

## 🔌 API Endpoints

### **1. Create Lead (POST)**

**Endpoint:** `POST /admin/raam-honda/leads`

**Request Body:**
```json
{
  "name": "Rajesh Kumar",
  "phone_number": "9876543210",
  "preferred_model": "Honda Activa",
  "location": "Tadbund",
  "service_type": "test_drive",
  "lead_source_page": "homepage"
}
```

**Mandatory Fields:**
- ✅ `name` - Customer name
- ✅ `phone_number` - 10-digit Indian mobile

**Optional Fields:**
- `preferred_model` - Honda model
- `location` - Showroom location
- `service_type` - 'test_drive' or 'general_enquiry' (default: 'general_enquiry')
- `lead_source_page` - Tracking source
- `enquiry_type` - Type of enquiry
- `message` - Customer message

**Response (201):**
```json
{
  "success": true,
  "lead": {
    "id": "uuid-here",
    "name": "Rajesh Kumar",
    "phone_number": "9876543210",
    "created_at": "2025-10-09T10:30:00Z",
    ...
  }
}
```

**Error (400):**
```json
{
  "error": "Missing required fields: name and phone_number are mandatory"
}
```

---

### **2. Get All Leads (GET)**

**Endpoint:** `GET /admin/raam-honda/leads`

**Query Parameters:**
- `source` - Filter by lead source page
- `service_type` - Filter by service type
- `enquiry_type` - Filter by enquiry type
- `limit` - Limit number of results

**Examples:**
```bash
# Get all leads
GET /admin/raam-honda/leads

# Get test drive leads only
GET /admin/raam-honda/leads?service_type=test_drive

# Get leads from homepage
GET /admin/raam-honda/leads?source=homepage

# Get last 50 leads
GET /admin/raam-honda/leads?limit=50

# Combined filters
GET /admin/raam-honda/leads?service_type=test_drive&source=offers&limit=20
```

**Response (200):**
```json
{
  "success": true,
  "leads": [
    {
      "id": "uuid-1",
      "name": "Rajesh Kumar",
      "phone_number": "9876543210",
      "service_type": "test_drive",
      "created_at": "2025-10-09T10:30:00Z",
      ...
    }
  ],
  "count": 1
}
```

---

### **3. Get Lead Statistics (GET)**

**Endpoint:** `GET /admin/raam-honda/leads/stats`

**Response (200):**
```json
{
  "success": true,
  "stats": {
    "total_leads": 250,
    "last_30_days": 45,
    "by_service_type": {
      "test_drive": 180,
      "general_enquiry": 70
    }
  }
}
```

---

### **4. Delete Lead (DELETE)**

**Endpoint:** `DELETE /admin/raam-honda/leads/:id`

**Example:**
```bash
DELETE /admin/raam-honda/leads/uuid-here
```

**Response (200):**
```json
{
  "success": true,
  "message": "Lead deleted successfully"
}
```

---

## 🔗 Frontend Integration

### **Test Drive Form**

**File:** `src/app/components/LeadsForm/testDriveForm.tsx`

**Changes Made:**
1. ✅ Updated API endpoint to `/admin/raam-honda/leads`
2. ✅ Changed phone to `+91-87126-00672`
3. ✅ Made only `name` and `phone_number` mandatory
4. ✅ Location and model are now optional

**Example Submission:**
```javascript
const leadData = {
  name: formData.fullName,
  phone_number: formData.phoneNumber,
  preferred_model: formData.preferredModel || null,
  location: formData.location || null,
  service_type: 'test_drive',
  lead_source_page: 'sticky_action_bar'
};

const response = await fetch(`${process.env.NEXT_PUBLIC_LEADS_API_URL}/admin/raam-honda/leads`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(leadData)
});
```

### **General Enquiry Form**

**File:** `src/app/components/LeadsForm/generalEnquiryForm.tsx`

**Update Required:**
```javascript
// Change API endpoint from:
/admin/raam-mg/ 

// To:
/admin/raam-honda/leads

// Add service_type:
service_type: 'general_enquiry'
```

---

## 🧪 Testing

### **Test with cURL:**

**Create Test Drive Lead:**
```bash
curl -X POST http://localhost:5000/admin/raam-honda/leads \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test User",
    "phone_number": "9876543210",
    "preferred_model": "Honda Activa",
    "location": "Tadbund",
    "service_type": "test_drive",
    "lead_source_page": "homepage"
  }'
```

**Get All Leads:**
```bash
curl http://localhost:5000/admin/raam-honda/leads
```

**Get Test Drive Leads Only:**
```bash
curl http://localhost:5000/admin/raam-honda/leads?service_type=test_drive
```

**Get Stats:**
```bash
curl http://localhost:5000/admin/raam-honda/leads/stats
```

---

## 📱 Lead Sources Tracking

### **Possible `lead_source_page` Values:**

- `homepage` - Homepage hero button
- `sticky_action_bar` - Sticky floating buttons
- `header` - Header test drive button
- `models_page` - Models page CTA
- `offers_page` - Offers page
- `services_page` - Services page
- `contact_page` - Contact form
- `store_locator` - Store locator page
- `testimonials` - Testimonials page

This helps track which pages generate most leads!

---

## 🔒 Security Features

1. ✅ **Phone Validation** - Only valid 10-digit Indian numbers accepted
2. ✅ **SQL Injection Protection** - Supabase client prevents injection
3. ✅ **RLS Enabled** - Row Level Security for data protection
4. ✅ **Public Insert Policy** - Anyone can submit leads
5. ✅ **Authenticated Read** - Only admins can read leads
6. ✅ **Error Handling** - Graceful error messages
7. ✅ **CORS Protection** - Configure in main server

---

## 📊 Analytics Queries

### **Get Leads by Source Page:**
```sql
SELECT lead_source_page, COUNT(*) as count 
FROM honda_leads 
GROUP BY lead_source_page 
ORDER BY count DESC;
```

### **Get Conversion Rate by Location:**
```sql
SELECT location, COUNT(*) as leads 
FROM honda_leads 
WHERE service_type = 'test_drive' 
GROUP BY location 
ORDER BY leads DESC;
```

### **Get Popular Models:**
```sql
SELECT preferred_model, COUNT(*) as count 
FROM honda_leads 
WHERE preferred_model IS NOT NULL 
GROUP BY preferred_model 
ORDER BY count DESC;
```

### **Get Leads by Date:**
```sql
SELECT DATE(created_at) as date, COUNT(*) as leads 
FROM honda_leads 
GROUP BY DATE(created_at) 
ORDER BY date DESC 
LIMIT 30;
```

---

## ✅ Validation Rules

### **Name:**
- ✅ Required
- ✅ Trimmed whitespace
- ❌ Cannot be empty

### **Phone Number:**
- ✅ Required
- ✅ Must be 10 digits
- ✅ Must start with 6, 7, 8, or 9 (Indian mobile)
- ✅ Non-digit characters removed automatically
- ❌ Invalid format rejected

### **Optional Fields:**
- Preferred Model - Any string
- Location - Any string
- Service Type - 'test_drive' or 'general_enquiry'
- Enquiry Type - Any string
- Message - Any text

---

## 🎯 Next Steps

1. ✅ Create Supabase table using `SUPABASE_SCHEMA.sql`
2. ✅ Configure environment variables
3. ✅ Add route to main server
4. ✅ Update General Enquiry form API endpoint
5. ✅ Test both forms
6. ✅ Monitor leads in Supabase dashboard

---

## 📞 Support

For issues or questions:
- Check Supabase logs
- Check server console
- Verify environment variables
- Test API with Postman/cURL

---

**Last Updated:** October 9, 2025
**Status:** ✅ Ready for Production

