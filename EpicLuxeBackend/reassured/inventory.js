const express = require("express");
const multer = require("multer");
const { createClient } = require("@supabase/supabase-js");
const { v4: uuidv4 } = require("uuid");
const slugify = require("slugify");

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage() });

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

const BUCKET_NAME = process.env.SUPABASE_BUCKET || "reassured-vehicles-bucket";

// Generate base slug from brand+model+variant with slugify
function generateBaseSlug(brand, model, variant = "") {
  let base = `${brand} ${model}`;
  if (variant && variant.trim() !== "") {
    base += ` ${variant}`;
  }
  return slugify(base, { lower: true, strict: true });
}

async function generateUniqueSlug(brand, model, variant = "") {
  try {
    const baseSlug = generateBaseSlug(brand, model, variant);
    let slug = baseSlug;
    let suffix = 1;

    const maxAttempts = 100;
    let attempts = 0;

    while (attempts < maxAttempts) {
      const { data, error } = await supabase
        .from("reassured-vehicles")
        .select("id")
        .eq("slug", slug)
        .limit(1);

      if (error) {
        console.error("Error checking slug uniqueness:", error);
        return `${baseSlug}-${Date.now()}`;
      }

      if (!data || data.length === 0) {
        return slug;
      }

      suffix += 1;
      slug = `${baseSlug}-${suffix}`;
      attempts += 1;
    }

    return `${baseSlug}-${Date.now()}`;
  } catch (error) {
    console.error("Error in generateUniqueSlug:", error);
    return `${brand}-${model}-${Date.now()}`.toLowerCase().replace(/[^a-z0-9]/g, '-');
  }
}

// Validate required fields & image presence
function validateVehicleFields(body, files) {
  console.log("🔍 Validating fields...");
  console.log("📋 Body fields:", Object.keys(body));
  console.log("📷 Files:", files ? files.length : 0);
  
  const required = ["brand", "model", "year", "price"];
  for (const field of required) {
    if (!body[field] || body[field].toString().trim() === "") {
      console.log(`❌ Required field missing: ${field}`);
      return `Field "${field}" is required and cannot be empty.`;
    }
  }
  
  if (isNaN(parseInt(body.year))) {
    console.log(`❌ Invalid year: ${body.year}`);
    return 'Field "year" must be a valid number.';
  }
  if (isNaN(parseFloat(body.price))) {
    console.log(`❌ Invalid price: ${body.price}`);
    return 'Field "price" must be a valid number.';
  }
  
  if (!files || files.length === 0) {
    console.log("❌ No images provided");
    return "At least one image is required.";
  }
  
  // Validate boolean fields
  if (body.featured !== undefined && !["true", "false", true, false].includes(body.featured)) {
    console.log(`❌ Invalid featured value: ${body.featured}`);
    return 'Field "featured" must be a boolean.';
  }
  if (body.published !== undefined && !["true", "false", true, false].includes(body.published)) {
    console.log(`❌ Invalid published value: ${body.published}`);
    return 'Field "published" must be a boolean.';
  }
  
  console.log("✅ All validations passed");
  return null;
}

// Middleware to enforce max 6 featured vehicles
async function enforceFeaturedLimit(featuredFlag, excludeVehicleId = null) {
  if (!featuredFlag) return true;

  const query = supabase.from("reassured-vehicles").select("id").eq("featured", true);
  if (excludeVehicleId) {
    query.neq("id", excludeVehicleId);
  }
  const { data, error } = await query;
  if (error) {
    console.error("Error checking featured count:", error);
    throw error;
  }

  if (data.length >= 6) {
    return false;
  }
  return true;
}

