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

module.exports = router;