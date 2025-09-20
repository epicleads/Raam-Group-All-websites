const express = require('express');
const { createClient } = require('@supabase/supabase-js');
const Joi = require('joi');
require('dotenv').config();

const router = express.Router();

// ✅ Validate environment variables early
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_KEY; // service role key

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('❌ Missing Supabase environment variables');
  process.exit(1);
}

// ✅ Supabase client
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// ✅ Joi schemas for validation
const brandDataSchema = Joi.object({
  brand_name: Joi.string().required().max(100),
  model_name: Joi.string().required().max(100),
  fuel_type: Joi.string().valid('Petrol', 'Diesel', 'Hybrid', 'Electric').required(),
  variant_name: Joi.string().required().max(100),
  is_active: Joi.boolean().default(true)
});

const bulkUploadSchema = Joi.object({
  brand_data: Joi.array().items(brandDataSchema).required().min(1)
});

const updateSchema = Joi.object({
  brand_name: Joi.string().max(100),
  model_name: Joi.string().max(100),
  fuel_type: Joi.string().valid('Petrol', 'Diesel', 'Hybrid', 'Electric'),
  variant_name: Joi.string().max(100),
  is_active: Joi.boolean()
}).min(1); // At least one field must be provided

// ✅ GET: Fetch all brand data with optional filtering
router.get('/', async (req, res) => {
  try {
    const { 
      brand_name, 
      model_name, 
      fuel_type, 
      is_active = 'true',
      page = 1, 
      limit = 100,
      sort_by = 'brand_name',
      sort_order = 'asc'
    } = req.query;

    // Build query
    let query = supabase
      .from('reassured_brand_data')
      .select('*', { count: 'exact' });

    // Apply filters
    if (brand_name) {
      query = query.ilike('brand_name', `%${brand_name}%`);
    }
    if (model_name) {
      query = query.ilike('model_name', `%${model_name}%`);
    }
    if (fuel_type) {
      query = query.eq('fuel_type', fuel_type);
    }
    if (is_active !== 'all') {
      query = query.eq('is_active', is_active === 'true');
    }

    // Apply sorting
    const validSortFields = ['brand_name', 'model_name', 'fuel_type', 'variant_name', 'created_at'];
    const sortField = validSortFields.includes(sort_by) ? sort_by : 'brand_name';
    const sortDirection = sort_order === 'desc' ? false : true;
    query = query.order(sortField, { ascending: sortDirection });

    // Apply pagination
    const pageNum = parseInt(page);
    const limitNum = Math.min(parseInt(limit), 1000); // Max 1000 records per request
    const from = (pageNum - 1) * limitNum;
    const to = from + limitNum - 1;
    query = query.range(from, to);

    const { data, error, count } = await query;

    if (error) {
      console.error('Error fetching brand data:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to fetch brand data',
        error: error.message
      });
    }

    res.json({
      success: true,
      data: data || [],
      pagination: {
        page: pageNum,
        limit: limitNum,
        total: count || 0,
        total_pages: Math.ceil((count || 0) / limitNum)
      }
    });

  } catch (error) {
    console.error('Unexpected error in GET /brand-data:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
});

// ✅ GET: Get unique brands
router.get('/brands', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('reassured_brand_data')
      .select('brand_name')
      .eq('is_active', true)
      .order('brand_name');

    if (error) {
      console.error('Error fetching brands:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to fetch brands',
        error: error.message
      });
    }

    // Extract unique brand names
    const uniqueBrands = [...new Set(data.map(item => item.brand_name))];

    res.json({
      success: true,
      data: uniqueBrands
    });

  } catch (error) {
    console.error('Unexpected error in GET /brand-data/brands:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
});

