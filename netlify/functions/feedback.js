// feedback.js - Netlify Function for handling feedback submissions
const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_KEY;

console.log('Feedback function initialized with:', {
  SUPABASE_URL: SUPABASE_URL ? 'SET' : 'MISSING',
  SUPABASE_KEY: SUPABASE_KEY ? 'SET' : 'MISSING'
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
  // Handle CORS preflight
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type'
      }
    };
  }

  // Get feedback
  if (event.httpMethod === 'GET') {
    try {
      if (!supabase) {
        throw new Error('Supabase client not initialized');
      }

      const limit = (event.queryStringParameters?.limit) || 10;
      console.log('Fetching feedback with limit:', limit);
      
      const { data, error } = await supabase
        .from('feedback')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) {
        console.error('Supabase fetch error:', error.message, error.code);
        return {
          statusCode: 500,
          headers: { 'Access-Control-Allow-Origin': '*' },
          body: JSON.stringify({ error: error.message, code: error.code })
        };
      }

      console.log('Feedback fetched:', data?.length || 0, 'records');
      return {
        statusCode: 200,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        },
        body: JSON.stringify(data || [])
      };
    } catch (err) {
      console.error('Get feedback error:', err.message, err.stack);
      return {
        statusCode: 500,
        headers: { 'Access-Control-Allow-Origin': '*' },
        body: JSON.stringify({ error: err.message })
      };
    }
  }

  // Submit feedback
  if (event.httpMethod === 'POST') {
    try {
      if (!supabase) {
        throw new Error('Supabase client not initialized');
      }

      const body = JSON.parse(event.body || '{}');
      console.log('Feedback submission received:', { category: body.category, message: body.message ? '...' : 'missing' });

      const { name, email, category, message } = body;

      if (!category || !message) {
        console.error('Validation failed - missing fields:', { category: !!category, message: !!message });
        return {
          statusCode: 400,
          headers: { 'Access-Control-Allow-Origin': '*' },
          body: JSON.stringify({ error: 'Missing required fields: category, message' })
        };
      }

      console.log('Inserting feedback into database...');
      const { data, error } = await supabase
        .from('feedback')
        .insert([{
          name: name || 'Anonymous',
          email: email || null,
          category,
          message
        }])
        .select()
        .single();

      if (error) {
        console.error('Supabase insert error:', error.message, error.code);
        return {
          statusCode: 500,
          headers: { 'Access-Control-Allow-Origin': '*' },
          body: JSON.stringify({ error: error.message, code: error.code })
        };
      }

      console.log('Feedback saved successfully:', data?.id);
      return {
        statusCode: 201,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        },
        body: JSON.stringify({ ok: true, data })
      };
    } catch (err) {
      console.error('Submit feedback error:', err.message, err.stack);
      return {
        statusCode: 500,
        headers: { 'Access-Control-Allow-Origin': '*' },
        body: JSON.stringify({ error: err.message })
      };
    }
  }

  return {
    statusCode: 405,
    body: JSON.stringify({ error: 'Method not allowed' })
  };
};
