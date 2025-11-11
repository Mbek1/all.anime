// score.js - Netlify Function (Supabase)
const { createClient } = require('@supabase/supabase-js');

// Simple token generator (replaces nanoid which has ES Module issues)
function generateToken(length = 8) {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let token = '';
  for (let i = 0; i < length; i++) {
    token += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return token;
}

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_KEY;
const SITE_URL = process.env.SITE_URL; 

console.log('Netlify Function initialized with:', { 
  SUPABASE_URL: SUPABASE_URL ? 'SET' : 'MISSING',
  SUPABASE_KEY: SUPABASE_KEY ? 'SET' : 'MISSING',
  SITE_URL: SITE_URL ? SITE_URL : 'MISSING'
});

let supabase;

try {
  if (!SUPABASE_URL || !SUPABASE_KEY) {
    throw new Error('Missing SUPABASE_URL or SUPABASE_KEY env vars');
  }
  supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
} catch (err) {
  console.error('Failed to initialize Supabase:', err);
}

exports.handler = async function(event) {
  console.log('Score function called:', { method: event.httpMethod });
  
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: JSON.stringify({ error: 'Method Not Allowed' }) };
  }

  try {
    if (!supabase) {
      throw new Error('Supabase client not initialized');
    }

    const body = JSON.parse(event.body || '{}');
    const { genre, difficulty, score, total, user_id } = body;

    console.log('Request body:', { genre, difficulty, score, total, user_id });

    if (!genre || !difficulty || typeof score !== 'number' || typeof total !== 'number') {
      return { statusCode: 400, body: JSON.stringify({ error: 'invalid_payload' }) };
    }

    // create a short token
    const token = generateToken(8);

    // If user_id is provided, fetch their name from Supabase Auth
    let user_name = 'Anonymous';
    if (user_id) {
      try {
        const userResponse = await fetch(`${SUPABASE_URL}/rest/v1/auth.users?id=eq.${user_id}`, {
          headers: {
            'apikey': SUPABASE_KEY,
            'Authorization': `Bearer ${SUPABASE_KEY}`
          }
        });
        
        if (userResponse.ok) {
          const users = await userResponse.json();
          if (users && users[0]) {
            user_name = users[0].user_metadata?.name || users[0].email || 'Anonymous';
          }
        }
      } catch (err) {
        console.error('Failed to fetch user name:', err);
        // Continue with Anonymous if fetch fails
      }
    }

    // insert row
    const { data, error } = await supabase
      .from('scores')
      .insert([{ genre, difficulty, score, total, token, user_id, user_name }])
      .select()
      .single();

    if (error) {
      console.error('Supabase insert error', error);
      return { statusCode: 500, body: JSON.stringify({ error: 'db_error', details: error.message }) };
    }

    console.log('Score saved successfully:', token);

    // share URL -> we use a pretty path /share/:token via netlify redirects
    const shareUrl = `${SITE_URL}/share/${token}`;

    return {
      statusCode: 200,
      body: JSON.stringify({ ok: true, token, share_url: shareUrl })
    };
  } catch (err) {
    console.error('Server error', err);
    return { statusCode: 500, body: JSON.stringify({ error: 'server_error', message: err.message }) };
  }
};