// POST /upload-reassured-vehicle: Create vehicle with images
router.post("/upload-reassured-vehicle", upload.array("images", 20), async (req, res) => {
  try {
    console.log("🚀 POST /upload-reassured-vehicle - RECEIVED REQUEST");
    console.log("📝 Request body:", req.body);
    console.log("📷 Files received:", req.files ? req.files.length : 0);
    if (req.files && req.files.length > 0) {
      console.log("📁 File details:", req.files.map(f => ({ name: f.originalname, size: f.size, mimetype: f.mimetype })));
    }

    // Validate inputs
    console.log("🔍 Starting validation...");
    const errorMsg = validateVehicleFields(req.body, req.files);
    if (errorMsg) {
      console.log("❌ Validation error:", errorMsg);
      return res.status(400).json({ success: false, error: errorMsg });
    }
    console.log("✅ Validation passed!");

    // Parse and sanitize inputs
    const {
      brand,
      model,
      variant,
      year,
      price,
      original_price,
      mileage,
      fuel_type,
      transmission,
      seating,
      location,
      condition,
      ownership,
      health_engine,
      health_tyres,
      health_paint,
      health_interior,
      health_electrical,
      color_exterior,
      color_interior,
      drivetrain,
      engine_capacity,
      horsepower,
      torque,
      video_url,
      published,
      featured,
      features_detailed,
      vehicle_type,
      body_type,
    } = req.body;

    const priceFloat = parseFloat(price);
    const origPriceFloat = original_price ? parseFloat(original_price) : null;

    // Calculate savings automatically
    let savings = null;
    if (origPriceFloat && origPriceFloat > priceFloat) {
      savings = origPriceFloat - priceFloat;
    }

    // Parse boolean flags safely
    const isFeatured = ["true", true].includes(featured);
    const isPublished = ["true", true].includes(published);

    // Enforce max 6 featured vehicles
    const canFeature = await enforceFeaturedLimit(isFeatured);
    if (!canFeature && isFeatured) {
      return res.status(400).json({
        success: false,
        error: "Cannot mark more than 6 vehicles as featured.",
      });
    }

    // Generate unique slug
    console.log("🔗 Generating unique slug for:", brand, model, variant);
    const slug = await generateUniqueSlug(brand, model, variant);
    console.log("✅ Generated slug:", slug);

    // Upload images to bucket first
    console.log("📤 Starting image upload to Supabase...");
    const uploadedImageUrls = [];
    for (const [idx, file] of req.files.entries()) {
      const ext = file.originalname.split(".").pop();
      const filename = `${uuidv4()}.${ext}`;
      const path = `vehicle-${Date.now()}/${filename}`;
      
      console.log(`📷 Uploading image ${idx + 1}/${req.files.length}: ${filename}`);

      const { error: uploadErr } = await supabase.storage
        .from(BUCKET_NAME)
        .upload(path, file.buffer, {
          contentType: file.mimetype,
          upsert: true,
        });

      if (uploadErr) {
        console.error("❌ Image upload error:", uploadErr);
        throw uploadErr;
      }

      const { data: urlData } = supabase.storage.from(BUCKET_NAME).getPublicUrl(path);
      uploadedImageUrls.push(urlData.publicUrl);
      console.log(`✅ Image ${idx + 1} uploaded: ${urlData.publicUrl}`);
    }

    // Parse features_detailed if it's a string
    let featuresObj = null;
    if (features_detailed) {
      try {
        featuresObj = typeof features_detailed === 'string' 
          ? JSON.parse(features_detailed) 
          : features_detailed;
      } catch (e) {
        console.error("Error parsing features_detailed:", e);
        featuresObj = null;
      }
    }

    // Insert vehicle record with image URLs
    console.log("💾 Inserting vehicle record to database...");
    console.log("📋 Vehicle data:", {
      brand: brand.toString().trim(),
      model: model.toString().trim(),
      variant: variant ? variant.toString().trim() : null,
      year: parseInt(year),
      slug,
      price: priceFloat,
      published: isPublished,
      featured: isFeatured,
      imageCount: uploadedImageUrls.length
    });
    
    const { data: vehicle, error: vehicleInsertError } = await supabase
      .from("reassured-vehicles")
      .insert([
        {
          brand: brand.toString().trim(),
          model: model.toString().trim(),
          variant: variant ? variant.toString().trim() : null,
          year: parseInt(year),
          slug,
          price: priceFloat,
          original_price: origPriceFloat,
          savings,
          mileage: mileage ? parseInt(mileage) : null,
          fuel_type: fuel_type ? fuel_type.toString().trim() : null,
          transmission: transmission ? transmission.toString().trim() : null,
          seating: seating ? parseInt(seating) : null,
          location: location ? location.toString().trim() : null,
          condition: condition ? condition.toString().trim() : null,
          ownership: ownership ? parseInt(ownership) : null,
          health_engine: health_engine ? parseInt(health_engine) : null,
          health_tyres: health_tyres ? parseInt(health_tyres) : null,
          health_paint: health_paint ? parseInt(health_paint) : null,
          health_interior: health_interior ? parseInt(health_interior) : null,
          health_electrical: health_electrical ? parseInt(health_electrical) : null,
          color_exterior: color_exterior ? color_exterior.toString().trim() : null,
          color_interior: color_interior ? color_interior.toString().trim() : null,
          drivetrain: drivetrain ? drivetrain.toString().trim() : null,
          engine_capacity: engine_capacity ? parseFloat(engine_capacity) : null,
          horsepower: horsepower ? parseInt(horsepower) : null,
          torque: torque ? parseInt(torque) : null,
          video_url: video_url ? video_url.toString().trim() : null,
          published: isPublished,
          featured: isFeatured,
          features_detailed: featuresObj,
          image_urls: uploadedImageUrls,
          is_liked: false,
          views: 0,
          vehicle_type: vehicle_type ? vehicle_type.toString().trim() : null,
          body_type: body_type ? body_type.toString().trim() : null,
        },
      ])
      .select()
      .single();

    if (vehicleInsertError) {
      console.error("❌ Vehicle insert error:", vehicleInsertError);
      if (vehicleInsertError.code === "23505" && vehicleInsertError.message.includes("slug")) {
        return res.status(409).json({
          success: false,
          error: "Duplicate slug detected. Please change variant or details and try again.",
        });
      }
      throw vehicleInsertError;
    }

    console.log("🎉 Vehicle upload successful! ID:", vehicle.id);

    return res.status(201).json({
      success: true,
      message: "Vehicle added successfully",
      vehicle_id: vehicle.id,
      slug,
      image_urls: uploadedImageUrls,
    });
  } catch (error) {
    console.error("💥 Vehicle upload failed:", error);
    console.error("💥 Error stack:", error.stack);
    return res.status(500).json({
      success: false,
      error: error.message || "Internal server error",
    });
  }
});

