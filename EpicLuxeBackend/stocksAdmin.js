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

// =============== Get One Stock by ID ===============
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

// GET unique brands from vehicles table for dynamic filters
router.get("/brands", async (req, res) => {
  try {
    console.log('[GET /admin/stocks/brands] Fetching unique brands');
    const { data, error } = await supabase
      .from("vehicles")
      .select("brand")
      .eq("published", true);

    if (error) {
      console.error("Error fetching vehicle brands:", error);
      throw error;
    }

    // Get unique brands from 'brand' column
    const uniqueBrands = [...new Set(data.map(car => car.brand))].filter(Boolean).sort();

    console.log('[GET /admin/stocks/brands] Found brands:', uniqueBrands);
    return res.status(200).json({
      success: true,
      brands: uniqueBrands
    });
  } catch (error) {
    console.error("Fetching vehicle brands failed:", error);
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

module.exports = router;
