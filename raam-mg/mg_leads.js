// backend/routes/leads.js
const express = require('express');
const { createClient } = require('@supabase/supabase-js');

require('dotenv').config();

const router = express.Router();

// ✅ Env validation
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY) {
  throw new Error("❌ Missing Supabase environment variables");
}

// ✅ Supabase client (Service role)
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

/**
 * @route   POST /api/leads
 * @desc    Create a new lead
 * @body    { name, phone_number, preferred_model?, location?, service_type?, lead_source_page }
 */
router.post('/', async (req, res) => {
  try {
    const { name, phone_number, preferred_model, location, service_type, lead_source_page } = req.body;

    // Basic validation
    if (!name || !phone_number || !lead_source_page) {
      return res.status(400).json({ error: 'Missing required fields: name, phone_number, lead_source_page' });
    }

    // Insert into Supabase
    const { data, error } = await supabase
      .from('mg_leads')
      .insert([
        {
          name,
          phone_number,
          preferred_model,
          location,
          service_type,
          lead_source_page
        }
      ])
      .select()
      .single();

    if (error) {
      console.error('❌ Supabase insert error:', error.message);
      return res.status(500).json({ error: 'Failed to create lead' });
    }

    return res.status(201).json({ success: true, lead: data });

  } catch (err) {
    console.error('❌ Server error:', err.message);
    return res.status(500).json({ error: 'Internal server error' });
  }
});


/**
 * @route   GET /api/leads
 * @desc    Get all leads (optional filter by lead_source_page)
 * @query   ?source=homepage
 */
router.get('/', async (req, res) => {
  try {
    const { source } = req.query;

    let query = supabase.from('mg_leads').select('*').order('created_at', { ascending: false });

    if (source) {
      query = query.eq('lead_source_page', source);
    }

    const { data, error } = await query;

    if (error) {
      console.error('❌ Supabase fetch error:', error.message);
      return res.status(500).json({ error: 'Failed to fetch leads' });
    }

    return res.json({ success: true, leads: data });

  } catch (err) {
    console.error('❌ Server error:', err.message);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
