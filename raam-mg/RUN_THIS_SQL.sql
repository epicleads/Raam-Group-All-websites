-- ===============================================
-- PREMIUM THEME SYSTEM - CLEAN INSTALLATION
-- Run this in Supabase SQL Editor
-- ===============================================

-- Step 1: Clean up old tables (safe to run multiple times)
DROP TABLE IF EXISTS mg_header_theme CASCADE;
DROP TABLE IF EXISTS mg_header_config CASCADE;
DROP VIEW IF EXISTS mg_active_header_theme CASCADE;
DROP VIEW IF EXISTS mg_active_header_configs CASCADE;
DROP FUNCTION IF EXISTS update_mg_header_theme_updated_at() CASCADE;

-- Step 2: Create fresh mg_header_theme table
CREATE TABLE mg_header_theme (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  theme_name VARCHAR(50) NOT NULL UNIQUE,
  theme_display_name VARCHAR(100) NOT NULL,
  is_active BOOLEAN DEFAULT false,

  -- Colors
  primary_color VARCHAR(7) NOT NULL,
  secondary_color VARCHAR(7) NOT NULL,
  accent_color VARCHAR(7) NOT NULL,
  text_color VARCHAR(7) NOT NULL,
  text_light_color VARCHAR(7) NOT NULL,
  glow_color VARCHAR(50) NOT NULL,

  -- Gradients
  header_light_gradient TEXT,
  header_dark_gradient TEXT,
  accent_gradient TEXT,

  -- Effects
  effects_intensity VARCHAR(10) DEFAULT 'medium',
  show_effects BOOLEAN DEFAULT false,
  effect_type VARCHAR(50),
  show_particles BOOLEAN DEFAULT false,
  show_snow BOOLEAN DEFAULT false,
  show_fireworks BOOLEAN DEFAULT false,

  -- Banner
  show_banner BOOLEAN DEFAULT false,
  banner_text_desktop VARCHAR(500),
  banner_text_mobile VARCHAR(200),
  banner_gradient TEXT,
  banner_emoji_start VARCHAR(10),
  banner_emoji_end VARCHAR(10),
  banner_animation_speed VARCHAR(20) DEFAULT 'medium',

  -- Metadata
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  activated_at TIMESTAMP WITH TIME ZONE,
  created_by VARCHAR(100),
  updated_by VARCHAR(100),
  description TEXT
);

-- Step 3: Create indexes
CREATE INDEX idx_mg_header_theme_active ON mg_header_theme(is_active) WHERE is_active = true;
CREATE INDEX idx_mg_header_theme_name ON mg_header_theme(theme_name);

-- Step 4: Create update trigger
CREATE OR REPLACE FUNCTION update_mg_header_theme_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER mg_header_theme_updated_at
BEFORE UPDATE ON mg_header_theme
FOR EACH ROW
EXECUTE FUNCTION update_mg_header_theme_updated_at();

-- Step 5: Insert all 5 premium themes
INSERT INTO mg_header_theme (
  theme_name, theme_display_name, is_active,
  primary_color, secondary_color, accent_color, text_color, text_light_color, glow_color,
  header_light_gradient, header_dark_gradient, accent_gradient,
  effects_intensity, show_effects, effect_type,
  show_banner, banner_text_desktop, banner_text_mobile, banner_gradient,
  banner_emoji_start, banner_emoji_end, banner_animation_speed, description
) VALUES

-- DEFAULT THEME (Active by default)
(
  'default', 'Default MG Theme', true,
  '#DA291C', '#8B0000', '#FF4500', '#1a1a1a', '#ffffff', 'rgba(218, 41, 28, 0.2)',
  'linear-gradient(135deg, rgba(255,255,255,0.97) 0%, rgba(248,248,248,0.95) 100%)',
  'linear-gradient(135deg, rgba(0,0,0,0.95) 0%, rgba(26,26,26,0.92) 100%)',
  'linear-gradient(135deg, #DA291C 0%, #8B0000 50%, #FF4500 100%)',
  'medium', false, 'none',
  false, NULL, NULL, NULL, NULL, NULL, 'medium',
  'Classic MG brand theme with signature red colors'
),

-- DIWALI THEME
(
  'diwali', 'Diwali Festival Theme', false,
  '#FF9900', '#FFD700', '#FF6600', '#1a1a1a', '#ffffff', 'rgba(255, 153, 0, 0.3)',
  'linear-gradient(135deg, rgba(255,248,220,0.97) 0%, rgba(255,239,213,0.95) 100%)',
  'linear-gradient(135deg, rgba(51,25,0,0.95) 0%, rgba(102,51,0,0.92) 100%)',
  'linear-gradient(135deg, #FF9900 0%, #FFD700 50%, #FF6600 100%)',
  'high', true, 'fireworks',
  true,
  '🎆 Happy Diwali! Special Festive Offers Available - Light Up Your Drive! 🪔',
  '🎆 Happy Diwali! Special Offers 🪔',
  'linear-gradient(90deg, #FF9900 0%, #FFD700 25%, #FF6600 50%, #FFD700 75%, #FF9900 100%)',
  '🎆', '🪔', 'slow',
  'Festive Diwali theme with golden colors and fireworks animation'
),

