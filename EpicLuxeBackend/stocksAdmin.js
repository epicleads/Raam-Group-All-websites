const express = require('express');
const router = express.Router();
require("dotenv").config();
const { v4: uuidv4 } = require("uuid");
const { createClient } = require("@supabase/supabase-js");

// Initialize Supabase client
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

// =============== Create Stock ===============
router.post('/', async (req, res) => {
  console.log('[POST /admin/stocks] Incoming body:', req.body);
  try {
    const {
      title,
      short_description,
      price,
      mileage,
      manufactured_year,
      make,
      model,
      variant,
      year,
      fuel_type,
      engine_capacity,
      transmission,
      drivetrain,
      seating_capacity,
      horsepower,
      torque,
      condition,
      original_price,
      ownership,
      image_urls,
      video_url,
      exterior_color,
      interior_color,
      is_featured,
      vehicle_type,
      body_type,
    } = req.body;

    const { data, error } = await supabase.from("featured_cars").insert([
      {
        id: uuidv4(),
        title,
        short_description,
        price,
        mileage,
        manufactured_year,
        make,
        model,
        variant,
        year,
        fuel_type,
        engine_capacity,
        transmission,
        drivetrain,
        seating_capacity,
        horsepower,
        torque,
        condition,
        original_price,
        ownership,
        image_urls,
        video_url,
        exterior_color,
        interior_color,
        is_featured: is_featured || false,
        vehicle_type: vehicle_type || null,
        body_type: body_type || null,
        created_at: new Date().toISOString(),
      },
    ]);

    if (error) throw error;
    console.log('[POST /admin/stocks] Inserted data:', data);
    res.status(200).json({ message: "Stock added successfully", data });
  } catch (error) {
    console.error('[POST /admin/stocks] Error:', error);
    res.status(500).json({ error: error.message });
  }
});

// =============== Update Stock ===============
router.put('/:id', async (req, res) => {
  console.log(`[PUT /admin/stocks/${req.params.id}] Incoming body:`, req.body);
  try {
    const { id } = req.params;
    const updates = req.body;

    const { data, error } = await supabase
      .from("featured_cars")
      .update(updates)
      .eq("id", id);

    if (error) throw error;
    console.log(`[PUT /admin/stocks/${req.params.id}] Updated data:`, data);
    res.status(200).json({ message: "Stock updated successfully", data });
  } catch (error) {
    console.error(`[PUT /admin/stocks/${req.params.id}] Error:`, error);
    res.status(500).json({ error: error.message });
  }
});

// =============== Delete Stock ===============
router.delete('/:id', async (req, res) => {
  console.log(`[DELETE /admin/stocks/${req.params.id}] Request to delete`);
  try {
    const { id } = req.params;

    const { error } = await supabase.from("featured_cars").delete().eq("id", id);

    if (error) throw error;
    console.log(`[DELETE /admin/stocks/${req.params.id}] Deleted successfully`);
    res.status(200).json({ message: "Stock deleted successfully" });
  } catch (error) {
    console.error(`[DELETE /admin/stocks/${req.params.id}] Error:`, error);
    res.status(500).json({ error: error.message });
  }
});

// =============== Get All Stocks ===============
router.get('/', async (req, res) => {
  console.log('[GET /admin/stocks] Fetching all stocks');
  try {
    const { data, error } = await supabase
      .from("featured_cars")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) throw error;
    console.log('[GET /admin/stocks] Fetched data:', data);
    res.status(200).json({ data });
  } catch (error) {
    console.error('[GET /admin/stocks] Error:', error);
    res.status(500).json({ error: error.message });
  }
});

