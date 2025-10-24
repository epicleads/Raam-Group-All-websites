-- ===============================================
-- MG Header Theme Management - Supabase Schema
-- ===============================================

-- Create mg_header_theme table
CREATE TABLE IF NOT EXISTS mg_header_theme (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  theme_name VARCHAR(50) NOT NULL, -- 'default', 'diwali', 'christmas-newyear', 'summer', 'monsoon'
  is_active BOOLEAN DEFAULT false,

  -- Theme Colors
  primary_color VARCHAR(7) NOT NULL, -- Hex color
  secondary_color VARCHAR(7) NOT NULL,
  accent_color VARCHAR(7) NOT NULL,
  text_color VARCHAR(7) NOT NULL,
  text_light_color VARCHAR(7) NOT NULL,
  glow_color VARCHAR(50) NOT NULL, -- rgba format

  -- Theme Gradients (stored as CSS gradient strings)
  header_light_gradient TEXT,
  header_dark_gradient TEXT,
  accent_gradient TEXT,

  -- Effects
  effects_intensity VARCHAR(10) DEFAULT 'medium', -- 'low', 'medium', 'high'
  show_particles BOOLEAN DEFAULT true,
  show_snow BOOLEAN DEFAULT false,
  show_fireworks BOOLEAN DEFAULT false,

  -- Banner Configuration
  show_banner BOOLEAN DEFAULT false,
  banner_text VARCHAR(255),
  banner_gradient TEXT,

  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  activated_at TIMESTAMP WITH TIME ZONE,

  -- Metadata
  created_by VARCHAR(100),
  updated_by VARCHAR(100)
);

-- Create index for active theme lookup (most common query)
CREATE INDEX idx_mg_header_theme_active ON mg_header_theme(is_active) WHERE is_active = true;

-- Create index for theme name
CREATE INDEX idx_mg_header_theme_name ON mg_header_theme(theme_name);

-- Create updated_at trigger
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

-- Insert default themes
INSERT INTO mg_header_theme (
  theme_name, is_active,
  primary_color, secondary_color, accent_color, text_color, text_light_color, glow_color,
  header_light_gradient, header_dark_gradient, accent_gradient,
  effects_intensity, show_particles, show_snow, show_fireworks,
  show_banner, banner_text
) VALUES
-- Default Theme
(
  'default', true,
  '#DA291C', '#8B0000', '#FF4500', '#1a1a1a', '#ffffff', 'rgba(218, 41, 28, 0.2)',
  'linear-gradient(135deg, rgba(255,255,255,0.97) 0%, rgba(248,248,248,0.95) 100%)',
  'linear-gradient(135deg, rgba(0,0,0,0.95) 0%, rgba(26,26,26,0.92) 100%)',
  'linear-gradient(135deg, #DA291C 0%, #8B0000 50%, #FF4500 100%)',
  'medium', false, false, false,
  false, NULL
),
-- Diwali Theme
(
  'diwali', false,
  '#FF9900', '#FFD700', '#FF6600', '#1a1a1a', '#ffffff', 'rgba(255, 153, 0, 0.3)',
  'linear-gradient(135deg, rgba(255,248,220,0.97) 0%, rgba(255,239,213,0.95) 100%)',
  'linear-gradient(135deg, rgba(51,25,0,0.95) 0%, rgba(102,51,0,0.92) 100%)',
  'linear-gradient(135deg, #FF9900 0%, #FFD700 50%, #FF6600 100%)',
  'high', true, false, true,
  true, '🎆 Happy Diwali! Special Festive Offers Available 🪔'
),
-- Christmas/New Year Theme
(
  'christmas-newyear', false,
  '#0ea5e9', '#60a5fa', '#bfdbfe', '#1a1a1a', '#ffffff', 'rgba(14, 165, 233, 0.2)',
  'linear-gradient(135deg, rgba(240,249,255,0.97) 0%, rgba(224,242,254,0.95) 100%)',
  'linear-gradient(135deg, rgba(12,74,110,0.95) 0%, rgba(7,89,133,0.92) 100%)',
  'linear-gradient(135deg, #0ea5e9 0%, #60a5fa 50%, #bfdbfe 100%)',
  'high', false, true, false,
  true, '❄️ Happy Holidays! Exclusive Winter Offers ❄️'
),
-- Summer Theme
(
  'summer', false,
  '#FF6B35', '#F7931E', '#FDC830', '#1a1a1a', '#ffffff', 'rgba(255, 107, 53, 0.2)',
  'linear-gradient(135deg, rgba(255,250,240,0.97) 0%, rgba(255,245,230,0.95) 100%)',
  'linear-gradient(135deg, rgba(102,51,0,0.95) 0%, rgba(77,38,0,0.92) 100%)',
  'linear-gradient(135deg, #FF6B35 0%, #F7931E 50%, #FDC830 100%)',
  'medium', true, false, false,
  true, '☀️ Summer Sale! Beat the Heat with Cool Deals 🌴'
),
-- Monsoon Theme
(
  'monsoon', false,
  '#4A90E2', '#50C878', '#87CEEB', '#1a1a1a', '#ffffff', 'rgba(74, 144, 226, 0.2)',
  'linear-gradient(135deg, rgba(240,248,255,0.97) 0%, rgba(230,244,255,0.95) 100%)',
  'linear-gradient(135deg, rgba(25,50,75,0.95) 0%, rgba(30,60,90,0.92) 100%)',
  'linear-gradient(135deg, #4A90E2 0%, #50C878 50%, #87CEEB 100%)',
  'medium', true, false, false,
  true, '🌧️ Monsoon Specials! Rainy Day Offers Available 💧'
);

