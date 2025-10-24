# 📋 Supabase Table Structure - MG Models Pricing

## 🗄️ **Table Name:** `mg_models_pricing`

---

## 📊 **Complete Column List**

| # | Column Name | Data Type | Constraints | Description |
|---|-------------|-----------|-------------|-------------|
| 1 | `id` | BIGSERIAL | PRIMARY KEY | Auto-increment ID |
| 2 | `model_name` | VARCHAR(50) | NOT NULL, UNIQUE | Model identifier (astor, comet, hector, windsor, gloster, zsev) |
| 3 | `model_display_name` | VARCHAR(100) | NOT NULL | Display name (MG Astor, MG Comet EV, etc.) |
| 4 | `starting_price` | VARCHAR(50) | NOT NULL | Starting price (₹9.99 Lakh*) |
| 5 | `top_price` | VARCHAR(50) | NOT NULL | Top variant price (₹13.69 Lakh*) |
| 6 | `variants` | JSONB | NOT NULL, DEFAULT '[]' | Array of variant objects with price, fuel, transmission |
| 7 | `features` | JSONB | NOT NULL, DEFAULT '[]' | Array of feature strings |
| 8 | `specifications` | JSONB | NOT NULL, DEFAULT '{}' | Object with technical specs |
| 9 | `is_active` | BOOLEAN | DEFAULT true | Active status for display |
| 10 | `is_featured` | BOOLEAN | DEFAULT false | Featured on homepage |
| 11 | `display_order` | INTEGER | DEFAULT 0 | Sort order (1-6) |
| 12 | `meta_title` | TEXT | NULL | SEO title |
| 13 | `meta_description` | TEXT | NULL | SEO description |
| 14 | `meta_keywords` | TEXT[] | NULL | SEO keywords array |
| 15 | `created_at` | TIMESTAMPTZ | DEFAULT NOW() | Creation timestamp |
| 16 | `updated_at` | TIMESTAMPTZ | DEFAULT NOW() | Last update (auto-updated) |
| 17 | `last_price_update` | TIMESTAMPTZ | DEFAULT NOW() | Last price change (auto-tracked) |
| 18 | `updated_by` | VARCHAR(100) | NULL | Admin email/name |
| 19 | `created_by` | VARCHAR(100) | DEFAULT 'system' | Creator |
| 20 | `admin_notes` | TEXT | NULL | Internal notes |

---

## 📦 **Sample Data Row (Astor)**

```json
{
  "id": 1,
  "model_name": "astor",
  "model_display_name": "MG Astor",
  "starting_price": "₹9.99 Lakh*",
  "top_price": "₹13.69 Lakh*",
  "variants": [
    {
      "name": "Sprint",
      "price": "₹9.99 Lakh*",
      "fuel": "Petrol",
      "transmission": "5MT"
    },
    {
      "name": "Shine",
      "price": "₹11.59 Lakh*",
      "fuel": "Petrol",
      "transmission": "5MT/8CVT"
    },
    {
      "name": "Select",
      "price": "₹12.69 Lakh*",
      "fuel": "Petrol",
      "transmission": "5MT/8CVT"
    },
    {
      "name": "Sharp Pro",
      "price": "₹13.69 Lakh*",
      "fuel": "Petrol",
      "transmission": "8CVT"
    }
  ],
  "features": [
    "Most Advanced SUV in its Class",
    "India's First AI-Powered SUV",
    "14 Autonomous Level-2 ADAS Features",
    "Personal AI Assistant",
    "25.7cm HD Touchscreen",
    "Digital Instrument Cluster 17.78cm",
    "6 Airbags with ESP",
    "49 Standard Safety Features",
    "Panoramic Skyroof",
    "i-Smart 2.0 Technology"
  ],
  "specifications": {
    "engine": {
      "petrol": "VTi-TECH 1.5L - 110 PS / 144 Nm"
    },
    "transmission": "5MT / 8CVT",
    "driveType": "Front Wheel Drive",
    "fuelTank": "45 Litres",
    "bootSpace": "448 Litres",
    "seating": "5 Seater",
    "groundClearance": "180 mm"
  },
  "is_active": true,
  "is_featured": false,
  "display_order": 1,
  "created_at": "2025-10-23T10:00:00Z",
  "updated_at": "2025-10-23T10:00:00Z",
  "last_price_update": "2025-10-23T10:00:00Z",
  "updated_by": "admin",
  "created_by": "admin",
  "admin_notes": null
}
```

