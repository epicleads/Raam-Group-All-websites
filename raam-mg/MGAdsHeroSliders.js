// backend/MG_ads_hero_sliders.js
const { createClient } = require('@supabase/supabase-js');
const path = require('path');
const fs = require('fs');

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;
const BUCKET_NAME = process.env.SUPABASE_BUCKET_MG_ADS_BANNERS || 'mg_ads_banners';

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

// ✅ Upload image to mg_ads_banners bucket
async function uploadImage(filePath, folder = 'mg_ads_hero_sliders') {
  const fileName = path.basename(filePath);
  const fileBuffer = fs.readFileSync(filePath);
  const fileExt = path.extname(fileName);

  const uniqueName = `${Date.now()}-${Math.random().toString(36).substring(7)}${fileExt}`;
  const filePathInBucket = `${folder}/${uniqueName}`;

  const { error: uploadError } = await supabase.storage
    .from(BUCKET_NAME)
    .upload(filePathInBucket, fileBuffer, {
      cacheControl: '3600',
      upsert: false,
      contentType: getMimeType(fileExt),
    });

  if (uploadError) {
    throw new Error(`Image upload failed: ${uploadError.message}`);
  }

  const { data: publicUrlData } = supabase.storage
    .from(BUCKET_NAME)
    .getPublicUrl(filePathInBucket);

  return publicUrlData.publicUrl;
}

// ✅ Helper function for MIME types
function getMimeType(ext) {
  switch (ext.toLowerCase()) {
    case '.jpg':
    case '.jpeg':
      return 'image/jpeg';
    case '.png':
      return 'image/png';
    case '.webp':
      return 'image/webp';
    default:
      return 'application/octet-stream';
  }
}

// ✅ CRUD OPERATIONS

// Create new hero slider
async function createHeroSlider(payload) {
  console.log('🔧 Attempting to create hero slider with payload:', payload);
  
  // Check environment variables
  if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
    throw new Error('Missing Supabase environment variables: SUPABASE_URL or SUPABASE_SERVICE_KEY');
  }
  
  console.log('🔗 Supabase URL:', SUPABASE_URL ? 'Set' : 'Not set');
  console.log('🔑 Service Key:', SUPABASE_SERVICE_KEY ? 'Set' : 'Not set');
  console.log('🪣 Bucket Name:', BUCKET_NAME);

  const { data, error } = await supabase
    .from('mg_ads_hero_sliders')
    .insert([payload])
    .select();

  if (error) {
    console.error('❌ Supabase insert error:', error);
    console.error('❌ Error details:', {
      message: error.message,
      details: error.details,
      hint: error.hint,
      code: error.code
    });
    throw new Error(`Database error: ${error.message} (Code: ${error.code})`);
  }
  
  console.log('✅ Successfully created hero slider:', data[0]);
  return data[0];
}

// Get all hero sliders (active + sorted)
async function getHeroSliders(includeInactive = false) {
  let query = supabase
    .from('mg_ads_hero_sliders')
    .select('*')
    .order('order_index', { ascending: true });

  if (!includeInactive) {
    query = query.eq('is_active', true);
  }

  const { data, error } = await query;
  if (error) throw new Error(error.message);
  return data;
}

// Get hero slider by ID
async function getHeroSliderById(id) {
  const { data, error } = await supabase
    .from('mg_ads_hero_sliders')
    .select('*')
    .eq('id', id)
    .single();

  if (error) throw new Error(error.message);
  return data;
}

// Update hero slider
async function updateHeroSlider(id, updates) {
  const { data, error } = await supabase
    .from('mg_ads_hero_sliders')
    .update(updates)
    .eq('id', id)
    .select();

  if (error) throw new Error(error.message);
  return data[0];
}

// Delete hero slider
async function deleteHeroSlider(id) {
  const { error } = await supabase
    .from('mg_ads_hero_sliders')
    .delete()
    .eq('id', id);

  if (error) throw new Error(error.message);
  return { success: true };
}

module.exports = {
  uploadImage,
  createHeroSlider,
  getHeroSliders,
  getHeroSliderById,
  updateHeroSlider,
  deleteHeroSlider,
};
