-- =====================================================
-- MG MODELS PRICING MANAGEMENT SYSTEM
-- Single Table to Manage All MG Model Prices
-- Models: Astor, Comet, Hector, Windsor, Gloster, ZS EV
-- =====================================================

-- Drop existing table if exists (for fresh start)
DROP TABLE IF EXISTS public.mg_models_pricing CASCADE;

-- Create mg_models_pricing table
CREATE TABLE public.mg_models_pricing (
    -- Primary Key
    id BIGSERIAL PRIMARY KEY,
    
    -- Model Information
    model_name VARCHAR(50) NOT NULL UNIQUE,
    model_display_name VARCHAR(100) NOT NULL,
    
    -- Pricing Information
    starting_price VARCHAR(50) NOT NULL,
    top_price VARCHAR(50) NOT NULL,
    
    -- Variants Data (JSONB for flexibility)
    variants JSONB NOT NULL DEFAULT '[]'::jsonb,
    
    -- Features (JSONB array)
    features JSONB NOT NULL DEFAULT '[]'::jsonb,
    
    -- Specifications (JSONB object)
    specifications JSONB NOT NULL DEFAULT '{}'::jsonb,
    
    -- Status & Control
    is_active BOOLEAN DEFAULT true,
    is_featured BOOLEAN DEFAULT false,
    display_order INTEGER DEFAULT 0,
    
    -- SEO & Metadata
    meta_title TEXT,
    meta_description TEXT,
    meta_keywords TEXT[],
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    last_price_update TIMESTAMPTZ DEFAULT NOW(),
    
    -- Audit Fields
    updated_by VARCHAR(100),
    created_by VARCHAR(100) DEFAULT 'system',
    
    -- Notes
    admin_notes TEXT
);

-- =====================================================
-- INDEXES FOR PERFORMANCE
-- =====================================================

-- Index on model_name for fast lookups
CREATE INDEX idx_mg_models_pricing_model_name ON public.mg_models_pricing(model_name);

-- Index on is_active for filtering active models
CREATE INDEX idx_mg_models_pricing_is_active ON public.mg_models_pricing(is_active);

-- Index on display_order for sorting
CREATE INDEX idx_mg_models_pricing_display_order ON public.mg_models_pricing(display_order);

-- GIN index on variants JSONB for fast JSON queries
CREATE INDEX idx_mg_models_pricing_variants ON public.mg_models_pricing USING GIN (variants);

-- GIN index on features JSONB
CREATE INDEX idx_mg_models_pricing_features ON public.mg_models_pricing USING GIN (features);

-- Index on timestamps
CREATE INDEX idx_mg_models_pricing_updated_at ON public.mg_models_pricing(updated_at DESC);

-- =====================================================
-- TRIGGER TO AUTO-UPDATE updated_at TIMESTAMP
-- =====================================================

CREATE OR REPLACE FUNCTION update_mg_models_pricing_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    -- Update last_price_update if price fields changed
    IF (NEW.starting_price != OLD.starting_price OR 
        NEW.top_price != OLD.top_price OR 
        NEW.variants != OLD.variants) THEN
        NEW.last_price_update = NOW();
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_mg_models_pricing_updated_at
    BEFORE UPDATE ON public.mg_models_pricing
    FOR EACH ROW
    EXECUTE FUNCTION update_mg_models_pricing_updated_at();

-- =====================================================
-- ROW LEVEL SECURITY (RLS)
-- =====================================================

-- Enable RLS
ALTER TABLE public.mg_models_pricing ENABLE ROW LEVEL SECURITY;

-- Policy: Allow public read access to active models
CREATE POLICY "Allow public read access to active models"
    ON public.mg_models_pricing
    FOR SELECT
    USING (is_active = true);

-- Policy: Allow authenticated users to read all models
CREATE POLICY "Allow authenticated users to read all models"
    ON public.mg_models_pricing
    FOR SELECT
    TO authenticated
    USING (true);

