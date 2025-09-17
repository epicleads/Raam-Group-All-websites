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

const BUCKET_NAME = process.env.SUPABASE_BUCKET || "vehicle-images";

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

    // Add maximum attempts to prevent infinite loops
    const maxAttempts = 100;
    let attempts = 0;

    while (attempts < maxAttempts) {
      const { data, error } = await supabase
        .from("vehicles")
        .select("id")
        .eq("slug", slug)
        .limit(1);

      if (error) {
        console.error("Error checking slug uniqueness:", error);
        // Return a timestamp-based slug as fallback
        return `${baseSlug}-${Date.now()}`;
      }

      if (!data || data.length === 0) {
        // Slug is unique
        return slug;
      }

      // Slug exists, try with suffix
      suffix += 1;
      slug = `${baseSlug}-${suffix}`;
      attempts += 1;
    }

    // Fallback if we can't find a unique slug
    return `${baseSlug}-${Date.now()}`;
  } catch (error) {
    console.error("Error in generateUniqueSlug:", error);
    // Return a fallback slug
    return `${brand}-${model}-${Date.now()}`.toLowerCase().replace(/[^a-z0-9]/g, '-');
  }
}

// Append unit if missing (case insensitive)
function appendUnitIfMissing(value, unit) {
  if (!value) return value;
  const trimmed = value.toString().trim();
  const lc = trimmed.toLowerCase();
  if (lc.endsWith(unit.toLowerCase())) {
    return trimmed;
  }
  return `${trimmed} ${unit}`;
}

// Validate required fields & image presence
function validateVehicleFields(body, files) {
  const required = ["brand", "model"];
  for (const field of required) {
    if (!body[field] || body[field].toString().trim() === "") {
      return `Field "${field}" is required and cannot be empty.`;
    }
  }
  if (!body.year || isNaN(parseInt(body.year))) {
    return 'Field "year" is required and must be a number.';
  }
  if (!body.price || isNaN(parseFloat(body.price))) {
    return 'Field "price" is required and must be a number.';
  }
  if (!files || files.length === 0) {
    return "At least one image is required.";
  }
  // Validate boolean fields
  if (body.featured !== undefined && !["true", "false", true, false].includes(body.featured)) {
    return 'Field "featured" must be a boolean.';
  }
  if (body.published !== undefined && !["true", "false", true, false].includes(body.published)) {
    return 'Field "published" must be a boolean.';
  }
  return null;
}

// Middleware to enforce max 6 featured vehicles on create/update
async function enforceFeaturedLimit(featuredFlag, excludeVehicleId = null) {
  if (!featuredFlag) return true; // no problem if not setting featured true

  const query = supabase.from("vehicles").select("id").eq("featured", true);
  if (excludeVehicleId) {
    query.neq("id", excludeVehicleId);
  }
  const { data, error } = await query;
  if (error) {
    console.error("Error checking featured count:", error);
    throw error;
  }

  if (data.length >= 6) {
    return false; // limit reached
  }
  return true;
}

