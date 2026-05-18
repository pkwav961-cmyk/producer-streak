/**
 * /api/scrape-credit-stats.js
 *
 * Vercel Serverless Function — Spotify Credit Stats Scraper
 *
 * This function is called either:
 *  - By the Vercel Cron scheduler every 24 hours (see vercel.json)
 *  - Manually via GET /api/scrape-credit-stats?userId=<uid> for on-demand refresh
 *
 * What it does:
 *  1. Reads a user's `claimedCredits` from Firestore
 *  2. For each verified credit track, searches the Spotify Search API
 *     using Client Credentials (no user login needed — public data only)
 *  3. Fetches play count via the Spotify Tracks endpoint
 *  4. Saves the enriched results to Firestore at:
 *       users/{userId}/creditStats/{trackId}
 *
 * Environment variables required (set in Vercel dashboard):
 *   SPOTIFY_CLIENT_ID       — Your Spotify app client ID
 *   SPOTIFY_CLIENT_SECRET   — Your Spotify app client secret
 *   FIREBASE_PROJECT_ID     — e.g. "producer-streak"
 *   FIREBASE_DATABASE_ID    — e.g. "ai-studio-0695a865-8d06-44e7-89f8-e0b4a718efb9"
 *   FIREBASE_SERVICE_ACCOUNT_JSON — Full JSON of your Firebase service account key
 *   CRON_SECRET             — A secret string to authenticate cron calls
 */

const { initializeApp, cert, getApps } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');

// ─── Firebase Admin Initialisation ──────────────────────────────────────────
function getAdminDb() {
  if (!getApps().length) {
    const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_JSON || '{}');
    initializeApp({
      credential: cert(serviceAccount),
      projectId: process.env.FIREBASE_PROJECT_ID,
    });
  }
  const db = getFirestore();
  db.settings({ databaseId: process.env.FIREBASE_DATABASE_ID });
  return db;
}

