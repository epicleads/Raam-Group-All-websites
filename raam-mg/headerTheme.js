const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_KEY;

if (!supabaseUrl || !supabaseKey) {
  throw new Error('Missing Supabase environment variables. Please set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env file');
}

const supabase = createClient(supabaseUrl, supabaseKey);

// Get active theme
async function getActiveTheme() {
  const { data, error } = await supabase
    .from('mg_header_theme')
    .select('*')
    .eq('is_active', true)
    .single();

  if (error && error.code !== 'PGRST116') {
    throw error;
  }

  return data;
}

// Get all themes
async function getAllThemes() {
  const { data, error } = await supabase
    .from('mg_header_theme')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data;
}

// Get theme by ID
async function getThemeById(id) {
  const { data, error } = await supabase
    .from('mg_header_theme')
    .select('*')
    .eq('id', id)
    .single();

  if (error) throw error;
  return data;
}

// Activate a theme (deactivates all others)
async function activateTheme(id, activatedBy) {
  // First, deactivate all themes
  const { error: deactivateError } = await supabase
    .from('mg_header_theme')
    .update({ is_active: false })
    .neq('id', id);

  if (deactivateError) throw deactivateError;

  // Then activate the selected theme
  const { data, error } = await supabase
    .from('mg_header_theme')
    .update({
      is_active: true,
      activated_at: new Date().toISOString(),
      updated_by: activatedBy
    })
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return data;
}

// Create new theme
async function createTheme(themeData) {
  const { data, error } = await supabase
    .from('mg_header_theme')
    .insert([themeData])
    .select()
    .single();

  if (error) throw error;
  return data;
}

// Update theme
async function updateTheme(id, updates) {
  const { data, error } = await supabase
    .from('mg_header_theme')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return data;
}

// Delete theme
async function deleteTheme(id) {
  // Check if theme is active
  const theme = await getThemeById(id);
  if (theme.is_active) {
    throw new Error('Cannot delete active theme. Please activate another theme first.');
  }

  const { error } = await supabase
    .from('mg_header_theme')
    .delete()
    .eq('id', id);

  if (error) throw error;
  return { message: 'Theme deleted successfully' };
}

// ===== Header Config Functions =====

// Get all header configs
async function getAllHeaderConfigs() {
  const { data, error } = await supabase
    .from('mg_header_config')
    .select('*')
    .eq('is_active', true)
    .order('config_key', { ascending: true });

  if (error) throw error;
  return data;
}

// Get header config by key
async function getHeaderConfigByKey(key) {
  const { data, error } = await supabase
    .from('mg_header_config')
    .select('*')
    .eq('config_key', key)
    .eq('is_active', true)
    .single();

  if (error && error.code !== 'PGRST116') throw error;
  return data;
}

// Update header config
async function updateHeaderConfig(key, value) {
  const { data, error } = await supabase
    .from('mg_header_config')
    .update({ config_value: value })
    .eq('config_key', key)
    .select()
    .single();

  if (error) throw error;
  return data;
}

// Bulk update header configs
async function bulkUpdateHeaderConfigs(configs) {
  const updates = [];

  for (const [key, value] of Object.entries(configs)) {
    const { data, error } = await supabase
      .from('mg_header_config')
      .update({ config_value: value })
      .eq('config_key', key)
      .select()
      .single();

    if (error) {
      console.error(`Error updating ${key}:`, error);
    } else {
      updates.push(data);
    }
  }

  return updates;
}

module.exports = {
  getActiveTheme,
  getAllThemes,
  getThemeById,
  activateTheme,
  createTheme,
  updateTheme,
  deleteTheme,
  getAllHeaderConfigs,
  getHeaderConfigByKey,
  updateHeaderConfig,
  bulkUpdateHeaderConfigs,
};
