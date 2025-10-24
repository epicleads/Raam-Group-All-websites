# MG Models Pricing API Documentation

## Base URL
```
https://raam-group-all-websites.onrender.com/admin/raam-mg/models/pricing
```

---

## 📋 **API Endpoints**

### 1️⃣ **GET All Models Pricing**

**Endpoint:**
```
GET /admin/raam-mg/models/pricing
```

**Query Parameters:**
- `active_only` (optional): `true` | `false` - Default: `true`
- `include_inactive` (optional): `true` | `false` - Default: `false`

**Example Request:**
```bash
curl -X GET "https://raam-group-all-websites.onrender.com/admin/raam-mg/models/pricing"
```

**Example Response:**
```json
{
  "success": true,
  "message": "Models pricing fetched successfully",
  "data": {
    "models": [
      {
        "id": 1,
        "model_name": "astor",
        "model_display_name": "MG Astor",
        "starting_price": "₹9.99 Lakh*",
        "top_price": "₹13.69 Lakh*",
        "variants": [...],
        "features": [...],
        "specifications": {...},
        "is_active": true,
        "created_at": "2025-10-23T...",
        "updated_at": "2025-10-23T..."
      },
      ...
    ],
    "count": 6
  },
  "timestamp": "2025-10-23T..."
}
```

---

### 2️⃣ **GET Specific Model Pricing**

**Endpoint:**
```
GET /admin/raam-mg/models/pricing/:modelName
```

**Valid Model Names:**
- `astor`
- `comet`
- `hector`
- `windsor`
- `gloster`
- `zsev`

**Example Request:**
```bash
curl -X GET "https://raam-group-all-websites.onrender.com/admin/raam-mg/models/pricing/astor"
```

**Example Response:**
```json
{
  "success": true,
  "message": "Pricing for MG Astor fetched successfully",
  "data": {
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
      }
    ],
    "features": [
      "Most Advanced SUV in its Class",
      "India's First AI-Powered SUV"
    ],
    "specifications": {
      "engine": {
        "petrol": "VTi-TECH 1.5L - 110 PS / 144 Nm"
      }
    },
    "is_active": true,
    "display_order": 1
  }
}
```

---

### 3️⃣ **POST Create New Model Pricing**

**Endpoint:**
```
POST /admin/raam-mg/models/pricing
```

**Request Body:**
```json
{
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
    }
  ],
  "features": [
    "Most Advanced SUV in its Class",
    "India's First AI-Powered SUV"
  ],
  "specifications": {
    "engine": {
      "petrol": "VTi-TECH 1.5L - 110 PS / 144 Nm"
    }
  },
  "is_active": true,
  "display_order": 1,
  "updated_by": "admin@raammg.com"
}
```

**Example Request:**
```bash
curl -X POST "https://raam-group-all-websites.onrender.com/admin/raam-mg/models/pricing" \
  -H "Content-Type: application/json" \
  -d '{
    "model_name": "astor",
    "model_display_name": "MG Astor",
    "starting_price": "₹9.99 Lakh*",
    "top_price": "₹13.69 Lakh*",
    "variants": [],
    "updated_by": "admin"
  }'
```

---

### 4️⃣ **PUT Update Model Pricing**

**Endpoint:**
```
PUT /admin/raam-mg/models/pricing/:modelName
```

**Request Body:** (Send only fields you want to update)
```json
{
  "starting_price": "₹10.99 Lakh*",
  "top_price": "₹14.99 Lakh*",
  "updated_by": "admin@raammg.com"
}
```

**Example Request:**
```bash
curl -X PUT "https://raam-group-all-websites.onrender.com/admin/raam-mg/models/pricing/astor" \
  -H "Content-Type: application/json" \
  -d '{
    "starting_price": "₹10.99 Lakh*",
    "top_price": "₹14.99 Lakh*",
    "updated_by": "admin@raammg.com"
  }'
```

**Example Response:**
```json
{
  "success": true,
  "message": "Pricing for MG Astor updated successfully",
  "data": {
    "id": 1,
    "model_name": "astor",
    "starting_price": "₹10.99 Lakh*",
    "top_price": "₹14.99 Lakh*",
    "updated_at": "2025-10-23T..."
  }
}
```

---

### 5️⃣ **PATCH Update Only Variants**

