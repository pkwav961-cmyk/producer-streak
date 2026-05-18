/**
 * src/lib/creditStats.ts
 *
 * Client-side credit stats fetcher — NO external API keys required.
 *
 * Uses three 100% free, no-registration APIs:
 *   1. Deezer API  — track search, rank, duration, preview, album art
 *   2. iTunes Search API — Apple's free public endpoint, no key needed
 *   3. Genius API  — pageviews as popularity proxy (key already in .env)
 *
 * Results are saved to Firestore: users/{userId}/creditStats/{docId}
 * The Firestore onSnapshot listener keeps the UI live-updating automatically.
 *
 * The "Sync Now" button in the Catalogue tab calls refreshCreditStats()
 * which re-runs the fetch pipeline for all of the user's claimedCredits.
 */

import { db } from './firebase';
import {
  collection,
  doc,
  setDoc,
  query,
  onSnapshot,
  orderBy,
  serverTimestamp,
} from 'firebase/firestore';
import { useState, useEffect, useCallback, useRef } from 'react';

// ─── Types ───────────────────────────────────────────────────────────────────

export interface TrackCreditStat {
  /** Firestore document ID */
  id: string;
  /** Track title from the original credit claim */
  title: string;
  /** Artist from the original credit claim */
  artist: string | null;
  /** Producer role (Main Producer, Co-Producer, etc.) */
  role: string | null;
  /** Original cover art from the credit claim */
  creditImage: string | null;
  /** ISO timestamp of the last fetch */
  lastScrapedAt: string;
  /** Whether NO results were found across all sources */
  notFound?: boolean;

  // — Deezer fields (most reliable, no CORS issues via proxy) —
  deezerId?: number;
  deezerTitle?: string;
  deezerArtist?: string;
  deezerRank?: number;        // Deezer's popularity score (higher = more popular)
  albumName?: string;
  albumImageUrl?: string;
  releaseDate?: string;
  previewUrl?: string;        // 30-second MP3 preview
  deezerUrl?: string;
  durationSec?: number;
  explicit?: boolean;

  // — iTunes fields —
  itunesTrackId?: number;
  itunesUrl?: string;
  itunesArtworkUrl?: string;
  itunesGenre?: string;
  itunesCollectionName?: string;  // album name from iTunes

  // — Genius fields —
  geniusPageviews?: number;
  geniusUrl?: string;
  geniusTitle?: string;

  // — Derived / display fields —
  popularityScore?: number;   // Normalised 0–100 from Deezer rank
  popularityTier?: string;    // 'Viral' | 'Trending' | 'Growing' | 'Emerging' | 'Underground' | 'Niche'
  estimatedStreamsMin?: number;
  estimatedStreamsMax?: number;
}

// ─── CORS Proxies (cycle through if one is blocked) ──────────────────────────

const PROXIES = [
  (url: string) => `https://api.allorigins.win/raw?url=${encodeURIComponent(url)}`,
  (url: string) => `https://corsproxy.io/?${encodeURIComponent(url)}`,
  (url: string) => `https://thingproxy.freeboard.io/fetch/${url}`,
];

async function fetchViaProxy(url: string): Promise<any | null> {
  for (const proxy of PROXIES) {
    try {
      const res = await fetch(proxy(url), { signal: AbortSignal.timeout(8000) });
      if (res.ok) {
        const text = await res.text();
        if (text && text.trim().startsWith('{') || text.trim().startsWith('[')) {
          return JSON.parse(text);
        }
      }
    } catch {
      // try next proxy
    }
  }
  return null;
}

// ─── Deezer Search (free, no key) ────────────────────────────────────────────

