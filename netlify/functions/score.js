// score.js - Netlify Function (Supabase)
const { createClient } = require('@supabase/supabase-js');
const { nanoid } = require('nanoid');

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_KEY;
const SITE_URL = process.env.SITE_URL; // e.g. https://your-site.netlify.app

if (!SUPABASE_URL || !SUPABASE_KEY || !SITE_URL) {
  console.error('Missing one of SUPABASE_URL, SUPABASE_KEY, SITE_URL env vars');
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

exports.handler = async function(event) {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: JSON.stringify({ error: 'Method Not Allowed' }) };
  }

  try {
    const body = JSON.parse(event.body || '{}');
    const { genre, difficulty, score, total } = body;

    if (!genre || !difficulty || typeof score !== 'number' || typeof total !== 'number') {
      return { statusCode: 400, body: JSON.stringify({ error: 'invalid_payload' }) };
    }

    // create a short token
    const token = nanoid(8);

    // insert row
    const { data, error } = await supabase
      .from('scores')
      .insert([{ genre, difficulty, score, total, token }])
      .select()
      .single();

    if (error) {
      console.error('Supabase insert error', error);
      return { statusCode: 500, body: JSON.stringify({ error: 'db_error' }) };
    }

    // share URL -> we use a pretty path /share/:token via netlify redirects
    const shareUrl = `${SITE_URL}/share/${token}`;

    return {
      statusCode: 200,
      body: JSON.stringify({ ok: true, token, share_url: shareUrl })
    };
  } catch (err) {
    console.error('Server error', err);
    return { statusCode: 500, body: JSON.stringify({ error: 'server_error' }) };
  }
};