// GET all reassured vehicles
router.get("/reassured-vehicles", async (req, res) => {
  try {
    console.log("📋 GET /reassured-vehicles - Request received");
    console.log("🔍 Query params:", req.query);
    
    let query = supabase.from("reassured-vehicles").select("*").order("created_at", {
      ascending: false,
    });

    const isFeatured = req.query.featured === "true";
    const isPublished = req.query.published === "true";

    if (isFeatured) {
      query = query.eq("featured", true);
    } else if (isPublished) {
      query = query.eq("published", true);
    }

    const { data, error } = await query;

    if (error) {
      console.error("❌ Error fetching vehicles:", error);
      throw error;
    }

    console.log(`✅ Found ${data?.length || 0} vehicles in database`);
    return res.status(200).json({ success: true, vehicles: data });
  } catch (error) {
    console.error("Fetching vehicles failed:", error);
    return res.status(500).json({
      success: false,
      error: error.message || "Internal server error",
    });
  }
});

// GET vehicle by ID
router.get("/reassured-vehicle/:id", async (req, res) => {
  try {
    console.log("🔍 GET /reassured-vehicle/:id - Request for ID:", req.params.id);
    const vehicleId = req.params.id;

    const { data: vehicle, error: vehicleError } = await supabase
      .from("reassured-vehicles")
      .select("*")
      .eq("id", vehicleId)
      .single();

    if (vehicleError) {
      console.log("❌ Vehicle not found:", vehicleError);
      return res.status(404).json({
        success: false,
        error: "Vehicle not found",
      });
    }

    console.log("✅ Vehicle found:", vehicle.brand, vehicle.model);

    // Increment views count
    await supabase
      .from("reassured-vehicles")
      .update({ views: (vehicle.views || 0) + 1 })
      .eq("id", vehicleId);

    return res.status(200).json({
      success: true,
      vehicle: { ...vehicle, views: (vehicle.views || 0) + 1 },
    });
  } catch (error) {
    console.error("Fetching vehicle failed:", error);
    return res.status(500).json({
      success: false,
      error: error.message || "Internal server error",
    });
  }
});

