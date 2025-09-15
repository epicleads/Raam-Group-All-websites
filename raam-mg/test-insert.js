// Test insert with correct column names
require('dotenv').config({ path: '../.env' });
const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

async function testInsert() {
  try {
    console.log('🧪 Testing insert with corrected column names...');

    const testPayload = {
      title: 'Test Slider',
      tagline: 'Test tagline',
      desktop_image: 'https://example.com/desktop.jpg',
      mobile_image: 'https://example.com/mobile.jpg',
      order_index: 1,
      is_active: true,
      cta_text: 'Learn More'
    };

    console.log('📝 Test payload:', testPayload);

    const { data, error } = await supabase
      .from('mg_ads_hero_sliders')
      .insert([testPayload])
      .select();

    if (error) {
      console.error('❌ Insert failed:', error.message);
    } else {
      console.log('✅ Insert successful! Created record:', data[0]);
      
      // Clean up - delete the test record
      await supabase
        .from('mg_ads_hero_sliders')
        .delete()
        .eq('id', data[0].id);
      
      console.log('🧹 Test record cleaned up');
    }

  } catch (error) {
    console.error('❌ Test error:', error.message);
  }
}

testInsert();