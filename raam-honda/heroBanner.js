// raam-honda-banners.js
// CommonJS, single-file Express router for Raam Honda Landing Page banner CRUD

const express = require('express');
const { createClient } = require('@supabase/supabase-js');
const { v4: uuidv4 } = require('uuid');
const multer = require('multer');
const path = require('path');

const router = express.Router();

// ========= ENV & SUPABASE =========
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;
const SUPABASE_BUCKET_RAAM_HONDA_BANNERS =
  process.env.SUPABASE_BUCKET_RAAM_HONDA_BANNERS || 'honda-offers-banners';

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

// ========= MULTER FOR IMAGE UPLOAD =========
const storage = multer.memoryStorage();
const upload = multer({ storage });

// Helper to upload a file to Supabase storage and get public URL
async function uploadBannerImage(file) {
  if (!file) return null;
  const ext = path.extname(file.originalname);
  const filename = `${uuidv4()}${ext}`;
  const { error } = await supabase.storage
    .from(SUPABASE_BUCKET_RAAM_HONDA_BANNERS)
    .upload(filename, file.buffer, {
      contentType: file.mimetype,
    });
  if (error) throw error;
  const { data: urlData } = supabase.storage
    .from(SUPABASE_BUCKET_RAAM_HONDA_BANNERS)
    .getPublicUrl(filename);
  return urlData.publicUrl;
}

// ========= CRUD: honda_offers TABLE =========

// GET all offers
router.get('/offers', async (req, res) => {
  try {
    const { data, error } = await supabase.from('honda_offers').select('*');
    if (error) throw error;
    res.json(data);
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

// GET offer by ID
router.get('/offers/:id', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('honda_offers')
      .select('*')
      .eq('id', req.params.id)
      .single();
    if (error) throw error;
    res.json(data);
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

// CREATE offer - supports two banner files: banner_desktop and banner_mobile
router.post(
  '/offers',
  upload.fields([
    { name: 'banner_desktop', maxCount: 1 },
    { name: 'banner_mobile', maxCount: 1 },
  ]),
  async (req, res) => {
    try {
      const { title, cta_text, cta_url, end_date, status } = req.body;
      if (!end_date) throw new Error('end_date is required');

      const desktopFile = req.files['banner_desktop'] ? req.files['banner_desktop'][0] : null;
      const mobileFile = req.files['banner_mobile'] ? req.files['banner_mobile'][0] : null;

      const image_url = await uploadBannerImage(desktopFile);
      const image_url_mobile = await uploadBannerImage(mobileFile);

      const { data, error } = await supabase
        .from('honda_offers')
        .insert([
          {
            title: title || 'Untitled Offer',
            cta_text: cta_text || '',
            cta_url: cta_url || '',
            image_url: image_url || '',
            image_url_mobile: image_url_mobile || '',
            end_date,
            status: status || 'active',
          },
        ])
        .select();

      if (error) throw error;
      res.json(data[0]);
    } catch (e) {
      res.status(400).json({ error: e.message });
    }
  }
);

// UPDATE offer - supports banner update for desktop and mobile
router.put(
  '/offers/:id',
  upload.fields([
    { name: 'banner_desktop', maxCount: 1 },
    { name: 'banner_mobile', maxCount: 1 },
  ]),
  async (req, res) => {
    try {
      const { title, cta_text, cta_url, end_date, status } = req.body;

      const desktopFile = req.files['banner_desktop'] ? req.files['banner_desktop'][0] : null;
      const mobileFile = req.files['banner_mobile'] ? req.files['banner_mobile'][0] : null;

      let image_url = req.body.image_url || null;
      let image_url_mobile = req.body.image_url_mobile || null;

      if (desktopFile) {
        image_url = await uploadBannerImage(desktopFile);
      }
      if (mobileFile) {
        image_url_mobile = await uploadBannerImage(mobileFile);
      }

      const updateObj = {
        title: title || 'Untitled Offer',
        cta_text: cta_text || '',
        cta_url: cta_url || '',
        image_url: image_url || '',
        image_url_mobile: image_url_mobile || '',
        end_date,
        status: status || 'active',
      };

      // Remove undefined fields
      Object.keys(updateObj).forEach(
        (key) => updateObj[key] === undefined && delete updateObj[key]
      );

      const { data, error } = await supabase
        .from('honda_offers')
        .update(updateObj)
        .eq('id', req.params.id)
        .select();

      if (error) throw error;
      res.json(data[0]);
    } catch (e) {
      res.status(400).json({ error: e.message });
    }
  }
);

// DELETE offer
router.delete('/offers/:id', async (req, res) => {
  try {
    const { error } = await supabase.from('honda_offers').delete().eq('id', req.params.id);
    if (error) throw error;
    res.json({ success: true, message: 'Offer deleted' });
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

module.exports = router;
