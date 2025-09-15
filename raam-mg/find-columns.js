// Find actual column names
require('dotenv').config({ path: '../.env' });
const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

async function findColumns() {
  try {
    console.log('🔍 Testing different column combinations...');

    // Test different payload combinations
    const testPayloads = [
      // Option 1: Without URL suffix
      {
        title: 'Test 1',
        tagline: 'Test tagline',
        desktop_image: null,
        mobile_image: null,
        order_index: 0,
        is_active: true
      },
      // Option 2: Different naming
      {
        title: 'Test 2', 
        desktop_image_url: null,
        mobile_image_url: null
      },
      // Option 3: Minimal required only
      {
        title: 'Test 3'
      }
    ];

    for (let i = 0; i < testPayloads.length; i++) {
      console.log(`\n🧪 Testing payload ${i + 1}:`, testPayloads[i]);
      
      const { data, error } = await supabase
        .from('mg_ads_hero_sliders')
        .insert([testPayloads[i]])
        .select();

      if (error) {
        console.log(`❌ Payload ${i + 1} failed:`, error.message);
      } else {
        console.log(`✅ Payload ${i + 1} SUCCESS! Columns that work:`, Object.keys(data[0]));
        
        // Clean up
        await supabase
          .from('mg_ads_hero_sliders')
          .delete()
          .eq('id', data[0].id);
        
        break; // Stop at first success
      }
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

findColumns();