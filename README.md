All.Anime Quiz Site - Static Build

Files included:
- all-anime-quiz.html  -> Single-file static quiz app (HTML/CSS/JS)
- og_shonen.png, og_shojo.png, og_isekai.png, og_mecha.png, og_slice_of_life.png, og_sports.png, og_classic.png  -> Default Open Graph images for each genre (1200x630)

How to deploy (Netlify / Vercel):
1. Download and unzip the package.
2. Option A (Netlify - drag & drop):
   - Go to https://app.netlify.com/drop
   - Drag the folder containing these files onto the page.
   - Netlify will deploy and provide a URL.
   - Rename all-anime-quiz.html to index.html for root access.

3. Option B (Vercel - Static):
   - Create a new Vercel project and import the repository OR
   - Use 'vercel --prod' from the folder if you have Vercel CLI.

Post-deploy steps:
- Edit the <meta property="og:image"> tag in the HTML to point to the deployed image URL
  (e.g., https://<your-site>.netlify.app/og_shonen.png).
- To enable server-side dynamic OG pages or save scores, create a serverless function at /api/score.

Backend (store scores & dynamic OG):
- The static site includes a JS placeholder function submitScoreToBackend(payload) that POSTs to /api/score.
- Example Netlify Function (Node.js):
  exports.handler = async (event) => {
    const body = JSON.parse(event.body || '{}');
    // body: { genre, difficulty, score, total }
    // TODO: validate and store in DB
    return { statusCode: 200, body: JSON.stringify({ ok: true }) };
  };

Customization:
- Add/remove genres or edit questions by modifying QUIZ_DB in the HTML file.
- For dynamic OG images per-result, implement a server function that generates share pages with OG tags.

License:
- Use and modify freely. Replace images with licensed artwork before public launch.
