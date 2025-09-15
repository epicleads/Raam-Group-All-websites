// Check table structure
require('dotenv').config({ path: '../.env' });
const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

async function checkTableStructure() {
  try {
    console.log('🔍 Checking mg_ads_hero_sliders table structure...');

    // Get table columns using PostgreSQL system tables
    const { data, error } = await supabase.rpc('sql', {
      query: `
        SELECT column_name, data_type, is_nullable, column_default
        FROM information_schema.columns 
        WHERE table_name = 'mg_ads_hero_sliders' 
        AND table_schema = 'public'
        ORDER BY ordinal_position;
      `
    });

    if (error) {
      console.log('❌ Could not get table structure via RPC, trying direct query...');
      
      // Try another approach - select with limit 0 to get column info
      const { data: sampleData, error: selectError } = await supabase
        .from('mg_ads_hero_sliders')
        .select('*')
        .limit(0);

      if (selectError) {
        console.error('❌ Error accessing table:', selectError.message);
        return;
      }

      console.log('✅ Table exists but could not get detailed structure');
      console.log('💡 Try adding a test record to see which columns work...');
      
      // Try minimal insert to see what columns exist
      const { data: testData, error: insertError } = await supabase
        .from('mg_ads_hero_sliders')
        .insert([{ title: 'Test' }])
        .select();

      if (insertError) {
        console.error('❌ Insert test failed:', insertError.message);
        console.log('\n📋 The table might need these columns added:');
        console.log(`
ALTER TABLE mg_ads_hero_sliders ADD COLUMN IF NOT EXISTS desktop_image_url TEXT;
ALTER TABLE mg_ads_hero_sliders ADD COLUMN IF NOT EXISTS mobile_image_url TEXT;
ALTER TABLE mg_ads_hero_sliders ADD COLUMN IF NOT EXISTS tagline TEXT;
ALTER TABLE mg_ads_hero_sliders ADD COLUMN IF NOT EXISTS order_index INTEGER DEFAULT 0;
ALTER TABLE mg_ads_hero_sliders ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;
        `);
      } else {
        console.log('✅ Basic insert works, columns exist:', Object.keys(testData[0]));
        
        // Clean up test record
        await supabase
          .from('mg_ads_hero_sliders')
          .delete()
          .eq('id', testData[0].id);
      }
    } else {
      console.log('✅ Table structure:');
      console.table(data);
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

checkTableStructure();