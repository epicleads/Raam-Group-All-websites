// Test Supabase connection and table existence
require('dotenv').config({ path: '../.env' });
const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;

console.log('🔧 Testing Supabase connection...');
console.log('🔗 URL:', SUPABASE_URL ? 'Set' : 'Not set');
console.log('🔑 Key:', SUPABASE_SERVICE_KEY ? 'Set' : 'Not set');

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error('❌ Missing environment variables!');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

async function testConnection() {
  try {
    // Test different table name variations
    const tableVariations = [
      'MG_ads_hero_sliders',
      'mg_ads_hero_sliders', 
      'MGAdsHeroSliders',
      'mgadshero sliders',
      'MG_ads_hero_slider'  // singular
    ];

    console.log('🔍 Testing different table name variations...');
    
    for (const tableName of tableVariations) {
      console.log(`\n🔍 Trying table: ${tableName}`);
      const { data, error } = await supabase
        .from(tableName)
        .select('*')
        .limit(1);

      if (error) {
        console.log(`❌ ${tableName}: ${error.message}`);
      } else {
        console.log(`✅ ${tableName}: SUCCESS! Found ${data?.length || 0} records`);
        return; // Stop here if we found the correct table
      }
    }

    // If none worked, show all tables
    console.log('\n📋 Let me try to list all tables...');
    const { data: allTables, error: listError } = await supabase
      .rpc('get_schema_tables', { schema_name: 'public' });

    if (error) {
      console.error('❌ Table access error:', error);
      console.error('Error details:', {
        message: error.message,
        details: error.details,
        hint: error.hint,
        code: error.code
      });

      // If table doesn't exist, create it
      if (error.code === 'PGRST116' || error.message.includes('does not exist')) {
        console.log('📋 Table does not exist. Here\'s the SQL to create it:');
        console.log(`
CREATE TABLE public."MG_ads_hero_sliders" (
    id BIGSERIAL PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    tagline TEXT,
    desktop_image_url TEXT,
    mobile_image_url TEXT,
    order_index INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE public."MG_ads_hero_sliders" ENABLE ROW LEVEL SECURITY;

-- Create policies (adjust as needed)
CREATE POLICY "Enable read access for all users" ON public."MG_ads_hero_sliders"
FOR SELECT USING (true);

CREATE POLICY "Enable all operations for service role" ON public."MG_ads_hero_sliders"
FOR ALL USING (true);
        `);
      }
    } else {
      console.log('✅ Table exists and is accessible');
      console.log('📊 Current records:', data?.length || 0);
    }

    // Test 2: Check bucket access
    console.log('🪣 Testing storage bucket...');
    const { data: buckets, error: bucketError } = await supabase.storage.listBuckets();
    
    if (bucketError) {
      console.error('❌ Bucket list error:', bucketError);
    } else {
      const mgBucket = buckets.find(b => b.name === 'mg_ads_banners');
      console.log('📦 Available buckets:', buckets.map(b => b.name));
      console.log('🎯 MG bucket exists:', mgBucket ? 'Yes' : 'No');
      
      if (!mgBucket) {
        console.log('💡 Create the mg_ads_banners bucket in Supabase Storage');
      }
    }

  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

testConnection();