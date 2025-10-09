-- Supabase SQL Schema for Raam Honda Leads Table
-- This table stores both Test Drive and General Enquiry leads

-- Create honda_leads table
CREATE TABLE IF NOT EXISTS honda_leads (
  -- Primary Key
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Mandatory Fields
  name VARCHAR(255) NOT NULL,
  phone_number VARCHAR(15) NOT NULL,
  
  -- Optional Fields
  preferred_model VARCHAR(100),
  location VARCHAR(255),
  service_type VARCHAR(50) DEFAULT 'general_enquiry', -- 'test_drive' or 'general_enquiry'
  lead_source_page VARCHAR(100),
  
  -- Additional fields for General Enquiry
  enquiry_type VARCHAR(100),
  message TEXT,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create index on phone_number for faster lookups
CREATE INDEX IF NOT EXISTS idx_honda_leads_phone ON honda_leads(phone_number);

-- Create index on created_at for faster sorting
CREATE INDEX IF NOT EXISTS idx_honda_leads_created_at ON honda_leads(created_at DESC);

-- Create index on service_type for filtering
CREATE INDEX IF NOT EXISTS idx_honda_leads_service_type ON honda_leads(service_type);

-- Create index on lead_source_page for analytics
CREATE INDEX IF NOT EXISTS idx_honda_leads_source_page ON honda_leads(lead_source_page);

-- Enable Row Level Security (RLS)
ALTER TABLE honda_leads ENABLE ROW LEVEL SECURITY;

-- Create policy to allow public inserts (for form submissions)
CREATE POLICY "Allow public insert" ON honda_leads
  FOR INSERT
  WITH CHECK (true);

-- Create policy to allow authenticated reads (for admin dashboard)
CREATE POLICY "Allow authenticated read" ON honda_leads
  FOR SELECT
  USING (auth.role() = 'authenticated');

-- Create trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_honda_leads_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER honda_leads_updated_at
  BEFORE UPDATE ON honda_leads
  FOR EACH ROW
  EXECUTE FUNCTION update_honda_leads_updated_at();

-- Add comments for documentation
COMMENT ON TABLE honda_leads IS 'Stores all leads from Raam Honda website (test drives and general enquiries)';
COMMENT ON COLUMN honda_leads.name IS 'Customer full name (mandatory)';
COMMENT ON COLUMN honda_leads.phone_number IS 'Customer 10-digit mobile number (mandatory)';
COMMENT ON COLUMN honda_leads.preferred_model IS 'Honda model customer is interested in (optional)';
COMMENT ON COLUMN honda_leads.location IS 'Preferred showroom location (optional)';
COMMENT ON COLUMN honda_leads.service_type IS 'Type of service: test_drive or general_enquiry';
COMMENT ON COLUMN honda_leads.lead_source_page IS 'Page where lead was generated (for tracking)';
COMMENT ON COLUMN honda_leads.enquiry_type IS 'Type of general enquiry (optional)';
COMMENT ON COLUMN honda_leads.message IS 'Customer message for general enquiry (optional)';

-- Sample query to get recent leads
-- SELECT * FROM honda_leads ORDER BY created_at DESC LIMIT 50;

-- Sample query to get test drive leads only
-- SELECT * FROM honda_leads WHERE service_type = 'test_drive' ORDER BY created_at DESC;

-- Sample query to get leads by source page
-- SELECT lead_source_page, COUNT(*) as count FROM honda_leads GROUP BY lead_source_page ORDER BY count DESC;

