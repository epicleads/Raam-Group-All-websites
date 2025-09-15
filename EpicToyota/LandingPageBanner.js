// epic-toyota-banners.js
// CommonJS, single-file Express router for Epic Toyota Landing Page banner CRUD

const express = require('express');
const { createClient } = require('@supabase/supabase-js');
const { v4: uuidv4 } = require('uuid');
const multer = require('multer');
const path = require('path');

const router = express.Router();

// ========= ENV & SUPABASE =========
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;
const SUPABASE_BUCKET_EPIC_TOYOTA_BANNER =
  process.env.SUPABASE_BUCKET_EPIC_TOYOTA_BANNER || 'campaign-banners';

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error('[EpicToyota] Missing SUPABASE_URL or SUPABASE_SERVICE_KEY');
  // Don't throw here—let server boot but endpoints will 500 with clear message
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

// ========= MULTER (in-memory) =========
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 8 * 1024 * 1024, // 8MB
  },
  fileFilter: (req, file, cb) => {
    const allowed = ['image/png', 'image/jpeg', 'image/webp'];
    if (!allowed.includes(file.mimetype)) {
      return cb(new Error('Only PNG, JPG/JPEG, or WEBP images are allowed'));
    }
    cb(null, true);
  },
});

// Multer for handling both desktop and mobile banner uploads
const uploadDualBanners = upload.fields([
  { name: 'desktop_banner', maxCount: 1 },
  { name: 'mobile_banner', maxCount: 1 }
]);

// ========= HELPERS =========
const badReq = (res, msg) => res.status(400).json({ ok: false, error: msg });
const srvErr = (res, msg, err) => {
  console.error('[EpicToyota]', msg, err);
  return res.status(500).json({ ok: false, error: msg });
};

function parseBool(v, defaultVal = undefined) {
  if (v === undefined || v === null || v === '') return defaultVal;
  if (typeof v === 'boolean') return v;
  if (typeof v === 'string') {
    if (['true', '1', 'yes'].includes(v.toLowerCase())) return true;
    if (['false', '0', 'no'].includes(v.toLowerCase())) return false;
  }
  return defaultVal;
}

function toISOorNull(v) {
  if (!v) return null;
  const d = new Date(v);
  return isNaN(d.getTime()) ? null : d.toISOString();
}

function storagePathFromPublicUrl(publicUrl) {
  // Supabase public URLs look like: https://<project>.supabase.co/storage/v1/object/public/<bucket>/<path>
  // We need "<path>" after "<bucket>/"
  try {
    const u = new URL(publicUrl);
    const parts = u.pathname.split('/'); // ['', 'storage', 'v1', 'object', 'public', '<bucket>', ...path]
    const idx = parts.indexOf('public');
    if (idx === -1) return null;
    const bucket = parts[idx + 1];
    if (bucket !== SUPABASE_BUCKET_EPIC_TOYOTA_BANNER) return null;
    const relPath = parts.slice(idx + 2).join('/');
    return relPath || null;
  } catch (_) {
    return null;
  }
}

async function uploadBannerToSupabase(file, prefix = 'banners') {
  const ext = path.extname(file.originalname || '').toLowerCase() || '.png';
  const key = `${prefix}/${uuidv4()}${ext}`;
  const { error: upErr } = await supabase.storage
    .from(SUPABASE_BUCKET_EPIC_TOYOTA_BANNER)
    .upload(key, file.buffer, {
      cacheControl: '3600',
      upsert: false,
      contentType: file.mimetype,
    });
  if (upErr) throw upErr;

  const { data } = supabase.storage
    .from(SUPABASE_BUCKET_EPIC_TOYOTA_BANNER)
    .getPublicUrl(key);

  return { key, publicUrl: data.publicUrl };
}

// Helper to upload both desktop and mobile banners
async function uploadDualBannersToSupabase(desktopFile, mobileFile) {
  const results = {};
  
  if (desktopFile) {
    results.desktop = await uploadBannerToSupabase(desktopFile, 'banners/desktop');
  }
  
  if (mobileFile) {
    results.mobile = await uploadBannerToSupabase(mobileFile, 'banners/mobile');
  }
  
  return results;
}

