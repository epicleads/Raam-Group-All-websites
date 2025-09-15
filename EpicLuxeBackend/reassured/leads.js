const express = require('express');
const { createClient } = require('@supabase/supabase-js');
const Joi = require('joi');
require('dotenv').config();

const router = express.Router();

// ✅ Validate environment variables early
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_KEY; // service role key




// ✅ Supabase client
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// ✅ Joi schema (only lead_type, name, phone mandatory)
const leadSchema = Joi.object({
  lead_type: Joi.string().required(),
  name: Joi.string().required(),
  phone: Joi.string().required(),
  email: Joi.string().email().allow(null, ''),
  preferred_model: Joi.string().allow(null, ''),
  location: Joi.string().allow(null, ''),
  message: Joi.string().allow(null, '')
});


// ✅ POST: Create a new lead
router.post('/reassured-leads', async (req, res) => {
  try {
    // Validate request body
    const { error, value } = leadSchema.validate(req.body);
    if (error) return res.status(400).json({ error: error.details[0].message });

    // Insert into Supabase
    const { data, error: dbError } = await supabase
      .from('reassured_leads')
      .insert([value])
      .select();

    if (dbError) return res.status(500).json({ error: dbError.message });

    res.status(201).json({ message: 'Lead created successfully', data });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ✅ GET: Fetch all leads
router.get('/reassured-leads',async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('reassured_leads')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) return res.status(500).json({ error: error.message });

    res.json({ count: data.length, leads: data });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
