require('dotenv').config();
const express = require('express');
const multer = require('multer');
const { createClient } = require('@supabase/supabase-js');
const { v4: uuidv4 } = require('uuid');
const fs = require('fs');

const router = express.Router();

// Multer setup: accept optional desktop and mobile creatives
const upload = multer({ dest: 'uploads/' });
const uploadFields = upload.fields([
  { name: 'desktop', maxCount: 1 },
  { name: 'mobile', maxCount: 1 },
]);

// Supabase client
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

const BUCKET = process.env.SUPABASE_BUCKET_ATHER_CAMPAIGN || 'ather-hero-sliders';
const TABLE = 'ather-hero-slider';

function parseBool(value, fallback = false) {
  if (value === undefined || value === null) return fallback;
  if (typeof value === 'boolean') return value;
  const s = String(value).toLowerCase();
  return s === 'true' || s === '1' || s === 'yes';
}

function parseDate(value) {
  if (!value) return null;
  const d = new Date(value);
  return isNaN(d.getTime()) ? null : d.toISOString();
}

async function uploadToBucket(file, keyParts = []) {
  if (!file) return null;
  const ext = file.originalname.split('.').pop();
  const fileName = `${uuidv4()}.${ext}`;
  const path = [...keyParts, fileName].join('/');
  const fileBuffer = fs.readFileSync(file.path);
  const { error: uploadError } = await supabase.storage
    .from(BUCKET)
    .upload(path, fileBuffer, { contentType: file.mimetype, upsert: true });
  fs.unlinkSync(file.path);
  if (uploadError) throw uploadError;
  const { data: publicUrlData } = supabase.storage.from(BUCKET).getPublicUrl(path);
  return publicUrlData.publicUrl;
}