async function deleteBannerFromSupabase(publicUrl) {
  const rel = storagePathFromPublicUrl(publicUrl);
  if (!rel) return;
  await supabase.storage.from(SUPABASE_BUCKET_EPIC_TOYOTA_BANNER).remove([rel]);
}

async function getByIdOr404(id, res) {
  const { data, error } = await supabase
    .from('campaign_banners')
    .select('*')
    .eq('id', id)
    .maybeSingle();

  if (error) return srvErr(res, 'Database error while fetching banner', error);
  if (!data) return res.status(404).json({ ok: false, error: 'Not found' });
  return data;
}

// ========= ROUTES =========

/**
 * Create banner with desktop and mobile versions
 * POST /api/campaign-banners
 * multipart/form-data: desktop_banner (file, required), mobile_banner (file, required), cta_text (string, required), cta_link (string, required), end_date (ISO/date, required), status (boolean, optional)
 */
router.post(
  '/campaign-banners',
  uploadDualBanners,
  async (req, res) => {
    try {
      if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
        return srvErr(res, 'Supabase credentials missing from environment');
      }

      const desktopFile = req.files?.desktop_banner?.[0];
      const mobileFile = req.files?.mobile_banner?.[0];
      const { cta_text, cta_link } = req.body;
      const end_date = toISOorNull(req.body.end_date);
      const status = parseBool(req.body.status, true);

      if (!desktopFile) return badReq(res, 'desktop_banner (file) is required');
      if (!mobileFile) return badReq(res, 'mobile_banner (file) is required');
      if (!cta_text || !cta_text.trim()) return badReq(res, 'cta_text is required');
      if (!cta_link || !cta_link.trim()) return badReq(res, 'cta_link is required');
      if (!end_date) return badReq(res, 'end_date is invalid or missing');

      const now = new Date();
      const end = new Date(end_date);
      if (end < now) {
        return badReq(res, 'end_date cannot be in the past');
      }

      const uploadedBanners = await uploadDualBannersToSupabase(desktopFile, mobileFile);

      const payload = {
        banner_url: uploadedBanners.desktop?.publicUrl, // For backward compatibility
        desktop_banner_url: uploadedBanners.desktop?.publicUrl,
        mobile_banner_url: uploadedBanners.mobile?.publicUrl,
        cta_text: cta_text.trim(),
        cta_link: cta_link.trim(),
        end_date,
        status,
      };

      const { data, error } = await supabase
        .from('campaign_banners')
        .insert(payload)
        .select('*')
        .single();

      if (error) {
        // Roll back storage on DB failure
        if (uploadedBanners.desktop) await deleteBannerFromSupabase(uploadedBanners.desktop.publicUrl).catch(() => {});
        if (uploadedBanners.mobile) await deleteBannerFromSupabase(uploadedBanners.mobile.publicUrl).catch(() => {});
        return srvErr(res, 'Failed to insert banner', error);
      }

      return res.status(201).json({ ok: true, data });
    } catch (err) {
      return srvErr(res, 'Unexpected error creating banner', err);
    }
  }
);

/**
 * List banners (with filters & pagination)
 * GET /api/campaign-banners?status=true|false&expired=true|false&page=1&pageSize=10
 */
router.get('/campaign-banners', async (req, res) => {
  try {
    const status = parseBool(req.query.status, undefined);
    const expired = parseBool(req.query.expired, undefined);
    const page = Math.max(parseInt(req.query.page || '1', 10), 1);
    const pageSize = Math.min(Math.max(parseInt(req.query.pageSize || '10', 10), 1), 100);
    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;

    let query = supabase.from('campaign_banners').select('*', { count: 'exact' });

    if (status !== undefined) {
      query = query.eq('status', status);
    }

    if (expired !== undefined) {
      if (expired) {
        query = query.lt('end_date', new Date().toISOString());
      } else {
        query = query.gte('end_date', new Date().toISOString());
      }
    }

    query = query.order('created_at', { ascending: false }).range(from, to);

    const { data, error, count } = await query;
    if (error) return srvErr(res, 'Failed to list banners', error);

    return res.json({
      ok: true,
      data,
      page,
      pageSize,
      total: count ?? 0,
      totalPages: Math.ceil((count ?? 0) / pageSize),
    });
  } catch (err) {
    return srvErr(res, 'Unexpected error listing banners', err);
  }
});