// GET vehicle by SLUG
router.get("/reassured-vehicle/slug/:slug", async (req, res) => {
  try {
    const vehicleSlug = req.params.slug;
    console.log("Fetching vehicle by slug:", vehicleSlug);

    const { data: vehicle, error: vehicleError } = await supabase
      .from("reassured-vehicles")
      .select("*")
      .eq("slug", vehicleSlug)
      .eq("published", true)
      .single();

    if (vehicleError || !vehicle) {
      console.log("Vehicle not found for slug:", vehicleSlug);
      return res.status(404).json({
        success: false,
        error: "Vehicle not found",
      });
    }

    // Increment views count
    await supabase
      .from("reassured-vehicles")
      .update({ views: vehicle.views + 1 })
      .eq("id", vehicle.id);

    return res.status(200).json({
      success: true,
      vehicle: { ...vehicle, views: vehicle.views + 1 },
    });
  } catch (error) {
    console.error("Fetching vehicle by slug failed:", error);
    return res.status(500).json({
      success: false,
      error: error.message || "Internal server error",
    });
  }
});

// GET featured vehicles
router.get("/reassured-vehicles/featured", async (req, res) => {
  try {
    const { data: vehicles, error } = await supabase
      .from("reassured-vehicles")
      .select("*")
      .eq("featured", true)
      .eq("published", true)
      .order("created_at", { ascending: false })
      .limit(6);

    if (error) {
      console.error("Error fetching featured vehicles:", error);
      throw error;
    }

    return res.status(200).json({ 
      success: true, 
      vehicles: vehicles 
    });
  } catch (error) {
    console.error("Error fetching featured vehicles:", error);
    return res.status(500).json({ 
      success: false, 
      error: error.message || "Internal server error" 
    });
  }
});

// GET published vehicles
router.get("/reassured-vehicles/published", async (req, res) => {
  try {
    const { data, error } = await supabase
      .from("reassured-vehicles")
      .select("*")
      .eq("published", true)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Fetching published vehicles failed:", error);
      throw error;
    }

    return res.status(200).json({ success: true, vehicles: data });
  } catch (error) {
    console.error("Error fetching published vehicles:", error);
    return res.status(500).json({ 
      success: false, 
      error: error.message || "Internal server error" 
    });
  }
});

