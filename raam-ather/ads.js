require('dotenv').config();
const express = require('express');
const multer = require('multer');
const { createClient } = require('@supabase/supabase-js');
const { v4: uuidv4 } = require('uuid');
const fs = require('fs');

const router = express.Router();

// Multer setup
const upload = multer({ dest: 'uploads/' });

// Supabase client
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

const BUCKET = process.env.SUPABASE_BUCKET_ATHER_CAMPAIGNS; // "ather-campaigns"

// ---------------- CREATE CAMPAIGN ----------------
router.post('/create', upload.single('creative'), async (req, res) => {
  try {
    const { cta_text, cta_link, end_date, slug, location } = req.body;

    if (!location) {
      return res.status(400).json({ error: 'Location is required (chennai or hyderabad)' });
    }

    if (!req.file) {
      return res.status(400).json({ error: 'No creative file uploaded' });
    }

    // Upload creative (image or video) to Supabase Storage
    const ext = req.file.originalname.split('.').pop();
    const fileName = `${uuidv4()}.${ext}`;
    const filePath = `campaigns/${location}/${slug}/${fileName}`;

    const fileBuffer = fs.readFileSync(req.file.path);

    const { error: uploadError } = await supabase.storage
      .from(BUCKET)
      .upload(filePath, fileBuffer, {
        contentType: req.file.mimetype,
        upsert: true,
      });

    fs.unlinkSync(req.file.path); // delete local temp file

    if (uploadError) throw uploadError;

    // Get public URL
    const { data: publicUrlData } = supabase.storage
      .from(BUCKET)
      .getPublicUrl(filePath);

    // Insert into DB
    const { data, error } = await supabase
      .from('ather_campaigns')
      .insert([
        {
          creative_url: publicUrlData.publicUrl,
          cta_text,
          cta_link,
          end_date,
          slug,
          location,
        },
      ])
      .select();

    if (error) throw error;

    res.json({ success: true, campaign: data[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// ---------------- GET ALL CAMPAIGNS ----------------
router.get('/all', async (req, res) => {
  try {
    const { location } = req.query;

    let query = supabase.from('ather_campaigns').select('*').order('created_at', { ascending: false });

    if (location) {
      query = query.eq('location', location);
    }

    const { data, error } = await query;

    if (error) throw error;
    res.json({ campaigns: data });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ---------------- GET SINGLE CAMPAIGN (BY SLUG + LOCATION) ----------------
router.get('/:slug', async (req, res) => {
  try {
    const { slug } = req.params;
    const { location } = req.query;

    let query = supabase.from('ather_campaigns').select('*').eq('slug', slug);

    if (location) {
      query = query.eq('location', location);
    }

    const { data, error } = await query.single();

    if (error) throw error;
    res.json({ campaign: data });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ---------------- UPDATE CAMPAIGN ----------------
router.put('/update/:id', upload.single('creative'), async (req, res) => {
  try {
    const { id } = req.params;
    const { cta_text, cta_link, end_date, slug, location } = req.body;

    let creativeUrl = null;

    // If creative file is uploaded → replace
    if (req.file) {
      const ext = req.file.originalname.split('.').pop();
      const fileName = `${uuidv4()}.${ext}`;
      const filePath = `campaigns/${location}/${slug}/${fileName}`;

      const fileBuffer = fs.readFileSync(req.file.path);

      const { error: uploadError } = await supabase.storage
        .from(BUCKET)
        .upload(filePath, fileBuffer, {
          contentType: req.file.mimetype,
          upsert: true,
        });

      fs.unlinkSync(req.file.path);

      if (uploadError) throw uploadError;

      const { data: publicUrlData } = supabase.storage
        .from(BUCKET)
        .getPublicUrl(filePath);

      creativeUrl = publicUrlData.publicUrl;
    }

    // Update DB record
    const { data, error } = await supabase
      .from('ather_campaigns')
      .update({
        cta_text,
        cta_link,
        end_date,
        slug,
        location,
        ...(creativeUrl && { creative_url: creativeUrl }),
      })
      .eq('id', id)
      .select();

    if (error) throw error;

    res.json({ success: true, campaign: data[0] });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ---------------- DELETE CAMPAIGN ----------------
router.delete('/delete/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const { error } = await supabase
      .from('ather_campaigns')
      .delete()
      .eq('id', id);

    if (error) throw error;

    res.json({ success: true, message: 'Campaign deleted' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
