/**
 * Geospatial utilities for planting planning tools:
 *  - Spacing rings & conflict detection
 *  - Distance measurement
 *  - Row planting (auto-fill a line)
 *  - Area fill (auto-fill a polygon)
 *  - Property boundary area calculation
 */

import { destination } from './turfLite';
import { createCirclePolygon } from './geoUtils';

const FT_TO_M = 0.3048;

// ─── Distance helpers ─────────────────────────────────────────────────────

/**
 * Haversine distance between two [lng, lat] points in meters.
 */
export function distanceMeters(a, b) {
  const R = 6371000;
  const dLat = ((b[1] - a[1]) * Math.PI) / 180;
  const dLng = ((b[0] - a[0]) * Math.PI) / 180;
  const sinLat = Math.sin(dLat / 2);
  const sinLng = Math.sin(dLng / 2);
  const h =
    sinLat * sinLat +
    Math.cos((a[1] * Math.PI) / 180) *
      Math.cos((b[1] * Math.PI) / 180) *
      sinLng * sinLng;
  return R * 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
}

export function distanceFeet(a, b) {
  return distanceMeters(a, b) / FT_TO_M;
}

export function formatDistance(meters) {
  const ft = meters / FT_TO_M;
  if (ft < 200) return `${Math.round(ft)} ft`;
  return `${(meters / 1000).toFixed(2)} km`;
}

// ─── Spacing rings GeoJSON ────────────────────────────────────────────────

/**
 * Generate GeoJSON circle polygons representing the recommended spacing
 * zone around each placed tree.
 */
export function generateSpacingRingsGeoJSON(trees, speciesMap) {
  const features = trees.map((tree) => {
    const species = speciesMap[tree.speciesId];
    if (!species) return null;

    const spacingFt = species.spacingFt || species.matureSpreadFt || 20;
    const radiusM = (spacingFt / 2) * FT_TO_M;
    const coords = createCirclePolygon([tree.lng, tree.lat], radiusM, 48);

    return {
      type: 'Feature',
      properties: {
        id: tree.id,
        spacingFt,
      },
      geometry: {
        type: 'Polygon',
        coordinates: [coords],
      },
    };
  }).filter(Boolean);

  return { type: 'FeatureCollection', features };
}

// ─── Spacing conflict detection ───────────────────────────────────────────

/**
 * Find pairs of trees whose spacing zones overlap.
 * Returns GeoJSON line features connecting conflicting tree pairs.
 */
export function generateSpacingConflictsGeoJSON(trees, speciesMap) {
  const features = [];

  for (let i = 0; i < trees.length; i++) {
    const a = trees[i];
    const spA = speciesMap[a.speciesId];
    if (!spA) continue;
    const radiusA = ((spA.spacingFt || spA.matureSpreadFt || 20) / 2) * FT_TO_M;

    for (let j = i + 1; j < trees.length; j++) {
      const b = trees[j];
      const spB = speciesMap[b.speciesId];
      if (!spB) continue;
      const radiusB = ((spB.spacingFt || spB.matureSpreadFt || 20) / 2) * FT_TO_M;

      const dist = distanceMeters([a.lng, a.lat], [b.lng, b.lat]);
      const minDist = radiusA + radiusB;

      // Use 90% threshold so trees at exactly recommended spacing don't false-flag
      if (dist < minDist * 0.9) {
        features.push({
          type: 'Feature',
          properties: {
            pairIds: [a.id, b.id],
            overlap: Math.round(((minDist - dist) / FT_TO_M)),
          },
          geometry: {
            type: 'LineString',
            coordinates: [[a.lng, a.lat], [b.lng, b.lat]],
          },
        });
      }
    }
  }

  return { type: 'FeatureCollection', features };
}

// ─── Ruler line GeoJSON ───────────────────────────────────────────────────

export function generateRulerGeoJSON(points) {
  if (!points || points.length < 2) return { type: 'FeatureCollection', features: [] };

  const dist = distanceMeters(points[0], points[1]);
  return {
    type: 'FeatureCollection',
    features: [{
      type: 'Feature',
      properties: {
        distance: dist,
        label: formatDistance(dist),
      },
      geometry: {
        type: 'LineString',
        coordinates: [points[0], points[1]],
      },
    }],
  };
}