// UPDATE vehicle by ID
router.put("/reassured-vehicle/:id", upload.array("images", 20), async (req, res) => {
  try {
    const vehicleId = req.params.id;

    const {
      brand,
      model,
      variant,
      year,
      price,
      original_price,
      mileage,
      fuel_type,
      transmission,
      seating,
      location,
      condition,
      ownership,
      health_engine,
      health_tyres,
      health_paint,
      health_interior,
      health_electrical,
      color_exterior,
      color_interior,
      drivetrain,
      engine_capacity,
      horsepower,
      torque,
      video_url,
      published,
      featured,
      features_detailed,
      vehicle_type,
      body_type,
    } = req.body;

    // Calculate savings
    const priceNum = price ? parseFloat(price) : null;
    const origPriceNum = original_price ? parseFloat(original_price) : null;
    let savingsCalc = null;
    if (origPriceNum && priceNum && origPriceNum > priceNum) {
      savingsCalc = origPriceNum - priceNum;
    }

    // Parse featured and published flags
    const parsedFeatured = featured !== undefined ? ["true", true].includes(featured) : undefined;
    const parsedPublished = published !== undefined ? ["true", true].includes(published) : undefined;

    // Enforce max 6 featured vehicles (excluding current vehicle)
    if (parsedFeatured) {
      const canFeature = await enforceFeaturedLimit(true, vehicleId);
      if (!canFeature) {
        return res.status(400).json({
          success: false,
          error: "Cannot mark more than 6 vehicles as featured.",
        });
      }
    }

    // Handle new images if provided
    let newImageUrls = [];
    if (req.files && req.files.length > 0) {
      for (const file of req.files) {
        const ext = file.originalname.split(".").pop();
        const filename = `${uuidv4()}.${ext}`;
        const path = `vehicle-${Date.now()}/${filename}`;

        const { error: uploadErr } = await supabase.storage
          .from(BUCKET_NAME)
          .upload(path, file.buffer, {
            contentType: file.mimetype,
            upsert: true,
          });

        if (uploadErr) {
          console.error("Image upload error:", uploadErr);
          throw uploadErr;
        }

        const { data: urlData } = supabase.storage.from(BUCKET_NAME).getPublicUrl(path);
        newImageUrls.push(urlData.publicUrl);
      }
    }

    // Parse features_detailed if provided
    let featuresObj = undefined;
    if (features_detailed !== undefined) {
      try {
        featuresObj = typeof features_detailed === 'string' 
          ? JSON.parse(features_detailed) 
          : features_detailed;
      } catch (e) {
        console.error("Error parsing features_detailed:", e);
        featuresObj = null;
      }
    }

    // Generate new slug if brand/model changed
    let newSlug;
    if (brand || model || variant !== undefined) {
      newSlug = await generateUniqueSlug(
        brand || "",
        model || "",
        variant || ""
      );
    }

    const updateData = {
      ...(brand ? { brand: brand.toString().trim() } : {}),
      ...(model ? { model: model.toString().trim() } : {}),
      ...(variant !== undefined ? { variant: variant ? variant.toString().trim() : null } : {}),
      ...(year ? { year: parseInt(year) } : {}),
      ...(price ? { price: priceNum } : {}),
      ...(original_price !== undefined ? { original_price: origPriceNum } : {}),
      ...(savingsCalc !== null ? { savings: savingsCalc } : {}),
      ...(mileage ? { mileage: parseInt(mileage) } : {}),
      ...(fuel_type ? { fuel_type: fuel_type.toString().trim() } : {}),
      ...(transmission ? { transmission: transmission.toString().trim() } : {}),
      ...(seating ? { seating: parseInt(seating) } : {}),
      ...(location ? { location: location.toString().trim() } : {}),
      ...(condition ? { condition: condition.toString().trim() } : {}),
      ...(ownership ? { ownership: parseInt(ownership) } : {}),
      ...(health_engine ? { health_engine: parseInt(health_engine) } : {}),
      ...(health_tyres ? { health_tyres: parseInt(health_tyres) } : {}),
      ...(health_paint ? { health_paint: parseInt(health_paint) } : {}),
      ...(health_interior ? { health_interior: parseInt(health_interior) } : {}),
      ...(health_electrical ? { health_electrical: parseInt(health_electrical) } : {}),
      ...(color_exterior ? { color_exterior: color_exterior.toString().trim() } : {}),
      ...(color_interior ? { color_interior: color_interior.toString().trim() } : {}),
      ...(drivetrain ? { drivetrain: drivetrain.toString().trim() } : {}),
      ...(engine_capacity ? { engine_capacity: parseFloat(engine_capacity) } : {}),
      ...(horsepower ? { horsepower: parseInt(horsepower) } : {}),
      ...(torque ? { torque: parseInt(torque) } : {}),
      ...(video_url ? { video_url: video_url.toString().trim() } : {}),
      ...(featuresObj !== undefined ? { features_detailed: featuresObj } : {}),
      ...(newImageUrls.length > 0 ? { image_urls: newImageUrls } : {}),
      ...(newSlug ? { slug: newSlug } : {}),
      ...(vehicle_type !== undefined ? { vehicle_type: vehicle_type ? vehicle_type.toString().trim() : null } : {}),
      ...(body_type !== undefined ? { body_type: body_type ? body_type.toString().trim() : null } : {}),
    };

    if (parsedFeatured !== undefined) updateData.featured = parsedFeatured;
    if (parsedPublished !== undefined) updateData.published = parsedPublished;

    const { error: updateError } = await supabase
      .from("reassured-vehicles")
      .update(updateData)
      .eq("id", vehicleId);

    if (updateError) {
      console.error("Vehicle update error:", updateError);
      return res.status(500).json({ success: false, error: updateError.message });
    }

    console.log(`Vehicle ID ${vehicleId} updated successfully`);
    return res.status(200).json({
      success: true,
      message: "Vehicle updated successfully",
    });
  } catch (error) {
    console.error("Vehicle update failed:", error);
    return res.status(500).json({
      success: false,
      error: error.message || "Internal server error",
    });
  }
});