// ✅ GET: Get models for a specific brand
router.get('/brands/:brandName/models', async (req, res) => {
  try {
    const { brandName } = req.params;

    const { data, error } = await supabase
      .from('reassured_brand_data')
      .select('model_name')
      .eq('brand_name', brandName)
      .eq('is_active', true)
      .order('model_name');

    if (error) {
      console.error('Error fetching models:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to fetch models',
        error: error.message
      });
    }

    // Extract unique model names
    const uniqueModels = [...new Set(data.map(item => item.model_name))];

    res.json({
      success: true,
      data: uniqueModels
    });

  } catch (error) {
    console.error('Unexpected error in GET /brand-data/brands/:brandName/models:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
});

// ✅ GET: Get variants for a specific brand and model
router.get('/brands/:brandName/models/:modelName/variants', async (req, res) => {
  try {
    const { brandName, modelName } = req.params;
    const { fuel_type } = req.query;

    let query = supabase
      .from('reassured_brand_data')
      .select('fuel_type, variant_name')
      .eq('brand_name', brandName)
      .eq('model_name', modelName)
      .eq('is_active', true)
      .order('fuel_type')
      .order('variant_name');

    if (fuel_type) {
      query = query.eq('fuel_type', fuel_type);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching variants:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to fetch variants',
        error: error.message
      });
    }

    // Group variants by fuel type
    const groupedVariants = {};
    data.forEach(item => {
      if (!groupedVariants[item.fuel_type]) {
        groupedVariants[item.fuel_type] = [];
      }
      groupedVariants[item.fuel_type].push(item.variant_name);
    });

    res.json({
      success: true,
      data: groupedVariants
    });

  } catch (error) {
    console.error('Unexpected error in GET /brand-data/brands/:brandName/models/:modelName/variants:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
});

// ✅ GET: Get data in the same format as BrandData.ts
router.get('/formatted', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('reassured_brand_data')
      .select('*')
      .eq('is_active', true)
      .order('brand_name')
      .order('model_name')
      .order('fuel_type')
      .order('variant_name');

    if (error) {
      console.error('Error fetching formatted brand data:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to fetch formatted brand data',
        error: error.message
      });
    }

    // Transform data to match BrandData.ts format
    const formattedData = {};
    data.forEach(item => {
      if (!formattedData[item.brand_name]) {
        formattedData[item.brand_name] = {};
      }
      if (!formattedData[item.brand_name][item.model_name]) {
        formattedData[item.brand_name][item.model_name] = {
          Petrol: [],
          Diesel: [],
          Hybrid: [],
          Electric: []
        };
      }
      if (formattedData[item.brand_name][item.model_name][item.fuel_type]) {
        formattedData[item.brand_name][item.model_name][item.fuel_type].push(item.variant_name);
      }
    });

    res.json({
      success: true,
      data: formattedData
    });

  } catch (error) {
    console.error('Unexpected error in GET /brand-data/formatted:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
});

// ✅ POST: Create a new brand data entry
router.post('/', async (req, res) => {
  try {
    const { error: validationError, value } = brandDataSchema.validate(req.body);
    
    if (validationError) {
      return res.status(400).json({
        success: false,
        message: 'Validation error',
        error: validationError.details[0].message
      });
    }

    const { data, error } = await supabase
      .from('reassured_brand_data')
      .insert([value])
      .select()
      .single();

    if (error) {
      console.error('Error creating brand data:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to create brand data',
        error: error.message
      });
    }

    res.status(201).json({
      success: true,
      message: 'Brand data created successfully',
      data
    });

  } catch (error) {
    console.error('Unexpected error in POST /brand-data:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
});

// ✅ POST: Bulk upload brand data
router.post('/bulk-upload', async (req, res) => {
  try {
    const { error: validationError, value } = bulkUploadSchema.validate(req.body);
    
    if (validationError) {
      return res.status(400).json({
        success: false,
        message: 'Validation error',
        error: validationError.details[0].message
      });
    }

    const { brand_data } = value;

    // Use upsert to handle duplicates
    const { data, error } = await supabase
      .from('reassured_brand_data')
      .upsert(brand_data, { 
        onConflict: 'brand_name,model_name,fuel_type,variant_name',
        ignoreDuplicates: false 
      })
      .select();

    if (error) {
      console.error('Error bulk uploading brand data:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to bulk upload brand data',
        error: error.message
      });
    }

    res.status(201).json({
      success: true,
      message: `Successfully uploaded ${data.length} brand data entries`,
      data: {
        uploaded_count: data.length,
        entries: data
      }
    });

  } catch (error) {
    console.error('Unexpected error in POST /brand-data/bulk-upload:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
});

// ✅ PUT: Update brand data by ID
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { error: validationError, value } = updateSchema.validate(req.body);
    
    if (validationError) {
      return res.status(400).json({
        success: false,
        message: 'Validation error',
        error: validationError.details[0].message
      });
    }

    const { data, error } = await supabase
      .from('reassured_brand_data')
      .update({ ...value, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Error updating brand data:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to update brand data',
        error: error.message
      });
    }

    if (!data) {
      return res.status(404).json({
        success: false,
        message: 'Brand data not found'
      });
    }

    res.json({
      success: true,
      message: 'Brand data updated successfully',
      data
    });

  } catch (error) {
    console.error('Unexpected error in PUT /brand-data/:id:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
});

