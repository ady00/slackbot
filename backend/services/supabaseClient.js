const { createClient } = require('@supabase/supabase-js');
const config = require('../config');

// Initialize Supabase client
const supabase = createClient(
  config.supabase.url,
  config.supabase.anonKey
);

/**
 * Test Supabase connection
 */
const testConnection = async () => {
  try {
    const { data, error } = await supabase
      .from('tickets')
      .select('count')
      .limit(1);
    
    if (error) throw error;
    console.log('Supabase connection successful');
    return true;
  } catch (error) {
    console.error('❌ Supabase connection failed:', error.message);
    return false;
  }
};

module.exports = {
  supabase,
  testConnection
};
