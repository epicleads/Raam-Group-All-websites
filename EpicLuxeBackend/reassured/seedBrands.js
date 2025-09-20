const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

// Sample brands to seed
const sampleBrands = [
  'MG',
  'Toyota', 
  'Skoda',
  'Honda',
  'Tata',
  'Mahindra',
  'Hyundai',
  'Kia',
  'Maruti Suzuki',
  'Nissan',
  'Ford',
  'Volkswagen'
];

async function seedBrands() {
  console.log('🌱 Seeding sample brands...');
  
  for (const brandName of sampleBrands) {
    try {
      // Check if brand already exists
      const { data: existingBrand } = await supabase
        .from('reassured_brand_data')
        .select('brand_name')
        .eq('brand_name', brandName)
        .limit(1);

      if (existingBrand && existingBrand.length > 0) {
        console.log(`✅ Brand "${brandName}" already exists`);
        continue;
      }

      // Add placeholder entry for the brand
      const { data, error } = await supabase
        .from('reassured_brand_data')
        .insert([{
          brand_name: brandName,
          model_name: 'PLACEHOLDER_MODEL',
          fuel_type: 'Petrol',
          variant_name: 'PLACEHOLDER_VARIANT',
          is_active: false // Mark as inactive until real data is added
        }])
        .select()
        .single();

      if (error) {
        console.error(`❌ Error adding brand "${brandName}":`, error.message);
      } else {
        console.log(`✅ Added brand: ${brandName}`);
      }
    } catch (err) {
      console.error(`❌ Unexpected error for brand "${brandName}":`, err.message);
    }
  }
  
  console.log('🎉 Brand seeding completed!');
}

// Run the seeding
seedBrands().catch(console.error);