async function searchDeezer(title: string, artist: string): Promise<Partial<TrackCreditStat> | null> {
  const q = encodeURIComponent(`${title} ${artist}`.trim());
  const url = `https://api.deezer.com/search?q=${q}&limit=5`;

  const data = await fetchViaProxy(url);
  if (!data?.data?.length) return null;

  // Find best match — prefer exact title match
  const items: any[] = data.data;
  const artistLower = artist.toLowerCase();
  const titleLower = title.toLowerCase();

  const best = items.find(t =>
    t.title?.toLowerCase() === titleLower ||
    (t.title?.toLowerCase().includes(titleLower) &&
      t.artist?.name?.toLowerCase().includes(artistLower.split(' ')[0]))
  ) || items[0];

  if (!best) return null;

  // Deezer rank goes up to ~1,000,000+. Normalise to 0–100.
  const rawRank = best.rank || 0;
  const normalisedScore = Math.min(100, Math.round(rawRank / 15000));

  return {
    deezerId: best.id,
    deezerTitle: best.title,
    deezerArtist: best.artist?.name,
    deezerRank: rawRank,
    albumName: best.album?.title,
    albumImageUrl: best.album?.cover_xl || best.album?.cover_big || best.album?.cover,
    previewUrl: best.preview,
    deezerUrl: best.link,
    durationSec: best.duration,
    explicit: best.explicit_lyrics || false,
    popularityScore: normalisedScore,
    popularityTier: popularityLabel(normalisedScore),
    ...streamRangeFromScore(normalisedScore),
  };
}

// ─── iTunes Search API (free, no key, Apple's public endpoint) ───────────────

async function searchItunes(title: string, artist: string): Promise<Partial<TrackCreditStat> | null> {
  try {
    // iTunes allows direct fetch (no CORS restrictions on this endpoint)
    const q = encodeURIComponent(`${title} ${artist}`.trim());
    const res = await fetch(
      `https://itunes.apple.com/search?term=${q}&entity=song&limit=5`,
      { signal: AbortSignal.timeout(8000) }
    );
    if (!res.ok) return null;

    const data = await res.json();
    if (!data.results?.length) return null;

    const titleLower = title.toLowerCase();
    const artistLower = artist.toLowerCase();

    const best = data.results.find((t: any) =>
      t.trackName?.toLowerCase().includes(titleLower) &&
      t.artistName?.toLowerCase().includes(artistLower.split(' ')[0])
    ) || data.results[0];

    return {
      itunesTrackId: best.trackId,
      itunesUrl: best.trackViewUrl,
      itunesArtworkUrl: best.artworkUrl100?.replace('100x100', '300x300'),
      itunesGenre: best.primaryGenreName,
      itunesCollectionName: best.collectionName,
      releaseDate: best.releaseDate ? best.releaseDate.split('T')[0] : undefined,
      durationSec: best.trackTimeMillis ? Math.round(best.trackTimeMillis / 1000) : undefined,
      albumName: best.collectionName,
      albumImageUrl: best.artworkUrl100?.replace('100x100', '600x600'),
    };
  } catch {
    return null;
  }
}

// ─── Genius (existing key) ────────────────────────────────────────────────────

async function searchGenius(title: string, artist: string): Promise<Partial<TrackCreditStat> | null> {
  const apiKey = import.meta.env.VITE_GENIUS_API_KEY;
  if (!apiKey) return null;

  try {
    const q = encodeURIComponent(`${artist} ${title}`.trim());
    const url = `https://api.genius.com/search?q=${q}&access_token=${apiKey}`;
    const res = await fetch(url, { signal: AbortSignal.timeout(8000) });
    if (!res.ok) return null;

    const data = await res.json();
    const hits = data.response?.hits || [];
    if (!hits.length) return null;

    const titleLower = title.toLowerCase();
    const artistLower = artist.toLowerCase();
    const best = hits.find((h: any) =>
      h.result?.title?.toLowerCase().includes(titleLower) &&
      h.result?.primary_artist?.name?.toLowerCase().includes(artistLower.split(' ')[0])
    ) || hits[0];

    const result = best?.result;
    if (!result) return null;

    return {
      geniusPageviews: result.stats?.pageviews || 0,
      geniusUrl: result.url,
      geniusTitle: result.title,
      albumImageUrl: result.song_art_image_url || result.header_image_url,
    };
  } catch {
    return null;
  }
}

