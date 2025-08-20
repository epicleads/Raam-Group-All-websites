const express = require('express');
const { createClient } = require('@supabase/supabase-js');
const Joi = require('joi');
require('dotenv').config();

const router = express.Router();

// Validate environment variables early
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_KEY;
const API_KEY = process.env.API_KEY; // Optional: set your API key here

console.log('SUPABASE_URL from env:', SUPABASE_URL ? 'Loaded' : 'Missing!');
console.log('SUPABASE_SERVICE_KEY from env:', SUPABASE_KEY ? 'Loaded' : 'Missing!');
console.log('API_KEY from env:', API_KEY ? 'Loaded' : 'Missing or Not Set!');

if (!SUPABASE_URL || !SUPABASE_KEY) {
  throw new Error('Missing Supabase credentials in environment variables!');
}

// Initialize Supabase client
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// Middleware: Simple API key authentication
router.use((req, res, next) => {
  if (!API_KEY) {
    // No API key set, skip auth (not recommended for prod)
    console.log('⚠️ No API key configured. Skipping auth.');
    return next();
  }

  const authHeader = req.headers['authorization'];
  if (!authHeader || authHeader !== `Bearer ${API_KEY}`) {
    console.log('❌ Unauthorized request. Missing or invalid API key.');
    return res.status(401).json({ success: false, error: 'Unauthorized' });
  }

  next();
});

// -------- Joi schema for lead validation --------
// (This needs to be filled in according to your table)
const leadSchema = Joi.object({
  lead_type: Joi.string().required(),
  lead_title: Joi.string().allow(null, ''),
  name: Joi.string().required(),
  phone: Joi.string().pattern(/^\d{10}$/).required(),
  email: Joi.string().email().allow(null, ''),
  preferred_model: Joi.string().allow(null, ''),
  vehicle_id: Joi.string().allow(null, ''),
  appointment_date: Joi.date().allow(null),
  appointment_time: Joi.string().allow(null, ''),
  message: Joi.string().allow(null, ''),
  budget: Joi.number().allow(null),
  insurance_type: Joi.string().allow(null, ''),
  loan_details: Joi.string().allow(null, ''),
  status: Joi.string().allow(null, ''),
  source_page: Joi.string().allow(null, ''),
  created_at: Joi.date().optional(),
  brand: Joi.string().allow(null, ''),
  fuel: Joi.string().allow(null, ''),
  variant: Joi.string().allow(null, ''),
  city: Joi.string().allow(null, ''),
  year: Joi.number().allow(null),
  owner: Joi.string().allow(null, ''),
  kms: Joi.number().allow(null),
  whatsapp_updates: Joi.boolean().allow(null),
  monthly_income: Joi.number().allow(null),
  employment_type: Joi.string().allow(null, ''),
  interested_car: Joi.string().allow(null, ''),
  loan_amount: Joi.number().allow(null),
  emi_tenure: Joi.number().allow(null),
  interest: Joi.number().allow(null),
  your_emi: Joi.number().allow(null),
  total_payable: Joi.number().allow(null),
  pan_card: Joi.string().allow(null, ''),
  car_interest: Joi.string().allow(null, ''),
});

// Async error handler wrapper to avoid repetitive try-catch
const asyncHandler = (fn) => (req, res, next) =>
  Promise.resolve(fn(req, res, next)).catch(next);

// ---------- POST /api/leads (Create new lead) -----------
router.post(
  '/leads',
  asyncHandler(async (req, res) => {
    console.log('\n--- [POST] /api/leads called ---');
    console.log('Request body:', req.body);

    // Validate request body
    const { error, value } = leadSchema.validate(req.body);
    if (error) {
      console.log('❗ Validation failed:', error.details[0].message);
      return res.status(400).json({ success: false, error: error.details[0].message });
    }

    console.log('Inserting lead into Supabase...');
    const { data, error: dbError } = await supabase.from('leads').insert([value]).select();

    if (dbError) {
      console.error('❌ Error inserting lead into Supabase:', dbError);
      return res
        .status(500)
        .json({ success: false, error: 'Failed to insert lead', details: dbError.message });
    }

    console.log('✅ Lead successfully inserted:', data && data[0]);
    res.status(201).json({ success: true, message: 'Lead submitted successfully', lead: data[0] });
  })
);

// ---------- GET /api/leads (Fetch leads with optional filtering and pagination) ----------
router.get(
  '/leads',
  asyncHandler(async (req, res) => {
    const { lead_type, page = 1, limit = 20 } = req.query;
    const pageInt = parseInt(page, 10);
    const limitInt = Math.min(parseInt(limit, 10), 100); // max 100 per page

    console.log('\n--- [GET] /api/leads called ---');
    if (lead_type) {
      console.log(`Filtering by lead_type: "${lead_type}"`);
    } else {
      console.log('No lead_type filter, returning all leads');
    }
    console.log(`Pagination - page: ${pageInt}, limit: ${limitInt}`);

    let query = supabase.from('leads').select('*').order('created_at', { ascending: false });

    if (lead_type) {
      query = query.eq('lead_type', lead_type);
    }

    query = query.range((pageInt - 1) * limitInt, pageInt * limitInt - 1);

    const { data, error } = await query;

    if (error) {
      console.error('❌ Error fetching leads from Supabase:', error);
      return res.status(500).json({ success: false, error: 'Failed to fetch leads', details: error.message });
    }

    console.log(`✅ Fetched ${data.length} lead(s) from Supabase`);
    res.json({ success: true, leads: data, page: pageInt, limit: limitInt });
  })
);

// Centralized error-handling middleware
router.use((err, req, res, next) => {
  console.error('❌ Unexpected error:', err);
  res.status(500).json({ success: false, error: 'Internal server error' });
});

module.exports = router;
