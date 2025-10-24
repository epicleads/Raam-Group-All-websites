# 🚀 MG Models Pricing Backend Setup Guide

## 📁 Files Created

1. ✅ **SUPABASE_MG_MODELS_PRICING_SCHEMA.sql** - Database schema
2. ✅ **mg_models_pricing.js** - Backend API logic (CRUD operations)
3. ✅ **router.js** - Updated with pricing routes
4. ✅ **MODELS_PRICING_API_DOCS.md** - Complete API documentation
5. ✅ **test-pricing-api.js** - Test script

---

## 🗄️ **Database Table Structure**

### **Table Name:** `mg_models_pricing`

**One table manages ALL 6 models:**
- MG Astor
- MG Comet EV
- MG Hector
- MG Windsor EV
- MG Gloster
- MG ZS EV

### **Key Columns:**

| Column | Purpose | Example |
|--------|---------|---------|
| `model_name` | Unique ID | `"astor"` |
| `model_display_name` | Display name | `"MG Astor"` |
| `starting_price` | Starting price | `"₹9.99 Lakh*"` |
| `top_price` | Top price | `"₹13.69 Lakh*"` |
| `variants` | JSON array of variants | `[{name, price, fuel, transmission}]` |
| `features` | JSON array of features | `["Feature 1", "Feature 2"]` |
| `specifications` | JSON object | `{engine: {petrol: "..."}}` |
| `is_active` | Active status | `true/false` |
| `updated_at` | Auto-updated timestamp | Auto |

---

## 🛠️ **Setup Instructions**

### **Step 1: Create Database Table**

1. Open Supabase Dashboard → SQL Editor
2. Copy entire content from `SUPABASE_MG_MODELS_PRICING_SCHEMA.sql`
3. Click "Run" to execute
4. Verify table created: Check "Table Editor" → `mg_models_pricing`

**Expected Result:**
- ✅ Table created with 6 rows (all models)
- ✅ Indexes created
- ✅ Triggers set up
- ✅ RLS policies enabled

---

### **Step 2: Test Database Connection**

Run the test script:

```bash
cd Backend/raam-mg
node test-pricing-api.js
```

**Expected Output:**
```
✅ Successfully connected to Supabase
✅ Found 6 models:
   - MG Astor: ₹9.99 Lakh* - ₹13.69 Lakh* (4 variants)
   - MG Comet EV: ₹7.49 Lakh* - ₹10.85 Lakh* (4 variants)
   - MG Hector: ₹14.49 Lakh* - ₹21.42 Lakh* (4 variants)
   - MG Windsor EV: ₹13.49 Lakh* - ₹15.49 Lakh* (3 variants)
   - MG Gloster: ₹38.80 Lakh* - ₹43.87 Lakh* (4 variants)
   - MG ZS EV: ₹18.98 Lakh* - ₹25.88 Lakh* (3 variants)
```

---

### **Step 3: Test API Endpoints**

**Test GET all models:**
```bash
curl https://raam-group-all-websites.onrender.com/admin/raam-mg/models/pricing
```

**Test GET Astor:**
```bash
curl https://raam-group-all-websites.onrender.com/admin/raam-mg/models/pricing/astor
```

**Test UPDATE Astor price:**
```bash
curl -X PUT https://raam-group-all-websites.onrender.com/admin/raam-mg/models/pricing/astor \
  -H "Content-Type: application/json" \
  -d '{
    "starting_price": "₹10.49 Lakh*",
    "top_price": "₹14.49 Lakh*",
    "updated_by": "admin@raammg.com"
  }'
```

---

## 📡 **API Endpoints Summary**

| Method | Endpoint | Purpose |
|--------|----------|---------|
| `GET` | `/models/pricing` | Get all models |
| `GET` | `/models/pricing/:modelName` | Get specific model |
| `POST` | `/models/pricing` | Create new model |
| `PUT` | `/models/pricing/:modelName` | Update model pricing |
| `PATCH` | `/models/pricing/:modelName/variants` | Update only variants |
| `DELETE` | `/models/pricing/:modelName` | Soft delete model |

---

## 💾 **Data Structure**

### **Variants JSON Structure:**
```json
{
  "variants": [
    {
      "name": "Sprint",
      "price": "₹9.99 Lakh*",
      "fuel": "Petrol",
      "transmission": "5MT"
    }
  ]
}
```

### **Features JSON Structure:**
```json
{
  "features": [
    "Most Advanced SUV in its Class",
    "India's First AI-Powered SUV"
  ]
}
```