// POST /upload-vehicle: Create vehicle with images and features
router.post("/upload-vehicle", upload.array("images", 20), async (req, res) => {
  try {
    console.log("POST /upload-vehicle");

    // Validate inputs
    const errorMsg = validateVehicleFields(req.body, req.files);
    if (errorMsg) {
      console.log("Validation error:", errorMsg);
      return res.status(400).json({ success: false, error: errorMsg });
    }

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
      engine_capacity,
      horsepower,
      torque,
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
      video_url,
      published,
      featured,
      features,
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

    // Apply units
    const mileageWithUnit = mileage ? appendUnitIfMissing(mileage, "km") : null;
    const engineCapacityUnit = engine_capacity ? appendUnitIfMissing(engine_capacity, "cc") : null;
    const horsepowerUnit = horsepower ? appendUnitIfMissing(horsepower, "hp") : null;
    const torqueUnit = torque ? appendUnitIfMissing(torque, "Nm") : null;

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
    const slug = await generateUniqueSlug(brand, model, variant);

    // Insert vehicle record
    const { data: vehicle, error: vehicleInsertError } = await supabase
      .from("vehicles")
      .insert([
        {
          brand: brand.toString().trim(),
          model: model.toString().trim(),
          variant: variant ? variant.toString().trim() : null,
          year: parseInt(year),
          price: priceFloat,
          original_price: origPriceFloat,
          savings,
          mileage: mileageWithUnit,
          fuel_type: fuel_type ? fuel_type.toString().trim() : null,
          transmission: transmission ? transmission.toString().trim() : null,
          engine_capacity: engineCapacityUnit,
          horsepower: horsepowerUnit,
          torque: torqueUnit,
          location: location ? location.toString().trim() : null,
          condition: condition ? condition.toString().trim() : null,
          ownership: ownership ? ownership.toString().trim() : null,
          health_engine: health_engine ? parseInt(health_engine) : null,
          health_tyres: health_tyres ? parseInt(health_tyres) : null,
          health_paint: health_paint ? parseInt(health_paint) : null,
          health_interior: health_interior ? parseInt(health_interior) : null,
          health_electrical: health_electrical ? parseInt(health_electrical) : null,
          color_exterior: color_exterior ? color_exterior.toString().trim() : null,
          color_interior: color_interior ? color_interior.toString().trim() : null,
          video_url: video_url ? video_url.toString().trim() : null,
          published: isPublished,
          featured: isFeatured,
          slug,
          vehicle_type: vehicle_type ? vehicle_type.toString().trim() : null,
          body_type: body_type ? body_type.toString().trim() : null,
        },
      ])
      .select()
      .single();

    if (vehicleInsertError) {
      console.error("Vehicle insert error:", vehicleInsertError);
      if (
        vehicleInsertError.code === "23505" &&
        vehicleInsertError.message.includes("slug")
      ) {
        return res.status(409).json({
          success: false,
          error:
            "Duplicate slug detected. Please change variant or details and try again.",
        });
      }
      throw vehicleInsertError;
    }

    const vehicleId = vehicle.id;
    console.log("Inserted vehicle with ID:", vehicleId);

    // Upload images
    const uploadedImages = [];
    for (const [idx, file] of req.files.entries()) {
      const ext = file.originalname.split(".").pop();
      const filename = `${uuidv4()}.${ext}`;
      const path = `${BUCKET_NAME}/${vehicleId}/${filename}`;

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
      uploadedImages.push({ image_url: urlData.publicUrl, sort_order: idx });
    }

    // Insert image metadata
    if (uploadedImages.length > 0) {
      const { error: imgInsertError } = await supabase
        .from("vehicle_images")
        .insert(
          uploadedImages.map((img) => ({
            vehicle_id: vehicleId,
            image_url: img.image_url,
            sort_order: img.sort_order,
          }))
        );

      if (imgInsertError) {
        console.error("Image metadata insert error:", imgInsertError);
        throw imgInsertError;
      }
    }

    // Insert features
    if (features) {
      let featureArray = [];
      if (typeof features === "string") {
        try {
          featureArray = JSON.parse(features);
        } catch {
          featureArray = [];
        }
      } else if (Array.isArray(features)) {
        featureArray = features;
      }

      if (featureArray.length > 0) {
        const { error: featInsertError } = await supabase
          .from("vehicle_features")
          .insert(
            featureArray.map((f) => ({
              vehicle_id: vehicleId,
              feature: f.toString().trim(),
            }))
          );

        if (featInsertError) {
          console.error("Features insert error:", featInsertError);
          throw featInsertError;
        }
      }
    }

    console.log("Vehicle upload successful");

    return res.status(201).json({
      success: true,
      message: "Vehicle added successfully",
      vehicle_id: vehicleId,
      slug,
    });
  } catch (error) {
    console.error("Vehicle upload failed:", error);
    return res.status(500).json({
      success: false,
      error: error.message || "Internal server error",
    });
  }
});