// ─── Main per-track scraper ───────────────────────────────────────────────────

async function scrapeTrack(
  title: string,
  artist: string,
  role: string | null,
  creditImage: string | null
): Promise<Omit<TrackCreditStat, 'id'>> {
  // Run all three sources concurrently
  const [deezer, itunes, genius] = await Promise.allSettled([
    searchDeezer(title, artist),
    searchItunes(title, artist),
    searchGenius(title, artist),
  ]);

  const deezerData = deezer.status === 'fulfilled' ? deezer.value : null;
  const itunesData = itunes.status === 'fulfilled' ? itunes.value : null;
  const geniusData = genius.status === 'fulfilled' ? genius.value : null;

  // Merge — Deezer is primary, iTunes fills gaps, Genius fills what remains
  const merged: Omit<TrackCreditStat, 'id'> = {
    title,
    artist: artist || null,
    role,
    creditImage,
    lastScrapedAt: new Date().toISOString(),
    notFound: !deezerData && !itunesData && !geniusData,

    // Deezer (highest quality for music metadata)
    ...(deezerData || {}),

    // iTunes fills in what Deezer missed
    albumImageUrl: deezerData?.albumImageUrl || itunesData?.albumImageUrl || geniusData?.albumImageUrl || creditImage || undefined,
    albumName: deezerData?.albumName || itunesData?.albumName || undefined,
    releaseDate: deezerData?.releaseDate || itunesData?.releaseDate || undefined,
    durationSec: deezerData?.durationSec || itunesData?.durationSec || undefined,
    itunesUrl: itunesData?.itunesUrl || undefined,
    itunesGenre: itunesData?.itunesGenre || undefined,
    itunesCollectionName: itunesData?.itunesCollectionName || undefined,

    // Genius
    ...(geniusData || {}),
  };

  // If Deezer had no score but Genius has pageviews, derive score from that
  if (!merged.popularityScore && merged.geniusPageviews) {
    const geniusScore = Math.min(100, Math.round(Math.log10(merged.geniusPageviews + 1) * 15));
    merged.popularityScore = geniusScore;
    merged.popularityTier = popularityLabel(geniusScore);
    Object.assign(merged, streamRangeFromScore(geniusScore));
  }

  return merged;
}

// ─── Firestore writer ─────────────────────────────────────────────────────────

function makeDocId(title: string, artist: string): string {
  return `${(artist || 'unknown').toLowerCase().replace(/[^a-z0-9]/g, '_')}_${title.toLowerCase().replace(/[^a-z0-9]/g, '_')}`.slice(0, 100);
}

// ─── React Hook ───────────────────────────────────────────────────────────────