**Endpoint:**
```
PATCH /admin/raam-mg/models/pricing/:modelName/variants
```

**Request Body:**
```json
{
  "variants": [
    {
      "name": "Sprint",
      "price": "₹10.99 Lakh*",
      "fuel": "Petrol",
      "transmission": "5MT"
    },
    {
      "name": "Shine",
      "price": "₹12.99 Lakh*",
      "fuel": "Petrol",
      "transmission": "5MT/8CVT"
    }
  ],
  "updated_by": "admin@raammg.com"
}
```

**Example Request:**
```bash
curl -X PATCH "https://raam-group-all-websites.onrender.com/admin/raam-mg/models/pricing/astor/variants" \
  -H "Content-Type: application/json" \
  -d '{
    "variants": [...],
    "updated_by": "admin"
  }'
```

---

### 6️⃣ **DELETE Model Pricing**

**Endpoint:**
```
DELETE /admin/raam-mg/models/pricing/:modelName?permanent=false
```

**Query Parameters:**
- `permanent` (optional): `true` | `false` - Default: `false` (soft delete)
- `updated_by` (optional): Email/name of admin

**Soft Delete (Default):**
```bash
curl -X DELETE "https://raam-group-all-websites.onrender.com/admin/raam-mg/models/pricing/astor"
```
Sets `is_active = false`

**Permanent Delete:**
```bash
curl -X DELETE "https://raam-group-all-websites.onrender.com/admin/raam-mg/models/pricing/astor?permanent=true"
```
Removes from database completely

---

## 🔐 **Error Responses**

### 400 Bad Request
```json
{
  "success": false,
  "error": "Missing required fields",
  "details": null,
  "timestamp": "2025-10-23T..."
}
```

### 404 Not Found
```json
{
  "success": false,
  "error": "Model 'xyz' not found",
  "details": null,
  "timestamp": "2025-10-23T..."
}
```

### 500 Internal Server Error
```json
{
  "success": false,
  "error": "Failed to fetch model pricing",
  "details": "Database connection error",
  "timestamp": "2025-10-23T..."
}
```

---

## 📊 **Database Schema**

### Table: `mg_models_pricing`

| Column | Type | Description |
|--------|------|-------------|
| `id` | BIGSERIAL | Primary key |
| `model_name` | VARCHAR(50) | Unique model identifier (astor, comet, etc.) |
| `model_display_name` | VARCHAR(100) | Display name (MG Astor, MG Comet EV) |
| `starting_price` | VARCHAR(50) | Starting price with currency |
| `top_price` | VARCHAR(50) | Top variant price |
| `variants` | JSONB | Array of variant objects |
| `features` | JSONB | Array of feature strings |
| `specifications` | JSONB | Object with specs |
| `is_active` | BOOLEAN | Active status |
| `display_order` | INTEGER | Display order |
| `created_at` | TIMESTAMPTZ | Creation timestamp |
| `updated_at` | TIMESTAMPTZ | Last update timestamp |
| `last_price_update` | TIMESTAMPTZ | Last price change |
| `updated_by` | VARCHAR(100) | Admin who updated |

---

## 🧪 **Testing the API**

### Test 1: Get Astor Pricing
```bash
curl https://raam-group-all-websites.onrender.com/admin/raam-mg/models/pricing/astor
```

### Test 2: Update Astor Pricing
```bash
curl -X PUT https://raam-group-all-websites.onrender.com/admin/raam-mg/models/pricing/astor \
  -H "Content-Type: application/json" \
  -d '{
    "starting_price": "₹10.49 Lakh*",
    "updated_by": "admin"
  }'
```

### Test 3: Get All Models
```bash
curl https://raam-group-all-websites.onrender.com/admin/raam-mg/models/pricing
```

---

## 🔄 **Workflow**

1. **Setup**: Run SQL schema in Supabase
2. **Test**: Use GET endpoint to verify data
3. **Admin Panel**: Build UI to manage prices
4. **Frontend**: Update Astor page to fetch from API
5. **Replicate**: Apply to all 6 models

---

## ✅ **Next Steps**

1. ✅ Run `SUPABASE_MG_MODELS_PRICING_SCHEMA.sql` in Supabase
2. ✅ Test endpoints using curl/Postman
3. ⏳ Build Admin Panel UI
4. ⏳ Integrate with Astor page
5. ⏳ Apply to all 6 models