// GET all vehicles (optionally filter published or featured)
router.get("/vehicles", async (req, res) => {
  try {
    let query = supabase.from("vehicles").select("*").order("created_at", {
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
      console.error("Error fetching vehicles:", error);
      throw error;
    }

    return res.status(200).json({ success: true, vehicles: data });
  } catch (error) {
    console.error("Fetching vehicles failed:", error);
    return res.status(500).json({
      success: false,
      error: error.message || "Internal server error",
    });
  }
});

// GET vehicle by ID (including images and features)
router.get("/vehicle/:id", async (req, res) => {
  try {
    const vehicleId = req.params.id;

    const { data: vehicle, error: vehicleError } = await supabase
      .from("vehicles")
      .select("*")
      .eq("id", vehicleId)
      .single();

    if (vehicleError) throw vehicleError;

    const { data: images } = await supabase
      .from("vehicle_images")
      .select("*")
      .eq("vehicle_id", vehicleId);

    const { data: features } = await supabase
      .from("vehicle_features")
      .select("*")
      .eq("vehicle_id", vehicleId);

    return res.status(200).json({
      success: true,
      vehicle,
      images,
      features,
    });
  } catch (error) {
    console.error("Fetching vehicle failed:", error);
    return res.status(500).json({
      success: false,
      error: error.message || "Internal server error",
    });
  }
});

// UPDATE vehicle by ID
router.put("/vehicle/:id", upload.array("images", 20), async (req, res) => {
  try {
    const vehicleId = req.params.id;

    // Extract update fields
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
      engine_capacity,
      horsepower,
      torque,
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
      video_url,
      published,
      featured,
      features,
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

    // Append units where applicable
    const mileageFixed = mileage ? appendUnitIfMissing(mileage, "km") : null;
    const engineCapacityFixed = engine_capacity ? appendUnitIfMissing(engine_capacity, "cc") : null;
    const horsepowerFixed = horsepower ? appendUnitIfMissing(horsepower, "hp") : null;
    const torqueFixed = torque ? appendUnitIfMissing(torque, "Nm") : null;

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

    // Generate new slug (optional: only if brand/model/variant changed)
    const slug = await generateUniqueSlug(
      brand || "",
      model || "",
      variant || ""
    );

    const updateData = {
      ...(brand ? { brand: brand.toString().trim() } : {}),
      ...(model ? { model: model.toString().trim() } : {}),
      ...(variant ? { variant: variant.toString().trim() } : { variant: null }),
      ...(year ? { year: parseInt(year) } : {}),
      ...(price ? { price: priceNum } : {}),
      ...(original_price ? { original_price: origPriceNum } : {}),
      savings: savingsCalc,
      mileage: mileageFixed,
      ...(fuel_type ? { fuel_type: fuel_type.toString().trim() } : {}),
      ...(transmission ? { transmission: transmission.toString().trim() } : {}),
      engine_capacity: engineCapacityFixed,
      horsepower: horsepowerFixed,
      torque: torqueFixed,
      ...(location ? { location: location.toString().trim() } : {}),
      ...(condition ? { condition: condition.toString().trim() } : {}),
      ...(ownership ? { ownership: ownership.toString().trim() } : {}),
      ...(health_engine ? { health_engine: parseInt(health_engine) } : {}),
      ...(health_tyres ? { health_tyres: parseInt(health_tyres) } : {}),
      ...(health_paint ? { health_paint: parseInt(health_paint) } : {}),
      ...(health_interior ? { health_interior: parseInt(health_interior) } : {}),
      ...(health_electrical ? { health_electrical: parseInt(health_electrical) } : {}),
      ...(color_exterior ? { color_exterior: color_exterior.toString().trim() } : {}),
      ...(color_interior ? { color_interior: color_interior.toString().trim() } : {}),
      ...(video_url ? { video_url: video_url.toString().trim() } : {}),
      slug,
      ...(vehicle_type !== undefined ? { vehicle_type: vehicle_type ? vehicle_type.toString().trim() : null } : {}),
      ...(body_type !== undefined ? { body_type: body_type ? body_type.toString().trim() : null } : {}),
    };

    if (parsedFeatured !== undefined) updateData.featured = parsedFeatured;
    if (parsedPublished !== undefined) updateData.published = parsedPublished;

    const { error: updateError } = await supabase
      .from("vehicles")
      .update(updateData)
      .eq("id", vehicleId);

    if (updateError) {
      console.error("Vehicle update error:", updateError);
      return res.status(500).json({ success: false, error: updateError.message });
    }

    // Replace features if provided
    if (features !== undefined) {
      await supabase.from("vehicle_features").delete().eq("vehicle_id", vehicleId);

      let featArray = [];
      if (typeof features === "string") {
        try {
          featArray = JSON.parse(features);
        } catch {
          featArray = [];
        }
      } else if (Array.isArray(features)) {
        featArray = features;
      }

      if (featArray.length > 0) {
        const { error: featInsertError } = await supabase
          .from("vehicle_features")
          .insert(
            featArray.map((f) => ({
              vehicle_id: vehicleId,
              feature: f.toString().trim(),
            }))
          );

        if (featInsertError) {
          console.error("Features insert error:", featInsertError);
          return res.status(500).json({ success: false, error: featInsertError.message });
        }
      }
    }

    // Image update handling is omitted here - can be added if required

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

// DELETE vehicle by ID (including images and features)
router.delete("/vehicle/:id", async (req, res) => {
  try {
    const vehicleId = req.params.id;
    console.log("DELETE /vehicle/:id for ID:", vehicleId);

    // Fetch images linked to vehicle
    const { data: images, error: imageFetchError } = await supabase
      .from("vehicle_images")
      .select("image_url")
      .eq("vehicle_id", vehicleId);

    if (imageFetchError) {
      console.error("Error fetching vehicle images:", imageFetchError);
      return res.status(500).json({
        success: false,
        error: imageFetchError.message || "Failed to fetch vehicle images",
      });
    }

    // Delete images from storage
    if (images && images.length > 0) {
      for (const { image_url } of images) {
        const prefix = `https://${process.env.SUPABASE_URL?.replace(
          /^https?:\/\//,
          ""
        )}/storage/v1/object/public/${BUCKET_NAME}/`;
        let filePath = image_url;
        if (image_url.startsWith(prefix)) {
          filePath = image_url.slice(prefix.length);
        }
        const { error: delErr } = await supabase.storage
          .from(BUCKET_NAME)
          .remove([filePath]);
        if (delErr) {
          console.error("Error deleting image from storage:", delErr);
          // proceed even if deletion fails
        }
      }
    }

    // Delete image and feature records
    await supabase.from("vehicle_features").delete().eq("vehicle_id", vehicleId);
    await supabase.from("vehicle_images").delete().eq("vehicle_id", vehicleId);

    // Delete vehicle record
    const { error: deleteError } = await supabase
      .from("vehicles")
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

// Additional GET routes for featured and published vehicles


// Fixed /vehicles/featured endpoint
router.get("/vehicles/featured", async (req, res) => {
  try {
    // First get the featured vehicles
    const { data: vehicles, error: vehiclesError } = await supabase
      .from("vehicles")
      .select("*")
      .eq("featured", true)
      .eq("published", true) // Only show published vehicles
      .order("created_at", { ascending: false })
      .limit(6);

    if (vehiclesError) {
      console.error("Error fetching vehicles:", vehiclesError);
      throw vehiclesError;
    }

    // Then get images for each vehicle
    const vehiclesWithImages = await Promise.all(
      vehicles.map(async (vehicle) => {
        const { data: images, error: imagesError } = await supabase
          .from("vehicle_images")
          .select("image_url")
          .eq("vehicle_id", vehicle.id)
          .order("sort_order", { ascending: true })
          .limit(1); // Get only the first image

        if (imagesError) {
          console.error("Error fetching images for vehicle:", vehicle.id, imagesError);
          // Continue with placeholder if image fetch fails
          return {
            ...vehicle,
            image_url: '/placeholder.png'
          };
        }

        return {
          ...vehicle,
          image_url: images?.[0]?.image_url || '/placeholder.png'
        };
      })
    );

    // Also get features for each vehicle (optional)
    const vehiclesWithImagesAndFeatures = await Promise.all(
      vehiclesWithImages.map(async (vehicle) => {
        const { data: features, error: featuresError } = await supabase
          .from("vehicle_features")
          .select("feature")
          .eq("vehicle_id", vehicle.id);

        if (featuresError) {
          console.error("Error fetching features for vehicle:", vehicle.id, featuresError);
          return {
            ...vehicle,
            features: []
          };
        }

        return {
          ...vehicle,
          features: features?.map(f => f.feature) || []
        };
      })
    );

    return res.status(200).json({ 
      success: true, 
      vehicles: vehiclesWithImagesAndFeatures 
    });

  } catch (error) {
    console.error("Error fetching featured vehicles:", error);
    return res.status(500).json({ 
      success: false, 
      error: error.message || "Internal server error" 
    });
  }
});

// Alternative approach using JOIN (if you prefer a single query)
router.get("/vehicles/featured-alt", async (req, res) => {
  try {
    // Get vehicles with their images using proper JOIN syntax
    const { data: vehicles, error } = await supabase
      .from("vehicles")
      .select(`
        *,
        vehicle_images!inner(image_url, sort_order)
      `)
      .eq("featured", true)
      .eq("published", true)
      .order("created_at", { ascending: false })
      .limit(6);

    if (error) {
      console.error("Error fetching featured vehicles:", error);
      throw error;
    }

    // Process the data to get the first image for each vehicle
    const processedVehicles = vehicles.map(vehicle => {
      // Sort images by sort_order and get the first one
      const sortedImages = vehicle.vehicle_images?.sort((a, b) => a.sort_order - b.sort_order);
      const firstImage = sortedImages?.[0];

      return {
        ...vehicle,
        image_url: firstImage?.image_url || '/placeholder.png',
        // Remove the nested images array since we only need the first image
        vehicle_images: undefined
      };
    });

    return res.status(200).json({ 
      success: true, 
      vehicles: processedVehicles 
    });

  } catch (error) {
    console.error("Error fetching featured vehicles:", error);
    return res.status(500).json({ 
      success: false, 
      error: error.message || "Internal server error" 
    });
  }
});


// Get only published vehicles
router.get("/vehicles/published", async (req, res) => {
  try {
    const { data, error } = await supabase
      .from("vehicles")
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
    return res.status(500).json({ success: false, error: error.message || "Internal server error" });
  }
});

// GET vehicle by SLUG (for public frontend)
router.get("/vehicle/slug/:slug", async (req, res) => {
  try {
    const vehicleSlug = req.params.slug;
    console.log("Fetching vehicle by slug:", vehicleSlug);

    // Get vehicle by slug
    const { data: vehicle, error: vehicleError } = await supabase
      .from("vehicles")
      .select("*")
      .eq("slug", vehicleSlug)
      .eq("published", true) // Only show published vehicles
      .single();

    if (vehicleError || !vehicle) {
      console.log("Vehicle not found for slug:", vehicleSlug);
      return res.status(404).json({
        success: false,
        error: "Vehicle not found",
      });
    }

    // Get vehicle images
    const { data: images, error: imagesError } = await supabase
      .from("vehicle_images")
      .select("*")
      .eq("vehicle_id", vehicle.id)
      .order("sort_order", { ascending: true });

    if (imagesError) {
      console.error("Error fetching images:", imagesError);
      // Continue without images rather than failing
    }

    // Get vehicle features
    const { data: features, error: featuresError } = await supabase
      .from("vehicle_features")
      .select("*")
      .eq("vehicle_id", vehicle.id);

    if (featuresError) {
      console.error("Error fetching features:", featuresError);
      // Continue without features rather than failing
    }

    console.log("Vehicle found successfully:", vehicle.id);

    return res.status(200).json({
      success: true,
      vehicle: vehicle,
      images: images || [],
      features: features || [],
    });
  } catch (error) {
    console.error("Fetching vehicle by slug failed:", error);
    return res.status(500).json({
      success: false,
      error: error.message || "Internal server error",
    });
  }
});

// GET all vehicle slugs (for generating static paths if needed)
router.get("/vehicles/slugs", async (req, res) => {
  try {
    const { data, error } = await supabase
      .from("vehicles")
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

// Test slug generation endpoint (optional - for debugging)
router.post("/test-slug", async (req, res) => {
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

// Also update your existing generateUniqueSlug function to handle edge cases better

// GET unique brands from vehicles table for dynamic filters
router.get("/vehicles/brands", async (req, res) => {
  try {
    const { data, error } = await supabase
      .from("vehicles")
      .select("brand")
      .eq("published", true)
      .order("brand");

    if (error) {
      console.error("Error fetching vehicle brands:", error);
      throw error;
    }

    // Get unique brands
    const uniqueBrands = [...new Set(data.map(vehicle => vehicle.brand))].filter(Boolean).sort();

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

module.exports = router;
