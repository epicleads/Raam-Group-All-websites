// backend/routes/honda_leads.js
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
 * @route   POST /admin/raam-honda/leads
 * @desc    Create a new Honda lead (Test Drive OR General Enquiry)
 * @body    { name, phone_number, preferred_model?, location?, service_type?, lead_source_page, enquiry_type?, message? }
 */
router.post('/', async (req, res) => {
  try {
    const { 
      name, 
      phone_number, 
      preferred_model, 
      location, 
      service_type, 
      lead_source_page,
      enquiry_type,
      message
    } = req.body;

    // Basic validation - Only name and phone_number are mandatory
    if (!name || !phone_number) {
      return res.status(400).json({ 
        error: 'Missing required fields: name and phone_number are mandatory' 
      });
    }

    // Validate phone number format (Indian 10-digit mobile)
    const phoneRegex = /^[6-9]\d{9}$/;
    const cleanPhone = phone_number.replace(/\D/g, ''); // Remove non-digits
    
    if (!phoneRegex.test(cleanPhone)) {
      return res.status(400).json({ 
        error: 'Invalid phone number. Please enter a valid 10-digit Indian mobile number' 
      });
    }

    // Insert into Supabase honda_leads table
    const { data, error } = await supabase
      .from('honda_leads')
      .insert([
        {
          name: name.trim(),
          phone_number: cleanPhone,
          preferred_model: preferred_model || null,
          location: location || null,
          service_type: service_type || 'general_enquiry', // Default to general_enquiry
          lead_source_page: lead_source_page || 'unknown',
          enquiry_type: enquiry_type || null,
          message: message || null
        }
      ])
      .select()
      .single();

    if (error) {
      console.error('❌ Supabase insert error:', error.message);
      return res.status(500).json({ error: 'Failed to create lead', details: error.message });
    }

    console.log('✅ Honda lead created successfully:', data.id);
    return res.status(201).json({ success: true, lead: data });

  } catch (err) {
    console.error('❌ Server error:', err.message);
    return res.status(500).json({ error: 'Internal server error', details: err.message });
  }
});

/**
 * @route   GET /admin/raam-honda/leads
 * @desc    Get all Honda leads (optional filters)
 * @query   ?source=homepage&service_type=test_drive&limit=50
 */
router.get('/', async (req, res) => {
  try {
    const { source, service_type, enquiry_type, limit } = req.query;

    let query = supabase
      .from('honda_leads')
      .select('*')
      .order('created_at', { ascending: false });

    // Apply filters if provided
    if (source) {
      query = query.eq('lead_source_page', source);
    }

    if (service_type) {
      query = query.eq('service_type', service_type);
    }

    if (enquiry_type) {
      query = query.eq('enquiry_type', enquiry_type);
    }

    if (limit) {
      query = query.limit(parseInt(limit));
    }

    const { data, error } = await query;

    if (error) {
      console.error('❌ Supabase fetch error:', error.message);
      return res.status(500).json({ error: 'Failed to fetch leads' });
    }

    return res.json({ 
      success: true, 
      leads: data,
      count: data.length 
    });

  } catch (err) {
    console.error('❌ Server error:', err.message);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * @route   GET /admin/raam-honda/leads/stats
 * @desc    Get lead statistics
 */
router.get('/stats', async (req, res) => {
  try {
    // Get total leads count
    const { count: totalCount, error: countError } = await supabase
      .from('honda_leads')
      .select('*', { count: 'exact', head: true });

    if (countError) {
      throw countError;
    }

    // Get leads by service type
    const { data: serviceTypeData, error: serviceError } = await supabase
      .from('honda_leads')
      .select('service_type')
      .order('created_at', { ascending: false });

    if (serviceError) {
      throw serviceError;
    }

    // Count by service type
    const serviceTypeCounts = serviceTypeData.reduce((acc, lead) => {
      acc[lead.service_type] = (acc[lead.service_type] || 0) + 1;
      return acc;
    }, {});

    // Get leads from last 30 days
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const { count: last30DaysCount, error: recentError } = await supabase
      .from('honda_leads')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', thirtyDaysAgo.toISOString());

    if (recentError) {
      throw recentError;
    }

    return res.json({
      success: true,
      stats: {
        total_leads: totalCount,
        last_30_days: last30DaysCount,
        by_service_type: serviceTypeCounts
      }
    });

  } catch (err) {
    console.error('❌ Stats error:', err.message);
    return res.status(500).json({ error: 'Failed to fetch stats' });
  }
});

/**
 * @route   DELETE /admin/raam-honda/leads/:id
 * @desc    Delete a specific lead (admin only)
 */
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const { error } = await supabase
      .from('honda_leads')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('❌ Delete error:', error.message);
      return res.status(500).json({ error: 'Failed to delete lead' });
    }

    console.log('✅ Lead deleted:', id);
    return res.json({ success: true, message: 'Lead deleted successfully' });

  } catch (err) {
    console.error('❌ Server error:', err.message);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;

