/**
 * =====================================================
 * TEST SCRIPT FOR MG MODELS PRICING API
 * =====================================================
 * 
 * Run this script to test all pricing API endpoints
 * Usage: node test-pricing-api.js
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

// Initialize Supabase client
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase environment variables');
  console.log('Please ensure SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are set in .env file');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

// =====================================================
// TEST FUNCTIONS
// =====================================================

async function testConnection() {
  console.log('\n🔍 Testing Supabase Connection...\n');
  
  try {
    const { data, error } = await supabase
      .from('mg_models_pricing')
      .select('count');

    if (error) {
      console.error('❌ Connection failed:', error.message);
      return false;
    }

    console.log('✅ Successfully connected to Supabase');
    return true;
  } catch (error) {
    console.error('❌ Connection error:', error.message);
    return false;
  }
}

async function testGetAllModels() {
  console.log('\n📋 Test 1: Get All Models Pricing\n');
  
  try {
    const { data, error } = await supabase
      .from('mg_models_pricing')
      .select('*')
      .order('display_order', { ascending: true });

    if (error) {
      console.error('❌ Failed to fetch models:', error.message);
      return;
    }

    console.log(`✅ Found ${data.length} models:`);
    data.forEach(model => {
      console.log(`   - ${model.model_display_name}: ${model.starting_price} - ${model.top_price} (${model.variants.length} variants)`);
    });
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

async function testGetSpecificModel(modelName = 'astor') {
  console.log(`\n🎯 Test 2: Get ${modelName.toUpperCase()} Pricing\n`);
  
  try {
    const { data, error } = await supabase
      .from('mg_models_pricing')
      .select('*')
      .eq('model_name', modelName)
      .single();

    if (error) {
      console.error(`❌ Failed to fetch ${modelName}:`, error.message);
      return;
    }

    console.log(`✅ ${data.model_display_name} Details:`);
    console.log(`   Starting Price: ${data.starting_price}`);
    console.log(`   Top Price: ${data.top_price}`);
    console.log(`   Variants: ${data.variants.length}`);
    data.variants.forEach((v, i) => {
      console.log(`      ${i + 1}. ${v.name}: ${v.price} (${v.fuel} | ${v.transmission})`);
    });
    console.log(`   Features: ${data.features.length}`);
    console.log(`   Active: ${data.is_active}`);
    console.log(`   Last Updated: ${new Date(data.updated_at).toLocaleString()}`);
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

async function testUpdatePricing(modelName = 'astor') {
  console.log(`\n✏️  Test 3: Update ${modelName.toUpperCase()} Pricing\n`);
  
  try {
    // Get current pricing
    const { data: current } = await supabase
      .from('mg_models_pricing')
      .select('starting_price, top_price')
      .eq('model_name', modelName)
      .single();

    console.log(`   Current Starting Price: ${current.starting_price}`);
    
    // Simulate price update (you can modify this)
    const newStartingPrice = '₹9.99 Lakh*'; // Keep same for testing
    
    const { data, error } = await supabase
      .from('mg_models_pricing')
      .update({
        starting_price: newStartingPrice,
        updated_by: 'test-script'
      })
      .eq('model_name', modelName)
      .select()
      .single();

    if (error) {
      console.error(`❌ Failed to update ${modelName}:`, error.message);
      return;
    }

    console.log(`✅ Updated successfully`);
    console.log(`   New Starting Price: ${data.starting_price}`);
    console.log(`   Last Updated: ${new Date(data.updated_at).toLocaleString()}`);
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

async function testVariantsUpdate(modelName = 'astor') {
  console.log(`\n🔄 Test 4: Update ${modelName.toUpperCase()} Variants\n`);
  
  try {
    const { data: current } = await supabase
      .from('mg_models_pricing')
      .select('variants')
      .eq('model_name', modelName)
      .single();

    console.log(`   Current Variants Count: ${current.variants.length}`);

    // Test variant update (keep same for testing)
    const { data, error } = await supabase
      .from('mg_models_pricing')
      .update({
        variants: current.variants, // Keep same for testing
        updated_by: 'test-script'
      })
      .eq('model_name', modelName)
      .select()
      .single();

    if (error) {
      console.error(`❌ Failed to update variants:`, error.message);
      return;
    }

    console.log(`✅ Variants update test successful`);
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

async function testTableStructure() {
  console.log('\n📊 Test 5: Verify Table Structure\n');
  
  try {
    const { data, error } = await supabase
      .from('mg_models_pricing')
      .select('*')
      .limit(1)
      .single();

    if (error) {
      console.error('❌ Failed to verify structure:', error.message);
      return;
    }

    console.log('✅ Table structure verified. Available fields:');
    Object.keys(data).forEach(key => {
      const value = data[key];
      const type = Array.isArray(value) ? 'Array' : typeof value === 'object' && value !== null ? 'Object' : typeof value;
      console.log(`   - ${key}: ${type}`);
    });
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

// =====================================================
// RUN ALL TESTS
// =====================================================

async function runAllTests() {
  console.log('╔════════════════════════════════════════════════════╗');
  console.log('║   MG MODELS PRICING API - TEST SUITE              ║');
  console.log('╚════════════════════════════════════════════════════╝');

  const connected = await testConnection();
  
  if (!connected) {
    console.log('\n❌ Cannot proceed with tests - connection failed\n');
    process.exit(1);
  }

  await testTableStructure();
  await testGetAllModels();
  await testGetSpecificModel('astor');
  await testGetSpecificModel('comet');
  await testGetSpecificModel('hector');
  await testUpdatePricing('astor');
  await testVariantsUpdate('astor');

  console.log('\n╔════════════════════════════════════════════════════╗');
  console.log('║   ALL TESTS COMPLETED                              ║');
  console.log('╚════════════════════════════════════════════════════╝\n');
}

// Run tests
runAllTests().catch(error => {
  console.error('\n❌ Test suite failed:', error.message);
  process.exit(1);
});

