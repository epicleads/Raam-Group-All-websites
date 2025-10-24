/**
 * =====================================================
 * MG MODELS PRICING API
 * Centralized pricing management for all MG models
 * =====================================================
 * 
 * Endpoints:
 * - GET    /api/models/pricing              - Get all models pricing
 * - GET    /api/models/pricing/:modelName   - Get specific model pricing
 * - POST   /api/models/pricing              - Create new model pricing
 * - PUT    /api/models/pricing/:modelName   - Update model pricing
 * - DELETE /api/models/pricing/:modelName   - Delete model pricing (soft delete)
 * 
 * Models: astor, comet, hector, windsor, gloster, zsev
 */

const { createClient } = require('@supabase/supabase-js');

// Initialize Supabase client
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase environment variables');
  console.error('Please set SUPABASE_URL and SUPABASE_SERVICE_KEY (or SUPABASE_SERVICE_ROLE_KEY) in .env file');
  throw new Error('Missing Supabase environment variables');
}

const supabase = createClient(supabaseUrl, supabaseKey);

// =====================================================
// HELPER FUNCTIONS
// =====================================================

/**
 * Validate model name
 */
function isValidModelName(modelName) {
  const validModels = ['astor', 'comet', 'hector', 'windsor', 'gloster', 'zsev'];
  return validModels.includes(modelName.toLowerCase());
}

/**
 * Format error response
 */
function errorResponse(res, statusCode, message, error = null) {
  console.error(`Error: ${message}`, error);
  return res.status(statusCode).json({
    success: false,
    error: message,
    details: error?.message || null,
    timestamp: new Date().toISOString()
  });
}

/**
 * Format success response
 */
function successResponse(res, data, message = 'Success') {
  return res.status(200).json({
    success: true,
    message,
    data,
    timestamp: new Date().toISOString()
  });
}

// =====================================================
// API ENDPOINTS
// =====================================================

/**
 * GET /api/models/pricing
 * Get all active models pricing
 */
async function getAllModelsPricing(req, res) {
  try {
    const { 
      active_only = 'true',
      include_inactive = 'false'
    } = req.query;

    let query = supabase
      .from('mg_models_pricing')
      .select('*')
      .order('display_order', { ascending: true });

    // Filter by active status
    if (active_only === 'true' && include_inactive !== 'true') {
      query = query.eq('is_active', true);
    }

    const { data, error } = await query;

    if (error) {
      return errorResponse(res, 500, 'Failed to fetch models pricing', error);
    }

    return successResponse(res, {
      models: data,
      count: data.length
    }, 'Models pricing fetched successfully');

  } catch (error) {
    return errorResponse(res, 500, 'Internal server error', error);
  }
}

/**
 * GET /api/models/pricing/:modelName
 * Get specific model pricing by model name
 */
async function getModelPricing(req, res) {
  try {
    const { modelName } = req.params;

    if (!modelName) {
      return errorResponse(res, 400, 'Model name is required');
    }

    const normalizedModelName = modelName.toLowerCase().trim();

    if (!isValidModelName(normalizedModelName)) {
      return errorResponse(res, 400, `Invalid model name. Valid models: astor, comet, hector, windsor, gloster, zsev`);
    }

    const { data, error } = await supabase
      .from('mg_models_pricing')
      .select('*')
      .eq('model_name', normalizedModelName)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return errorResponse(res, 404, `Model '${normalizedModelName}' not found`);
      }
      return errorResponse(res, 500, 'Failed to fetch model pricing', error);
    }

    if (!data.is_active) {
      console.warn(`Model '${normalizedModelName}' is inactive but data returned`);
    }

    return successResponse(res, data, `Pricing for ${data.model_display_name} fetched successfully`);

  } catch (error) {
    return errorResponse(res, 500, 'Internal server error', error);
  }
}

/**
 * POST /api/models/pricing
 * Create new model pricing entry
 */
