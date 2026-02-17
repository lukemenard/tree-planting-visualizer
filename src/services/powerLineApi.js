/**
 * OpenStreetMap Overpass API integration for power line data.
 *
 * - Fetches power=line and power=minor_line ways within a bounding box
 * - Converts Overpass JSON to GeoJSON FeatureCollection
 * - Provides proximity checking via turf.js
 */

import * as turf from '@turf/turf';

const OVERPASS_URL = 'https://overpass-api.de/api/interpreter';
const MIN_ZOOM_FOR_FETCH = 14;
const DEBOUNCE_MS = 800;
const DEFAULT_BUFFER_FT = 30;
const FT_TO_METERS = 0.3048;

// Cache by bbox hash
const bboxCache = new Map();
let debounceTimer = null;

// ─── Overpass query builder ─────────────────────────────────────────────

function buildOverpassQuery(south, west, north, east) {
  return `
[out:json][timeout:15];
(
  way["power"="line"](${south},${west},${north},${east});
  way["power"="minor_line"](${south},${west},${north},${east});
  way["power"="cable"](${south},${west},${north},${east});
);
out geom;
  `.trim();
}

function bboxKey(south, west, north, east) {
  return `${south.toFixed(4)},${west.toFixed(4)},${north.toFixed(4)},${east.toFixed(4)}`;
}

// ─── Convert Overpass JSON to GeoJSON ───────────────────────────────────

function overpassToGeoJSON(data) {
  const features = [];

  for (const element of data.elements || []) {
    if (element.type !== 'way' || !element.geometry) continue;

    const coords = element.geometry.map((pt) => [pt.lon, pt.lat]);
    if (coords.length < 2) continue;

    features.push({
      type: 'Feature',
      properties: {
        id: element.id,
        power: element.tags?.power || 'line',
        voltage: element.tags?.voltage || null,
        operator: element.tags?.operator || null,
        cables: element.tags?.cables || null,
      },
      geometry: {
        type: 'LineString',
        coordinates: coords,
      },
    });
  }

  return { type: 'FeatureCollection', features };
}

// ─── Generate buffer polygons around power lines ────────────────────────

export function generatePowerLineBuffer(lineGeoJSON, bufferFt = DEFAULT_BUFFER_FT) {
  if (!lineGeoJSON || lineGeoJSON.features.length === 0) {
    return { type: 'FeatureCollection', features: [] };
  }

  const bufferKm = (bufferFt * FT_TO_METERS) / 1000;
  const bufferFeatures = [];

  for (const feature of lineGeoJSON.features) {
    try {
      const buffered = turf.buffer(feature, bufferKm, { units: 'kilometers' });
      if (buffered) {
        buffered.properties = { ...feature.properties, bufferFt };
        bufferFeatures.push(buffered);
      }
    } catch {
      // skip invalid geometries
    }
  }

  return { type: 'FeatureCollection', features: bufferFeatures };
}

// ─── Fetch power lines for a viewport ───────────────────────────────────

export async function fetchPowerLines(bounds) {
  const south = bounds.getSouth();
  const west = bounds.getWest();
  const north = bounds.getNorth();
  const east = bounds.getEast();

  const key = bboxKey(south, west, north, east);
  if (bboxCache.has(key)) return bboxCache.get(key);

  const query = buildOverpassQuery(south, west, north, east);

  try {
    const response = await fetch(OVERPASS_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: `data=${encodeURIComponent(query)}`,
    });

    if (!response.ok) {
      console.warn('Overpass query failed:', response.status);
      return { type: 'FeatureCollection', features: [] };
    }

    const data = await response.json();
    const geojson = overpassToGeoJSON(data);
    bboxCache.set(key, geojson);
    return geojson;
  } catch (err) {
    console.warn('Overpass query error:', err.message);
    return { type: 'FeatureCollection', features: [] };
  }
}

// ─── Debounced fetch for viewport changes ───────────────────────────────

export function debouncedFetchPowerLines(bounds, zoom, callback) {
  if (debounceTimer) clearTimeout(debounceTimer);

  if (zoom < MIN_ZOOM_FOR_FETCH) {
    callback({ type: 'FeatureCollection', features: [] });
    return;
  }

  debounceTimer = setTimeout(async () => {
    const result = await fetchPowerLines(bounds);
    callback(result);
  }, DEBOUNCE_MS);
}

// ─── Proximity check ────────────────────────────────────────────────────

/**
 * Check if a point is near any power line.
 * Returns { near: boolean, distanceFt: number | null }
 */
export function checkPowerLineProximity(lngLat, powerLineGeoJSON, bufferFt = DEFAULT_BUFFER_FT) {
  if (!powerLineGeoJSON || powerLineGeoJSON.features.length === 0) {
    return { near: false, distanceFt: null };
  }

  const point = turf.point([lngLat.lng, lngLat.lat]);
  let minDistFt = Infinity;

  for (const feature of powerLineGeoJSON.features) {
    try {
      const nearest = turf.nearestPointOnLine(feature, point, { units: 'meters' });
      const distFt = (nearest.properties.dist || 0) / FT_TO_METERS;
      if (distFt < minDistFt) minDistFt = distFt;
    } catch {
      // skip invalid geometries
    }
  }

  if (minDistFt === Infinity) return { near: false, distanceFt: null };

  return {
    near: minDistFt <= bufferFt,
    distanceFt: Math.round(minDistFt),
  };
}