// ---------------- CREATE HERO SLIDE ----------------
router.post('/hero-slides/create', uploadFields, async (req, res) => {
  try {
    const {
      cta_text,
      cta_link,
      order_index,
      is_visible,
      active_from,
      active_until,
      scope = 'homepage',
      is_default,
    } = req.body;

    if (!cta_text) return res.status(400).json({ error: 'cta_text is required' });
    if (!req.files || !req.files.desktop) return res.status(400).json({ error: 'desktop creative is required' });

    const desktopFile = req.files.desktop?.[0] || null;
    const mobileFile = req.files.mobile?.[0] || null;

    const folderKey = ['hero', scope, uuidv4()];
    const desktopUrl = await uploadToBucket(desktopFile, [...folderKey, 'desktop']);
    const mobileUrl = mobileFile ? await uploadToBucket(mobileFile, [...folderKey, 'mobile']) : null;

    const payload = {
      desktop_src: desktopUrl,
      mobile_src: mobileUrl,
      cta_text,
      cta_link: cta_link || null,
      order_index: Number.isFinite(Number(order_index)) ? Number(order_index) : 0,
      is_visible: parseBool(is_visible, true),
      active_from: parseDate(active_from),
      active_until: parseDate(active_until),
      scope,
      is_default: parseBool(is_default, false),
    };

    const { data, error } = await supabase
      .from(TABLE)
      .insert([payload])
      .select();
    if (error) throw error;
    res.json({ success: true, slide: data[0] });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// ---------------- GET ALL HERO SLIDES (admin) ----------------
router.get('/hero-slides/all', async (req, res) => {
  try {
    const { scope, include_inactive } = req.query;
    let query = supabase.from(TABLE).select('*');
    if (scope) query = query.eq('scope', scope);
    if (!parseBool(include_inactive, false)) query = query.eq('is_visible', true);
    query = query.order('order_index', { ascending: true }).order('created_at', { ascending: false });
    const { data, error } = await query;
    if (error) throw error;
    res.json({ slides: data });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ---------------- PUBLIC FEED (active for scope, fallback default) ----------------
router.get('/hero-slides/public', async (req, res) => {
  try {
    const { scope = 'homepage' } = req.query;
    console.log('[HeroSlides] Public feed requested', { scope });
    const nowIso = new Date().toISOString();

    // Try active offers first
    let { data: active, error: errActive } = await supabase
      .from(TABLE)
      .select('*')
      .eq('scope', scope)
      .eq('is_visible', true)
      .or(`active_until.is.null,active_until.gte.${nowIso}`)
      .order('order_index', { ascending: true });
    if (errActive) throw errActive;

    console.log('[HeroSlides] Active query result', {
      scope,
      count: active?.length || 0,
    });

    if (active && active.length > 0) {
      return res.json({ scope, slides: active });
    }

    // Fallback to default per scope
    const { data: fallback, error: errFallback } = await supabase
      .from(TABLE)
      .select('*')
      .eq('scope', scope)
      .eq('is_default', true)
      .eq('is_visible', true)
      .order('order_index', { ascending: true });
    if (errFallback) throw errFallback;

    console.log('[HeroSlides] Fallback query result', {
      scope,
      count: fallback?.length || 0,
    });

    res.json({ scope, slides: fallback || [] });
  } catch (err) {
    console.error('[HeroSlides] Public feed error', {
      scope: req.query?.scope,
      message: err?.message,
    });
    res.status(500).json({ error: err.message });
  }
});

// ---------------- GET SINGLE SLIDE ----------------
router.get('/hero-slides/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { data, error } = await supabase.from(TABLE).select('*').eq('id', id).single();
    if (error) throw error;
    res.json({ slide: data });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ---------------- UPDATE SLIDE ----------------
router.put('/hero-slides/update/:id', uploadFields, async (req, res) => {
  try {
    const { id } = req.params;
    const {
      cta_text,
      cta_link,
      order_index,
      is_visible,
      active_from,
      active_until,
      scope,
      is_default,
    } = req.body;

    const desktopFile = req.files?.desktop?.[0] || null;
    const mobileFile = req.files?.mobile?.[0] || null;

    const updates = {};
    if (cta_text !== undefined) updates.cta_text = cta_text;
    if (cta_link !== undefined) updates.cta_link = cta_link;
    if (order_index !== undefined) updates.order_index = Number(order_index);
    if (is_visible !== undefined) updates.is_visible = parseBool(is_visible);
    if (active_from !== undefined) updates.active_from = parseDate(active_from);
    if (active_until !== undefined) updates.active_until = parseDate(active_until);
    if (scope !== undefined) updates.scope = scope;
    if (is_default !== undefined) updates.is_default = parseBool(is_default);

    // Upload replacements if provided
    if (desktopFile) {
      const desktopUrl = await uploadToBucket(desktopFile, ['hero', updates.scope || 'homepage', id, 'desktop']);
      updates.desktop_src = desktopUrl;
    }
    if (mobileFile) {
      const mobileUrl = await uploadToBucket(mobileFile, ['hero', updates.scope || 'homepage', id, 'mobile']);
      updates.mobile_src = mobileUrl;
    }

    const { data, error } = await supabase
      .from(TABLE)
      .update(updates)
      .eq('id', id)
      .select();
    if (error) throw error;
    res.json({ success: true, slide: data[0] });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ---------------- REORDER (batch) ----------------
router.patch('/hero-slides/reorder', async (req, res) => {
  try {
    const { items } = req.body; // [{id, order_index}, ...]
    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: 'items array is required' });
    }
    const updates = await Promise.all(items.map(async (item) => {
      const { data, error } = await supabase
        .from(TABLE)
        .update({ order_index: Number(item.order_index) })
        .eq('id', item.id)
        .select();
      if (error) throw error;
      return data[0];
    }));
    res.json({ success: true, slides: updates });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ---------------- DELETE SLIDE ----------------
router.delete('/hero-slides/delete/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { error } = await supabase.from(TABLE).delete().eq('id', id);
    if (error) throw error;
    res.json({ success: true, message: 'Slide deleted' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