// GET unique brands from vehicles table for dynamic filters
// IMPORTANT: This route MUST come before the /:id route to avoid conflicts
router.get("/brands", async (req, res) => {
  console.log('\n🔍 ============ BRANDS ENDPOINT DEBUG START ============');
  console.log('[GET /admin/stocks/brands] Request received');
  console.log('[GET /admin/stocks/brands] Headers:', JSON.stringify(req.headers, null, 2));
  console.log('[GET /admin/stocks/brands] Query params:', req.query);
  console.log('[GET /admin/stocks/brands] Supabase URL:', process.env.SUPABASE_URL ? 'SET' : 'NOT SET');
  console.log('[GET /admin/stocks/brands] Supabase Key:', process.env.SUPABASE_SERVICE_KEY ? 'SET' : 'NOT SET');

  try {
    console.log('[GET /admin/stocks/brands] Starting Supabase query...');

    // First, let's check if the table exists and has data
    const { count, error: countError } = await supabase
      .from("vehicles")
      .select("*", { count: 'exact', head: true });

    console.log('[GET /admin/stocks/brands] Total vehicles count:', count);
    if (countError) {
      console.error('[GET /admin/stocks/brands] Count error:', countError);
      throw countError;
    }

    // Now fetch the brands
    console.log('[GET /admin/stocks/brands] Fetching unique brands...');
    const { data, error } = await supabase
      .from("vehicles")
      .select("brand")
      .eq("published", true);

    console.log('[GET /admin/stocks/brands] Raw query result:');
    console.log('  - Data:', data);
    console.log('  - Error:', error);
    console.log('  - Data length:', data ? data.length : 'null');

    if (error) {
      console.error('[GET /admin/stocks/brands] Supabase error details:', {
        message: error.message,
        details: error.details,
        hint: error.hint,
        code: error.code
      });
      throw error;
    }

    // Get unique brands from 'brand' column
    console.log('[GET /admin/stocks/brands] Processing brands...');
    const allBrands = data.map(car => car.brand);
    console.log('[GET /admin/stocks/brands] All brands (raw):', allBrands);

    const filteredBrands = allBrands.filter(Boolean);
    console.log('[GET /admin/stocks/brands] Filtered brands (non-empty):', filteredBrands);

    const uniqueBrands = [...new Set(filteredBrands)].sort();
    console.log('[GET /admin/stocks/brands] Unique brands (final):', uniqueBrands);

    const response = {
      success: true,
      brands: uniqueBrands,
      debug: {
        totalVehicles: count,
        publishedVehicles: data.length,
        uniqueBrandCount: uniqueBrands.length
      }
    };

    console.log('[GET /admin/stocks/brands] Sending response:', response);
    console.log('🔍 ============ BRANDS ENDPOINT DEBUG END ============\n');

    return res.status(200).json(response);
  } catch (error) {
    console.error('\n❌ ============ BRANDS ENDPOINT ERROR ============');
    console.error('[GET /admin/stocks/brands] Error details:', {
      message: error.message,
      stack: error.stack,
      name: error.name,
      cause: error.cause
    });
    console.error('❌ ============ BRANDS ENDPOINT ERROR END ============\n');

    return res.status(500).json({
      success: false,
      error: error.message || "Internal server error",
      details: error.details || null,
      hint: error.hint || null
    });
  }
});

// GET unique vehicle types from vehicles table for dynamic filters
router.get("/vehicle-types", async (req, res) => {
  try {
    console.log('[GET /admin/stocks/vehicle-types] Fetching unique vehicle types');
    const { data, error } = await supabase
      .from("vehicles")
      .select("vehicle_type")
      .eq("published", true);

    if (error) {
      console.error("Error fetching vehicle types:", error);
      throw error;
    }

    // Get unique vehicle types
    const uniqueVehicleTypes = [...new Set(data.map(car => car.vehicle_type))].filter(Boolean).sort();

    console.log('[GET /admin/stocks/vehicle-types] Found vehicle types:', uniqueVehicleTypes);
    return res.status(200).json({
      success: true,
      vehicleTypes: uniqueVehicleTypes
    });
  } catch (error) {
    console.error("Fetching vehicle types failed:", error);
    return res.status(500).json({
      success: false,
      error: error.message || "Internal server error",
    });
  }
});

// GET unique body types from vehicles table for dynamic filters
router.get("/body-types", async (req, res) => {
  try {
    console.log('[GET /admin/stocks/body-types] Fetching unique body types');
    const { data, error } = await supabase
      .from("vehicles")
      .select("body_type")
      .eq("published", true);

    if (error) {
      console.error("Error fetching body types:", error);
      throw error;
    }

    // Get unique body types
    const uniqueBodyTypes = [...new Set(data.map(car => car.body_type))].filter(Boolean).sort();

    console.log('[GET /admin/stocks/body-types] Found body types:', uniqueBodyTypes);
    return res.status(200).json({
      success: true,
      bodyTypes: uniqueBodyTypes
    });
  } catch (error) {
    console.error("Fetching body types failed:", error);
    return res.status(500).json({
      success: false,
      error: error.message || "Internal server error",
    });
  }
});

// GET models by brand from vehicles table for dynamic filters
router.get("/models-by-brand", async (req, res) => {
  try {
    console.log('[GET /admin/stocks/models-by-brand] Fetching models by brand');
    const { data, error } = await supabase
      .from("vehicles")
      .select("brand, model")
      .eq("published", true);

    if (error) {
      console.error("Error fetching models by brand:", error);
      throw error;
    }

    // Group models by brand
    const modelsByBrand = {};
    data.forEach(car => {
      if (car.brand && car.model) {
        if (!modelsByBrand[car.brand]) {
          modelsByBrand[car.brand] = new Set();
        }
        modelsByBrand[car.brand].add(car.model);
      }
    });

    // Convert Sets to sorted arrays
    const result = {};
    Object.keys(modelsByBrand).forEach(brand => {
      result[brand] = Array.from(modelsByBrand[brand]).sort();
    });

    console.log('[GET /admin/stocks/models-by-brand] Found models by brand:', result);
    return res.status(200).json({
      success: true,
      modelsByBrand: result
    });
  } catch (error) {
    console.error("Fetching models by brand failed:", error);
    return res.status(500).json({
      success: false,
      error: error.message || "Internal server error",
    });
  }
});