-- Policy: Allow authenticated users to insert/update/delete
CREATE POLICY "Allow authenticated users full access"
    ON public.mg_models_pricing
    FOR ALL
    TO authenticated
    USING (true)
    WITH CHECK (true);

-- =====================================================
-- EXAMPLE DATA STRUCTURE (FOR REFERENCE)
-- Data will be added through Admin Panel
-- =====================================================

-- Example variant structure:
-- {
--   "name": "Sprint",
--   "price": "₹9.99 Lakh*",
--   "fuel": "Petrol",
--   "transmission": "5MT"
-- }

-- Example features structure:
-- [
--   "Most Advanced SUV in its Class",
--   "India's First AI-Powered SUV"
-- ]

-- Example specifications structure:
-- {
--   "engine": {
--     "petrol": "VTi-TECH 1.5L - 110 PS / 144 Nm"
--   },
--   "transmission": "5MT / 8CVT",
--   "driveType": "Front Wheel Drive"
-- }

-- =====================================================
-- HELPFUL QUERIES FOR ADMIN PANEL
-- =====================================================

-- Get all active models with pricing
-- SELECT model_name, model_display_name, starting_price, top_price, is_active 
-- FROM mg_models_pricing 
-- WHERE is_active = true 
-- ORDER BY display_order;

-- Get specific model with all details
-- SELECT * FROM mg_models_pricing WHERE model_name = 'astor';

-- Get all variants for a model
-- SELECT model_name, jsonb_array_elements(variants) as variant 
-- FROM mg_models_pricing 
-- WHERE model_name = 'astor';

-- Update price for a specific model
-- UPDATE mg_models_pricing 
-- SET starting_price = '₹10.99 Lakh*', 
--     top_price = '₹14.99 Lakh*',
--     updated_by = 'admin@raammg.com'
-- WHERE model_name = 'astor';

-- Grant necessary permissions
GRANT SELECT ON public.mg_models_pricing TO anon;
GRANT ALL ON public.mg_models_pricing TO authenticated;
GRANT USAGE, SELECT ON SEQUENCE mg_models_pricing_id_seq TO authenticated;

-- =====================================================
-- TABLE COMMENTS (Documentation)
-- =====================================================

COMMENT ON TABLE public.mg_models_pricing IS 'Centralized pricing management for all MG models at Raam MG';
COMMENT ON COLUMN public.mg_models_pricing.model_name IS 'Unique identifier for model (lowercase, URL-friendly): astor, comet, hector, windsor, gloster, zsev';
COMMENT ON COLUMN public.mg_models_pricing.model_display_name IS 'Display name shown on website (e.g., MG Astor, MG Comet EV)';
COMMENT ON COLUMN public.mg_models_pricing.starting_price IS 'Starting price with currency symbol (e.g., ₹9.99 Lakh*)';
COMMENT ON COLUMN public.mg_models_pricing.top_price IS 'Highest variant price with currency symbol';
COMMENT ON COLUMN public.mg_models_pricing.variants IS 'JSONB array of variant objects with name, price, fuel, transmission';
COMMENT ON COLUMN public.mg_models_pricing.features IS 'JSONB array of feature strings';
COMMENT ON COLUMN public.mg_models_pricing.specifications IS 'JSONB object containing technical specifications (engine, transmission, etc.)';
COMMENT ON COLUMN public.mg_models_pricing.is_active IS 'Whether model should be displayed on website';
COMMENT ON COLUMN public.mg_models_pricing.display_order IS 'Sort order for displaying models (1-6)';
COMMENT ON COLUMN public.mg_models_pricing.updated_at IS 'Auto-updated timestamp on any change';
COMMENT ON COLUMN public.mg_models_pricing.last_price_update IS 'Auto-updated when price fields change';

-- =====================================================
-- SCHEMA CREATION COMPLETE
-- Table is ready - Add data through Admin Panel
-- =====================================================