export function useCreditStats(userId: string | null | undefined, claimedCredits: any[] = []) {
  const [stats, setStats] = useState<TrackCreditStat[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [lastScraped, setLastScraped] = useState<Date | null>(null);
  const [error, setError] = useState<string | null>(null);
  const refreshingRef = useRef(false);

  // Live Firestore listener
  useEffect(() => {
    if (!userId) {
      setStats([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    const statsCol = collection(db, 'users', userId, 'creditStats');
    const q = query(statsCol, orderBy('lastScrapedAt', 'desc'));

    const unsub = onSnapshot(
      q,
      (snap) => {
        const data: TrackCreditStat[] = snap.docs.map(d => ({
          id: d.id,
          ...(d.data() as Omit<TrackCreditStat, 'id'>),
        }));
        setStats(data);
        setLoading(false);
        if (data.length > 0 && data[0].lastScrapedAt) {
          setLastScraped(new Date(data[0].lastScrapedAt));
        }
      },
      (err) => {
        console.error('creditStats listener:', err);
        setError(err.message);
        setLoading(false);
      }
    );

    return () => unsub();
  }, [userId]);

  /**
   * Scrape Deezer + iTunes + Genius for all of the user's claimedCredits
   * and save results to Firestore. The onSnapshot listener above picks up
   * the writes automatically and updates the UI in real time.
   */
  const refresh = useCallback(async () => {
    if (!userId || refreshingRef.current || claimedCredits.length === 0) return;

    refreshingRef.current = true;
    setRefreshing(true);
    setError(null);

    const statsCol = collection(db, 'users', userId, 'creditStats');

    try {
      for (const credit of claimedCredits) {
        const { title, artist, role, image } = credit;
        if (!title) continue;

        try {
          const statsDoc = await scrapeTrack(title, artist || '', role || null, image || null);
          const docId = makeDocId(title, artist || '');
          await setDoc(doc(statsCol, docId), statsDoc, { merge: true });
        } catch (trackErr) {
          console.error(`Failed to scrape "${title}":`, trackErr);
        }

        // Small delay to be polite to free APIs
        await new Promise(r => setTimeout(r, 400));
      }
    } catch (err: any) {
      setError(err.message || 'Scrape failed');
    } finally {
      refreshingRef.current = false;
      setRefreshing(false);
    }
  }, [userId, claimedCredits]);

  const isStale = !lastScraped || (Date.now() - lastScraped.getTime()) > 23 * 60 * 60 * 1000;

  return { stats, loading, refreshing, error, lastScraped, isStale, refresh };
}

// ─── Display utilities ────────────────────────────────────────────────────────

/** Convert Deezer rank / derived score (0–100) to a descriptive label */
export function popularityLabel(score: number): string {
  if (score >= 80) return 'Viral';
  if (score >= 65) return 'Trending';
  if (score >= 50) return 'Growing';
  if (score >= 35) return 'Emerging';
  if (score >= 20) return 'Underground';
  return 'Niche';
}

/** Popularity score → estimated stream range based on observed industry data */
function streamRangeFromScore(score: number): { estimatedStreamsMin: number; estimatedStreamsMax: number } {
  if (score >= 90) return { estimatedStreamsMin: 500_000_000,  estimatedStreamsMax: 5_000_000_000 };
  if (score >= 80) return { estimatedStreamsMin: 50_000_000,   estimatedStreamsMax: 500_000_000 };
  if (score >= 70) return { estimatedStreamsMin: 10_000_000,   estimatedStreamsMax: 50_000_000 };
  if (score >= 60) return { estimatedStreamsMin: 1_000_000,    estimatedStreamsMax: 10_000_000 };
  if (score >= 50) return { estimatedStreamsMin: 250_000,      estimatedStreamsMax: 1_000_000 };
  if (score >= 40) return { estimatedStreamsMin: 50_000,       estimatedStreamsMax: 250_000 };
  if (score >= 30) return { estimatedStreamsMin: 10_000,       estimatedStreamsMax: 50_000 };
  if (score >= 20) return { estimatedStreamsMin: 1_000,        estimatedStreamsMax: 10_000 };
  return { estimatedStreamsMin: 0, estimatedStreamsMax: 1_000 };
}

/** Format stream range as human-readable string */
export function formatStreamRange(min: number, max: number): string {
  const fmt = (n: number): string => {
    if (n >= 1_000_000_000) return `${(n / 1_000_000_000).toFixed(1)}B`;
    if (n >= 1_000_000)     return `${(n / 1_000_000).toFixed(1)}M`;
    if (n >= 1_000)         return `${(n / 1_000).toFixed(0)}K`;
    return String(n);
  };
  return `${fmt(min)} – ${fmt(max)}`;
}

/** Format seconds as mm:ss */
export function formatDuration(secs: number): string {
  const m = Math.floor(secs / 60);
  const s = secs % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}