/**
 * CRITICAL FIX: Get currently active banner (status=true & not expired)
 * GET /api/campaign-banners/active
 * Returns latest (by created_at) active, non-expired banner or { data: null }
 * MUST BE DEFINED BEFORE /:id ROUTE
 */
router.get('/campaign-banners/active', async (req, res) => {
  try {
    console.log('🎯 Active banner endpoint hit!');
    const nowISO = new Date().toISOString();
    console.log('⏰ Current time:', nowISO);
    
    const { data, error } = await supabase
      .from('campaign_banners')
      .select('*')
      .eq('status', true)
      .gte('end_date', nowISO)
      .order('created_at', { ascending: false })
      .limit(1);

    if (error) {
      console.error('❌ Database error:', error);
      return srvErr(res, 'Failed to fetch active banner', error);
    }

    const active = (data && data.length > 0) ? data[0] : null;
    console.log('✅ Found active banner:', active ? `ID ${active.id}` : 'None');
    
    return res.json({ ok: true, data: active });
  } catch (err) {
    console.error('💥 Unexpected error:', err);
    return srvErr(res, 'Unexpected error fetching active banner', err);
  }
});

/**
 * Get by ID
 * GET /api/campaign-banners/:id
 * MUST BE DEFINED AFTER /active ROUTE
 */
router.get('/campaign-banners/:id', async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isFinite(id)) return badReq(res, 'Invalid id');
  const row = await getByIdOr404(id, res);
  if (!row || res.headersSent) return;
  return res.json({ ok: true, data: row });
});

/**
 * Update banner (fields + optional new desktop/mobile images)
 * PUT /api/campaign-banners/:id
 * multipart/form-data: optional desktop_banner (file), mobile_banner (file), cta_text, cta_link, end_date, status
 */
router.put(
  '/campaign-banners/:id',
  uploadDualBanners,
  async (req, res) => {
    try {
      const id = Number(req.params.id);
      if (!Number.isFinite(id)) return badReq(res, 'Invalid id');

      const existing = await getByIdOr404(id, res);
      if (!existing || res.headersSent) return;

      const desktopFile = req.files?.desktop_banner?.[0];
      const mobileFile = req.files?.mobile_banner?.[0];
      const updates = {};

      if (req.body.cta_text !== undefined) {
        if (!req.body.cta_text.trim()) return badReq(res, 'cta_text cannot be empty');
        updates.cta_text = req.body.cta_text.trim();
      }

      if (req.body.cta_link !== undefined) {
        if (!req.body.cta_link.trim()) return badReq(res, 'cta_link cannot be empty');
        updates.cta_link = req.body.cta_link.trim();
      }

      if (req.body.end_date !== undefined) {
        const end_date = toISOorNull(req.body.end_date);
        if (!end_date) return badReq(res, 'end_date is invalid');
        const end = new Date(end_date);
        if (end < new Date()) return badReq(res, 'end_date cannot be in the past');
        updates.end_date = end_date;
      }

      if (req.body.status !== undefined) {
        const status = parseBool(req.body.status, null);
        if (status === null) return badReq(res, 'status must be boolean');
        updates.status = status;
      }

      let newDesktopUrl = null;
      let newMobileUrl = null;

      if (desktopFile || mobileFile) {
        const uploadedBanners = await uploadDualBannersToSupabase(desktopFile, mobileFile);
        
        if (uploadedBanners.desktop) {
          newDesktopUrl = uploadedBanners.desktop.publicUrl;
          updates.desktop_banner_url = newDesktopUrl;
          updates.banner_url = newDesktopUrl; // For backward compatibility
        }
        
        if (uploadedBanners.mobile) {
          newMobileUrl = uploadedBanners.mobile.publicUrl;
          updates.mobile_banner_url = newMobileUrl;
        }
      }

      if (Object.keys(updates).length === 0) {
        return badReq(res, 'No fields to update');
      }

      const { data, error } = await supabase
        .from('campaign_banners')
        .update(updates)
        .eq('id', id)
        .select('*')
        .single();

      if (error) {
        // roll back newly uploaded images if DB update failed
        if (newDesktopUrl) await deleteBannerFromSupabase(newDesktopUrl).catch(() => {});
        if (newMobileUrl) await deleteBannerFromSupabase(newMobileUrl).catch(() => {});
        return srvErr(res, 'Failed to update banner', error);
      }

      // If banner images replaced successfully, delete old images
      if (desktopFile && existing.desktop_banner_url && existing.desktop_banner_url !== newDesktopUrl) {
        await deleteBannerFromSupabase(existing.desktop_banner_url).catch(() => {});
      }
      if (mobileFile && existing.mobile_banner_url && existing.mobile_banner_url !== newMobileUrl) {
        await deleteBannerFromSupabase(existing.mobile_banner_url).catch(() => {});
      }

      return res.json({ ok: true, data });
    } catch (err) {
      return srvErr(res, 'Unexpected error updating banner', err);
    }
  }
);

