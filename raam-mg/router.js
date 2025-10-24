const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const {
  uploadImage,
  createHeroSlider,
  getHeroSliders,
  getHeroSliderById,
  updateHeroSlider,
  deleteHeroSlider,
} = require('./MGAdsHeroSliders');

const {
  getActiveTheme,
  getAllThemes,
  getThemeById,
  activateTheme,
  createTheme,
  updateTheme,
  deleteTheme,
  getAllHeaderConfigs,
  getHeaderConfigByKey,
  updateHeaderConfig,
  bulkUpdateHeaderConfigs,
} = require('./headerTheme');

const {
  getAllModelsPricing,
  getModelPricing,
  createModelPricing,
  updateModelPricing,
  deleteModelPricing,
  updateModelVariants,
} = require('./mg_models_pricing');

const router = express.Router();

// Ensure uploads directory exists
const uploadsDir = path.join(__dirname, '../uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
  console.log('Created uploads directory:', uploadsDir);
}

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadsDir); // Use absolute path
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({ storage });

// GET - Fetch all hero sliders
router.get('/hero-sliders', async (req, res) => {
  try {
    const includeInactive = req.query.includeInactive === 'true';
    const sliders = await getHeroSliders(includeInactive);
    res.json({ success: true, data: sliders });
  } catch (error) {
    console.error('Error fetching hero sliders:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// GET - Fetch single hero slider by ID
router.get('/hero-sliders/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const slider = await getHeroSliderById(id);
    res.json({ success: true, data: slider });
  } catch (error) {
    console.error('Error fetching hero slider:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// POST - Create new hero slider
router.post('/hero-sliders', upload.fields([
  { name: 'desktopImage', maxCount: 1 },
  { name: 'mobileImage', maxCount: 1 }
]), async (req, res) => {
  try {
    console.log('📤 Creating new hero slider...');
    console.log('📋 Request body:', req.body);
    console.log('📁 Files received:', req.files ? Object.keys(req.files) : 'No files');

    const { 
      title, 
      tagline, 
      cta_text, 
      cta_link, 
      order_index, 
      is_active, 
      end_date,
      seo_title,
      seo_description,
      seo_keywords,
      seo_canonical_url,
      seo_slug,
      seo_og_title,
      seo_og_description,
      seo_og_image,
      seo_schema
    } = req.body;
    
    let desktopImageUrl = null;
    let mobileImageUrl = null;

    // Upload desktop image if provided
    if (req.files && req.files.desktopImage) {
      console.log('🖥️ Uploading desktop image...');
      desktopImageUrl = await uploadImage(req.files.desktopImage[0].path, 'mg_ads_hero_sliders/desktop');
      console.log('✅ Desktop image uploaded:', desktopImageUrl);
    }

    // Upload mobile image if provided
    if (req.files && req.files.mobileImage) {
      console.log('📱 Uploading mobile image...');
      mobileImageUrl = await uploadImage(req.files.mobileImage[0].path, 'mg_ads_hero_sliders/mobile');
      console.log('✅ Mobile image uploaded:', mobileImageUrl);
    }

    const payload = {
      title,
      tagline,
      desktop_image: desktopImageUrl,
      mobile_image: mobileImageUrl,
      cta_text: cta_text || 'Learn More',
      cta_link: cta_link || null,
      order_index: parseInt(order_index) || 0,
      is_active: is_active === 'true' || is_active === true,
      end_date: end_date || null,
      seo_title: seo_title || null,
      seo_description: seo_description || null,
      seo_keywords: seo_keywords || null,
      seo_canonical_url: seo_canonical_url || null,
      seo_slug: seo_slug || null,
      seo_og_title: seo_og_title || null,
      seo_og_description: seo_og_description || null,
      seo_og_image: seo_og_image || null,
      seo_schema: seo_schema || null,
    };

    console.log('💾 Payload to save:', payload);
    
    const newSlider = await createHeroSlider(payload);
    console.log('✅ Hero slider created successfully:', newSlider);
    
    res.json({ success: true, data: newSlider });
  } catch (error) {
    console.error('❌ Error creating hero slider:', error);
    console.error('❌ Full error details:', {
      message: error.message,
      stack: error.stack,
      name: error.name
    });
    res.status(500).json({ success: false, error: error.message });
  }
});

// PUT - Update hero slider
router.put('/hero-sliders/:id', upload.fields([
  { name: 'desktopImage', maxCount: 1 },
  { name: 'mobileImage', maxCount: 1 }
]), async (req, res) => {
  try {
    const { id } = req.params;
    const { 
      title, 
      tagline, 
      cta_text, 
      cta_link, 
      order_index, 
      is_active, 
      end_date,
      seo_title,
      seo_description,
      seo_keywords,
      seo_canonical_url,
      seo_slug,
      seo_og_title,
      seo_og_description,
      seo_og_image,
      seo_schema
    } = req.body;
    
    const updates = {
      title,
      tagline,
      cta_text: cta_text || 'Learn More',
      cta_link: cta_link || null,
      order_index: parseInt(order_index) || 0,
      is_active: is_active === 'true' || is_active === true,
      end_date: end_date || null,
      seo_title: seo_title || null,
      seo_description: seo_description || null,
      seo_keywords: seo_keywords || null,
      seo_canonical_url: seo_canonical_url || null,
      seo_slug: seo_slug || null,
      seo_og_title: seo_og_title || null,
      seo_og_description: seo_og_description || null,
      seo_og_image: seo_og_image || null,
      seo_schema: seo_schema || null,
    };

    // Upload new desktop image if provided
    if (req.files && req.files.desktopImage) {
      updates.desktop_image = await uploadImage(req.files.desktopImage[0].path, 'mg_ads_hero_sliders/desktop');
    }

    // Upload new mobile image if provided
    if (req.files && req.files.mobileImage) {
      updates.mobile_image = await uploadImage(req.files.mobileImage[0].path, 'mg_ads_hero_sliders/mobile');
    }

    const updatedSlider = await updateHeroSlider(id, updates);
    res.json({ success: true, data: updatedSlider });
  } catch (error) {
    console.error('Error updating hero slider:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// DELETE - Delete hero slider
router.delete('/hero-sliders/:id', async (req, res) => {
  try {
    const { id } = req.params;
    await deleteHeroSlider(id);
    res.json({ success: true, message: 'Hero slider deleted successfully' });
  } catch (error) {
    console.error('Error deleting hero slider:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ===== HEADER THEME ROUTES =====

// GET - Get active theme
router.get('/header-theme/active', async (req, res) => {
  try {
    const theme = await getActiveTheme();
    res.json({ success: true, data: theme });
  } catch (error) {
    console.error('Error fetching active theme:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// GET - Get all themes
router.get('/header-themes', async (req, res) => {
  try {
    const themes = await getAllThemes();
    res.json({ success: true, data: themes });
  } catch (error) {
    console.error('Error fetching themes:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// GET - Get theme by ID
router.get('/header-themes/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const theme = await getThemeById(id);
    res.json({ success: true, data: theme });
  } catch (error) {
    console.error('Error fetching theme:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// POST - Activate theme
router.post('/header-themes/:id/activate', async (req, res) => {
  try {
    const { id } = req.params;
    const { activatedBy } = req.body;
    const theme = await activateTheme(id, activatedBy || 'admin');
    res.json({ success: true, data: theme });
  } catch (error) {
    console.error('Error activating theme:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// POST - Create new theme
router.post('/header-themes', async (req, res) => {
  try {
    const theme = await createTheme(req.body);
    res.json({ success: true, data: theme });
  } catch (error) {
    console.error('Error creating theme:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// PUT - Update theme
router.put('/header-themes/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const theme = await updateTheme(id, req.body);
    res.json({ success: true, data: theme });
  } catch (error) {
    console.error('Error updating theme:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// DELETE - Delete theme
router.delete('/header-themes/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await deleteTheme(id);
    res.json({ success: true, message: result.message });
  } catch (error) {
    console.error('Error deleting theme:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ===== HEADER CONFIG ROUTES =====

// GET - Get all header configs
router.get('/header-configs', async (req, res) => {
  try {
    const configs = await getAllHeaderConfigs();
    res.json({ success: true, data: configs });
  } catch (error) {
    console.error('Error fetching header configs:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// GET - Get config by key
router.get('/header-configs/:key', async (req, res) => {
  try {
    const { key } = req.params;
    const config = await getHeaderConfigByKey(key);
    res.json({ success: true, data: config });
  } catch (error) {
    console.error('Error fetching header config:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// PUT - Update header config
router.put('/header-configs/:key', async (req, res) => {
  try {
    const { key } = req.params;
    const { value } = req.body;
    const config = await updateHeaderConfig(key, value);
    res.json({ success: true, data: config });
  } catch (error) {
    console.error('Error updating header config:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// POST - Bulk update header configs
router.post('/header-configs/bulk-update', async (req, res) => {
  try {
    const configs = await bulkUpdateHeaderConfigs(req.body);
    res.json({ success: true, data: configs });
  } catch (error) {
    console.error('Error bulk updating header configs:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// =====================================================
// MG MODELS PRICING ROUTES
// =====================================================

// GET - Get all models pricing
router.get('/models/pricing', getAllModelsPricing);

// GET - Get specific model pricing
router.get('/models/pricing/:modelName', getModelPricing);

// POST - Create new model pricing
router.post('/models/pricing', createModelPricing);

// PUT - Update model pricing
router.put('/models/pricing/:modelName', updateModelPricing);

// DELETE - Delete/deactivate model pricing
router.delete('/models/pricing/:modelName', deleteModelPricing);

// PATCH - Update only variants for a model
router.patch('/models/pricing/:modelName/variants', updateModelVariants);

module.exports = router;