// ✅ DELETE: Delete brand data by ID
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const { data, error } = await supabase
      .from('reassured_brand_data')
      .delete()
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Error deleting brand data:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to delete brand data',
        error: error.message
      });
    }

    if (!data) {
      return res.status(404).json({
        success: false,
        message: 'Brand data not found'
      });
    }

    res.json({
      success: true,
      message: 'Brand data deleted successfully',
      data
    });

  } catch (error) {
    console.error('Unexpected error in DELETE /brand-data/:id:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
});

// ✅ DELETE: Delete all brand data for a specific brand
router.delete('/brands/:brandName', async (req, res) => {
  try {
    const { brandName } = req.params;

    const { data, error } = await supabase
      .from('reassured_brand_data')
      .delete()
      .eq('brand_name', brandName)
      .select();

    if (error) {
      console.error('Error deleting brand data:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to delete brand data',
        error: error.message
      });
    }

    res.json({
      success: true,
      message: `Successfully deleted ${data.length} entries for brand: ${brandName}`,
      data: {
        deleted_count: data.length,
        brand_name: brandName
      }
    });

  } catch (error) {
    console.error('Unexpected error in DELETE /brand-data/brands/:brandName:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
});

// ✅ POST: Import from BrandData.ts format
router.post('/import-from-ts', async (req, res) => {
  try {
    const { brandData } = req.body;

    if (!brandData || typeof brandData !== 'object') {
      return res.status(400).json({
        success: false,
        message: 'Invalid brand data format. Expected object with brand names as keys.'
      });
    }

    const transformedData = [];

    // Transform BrandData.ts format to database format
    for (const [brandName, models] of Object.entries(brandData)) {
      for (const [modelName, fuelTypes] of Object.entries(models)) {
        for (const [fuelType, variants] of Object.entries(fuelTypes)) {
          if (Array.isArray(variants)) {
            variants.forEach(variantName => {
              if (variantName && variantName.trim() !== '') {
                transformedData.push({
                  brand_name: brandName,
                  model_name: modelName,
                  fuel_type: fuelType,
                  variant_name: variantName.trim(),
                  is_active: true
                });
              }
            });
          }
        }
      }
    }

    if (transformedData.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No valid data found to import'
      });
    }

    // Use upsert to handle duplicates
    const { data, error } = await supabase
      .from('reassured_brand_data')
      .upsert(transformedData, { 
        onConflict: 'brand_name,model_name,fuel_type,variant_name',
        ignoreDuplicates: false 
      })
      .select();

    if (error) {
      console.error('Error importing brand data:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to import brand data',
        error: error.message
      });
    }

    res.status(201).json({
      success: true,
      message: `Successfully imported ${data.length} brand data entries`,
      data: {
        imported_count: data.length,
        brands: [...new Set(data.map(item => item.brand_name))],
        total_entries: transformedData.length
      }
    });

  } catch (error) {
    console.error('Unexpected error in POST /brand-data/import-from-ts:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
});

module.exports = router;