export function generateRulerPointsGeoJSON(points) {
  return {
    type: 'FeatureCollection',
    features: (points || []).map((p, i) => ({
      type: 'Feature',
      properties: { index: i },
      geometry: { type: 'Point', coordinates: p },
    })),
  };
}

// ─── Row planting ─────────────────────────────────────────────────────────

/**
 * Generate trees along a straight line from `start` to `end`,
 * spaced according to the species' spacingFt.
 * @returns {Array<{lng, lat}>} Planting positions (excludes start if too close to boundary)
 */
export function computeRowPositions(start, end, spacingFt) {
  const spacingM = spacingFt * FT_TO_M;
  const totalDist = distanceMeters(start, end);
  if (totalDist < spacingM * 0.5) return [start];

  const count = Math.floor(totalDist / spacingM) + 1;
  const positions = [];

  // Bearing from start to end
  const dLng = end[0] - start[0];
  const dLat = end[1] - start[1];
  const bearingRad = Math.atan2(dLng * Math.cos((start[1] * Math.PI) / 180), dLat);
  const bearingDeg = ((bearingRad * 180) / Math.PI + 360) % 360;

  for (let i = 0; i < count; i++) {
    const distKm = (i * spacingM) / 1000;
    const pt = destination(start, distKm, bearingDeg);
    positions.push(pt);
  }

  return positions;
}

// ─── Area fill ────────────────────────────────────────────────────────────

/**
 * Fill a polygon with a grid of tree positions at the given spacing.
 * Uses a hex offset grid for more natural distribution.
 * @param {Array<[lng,lat]>} polygon - Ring of coordinates
 * @param {number} spacingFt
 * @returns {Array<[lng,lat]>}
 */
export function computeAreaFillPositions(polygon, spacingFt, pattern = 'hex') {
  if (!polygon || polygon.length < 3) return [];

  const spacingM = spacingFt * FT_TO_M;
  const positions = [];

  // Compute bounding box of the polygon
  let minLng = Infinity, maxLng = -Infinity, minLat = Infinity, maxLat = -Infinity;
  for (const [lng, lat] of polygon) {
    if (lng < minLng) minLng = lng;
    if (lng > maxLng) maxLng = lng;
    if (lat < minLat) minLat = lat;
    if (lat > maxLat) maxLat = lat;
  }

  // Convert spacing to approximate degrees
  const latPerM = 1 / 111320;
  const lngPerM = 1 / (111320 * Math.cos(((minLat + maxLat) / 2 * Math.PI) / 180));
  const dLat = spacingM * latPerM;
  const dLng = spacingM * lngPerM;
  // Hex (staggered) rows use sqrt(3)/2 vertical offset; grid uses full spacing
  const rowHeight = pattern === 'grid' ? dLat : dLat * 0.866;

  let row = 0;
  for (let lat = minLat + dLat / 2; lat <= maxLat; lat += rowHeight) {
    const offset = (pattern === 'hex' && row % 2 === 1) ? dLng / 2 : 0;
    for (let lng = minLng + dLng / 2 + offset; lng <= maxLng; lng += dLng) {
      if (pointInPolygon([lng, lat], polygon)) {
        positions.push([lng, lat]);
      }
    }
    row++;
  }

  return positions;
}

/**
 * Ray-casting point-in-polygon test.
 */
function pointInPolygon(point, polygon) {
  const [x, y] = point;
  let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const [xi, yi] = polygon[i];
    const [xj, yj] = polygon[j];
    if ((yi > y) !== (yj > y) && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) {
      inside = !inside;
    }
  }
  return inside;
}

// ─── Multi-species distribution ──────────────────────────────────────────

/**
 * Assign species to a list of planting positions following sustainable
 * forestry diversity rules.
 *
 * Rules:
 *  - No single species exceeds ~50% of the total (anti-monoculture).
 *  - Species with specified proportions are honoured first; remaining
 *    positions are distributed evenly among species without proportions.
 *  - Spatial interleaving: species are distributed in a shuffled pattern
 *    rather than planted in contiguous blocks.
 *
 * @param {Array<[lng,lat]>} positions - Grid/row positions
 * @param {Array<{speciesId: string, proportion?: number}>} mix
 *        Each entry has a speciesId and an optional proportion (0-1).
 *        If proportions are omitted, equal share is assumed.
 * @returns {Array<{lng: number, lat: number, speciesId: string}>}
 */