-- CHRISTMAS THEME
(
  'christmas-newyear', 'Christmas & New Year Theme', false,
  '#0ea5e9', '#60a5fa', '#bfdbfe', '#1a1a1a', '#ffffff', 'rgba(14, 165, 233, 0.2)',
  'linear-gradient(135deg, rgba(240,249,255,0.97) 0%, rgba(224,242,254,0.95) 100%)',
  'linear-gradient(135deg, rgba(12,74,110,0.95) 0%, rgba(7,89,133,0.92) 100%)',
  'linear-gradient(135deg, #0ea5e9 0%, #60a5fa 50%, #bfdbfe 100%)',
  'high', true, 'snow',
  true,
  '❄️ Happy Holidays! Exclusive Winter Offers - Drive Into The New Year! ☃️',
  '❄️ Happy Holidays! Winter Offers ☃️',
  'linear-gradient(90deg, #0ea5e9 0%, #60a5fa 25%, #bfdbfe 50%, #60a5fa 75%, #0ea5e9 100%)',
  '❄️', '☃️', 'medium',
  'Winter wonderland theme with falling snow animation'
),

-- SUMMER THEME
(
  'summer', 'Summer Heat Theme', false,
  '#FF6B35', '#F7931E', '#FDC830', '#1a1a1a', '#ffffff', 'rgba(255, 107, 53, 0.2)',
  'linear-gradient(135deg, rgba(255,250,240,0.97) 0%, rgba(255,245,230,0.95) 100%)',
  'linear-gradient(135deg, rgba(102,51,0,0.95) 0%, rgba(77,38,0,0.92) 100%)',
  'linear-gradient(135deg, #FF6B35 0%, #F7931E 50%, #FDC830 100%)',
  'medium', true, 'shimmer',
  true,
  '☀️ Summer Sale! Beat the Heat with Cool Deals - Drive in Style This Summer! 🌴',
  '☀️ Summer Sale! Cool Deals 🌴',
  'linear-gradient(90deg, #FF6B35 0%, #F7931E 25%, #FDC830 50%, #F7931E 75%, #FF6B35 100%)',
  '☀️', '🌴', 'fast',
  'Vibrant summer theme with sun rays and heat shimmer effect'
),

-- MONSOON THEME
(
  'monsoon', 'Monsoon Refresh Theme', false,
  '#4A90E2', '#50C878', '#87CEEB', '#1a1a1a', '#ffffff', 'rgba(74, 144, 226, 0.2)',
  'linear-gradient(135deg, rgba(240,248,255,0.97) 0%, rgba(230,244,255,0.95) 100%)',
  'linear-gradient(135deg, rgba(25,50,75,0.95) 0%, rgba(30,60,90,0.92) 100%)',
  'linear-gradient(135deg, #4A90E2 0%, #50C878 50%, #87CEEB 100%)',
  'medium', true, 'rain',
  true,
  '🌧️ Monsoon Specials! Rainy Day Offers Available - Splash Into Savings! 💧',
  '🌧️ Monsoon Specials! 💧',
  'linear-gradient(90deg, #4A90E2 0%, #50C878 25%, #87CEEB 50%, #50C878 75%, #4A90E2 100%)',
  '🌧️', '💧', 'medium',
  'Refreshing monsoon theme with animated rain drops'
);

-- Step 6: Create header config table
CREATE TABLE mg_header_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  config_key VARCHAR(100) UNIQUE NOT NULL,
  config_value TEXT,
  config_type VARCHAR(20) DEFAULT 'string',
  description TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_mg_header_config_key ON mg_header_config(config_key);

-- Step 7: Insert default configs
INSERT INTO mg_header_config (config_key, config_value, config_type, description) VALUES
('logo_url', '/assets/raam-mg-logo.png', 'string', 'Header logo URL'),
('logo_width', '90', 'number', 'Logo width in pixels'),
('logo_height', '85', 'number', 'Logo height in pixels'),
('show_test_drive_button', 'true', 'boolean', 'Show/hide test drive button'),
('test_drive_button_text', 'Book Test Drive', 'string', 'Test drive button text'),
('show_search', 'true', 'boolean', 'Show/hide search icon'),
('header_sticky', 'true', 'boolean', 'Enable sticky header'),
('header_hide_on_scroll', 'true', 'boolean', 'Hide header on scroll down'),
('phone_number', '+91-9999999999', 'string', 'Contact phone number');

-- Step 8: Create views
CREATE OR REPLACE VIEW mg_active_header_theme AS
SELECT * FROM mg_header_theme WHERE is_active = true LIMIT 1;

CREATE OR REPLACE VIEW mg_active_header_configs AS
SELECT * FROM mg_header_config WHERE is_active = true;

-- Step 9: Verify installation
SELECT
  theme_name,
  theme_display_name,
  is_active,
  effect_type,
  show_banner,
  CASE
    WHEN is_active THEN '✅ ACTIVE'
    ELSE '⚪ Inactive'
  END as status
FROM mg_header_theme
ORDER BY
  is_active DESC,
  theme_name;

-- ===============================================
-- ✅ INSTALLATION COMPLETE!
-- You should see 5 themes with "default" marked as ACTIVE
-- ===============================================
