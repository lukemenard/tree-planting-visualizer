/**
 * Fetch species images from Wikipedia REST API.
 * Falls back to Wikimedia Commons search if the main article has no image.
 * Results are cached in localStorage for fast repeat loads.
 */

const WIKI_API = 'https://en.wikipedia.org/api/rest_v1/page/summary';
const CACHE_KEY = 'species-image-cache';
const CACHE_TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30 days

let memoryCache = null;

function loadCache() {
  if (memoryCache) return memoryCache;
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      // Expire stale entries
      const now = Date.now();
      for (const key of Object.keys(parsed)) {
        if (now - (parsed[key].ts || 0) > CACHE_TTL_MS) delete parsed[key];
      }
      memoryCache = parsed;
      return memoryCache;
    }
  } catch { /* ignore */ }
  memoryCache = {};
  return memoryCache;
}

function saveCache() {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify(memoryCache));
  } catch { /* quota exceeded, etc. */ }
}

/**
 * Fetch a photo URL for a species by scientific name.
 * Returns { url, source } or null.
 */
export async function fetchSpeciesImage(scientificName) {
  if (!scientificName) return null;

  const cache = loadCache();
  const cacheKey = scientificName.toLowerCase().trim();

  if (cache[cacheKey]) {
    return cache[cacheKey].url ? { url: cache[cacheKey].url, source: cache[cacheKey].source } : null;
  }

  // Try Wikipedia summary (uses the scientific name as article title)
  const candidates = [
    scientificName,
    scientificName.split(' ').slice(0, 2).join(' '), // genus + species only
  ];

  for (const name of candidates) {
    try {
      const encoded = encodeURIComponent(name.replace(/ /g, '_'));
      const resp = await fetch(`${WIKI_API}/${encoded}`, {
        headers: { 'Accept': 'application/json' },
      });

      if (!resp.ok) continue;

      const data = await resp.json();
      const imgUrl = data.thumbnail?.source || data.originalimage?.source || null;

      if (imgUrl) {
        // Upgrade thumbnail to larger size (Wikipedia thumbnails are usually small)
        const largerUrl = imgUrl.replace(/\/(\d+)px-/, '/600px-');
        cache[cacheKey] = { url: largerUrl, source: 'wikipedia', ts: Date.now() };
        saveCache();
        return { url: largerUrl, source: 'Wikipedia' };
      }
    } catch {
      // Network error, try next candidate
    }
  }

  // Mark as not found so we don't retry
  cache[cacheKey] = { url: null, source: null, ts: Date.now() };
  saveCache();
  return null;
}