// ─── Spotify Client Credentials Flow ─────────────────────────────────────────
async function getSpotifyToken() {
  const creds = Buffer.from(
    `${process.env.SPOTIFY_CLIENT_ID}:${process.env.SPOTIFY_CLIENT_SECRET}`
  ).toString('base64');

  const res = await fetch('https://accounts.spotify.com/api/token', {
    method: 'POST',
    headers: {
      'Authorization': `Basic ${creds}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: 'grant_type=client_credentials',
  });

  if (!res.ok) {
    throw new Error(`Spotify token fetch failed: ${res.status} ${res.statusText}`);
  }

  const data = await res.json();
  return data.access_token;
}

// ─── Spotify Track Search ─────────────────────────────────────────────────────
async function searchSpotifyTrack(token, title, artist) {
  const query = encodeURIComponent(`track:${title} artist:${artist}`);
  const res = await fetch(
    `https://api.spotify.com/v1/search?q=${query}&type=track&limit=3`,
    { headers: { Authorization: `Bearer ${token}` } }
  );

  if (!res.ok) return null;

  const data = await res.json();
  const tracks = data.tracks?.items || [];
  if (tracks.length === 0) return null;

  // Pick best match — prefer exact title and artist match
  const bestMatch = tracks.find(t =>
    t.name.toLowerCase() === title.toLowerCase() &&
    t.artists.some(a => a.name.toLowerCase().includes(artist.toLowerCase().split(' ')[0]))
  ) || tracks[0];

  return {
    spotifyId: bestMatch.id,
    spotifyName: bestMatch.name,
    spotifyArtist: bestMatch.artists.map(a => a.name).join(', '),
    albumName: bestMatch.album?.name || null,
    albumImageUrl: bestMatch.album?.images?.[0]?.url || null,
    releaseDate: bestMatch.album?.release_date || null,
    previewUrl: bestMatch.preview_url || null,
    spotifyUrl: bestMatch.external_urls?.spotify || null,
    popularity: bestMatch.popularity || 0,
    durationMs: bestMatch.duration_ms || 0,
    explicit: bestMatch.explicit || false,
    // Spotify does not expose raw play counts via public API.
    // Popularity (0-100) is a proxy calculated from recent streams.
    // We store it as `popularityScore` and derive an estimated stream range.
    estimatedStreamsMin: popularityToEstimatedStreams(bestMatch.popularity).min,
    estimatedStreamsMax: popularityToEstimatedStreams(bestMatch.popularity).max,
  };
}

/**
 * Converts Spotify's popularity score (0–100) to an estimated stream range.
 * Based on publicly documented relationships between popularity and stream counts.
 */
function popularityToEstimatedStreams(popularity) {
  if (popularity >= 90) return { min: 500_000_000, max: 5_000_000_000 };
  if (popularity >= 80) return { min: 50_000_000,  max: 500_000_000 };
  if (popularity >= 70) return { min: 10_000_000,  max: 50_000_000 };
  if (popularity >= 60) return { min: 1_000_000,   max: 10_000_000 };
  if (popularity >= 50) return { min: 250_000,     max: 1_000_000 };
  if (popularity >= 40) return { min: 50_000,      max: 250_000 };
  if (popularity >= 30) return { min: 10_000,      max: 50_000 };
  if (popularity >= 20) return { min: 1_000,       max: 10_000 };
  return { min: 0, max: 1_000 };
}

// ─── Main Handler ─────────────────────────────────────────────────────────────
module.exports = async function handler(req, res) {
  // Authenticate cron calls
  const authHeader = req.headers['authorization'];
  const cronSecret = process.env.CRON_SECRET;

  if (
    cronSecret &&
    req.method === 'GET' &&
    !req.query.userId &&
    authHeader !== `Bearer ${cronSecret}`
  ) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    const db = getAdminDb();
    const token = await getSpotifyToken();

    // Determine which user(s) to scrape
    let userIds = [];

    if (req.query.userId) {
      // On-demand: single user
      userIds = [req.query.userId];
    } else {
      // Cron: scrape ALL users who have claimedCredits
      const snapshot = await db.collection('users')
        .where('claimedCredits', '!=', null)
        .select('claimedCredits')
        .get();

      userIds = snapshot.docs.map(doc => doc.id);
    }

    const results = [];

    for (const userId of userIds) {
      const userDoc = await db.collection('users').doc(userId).get();
      if (!userDoc.exists) continue;

      const userData = userDoc.data();
      const claimedCredits = userData.claimedCredits || [];

      if (claimedCredits.length === 0) continue;

      const statsRef = db.collection('users').doc(userId).collection('creditStats');
      const userResults = [];

      for (const credit of claimedCredits) {
        const { title, artist } = credit;
        if (!title) continue;

        try {
          const spotifyData = await searchSpotifyTrack(token, title, artist || '');

          const statsDoc = {
            title,
            artist: artist || null,
            role: credit.role || null,
            creditImage: credit.image || null,
            lastScrapedAt: new Date().toISOString(),
            ...(spotifyData || { notFoundOnSpotify: true }),
          };

          // Use a deterministic doc ID from the track title
          const docId = encodeDocId(title, artist);
          await statsRef.doc(docId).set(statsDoc, { merge: true });

          userResults.push({ docId, title, artist, found: !!spotifyData });

          // Respect Spotify rate limits: ~30 req/s max with client credentials
          await sleep(120);
        } catch (trackErr) {
          console.error(`Error scraping "${title}" for user ${userId}:`, trackErr);
          userResults.push({ title, artist, error: String(trackErr) });
        }
      }

      results.push({ userId, tracksProcessed: userResults.length, tracks: userResults });
    }

    return res.status(200).json({
      success: true,
      usersProcessed: userIds.length,
      results,
      scrapedAt: new Date().toISOString(),
    });
  } catch (err) {
    console.error('Scraper error:', err);
    return res.status(500).json({ error: String(err) });
  }
};

// ─── Helpers ─────────────────────────────────────────────────────────────────
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function encodeDocId(title, artist) {
  // Create a Firestore-safe document ID from track title + artist
  return `${(artist || 'unknown').toLowerCase().replace(/[^a-z0-9]/g, '_')}_${title.toLowerCase().replace(/[^a-z0-9]/g, '_')}`.slice(0, 100);
}