export function assignSpeciesToPositions(positions, mix) {
  if (!positions.length || !mix.length) return [];
  if (mix.length === 1) {
    return positions.map((p) => ({ lng: p[0], lat: p[1], speciesId: mix[0].speciesId }));
  }

  const n = positions.length;

  // Calculate target counts per species
  const hasProportion = mix.some((m) => m.proportion != null);
  let targets;

  if (hasProportion) {
    // Explicit proportions from a community mix — honour them exactly
    const totalProp = mix.reduce((s, m) => s + (m.proportion || 0), 0) || 1;
    targets = mix.map((m) => ({
      speciesId: m.speciesId,
      count: Math.max(1, Math.round(((m.proportion || (1 / mix.length)) / totalProp) * n)),
    }));
  } else {
    // No proportions (manual multi-select) — equal split with anti-monoculture cap
    const maxShare = 0.5;
    const perSpecies = Math.floor(n / mix.length);
    targets = mix.map((m) => ({ speciesId: m.speciesId, count: perSpecies }));
    const maxCount = Math.floor(n * maxShare);
    targets.forEach((t) => { t.count = Math.min(t.count, maxCount); });
  }

  // Fill remaining positions (from rounding or capping)
  let assigned = targets.reduce((s, t) => s + t.count, 0);
  let idx = 0;
  while (assigned < n) {
    targets[idx % targets.length].count++;
    assigned++;
    idx++;
  }

  // Build species assignment array and shuffle for spatial interleaving
  const assignments = [];
  targets.forEach((t) => {
    for (let i = 0; i < t.count; i++) assignments.push(t.speciesId);
  });

  // Fisher-Yates shuffle
  for (let i = assignments.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [assignments[i], assignments[j]] = [assignments[j], assignments[i]];
  }

  return positions.map((p, i) => ({
    lng: p[0],
    lat: p[1],
    speciesId: assignments[i % assignments.length],
  }));
}

// ─── Property boundary ───────────────────────────────────────────────────

/**
 * Calculate the area of a polygon in square meters using the Shoelace formula
 * with geodesic correction.
 */
export function polygonAreaSqM(polygon) {
  if (!polygon || polygon.length < 3) return 0;

  // Convert to approximate meters using center latitude
  const centerLat = polygon.reduce((s, p) => s + p[1], 0) / polygon.length;
  const latToM = 111320;
  const lngToM = 111320 * Math.cos((centerLat * Math.PI) / 180);

  let area = 0;
  for (let i = 0; i < polygon.length; i++) {
    const j = (i + 1) % polygon.length;
    const xi = polygon[i][0] * lngToM;
    const yi = polygon[i][1] * latToM;
    const xj = polygon[j][0] * lngToM;
    const yj = polygon[j][1] * latToM;
    area += xi * yj - xj * yi;
  }

  return Math.abs(area / 2);
}

export function polygonAreaAcres(polygon) {
  return polygonAreaSqM(polygon) / 4046.86;
}

/**
 * Generate a GeoJSON polygon for the boundary.
 */
export function generateBoundaryGeoJSON(polygon) {
  if (!polygon || polygon.length < 3) return { type: 'FeatureCollection', features: [] };

  const closed = [...polygon];
  if (closed[0][0] !== closed[closed.length - 1][0] || closed[0][1] !== closed[closed.length - 1][1]) {
    closed.push(closed[0]);
  }

  const areaSqM = polygonAreaSqM(polygon);
  return {
    type: 'FeatureCollection',
    features: [{
      type: 'Feature',
      properties: {
        areaSqM,
        areaAcres: (areaSqM / 4046.86).toFixed(2),
        areaSqFt: Math.round(areaSqM / 0.0929),
      },
      geometry: {
        type: 'Polygon',
        coordinates: [closed],
      },
    }],
  };
}

export function generateBoundaryPointsGeoJSON(points) {
  return {
    type: 'FeatureCollection',
    features: (points || []).map((p, i) => ({
      type: 'Feature',
      properties: { index: i },
      geometry: { type: 'Point', coordinates: p },
    })),
  };
}
