// setup.js - Netlify Function to initialize database schema
const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_KEY;

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

exports.handler = async function(event) {
  try {
    console.log('Setup function called');

    // Try to add the user_name column if it doesn't exist
    // We do this by using raw SQL through Supabase
    const { error } = await supabase.rpc('exec_sql', {
      sql: "ALTER TABLE scores ADD COLUMN IF NOT EXISTS user_name TEXT DEFAULT 'Anonymous';"
    }).catch(err => {
      console.log('RPC method not available, trying direct insert to detect schema');
      return { error: err };
    });

    if (error) {
      console.log('RPC error (this might be expected):', error.message);
      
      // Alternative: try a test insert to see current schema
      const { error: insertError } = await supabase
        .from('scores')
        .insert([{ 
          genre: '_test', 
          difficulty: '_test', 
          score: 0, 
          total: 1, 
          token: '_test',
          user_name: 'Test'
        }])
        .select()
        .single();

      if (insertError && insertError.message.includes('user_name')) {
        console.log('Column user_name exists and works!');
        // Clean up test record
        await supabase
          .from('scores')
          .delete()
          .eq('genre', '_test');
      } else if (insertError) {
        console.log('Insert error:', insertError.message);
        return {
          statusCode: 400,
          body: JSON.stringify({ error: 'Column does not exist', details: insertError.message })
        };
      }
    }

    return {
      statusCode: 200,
      body: JSON.stringify({ ok: true, message: 'Setup complete' })
    };
  } catch (err) {
    console.error('Setup error:', err);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: err.message })
    };
  }
};