/**
 * Toggle or set status
 * PATCH /api/campaign-banners/:id/status
 * body: { status: true|false }
 */
router.patch('/campaign-banners/:id/status', express.json(), async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isFinite(id)) return badReq(res, 'Invalid id');

    const status = parseBool(req.body.status, null);
    if (status === null) return badReq(res, 'status must be boolean');

    const { data, error } = await supabase
      .from('campaign_banners')
      .update({ status })
      .eq('id', id)
      .select('*')
      .single();

    if (error) return srvErr(res, 'Failed to update status', error);
    return res.json({ ok: true, data });
  } catch (err) {
    return srvErr(res, 'Unexpected error updating status', err);
  }
});

/**
 * Delete banner
 * DELETE /api/campaign-banners/:id
 */
router.delete('/campaign-banners/:id', async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isFinite(id)) return badReq(res, 'Invalid id');

    // Fetch first to get URLs for storage removal
    const existing = await getByIdOr404(id, res);
    if (!existing || res.headersSent) return;

    const { error } = await supabase.from('campaign_banners').delete().eq('id', id);
    if (error) return srvErr(res, 'Failed to delete banner', error);

    // Delete both desktop and mobile banner images from storage
    if (existing.desktop_banner_url) {
      await deleteBannerFromSupabase(existing.desktop_banner_url).catch(() => {});
    }
    if (existing.mobile_banner_url) {
      await deleteBannerFromSupabase(existing.mobile_banner_url).catch(() => {});
    }
    
    // Legacy support: delete old single banner_url if it exists
    if (existing.banner_url) {
      await deleteBannerFromSupabase(existing.banner_url).catch(() => {});
    }

    return res.json({ ok: true, data: { id, deleted: true } });
  } catch (err) {
    return srvErr(res, 'Unexpected error deleting banner', err);
  }
});

/**
 * Auto-expire endpoint (optional, if you want a cron to flip status=false after expiry)
 * POST /api/campaign-banners/expire-past
 * Flips status=false where end_date < now AND status=true
 */
router.post('/campaign-banners/expire-past', async (req, res) => {
  try {
    const nowISO = new Date().toISOString();
    const { data, error } = await supabase
      .from('campaign_banners')
      .update({ status: false })
      .lt('end_date', nowISO)
      .eq('status', true)
      .select('id');

    if (error) return srvErr(res, 'Failed to expire past banners', error);
    return res.json({ ok: true, data, message: `Expired ${data?.length || 0} banners` });
  } catch (err) {
    return srvErr(res, 'Unexpected error expiring banners', err);
  }
});

module.exports = router;