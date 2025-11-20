const express = require('express');
const { createClient } = require('@supabase/supabase-js');
const Joi = require('joi');
require('dotenv').config();

const router = express.Router();

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_KEY;

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

const sellLeadSchema = Joi.object({
  brand: Joi.string().trim().required(),
  model: Joi.string().trim().required(),
  fuel_type: Joi.string().trim().allow(null, ''),
  transmission: Joi.string().trim().allow(null, ''),
  variant: Joi.string().trim().allow(null, ''),
  rto: Joi.string().trim().allow(null, ''),
  registration_year: Joi.number().integer().min(1980).max(new Date().getFullYear() + 1).allow(null),
  ownership: Joi.string().trim().allow(null, ''),
  kms: Joi.number().integer().min(0).allow(null),
  when_to_sell: Joi.string().trim().allow(null, ''),
  city: Joi.string().trim().allow(null, ''),
  state: Joi.string().trim().allow(null, ''),
  phone: Joi.string().pattern(/^\d{10,15}$/).required(),
  whatsapp_updates: Joi.boolean().default(true),
  email: Joi.string().email().allow(null, ''),
  source: Joi.string().trim().default('sell-your-car'),
  crm_status: Joi.string().trim().default('pending'),
  crm_reference: Joi.string().trim().allow(null, ''),
  notes: Joi.string().trim().allow(null, '')
});

router.post('/reassured-sell-leads', async (req, res) => {
  try {
    const { error, value } = sellLeadSchema.validate(req.body, { stripUnknown: true });
    if (error) return res.status(400).json({ error: error.details[0].message });

    const payload = { ...value, submitted_at: new Date().toISOString() };

    const { data, error: dbError } = await supabase
      .from('reassured_sell_vehicles_sale_data')
      .insert([payload])
      .select();

    if (dbError) return res.status(500).json({ error: dbError.message });

    res.status(201).json({ message: 'Sell lead captured successfully', data });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/reassured-sell-leads', async (_req, res) => {
  try {
    const { data, error } = await supabase
      .from('reassured_sell_vehicles_sale_data')
      .select('*')
      .order('submitted_at', { ascending: false });

    if (error) return res.status(500).json({ error: error.message });

    res.json({ count: data.length, leads: data });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;


