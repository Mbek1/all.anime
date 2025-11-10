// share.js - Netlify Function: serves dynamic OG HTML for a token
const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_KEY;
const OG_BASE_URL = process.env.OG_BASE_URL || '';
const SITE_URL = process.env.SITE_URL || '';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

exports.handler = async function(event) {
  try {
    let token = (event.queryStringParameters && event.queryStringParameters.token) || '';
    // Support receiving token as path parameter if rewritten (we also accept query param fallback)
    const pathParts = event.path && event.path.split('/') || [];
    if (!token && pathParts.length) {
      // path like /.netlify/functions/share/<token> or /share/<token> (depending on rewrites)
      const last = pathParts[pathParts.length - 1];
      if (last && last.length > 2) {
        // treat as token
        token = last;
      }
    }

    if (!token) {
      return { statusCode: 400, body: 'Missing token' };
    }

    // fetch the score row by token
    const { data, error } = await supabase
      .from('scores')
      .select('*')
      .eq('token', token)
      .limit(1)
      .single();

    if (error || !data) {
      return { statusCode: 404, body: 'Not found' };
    }

    const { genre, difficulty, score, total } = data;
    const title = `I scored ${score}/${total} on the ${genre} (${difficulty}) quiz`;
    const description = `Try the ${genre} quiz on All.Anime — how well do you know it?`;
    const ogImage = `${OG_BASE_URL}/og_${String(genre).replace(/\s+/g,'_').toLowerCase()}.png`;
    // Create referral link that auto-starts the same quiz
    const quizLink = `${SITE_URL}?genre=${encodeURIComponent(genre)}&difficulty=${difficulty}&autostart=true`;
    const shareUrl = `${SITE_URL}/share/${token}`;

    // simple HTML with OG tags (social crawlers read these)
    const html = `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${escapeHtml(title)}</title>
  <meta property="og:type" content="website" />
  <meta property="og:title" content="${escapeHtml(title)}" />
  <meta property="og:description" content="${escapeHtml(description)}" />
  <meta property="og:image" content="${escapeHtml(ogImage)}" />
  <meta property="og:image:width" content="1200" />
  <meta property="og:image:height" content="630" />
  <meta property="og:url" content="${escapeHtml(shareUrl)}" />
  <meta property="og:site_name" content="All.Anime Quiz Hub" />
  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:title" content="${escapeHtml(title)}" />
  <meta name="twitter:description" content="${escapeHtml(description)}" />
  <meta name="twitter:image" content="${escapeHtml(ogImage)}" />
  <meta http-equiv="refresh" content="0;url=${escapeHtml(quizLink)}" />
  <style>
    body { font-family: Arial, sans-serif; margin: 40px; text-align: center; background: #f7f8fb; }
    a { color: #ff6f61; text-decoration: none; font-weight: bold; }
  </style>
</head>
<body>
  <h1>${escapeHtml(title)}</h1>
  <p>${escapeHtml(description)}</p>
  <p><a href="${escapeHtml(quizLink)}">Take the ${escapeHtml(genre)} (${escapeHtml(difficulty)}) quiz on All.Anime</a></p>
  <p><small>Redirecting in a moment...</small></p>
</body>
</html>`;

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'text/html' },
      body: html
    };

  } catch (err) {
    console.error(err);
    return { statusCode: 500, body: 'server error' };
  }
};

function escapeHtml(s){ return String(s).replace(/[&<>"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c])); }