---

## 🔍 **All 6 Models - Default Data**

| Model | Starting Price | Top Price | Variants Count |
|-------|----------------|-----------|----------------|
| **MG Astor** | ₹9.99 Lakh* | ₹13.69 Lakh* | 4 |
| **MG Comet EV** | ₹7.49 Lakh* | ₹10.85 Lakh* | 4 |
| **MG Hector** | ₹14.49 Lakh* | ₹21.42 Lakh* | 4 |
| **MG Windsor EV** | ₹13.49 Lakh* | ₹15.49 Lakh* | 3 |
| **MG Gloster** | ₹38.80 Lakh* | ₹43.87 Lakh* | 4 |
| **MG ZS EV** | ₹18.98 Lakh* | ₹25.88 Lakh* | 3 |

---

## 🎯 **Price Update Locations (Astor)**

### **Currently Hardcoded:**

1. **page.tsx - getAstorData()** (Lines 120-126)
   - Starting price: 1x
   - Top price: 1x
   - Variant prices: 4x

2. **HeroSection.tsx** (Line 125)
   - Starting price: 1x

3. **ModelVariants.tsx** (Lines 18, 38, 58, 78)
   - Variant prices: 4x

**Total Hardcoded Locations:** 11 price values

### **Will Become Dynamic:**

1. **Backend API** → Fetch from Supabase
2. **page.tsx** → Calls API, gets all data
3. **Components** → Receive prices as props
4. **SEO Metadata** → Auto-updated from API data

---

## 🏗️ **Admin Panel Data Flow**

```
┌─────────────────┐
│  Admin Panel    │
│  (Update Price) │
└────────┬────────┘
         │
         ↓
┌─────────────────┐
│  PUT /models/   │
│  pricing/astor  │
└────────┬────────┘
         │
         ↓
┌─────────────────┐
│  Supabase DB    │
│  mg_models_     │
│  pricing table  │
└────────┬────────┘
         │
         ↓
┌─────────────────┐
│  Frontend API   │
│  GET /models/   │
│  pricing/astor  │
└────────┬────────┘
         │
         ↓
┌─────────────────┐
│  Astor Page     │
│  (Shows New     │
│   Price)        │
└─────────────────┘
```

---

## ✅ **Advantages**

1. ✅ **Centralized Management** - All 6 models in one table
2. ✅ **No Code Changes** - Update prices without deployment
3. ✅ **Real-time** - Changes reflect immediately (after cache expires)
4. ✅ **Audit Trail** - Track all changes with timestamps
5. ✅ **Flexible** - JSONB allows any structure
6. ✅ **Scalable** - Easy to add new models
7. ✅ **SEO Friendly** - Metadata auto-updates

---

## 🔐 **Security Features**

1. ✅ **Row Level Security (RLS)** enabled
2. ✅ **Public read** access to active models only
3. ✅ **Authenticated write** access for admin
4. ✅ **Soft delete** by default (preserves data)
5. ✅ **Validation** on all inputs

---

## 📝 **Quick Reference**

### **Get Astor Pricing:**
```sql
SELECT * FROM mg_models_pricing WHERE model_name = 'astor';
```

### **Update Astor Starting Price:**
```sql
UPDATE mg_models_pricing 
SET starting_price = '₹10.99 Lakh*', 
    updated_by = 'admin@raammg.com'
WHERE model_name = 'astor';
```

### **Get All Active Models:**
```sql
SELECT model_display_name, starting_price, top_price 
FROM mg_models_pricing 
WHERE is_active = true 
ORDER BY display_order;
```

---

**Setup complete! Ready to proceed with Admin Panel** 🚀