// GET unique interior colors from vehicles table for dynamic filters
router.get("/interior-colors", async (req, res) => {
  try {
    console.log('[GET /admin/stocks/interior-colors] Fetching unique interior colors');
    const { data, error } = await supabase
      .from("vehicles")
      .select("color_interior")
      .eq("published", true);

    if (error) {
      console.error("Error fetching interior colors:", error);
      throw error;
    }

    // Get unique interior colors
    const uniqueInteriorColors = [...new Set(data.map(car => car.color_interior))].filter(Boolean).sort();

    console.log('[GET /admin/stocks/interior-colors] Found interior colors:', uniqueInteriorColors);
    return res.status(200).json({
      success: true,
      interiorColors: uniqueInteriorColors
    });
  } catch (error) {
    console.error("Fetching interior colors failed:", error);
    return res.status(500).json({
      success: false,
      error: error.message || "Internal server error",
    });
  }
});

// GET unique exterior colors from vehicles table for dynamic filters
router.get("/exterior-colors", async (req, res) => {
  try {
    console.log('[GET /admin/stocks/exterior-colors] Fetching unique exterior colors');
    const { data, error } = await supabase
      .from("vehicles")
      .select("color_exterior")
      .eq("published", true);

    if (error) {
      console.error("Error fetching exterior colors:", error);
      throw error;
    }

    // Get unique exterior colors
    const uniqueExteriorColors = [...new Set(data.map(car => car.color_exterior))].filter(Boolean).sort();

    console.log('[GET /admin/stocks/exterior-colors] Found exterior colors:', uniqueExteriorColors);
    return res.status(200).json({
      success: true,
      exteriorColors: uniqueExteriorColors
    });
  } catch (error) {
    console.error("Fetching exterior colors failed:", error);
    return res.status(500).json({
      success: false,
      error: error.message || "Internal server error",
    });
  }
});

// GET unique locations from vehicles table for dynamic filters
router.get("/locations", async (req, res) => {
  try {
    console.log('[GET /admin/stocks/locations] Fetching unique locations');
    const { data, error } = await supabase
      .from("vehicles")
      .select("location")
      .eq("published", true);

    if (error) {
      console.error("Error fetching locations:", error);
      throw error;
    }

    // Get unique locations
    const uniqueLocations = [...new Set(data.map(car => car.location))].filter(Boolean).sort();

    console.log('[GET /admin/stocks/locations] Found locations:', uniqueLocations);
    return res.status(200).json({
      success: true,
      locations: uniqueLocations
    });
  } catch (error) {
    console.error("Fetching locations failed:", error);
    return res.status(500).json({
      success: false,
      error: error.message || "Internal server error",
    });
  }
});

// GET all features from vehicles table for dynamic filters
router.get("/features", async (req, res) => {
  try {
    console.log('[GET /admin/stocks/features] Fetching all features');

    // First, get all vehicles with their features
    const { data: vehicles, error } = await supabase
      .from("vehicles")
      .select(`
        id,
        vehicle_features (
          feature
        )
      `)
      .eq("published", true);

    if (error) {
      console.error("Error fetching features:", error);
      throw error;
    }

    // Extract all features into a flat array
    const allFeatures = new Set();
    vehicles.forEach(vehicle => {
      if (vehicle.vehicle_features && Array.isArray(vehicle.vehicle_features)) {
        vehicle.vehicle_features.forEach(featureObj => {
          if (featureObj.feature) {
            allFeatures.add(featureObj.feature.trim());
          }
        });
      }
    });

    // Convert Set to sorted array
    const uniqueFeatures = Array.from(allFeatures).sort();

    console.log('[GET /admin/stocks/features] Found features:', uniqueFeatures);
    return res.status(200).json({
      success: true,
      features: uniqueFeatures
    });
  } catch (error) {
    console.error("Fetching features failed:", error);
    return res.status(500).json({
      success: false,
      error: error.message || "Internal server error",
    });
  }
});

// =============== Get One Stock by ID ===============
// IMPORTANT: This route MUST come AFTER all specific routes (like /brands, /models-by-brand)
router.get('/:id', async (req, res) => {
  console.log(`[GET /admin/stocks/${req.params.id}] Fetching stock by ID`);
  try {
    const { id } = req.params;
    const { data, error } = await supabase
      .from("featured_cars")
      .select("*")
      .eq("id", id)
      .single();

    if (error) throw error;
    console.log(`[GET /admin/stocks/${req.params.id}] Fetched data:`, data);
    res.status(200).json({ data });
  } catch (error) {
    console.error(`[GET /admin/stocks/${req.params.id}] Error:`, error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