// DELETE vehicle by ID
router.delete("/reassured-vehicle/:id", async (req, res) => {
  try {
    const vehicleId = req.params.id;
    console.log("DELETE /reassured-vehicle/:id for ID:", vehicleId);

    // Get vehicle to access image URLs
    const { data: vehicle, error: fetchError } = await supabase
      .from("reassured-vehicles")
      .select("image_urls")
      .eq("id", vehicleId)
      .single();

    if (fetchError) {
      console.error("Error fetching vehicle:", fetchError);
      return res.status(404).json({
        success: false,
        error: "Vehicle not found",
      });
    }

    // Delete images from storage
    if (vehicle.image_urls && vehicle.image_urls.length > 0) {
      for (const imageUrl of vehicle.image_urls) {
        const prefix = `https://${process.env.SUPABASE_URL?.replace(
          /^https?:\/\//,
          ""
        )}/storage/v1/object/public/${BUCKET_NAME}/`;
        let filePath = imageUrl;
        if (imageUrl.startsWith(prefix)) {
          filePath = imageUrl.slice(prefix.length);
        }
        const { error: delErr } = await supabase.storage
          .from(BUCKET_NAME)
          .remove([filePath]);
        if (delErr) {
          console.error("Error deleting image from storage:", delErr);
        }
      }
    }

    // Delete vehicle record
    const { error: deleteError } = await supabase
      .from("reassured-vehicles")
      .delete()
      .eq("id", vehicleId);

    if (deleteError) {
      console.error("Vehicle delete error:", deleteError);
      return res.status(500).json({ success: false, error: deleteError.message });
    }

    console.log(`Vehicle ID ${vehicleId} deleted successfully`);
    return res.status(200).json({ success: true, message: "Vehicle deleted" });
  } catch (error) {
    console.error("Vehicle deletion failed:", error);
    return res.status(500).json({ success: false, error: error.message });
  }
});

// POST route to toggle like status
router.post("/reassured-vehicle/:id/like", async (req, res) => {
  try {
    const vehicleId = req.params.id;

    // Get current like status
    const { data: vehicle, error: fetchError } = await supabase
      .from("reassured-vehicles")
      .select("is_liked")
      .eq("id", vehicleId)
      .single();

    if (fetchError) {
      return res.status(404).json({
        success: false,
        error: "Vehicle not found",
      });
    }

    // Toggle like status
    const newLikeStatus = !vehicle.is_liked;

    const { error: updateError } = await supabase
      .from("reassured-vehicles")
      .update({ is_liked: newLikeStatus })
      .eq("id", vehicleId);

    if (updateError) {
      console.error("Error updating like status:", updateError);
      return res.status(500).json({ success: false, error: updateError.message });
    }

    return res.status(200).json({
      success: true,
      is_liked: newLikeStatus,
      message: newLikeStatus ? "Vehicle liked" : "Vehicle unliked",
    });
  } catch (error) {
    console.error("Toggle like failed:", error);
    return res.status(500).json({
      success: false,
      error: error.message || "Internal server error",
    });
  }
});

// GET all vehicle slugs
router.get("/reassured-vehicles/slugs", async (req, res) => {
  try {
    const { data, error } = await supabase
      .from("reassured-vehicles")
      .select("slug")
      .eq("published", true);

    if (error) {
      console.error("Error fetching vehicle slugs:", error);
      throw error;
    }

    const slugs = data.map(vehicle => vehicle.slug);

    return res.status(200).json({ 
      success: true, 
      slugs: slugs 
    });
  } catch (error) {
    console.error("Fetching vehicle slugs failed:", error);
    return res.status(500).json({
      success: false,
      error: error.message || "Internal server error",
    });
  }
});

// Test slug generation endpoint
router.post("/reassured-test-slug", async (req, res) => {
  try {
    const { brand, model, variant } = req.body;
    
    if (!brand || !model) {
      return res.status(400).json({
        success: false,
        error: "Brand and model are required"
      });
    }

    const slug = await generateUniqueSlug(brand, model, variant);
    
    return res.status(200).json({
      success: true,
      slug: slug
    });
  } catch (error) {
    console.error("Test slug generation failed:", error);
    return res.status(500).json({
      success: false,
      error: error.message || "Internal server error",
    });
  }
});

module.exports = router;