-- ===============================================
-- Additional Header Configuration Table
-- ===============================================

CREATE TABLE IF NOT EXISTS mg_header_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  config_key VARCHAR(100) UNIQUE NOT NULL,
  config_value TEXT,
  config_type VARCHAR(20) DEFAULT 'string', -- 'string', 'boolean', 'number', 'json'
  description TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index for config lookup
CREATE INDEX idx_mg_header_config_key ON mg_header_config(config_key);

-- Insert default header configurations
INSERT INTO mg_header_config (config_key, config_value, config_type, description) VALUES
('logo_url', '/assets/raam-mg-logo.png', 'string', 'Header logo URL'),
('logo_width', '90', 'number', 'Logo width in pixels'),
('logo_height', '85', 'number', 'Logo height in pixels'),
('show_test_drive_button', 'true', 'boolean', 'Show/hide test drive button'),
('test_drive_button_text', 'Book Test Drive', 'string', 'Test drive button text'),
('show_search', 'true', 'boolean', 'Show/hide search icon'),
('header_sticky', 'true', 'boolean', 'Enable sticky header'),
('header_hide_on_scroll', 'true', 'boolean', 'Hide header on scroll down'),
('phone_number', '+91-9999999999', 'string', 'Contact phone number'),
('show_social_icons', 'false', 'boolean', 'Show social media icons in header'),
('social_facebook', '', 'string', 'Facebook URL'),
('social_instagram', '', 'string', 'Instagram URL'),
('social_twitter', '', 'string', 'Twitter URL'),
('social_youtube', '', 'string', 'YouTube URL');

-- ===============================================
-- Views for easy querying
-- ===============================================

-- View for active theme
CREATE OR REPLACE VIEW mg_active_header_theme AS
SELECT * FROM mg_header_theme WHERE is_active = true LIMIT 1;

-- View for all configs
CREATE OR REPLACE VIEW mg_active_header_configs AS
SELECT * FROM mg_header_config WHERE is_active = true;

COMMENT ON TABLE mg_header_theme IS 'Manages seasonal and custom themes for MG website header';
COMMENT ON TABLE mg_header_config IS 'Manages general header configuration settings';