async function createModelPricing(req, res) {
  try {
    const {
      model_name,
      model_display_name,
      starting_price,
      top_price,
      variants = [],
      features = [],
      specifications = {},
      is_active = true,
      display_order = 0,
      meta_title,
      meta_description,
      meta_keywords = [],
      updated_by = 'admin'
    } = req.body;

    // Validation
    if (!model_name || !model_display_name || !starting_price || !top_price) {
      return errorResponse(res, 400, 'Missing required fields: model_name, model_display_name, starting_price, top_price');
    }

    const normalizedModelName = model_name.toLowerCase().trim();

    if (!isValidModelName(normalizedModelName)) {
      return errorResponse(res, 400, `Invalid model name. Valid models: astor, comet, hector, windsor, gloster, zsev`);
    }

    // Check if model already exists
    const { data: existing } = await supabase
      .from('mg_models_pricing')
      .select('model_name')
      .eq('model_name', normalizedModelName)
      .single();

    if (existing) {
      return errorResponse(res, 409, `Model '${normalizedModelName}' already exists. Use PUT to update.`);
    }

    // Insert new model
    const { data, error } = await supabase
      .from('mg_models_pricing')
      .insert([{
        model_name: normalizedModelName,
        model_display_name,
        starting_price,
        top_price,
        variants,
        features,
        specifications,
        is_active,
        display_order,
        meta_title,
        meta_description,
        meta_keywords,
        created_by: updated_by,
        updated_by
      }])
      .select()
      .single();

    if (error) {
      return errorResponse(res, 500, 'Failed to create model pricing', error);
    }

    return res.status(201).json({
      success: true,
      message: `Model pricing for ${model_display_name} created successfully`,
      data,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    return errorResponse(res, 500, 'Internal server error', error);
  }
}

/**
 * PUT /api/models/pricing/:modelName
 * Update existing model pricing
 */
async function updateModelPricing(req, res) {
  try {
    const { modelName } = req.params;
    const updateData = req.body;

    if (!modelName) {
      return errorResponse(res, 400, 'Model name is required');
    }

    const normalizedModelName = modelName.toLowerCase().trim();

    if (!isValidModelName(normalizedModelName)) {
      return errorResponse(res, 400, `Invalid model name. Valid models: astor, comet, hector, windsor, gloster, zsev`);
    }

    // Check if model exists
    const { data: existing, error: checkError } = await supabase
      .from('mg_models_pricing')
      .select('model_name, model_display_name')
      .eq('model_name', normalizedModelName)
      .single();

    if (checkError || !existing) {
      return errorResponse(res, 404, `Model '${normalizedModelName}' not found`);
    }

    // Prepare update object (only include provided fields)
    const allowedFields = [
      'model_display_name',
      'starting_price',
      'top_price',
      'variants',
      'features',
      'specifications',
      'is_active',
      'is_featured',
      'display_order',
      'meta_title',
      'meta_description',
      'meta_keywords',
      'updated_by',
      'admin_notes'
    ];

    const updates = {};
    allowedFields.forEach(field => {
      if (updateData.hasOwnProperty(field)) {
        updates[field] = updateData[field];
      }
    });

    if (Object.keys(updates).length === 0) {
      return errorResponse(res, 400, 'No valid fields provided for update');
    }

    // Perform update
    const { data, error } = await supabase
      .from('mg_models_pricing')
      .update(updates)
      .eq('model_name', normalizedModelName)
      .select()
      .single();

    if (error) {
      return errorResponse(res, 500, 'Failed to update model pricing', error);
    }

    return successResponse(res, data, `Pricing for ${data.model_display_name} updated successfully`);

  } catch (error) {
    return errorResponse(res, 500, 'Internal server error', error);
  }
}

/**
 * DELETE /api/models/pricing/:modelName
 * Soft delete model pricing (set is_active = false)
 */
async function deleteModelPricing(req, res) {
  try {
    const { modelName } = req.params;
    const { permanent = 'false', updated_by = 'admin' } = req.query;

    if (!modelName) {
      return errorResponse(res, 400, 'Model name is required');
    }

    const normalizedModelName = modelName.toLowerCase().trim();

    if (!isValidModelName(normalizedModelName)) {
      return errorResponse(res, 400, `Invalid model name. Valid models: astor, comet, hector, windsor, gloster, zsev`);
    }

    // Check if model exists
    const { data: existing, error: checkError } = await supabase
      .from('mg_models_pricing')
      .select('model_name, model_display_name, is_active')
      .eq('model_name', normalizedModelName)
      .single();

    if (checkError || !existing) {
      return errorResponse(res, 404, `Model '${normalizedModelName}' not found`);
    }

    if (permanent === 'true') {
      // Permanent delete (use with caution)
      const { error } = await supabase
        .from('mg_models_pricing')
        .delete()
        .eq('model_name', normalizedModelName);

      if (error) {
        return errorResponse(res, 500, 'Failed to delete model pricing', error);
      }

      return successResponse(res, null, `Model ${existing.model_display_name} permanently deleted`);
    } else {
      // Soft delete (set is_active = false)
      const { data, error } = await supabase
        .from('mg_models_pricing')
        .update({ 
          is_active: false,
          updated_by,
          admin_notes: `Soft deleted on ${new Date().toISOString()}`
        })
        .eq('model_name', normalizedModelName)
        .select()
        .single();

      if (error) {
        return errorResponse(res, 500, 'Failed to deactivate model pricing', error);
      }

      return successResponse(res, data, `Model ${existing.model_display_name} deactivated successfully`);
    }

  } catch (error) {
    return errorResponse(res, 500, 'Internal server error', error);
  }
}

/**
 * PATCH /api/models/pricing/:modelName/variants
 * Update only variants for a specific model
 */
async function updateModelVariants(req, res) {
  try {
    const { modelName } = req.params;
    const { variants, updated_by = 'admin' } = req.body;

    if (!modelName) {
      return errorResponse(res, 400, 'Model name is required');
    }

    if (!variants || !Array.isArray(variants)) {
      return errorResponse(res, 400, 'Variants must be an array');
    }

    const normalizedModelName = modelName.toLowerCase().trim();

    if (!isValidModelName(normalizedModelName)) {
      return errorResponse(res, 400, `Invalid model name`);
    }

    const { data, error } = await supabase
      .from('mg_models_pricing')
      .update({ variants, updated_by })
      .eq('model_name', normalizedModelName)
      .select()
      .single();

    if (error) {
      return errorResponse(res, 500, 'Failed to update variants', error);
    }

    return successResponse(res, data, 'Variants updated successfully');

  } catch (error) {
    return errorResponse(res, 500, 'Internal server error', error);
  }
}

// =====================================================
// EXPORT FUNCTIONS
// =====================================================

module.exports = {
  getAllModelsPricing,
  getModelPricing,
  createModelPricing,
  updateModelPricing,
  deleteModelPricing,
  updateModelVariants
};

