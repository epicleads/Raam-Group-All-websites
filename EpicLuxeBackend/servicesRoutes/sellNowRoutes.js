const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
require('dotenv').config(); // to load env variables

const { createClient } = require('@supabase/supabase-js');

const router = express.Router();

// Initialize Supabase client
// Make sure SUPABASE_URL and SUPABASE_SERVICE_KEY are set in your environment variables (.env)
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY;

if (!supabaseUrl || !supabaseKey) {
  throw new Error('Missing Supabase env variables SUPABASE_URL or SUPABASE_SERVICE_KEY');
}

const supabase = createClient(supabaseUrl, supabaseKey);

// ⚡️ Setup Multer for image uploads
const uploadDir = path.join(__dirname, '..', 'uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir);
}

// Multer diskStorage for unique filenames
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    cb(
      null,
      `${file.fieldname}-${Date.now()}-${file.originalname.replace(/\s+/g, '_')}`
    );
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 7 * 1024 * 1024 }, // Max 7MB/file (adjust if needed)
});

// 📢 ============ ROUTES ============

// 1. Save SellNowWizard main details (step 1-9)
router.post('/sellnow/details', async (req, res) => {
  const {
    brand, model, fuel, variant, city, year,
    owner, kms, phone, whatsappUpdates, timestamp,
  } = req.body;

  if (!brand || !model || !fuel || !variant || !city || !year || !owner || !kms || !phone) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  // Insert into supabase table sell_requests
  const { data, error } = await supabase
    .from('sell_requests')
    .insert([
      {
        brand,
        model,
        fuel,
        variant,
        city,
        year,
        owner,
        kms,
        phone,
        whatsapp_updates: whatsappUpdates || false,
        submitted_at: timestamp || new Date().toISOString(),
      }
    ])
    .select() // return inserted row(s)
    .single(); // only one record

  if (error) {
    console.error('Supabase insert error:', error);
    return res.status(500).json({ error: 'Failed to save details' });
  }

  // Return the created row's id as requestId
  res.status(201).json({
    message: 'Details saved. Now upload images if you wish.',
    requestId: data.id,
  });
});

// 2. Save images to corresponding evaluation
router.post('/sellnow/images', upload.fields([
  { name: 'rc', maxCount: 1 },
  { name: 'exterior', maxCount: 10 },
  { name: 'tyres', maxCount: 10 },
  { name: 'interior', maxCount: 10 },
]), async (req, res) => {
  const { requestId } = req.body;
  if (!requestId) {
    return res.status(400).json({ error: 'Missing requestId' });
  }

  let uploaded = {};

  try {
    for (const field of ['rc', 'exterior', 'tyres', 'interior']) {
      if (req.files && req.files[field]) {
        const rowsToInsert = req.files[field].map((file) => ({
          request_id: requestId,
          image_type: field,
          storage_path: `/uploads/${file.filename}`, // or your actual storage system path
        }));

        // Insert multiple rows for this image type
        const { data, error } = await supabase.from('sell_request_images').insert(rowsToInsert);

        if (error) {
          console.error(`Supabase insert images error for ${field}:`, error);
          return res.status(500).json({ error: 'Failed to save images' });
        }

        uploaded[field] = data;
      }
    }
  } catch (err) {
    console.error('Error uploading images:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }

  res.status(200).json({
    message: 'Images uploaded successfully',
    uploaded,
  });
});

// Optional: list all requests (for testing/debugging)
router.get('/sellnow/requests', async (req, res) => {
  const { data, error } = await supabase.from('sell_requests').select('*').order('submitted_at', { ascending: false });
  if (error) {
    return res.status(500).json({ error: 'Failed to fetch requests' });
  }
  res.json({ requests: data });
});

module.exports = router;