### **Specifications JSON Structure:**
```json
{
  "specifications": {
    "engine": {
      "petrol": "VTi-TECH 1.5L - 110 PS / 144 Nm"
    },
    "transmission": "5MT / 8CVT",
    "driveType": "Front Wheel Drive"
  }
}
```

---

## 🔄 **Update Workflow**

### **Scenario 1: Admin wants to update Astor starting price**

**Current Price:** ₹9.99 Lakh*  
**New Price:** ₹10.49 Lakh*

**API Call:**
```bash
PUT /admin/raam-mg/models/pricing/astor
{
  "starting_price": "₹10.49 Lakh*",
  "updated_by": "admin@raammg.com"
}
```

**Result:**
- ✅ Database updated instantly
- ✅ Frontend will get new price on next fetch
- ✅ All SEO metadata auto-updates
- ✅ Audit trail maintained

---

### **Scenario 2: Admin wants to update all variant prices**

**API Call:**
```bash
PATCH /admin/raam-mg/models/pricing/astor/variants
{
  "variants": [
    {"name": "Sprint", "price": "₹10.99 Lakh*", "fuel": "Petrol", "transmission": "5MT"},
    {"name": "Shine", "price": "₹12.99 Lakh*", "fuel": "Petrol", "transmission": "5MT/8CVT"}
  ],
  "updated_by": "admin@raammg.com"
}
```

---

## 📊 **Frontend Integration Plan**

### **Phase 1: Update Astor Page**

**File:** `raam-mg/src/app/mg-models/astor/page.tsx`

**Change from:**
```tsx
async function getAstorData() {
  return {
    startingPrice: "₹9.99 Lakh*",  // ❌ Hardcoded
    // ...
  }
}
```

**Change to:**
```tsx
async function getAstorData() {
  try {
    const res = await fetch(
      'https://raam-group-all-websites.onrender.com/admin/raam-mg/models/pricing/astor',
      { next: { revalidate: 3600 } } // Cache for 1 hour
    )
    const result = await res.json()
    return result.data // ✅ Dynamic from backend
  } catch (error) {
    // Fallback to static data
    return { /* fallback */ }
  }
}
```

**Pass to components:**
```tsx
<HeroSection startingPrice={astorData.starting_price} />
<ModelVariants variants={astorData.variants} />
```

---

## 🎯 **Benefits of This System**

1. ✅ **Single Source of Truth** - One table for all models
2. ✅ **Real-time Updates** - Change price in admin panel → Live immediately
3. ✅ **No Code Deployment** - Update prices without touching code
4. ✅ **Audit Trail** - Track who changed what and when
5. ✅ **Scalable** - Easy to add new models or variants
6. ✅ **Version Control** - All changes tracked with timestamps
7. ✅ **Flexible** - JSONB allows any structure for variants/features

---

## 🚨 **Important Notes**

1. **Cache Strategy:** Frontend caches for 1 hour (`revalidate: 3600`)
2. **Fallback:** Always have fallback data in case API fails
3. **Validation:** Backend validates all model names and data
4. **Security:** RLS policies ensure data security
5. **Performance:** Indexed queries for fast lookups

---

## 📈 **Next Steps**

### **Immediate:**
1. ✅ Run SQL schema in Supabase
2. ✅ Test endpoints using `test-pricing-api.js`
3. ⏳ Build Admin Panel UI
4. ⏳ Integrate Astor page with API
5. ⏳ Replicate for other 5 models

### **Admin Panel Features Needed:**
- 📝 Model selector dropdown
- 💰 Price input fields (starting, top)
- 🔢 Variant editor (add/edit/delete variants)
- 📋 Features list editor
- 🔧 Specifications editor
- 👁️ Preview before save
- 📊 Change history/audit log

---

## ✅ **Checklist**

- [ ] Run SQL schema in Supabase
- [ ] Verify 6 models created in database
- [ ] Test GET endpoint for all models
- [ ] Test GET endpoint for specific model (astor)
- [ ] Test UPDATE endpoint
- [ ] Create admin panel UI
- [ ] Integrate Astor page with API
- [ ] Test on production
- [ ] Replicate for all 6 models

---

## 📞 **Support**

For questions or issues:
- Check API logs in backend
- Verify Supabase connection
- Check environment variables
- Review API documentation

---

**Backend Setup Complete! Ready for Admin Panel Development** 🎉

