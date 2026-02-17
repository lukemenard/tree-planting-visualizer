import * as turf from './turfLite';
import { projectStand } from '../models/forestryModel';
import { getSeasonalColor } from './seasonalColors';

/**
 * Create a GeoJSON circle polygon from a center point and radius.
 */
export function createCirclePolygon(center, radiusMeters, steps = 32) {
  const coords = [];
  const km = radiusMeters / 1000;

  for (let i = 0; i <= steps; i++) {
    const angle = (i / steps) * 360;
    const point = turf.destination(center, km, angle);
    coords.push(point);
  }

  return coords;
}

/**
 * Fallback string-to-number mapping for legacy growthRate strings.
 */
const GROWTH_SPEED_FALLBACK = { fast: 1.4, moderate: 1.0, slow: 0.6 };

/**
 * Get a growth multiplier for a given projection year, adjusted for
 * species-specific growth speed.
 *
 * @param {number|null} projectionYear  Year in the projection (0-80), or null for mature
 * @param {number|string} [growthSpeed] Continuous speed multiplier (0.3-2.0) or legacy
 *                                       string ('fast'/'moderate'/'slow'). Default 1.0.
 * @returns {number} 0.15 (sapling) to 1.0 (mature)
 */
export function getGrowthFactor(projectionYear, growthSpeed) {
  if (projectionYear === null || projectionYear === undefined) return 1.0;
  if (projectionYear <= 0) return 0.15;

  let speed;
  if (typeof growthSpeed === 'number') {
    speed = growthSpeed;
  } else if (typeof growthSpeed === 'string') {
    speed = GROWTH_SPEED_FALLBACK[growthSpeed] || 1.0;
  } else {
    speed = 1.0;
  }

  const t = (projectionYear * speed) / 30;
  return Math.min(1.0, 0.15 + 0.85 * (1 - Math.exp(-3 * t)));
}

/**
 * Build a lookup from projected tree data keyed by tree id.
 * Returns null if projection fails or isn't needed.
 */
function buildProjectedLookup(trees, speciesMap, projectionYear, siteIndex, prescription) {
  if (projectionYear === null || projectionYear === undefined) return null;
  if (siteIndex === undefined) return null;
  try {
    const result = projectStand(trees, speciesMap, projectionYear, siteIndex, null, prescription);
    const lookup = {};
    for (const t of result.trees) {
      lookup[t.id] = t;
    }
    return lookup;
  } catch {
    return null;
  }
}

/**
 * Generate a subtle ground shadow beneath each tree canopy.
 */
export function generateCanopyShadowGeoJSON(trees, speciesMap, projectionYear, siteIndex, prescription, season = 'summer') {
  const projected = buildProjectedLookup(trees, speciesMap, projectionYear, siteIndex, prescription);

  const features = trees.map((tree) => {
    const species = speciesMap instanceof Map
      ? speciesMap.get(tree.speciesId)
      : speciesMap[tree.speciesId];
    if (!species) return null;

    let r;
    const pt = projected?.[tree.id];
    if (pt && pt.alive && !pt.harvested) {
      r = (pt.crownWidthFt / 2) * 0.3048;
    } else if (pt && (!pt.alive || pt.harvested)) {
      return null;
    } else {
      const gf = getGrowthFactor(projectionYear, species.growthSpeed ?? species.growthRate);
      r = species.canopyRadius * gf;
    }

    const coords = createCirclePolygon([tree.lng, tree.lat], Math.max(0.5, r), 24);
    const { canopyColor, opacity } = getSeasonalColor(species, season);

    return {
      type: 'Feature',
      properties: {
        id: tree.id,
        speciesId: tree.speciesId,
        color: canopyColor,
        seasonalOpacity: opacity,
      },
      geometry: {
        type: 'Polygon',
        coordinates: [coords],
      },
    };
  }).filter(Boolean);

  return { type: 'FeatureCollection', features };
}

/**
 * Generate GeoJSON for 3D tree models (Mapbox `model` layer).
 * Uses forestry model output for dimensions when site index is available.
 */
export function generateTreeModelGeoJSON(trees, speciesMap, projectionYear, siteIndex, prescription) {
  const projected = buildProjectedLookup(trees, speciesMap, projectionYear, siteIndex, prescription);

  const features = trees.map((tree) => {
    const species = speciesMap instanceof Map
      ? speciesMap.get(tree.speciesId)
      : speciesMap[tree.speciesId];
    if (!species) return null;

    const shape = species.canopyShape || 'round';
    let canopyDiameter, treeHeight, crownRatio, alive;

    const pt = projected?.[tree.id];
    if (pt && pt.alive && !pt.harvested) {
      canopyDiameter = pt.crownWidthFt * 0.3048; // ft to meters
      treeHeight = pt.heightFt * 0.3048;
      crownRatio = pt.crownRatio ?? 0.5;
      alive = true;
    } else if (pt && (!pt.alive || pt.harvested)) {
      // Dead/harvested: show as snag if dead, skip if harvested
      if (pt.harvested) return null;
      // Dead tree snag
      canopyDiameter = (pt.crownWidthFt || 5) * 0.3048 * 0.3;
      treeHeight = (pt.heightFt || 10) * 0.3048 * 0.8;
      crownRatio = 0;
      alive = false;
    } else {
      const gf = getGrowthFactor(projectionYear, species.growthSpeed ?? species.growthRate);
      canopyDiameter = species.canopyRadius * 2 * gf;
      treeHeight = (species.height || species.canopyRadius * 2) * gf;
      crownRatio = 0.6;
      alive = true;
    }

    const sx = canopyDiameter;
    const sy = canopyDiameter;
    const sz = treeHeight;

    const hex = species.color || '#2d5a27';
    const r = parseInt(hex.slice(1, 3), 16) / 255;
    const g = parseInt(hex.slice(3, 5), 16) / 255;
    const b = parseInt(hex.slice(5, 7), 16) / 255;

    // Determine species group for model type
    const speciesGroup = species.speciesGroup || 'default';

    return {
      type: 'Feature',
      properties: {
        id: tree.id,
        speciesId: tree.speciesId,
        modelId: `tree-${shape}`,
        scale: [sx, sy, sz],
        color: [r, g, b],
        speciesName: species.name || '',
        speciesGroup,
        crownRatio,
        alive,
        canopyShape: shape,
        category: species.category || 'deciduous',
      },
      geometry: {
        type: 'Point',
        coordinates: [tree.lng, tree.lat],
      },
    };
  }).filter(Boolean);

  return { type: 'FeatureCollection', features };
}

/**
 * Generate fill-extrusion GeoJSON for 3D tree trunk + canopy rendering.
 * Each tree produces two polygon features:
 *   1. A small circle for the trunk (brown, extruded to trunk height)
 *   2. A larger circle for the canopy (green, extruded from trunk top to total height)
 *
 * The canopy circle has a base-height = trunk height, so it "floats" above the trunk.
 * This creates a visible 3D tree shape using native Mapbox fill-extrusion.
 */
export function generateTree3DExtrusionGeoJSON(trees, speciesMap, projectionYear, siteIndex, prescription, season = 'summer') {
  const projected = buildProjectedLookup(trees, speciesMap, projectionYear, siteIndex, prescription);
  const features = [];

  for (const tree of trees) {
    const species = speciesMap instanceof Map
      ? speciesMap.get(tree.speciesId)
      : speciesMap[tree.speciesId];
    if (!species) continue;

    let crownWidthM, treeHeightM, crownRatio, alive;

    const pt = projected?.[tree.id];
    if (pt && pt.alive && !pt.harvested) {
      crownWidthM = pt.crownWidthFt * 0.3048;
      treeHeightM = pt.heightFt * 0.3048;
      crownRatio = pt.crownRatio ?? 0.5;
      alive = true;
    } else if (pt && pt.harvested) {
      continue;
    } else if (pt && !pt.alive) {
      // Dead tree snag
      crownWidthM = 1;
      treeHeightM = (pt.heightFt || 10) * 0.3048 * 0.7;
      crownRatio = 0;
      alive = false;
    } else {
      const gf = getGrowthFactor(projectionYear, species.growthSpeed ?? species.growthRate);
      crownWidthM = species.canopyRadius * 2 * gf * 0.3048;
      treeHeightM = ((species.height || species.canopyRadius * 2) * gf) * 0.3048;
      crownRatio = 0.6;
      alive = true;
    }

    const group = species.speciesGroup || 'default';
    const center = [tree.lng, tree.lat];

    // Model type characteristics
    let trunkRatio = 0.35;
    let trunkWidthRatio = 0.06;
    if (['pine-hard', 'pine-soft'].includes(group)) { trunkRatio = 0.35; trunkWidthRatio = 0.05; }
    else if (['spruce', 'fir'].includes(group)) { trunkRatio = 0.15; trunkWidthRatio = 0.04; }
    else if (['cedar', 'cypress', 'redwood'].includes(group)) { trunkRatio = 0.20; trunkWidthRatio = 0.04; }
    else if (group === 'palm') { trunkRatio = 0.80; trunkWidthRatio = 0.04; }
    else if (['walnut', 'sycamore'].includes(group)) { trunkRatio = 0.30; trunkWidthRatio = 0.08; }
    else if (['poplar', 'sweetgum', 'birch'].includes(group)) { trunkRatio = 0.40; trunkWidthRatio = 0.05; }

    const trunkHeightM = treeHeightM * trunkRatio;
    const trunkRadiusM = Math.max(0.15, treeHeightM * trunkWidthRatio);
    const canopyRadiusM = Math.max(0.5, crownWidthM / 2);

    // Seasonal + vigor color
    let trunkColor = '#5D4037';
    let canopyColor;

    if (!alive) {
      canopyColor = '#666666';
      trunkColor = '#888888';
    } else {
      const seasonal = getSeasonalColor(species, season);
      canopyColor = seasonal.canopyColor;

      // Crown ratio color adjustment overrides seasonal for stressed trees
      if (crownRatio < 0.2) {
        canopyColor = '#999977';
      } else if (crownRatio < 0.3) {
        canopyColor = '#8B7355';
      }
    }

    // Trunk feature
    const trunkCoords = createCirclePolygon(center, trunkRadiusM, 8);
    features.push({
      type: 'Feature',
      properties: {
        treeId: tree.id,
        part: 'trunk',
        height: trunkHeightM,
        baseHeight: 0,
        color: trunkColor,
      },
      geometry: {
        type: 'Polygon',
        coordinates: [trunkCoords],
      },
    });

    // Canopy feature (only if alive or showing snag)
    if (alive) {
      const canopyCoords = createCirclePolygon(center, canopyRadiusM, 16);
      features.push({
        type: 'Feature',
        properties: {
          treeId: tree.id,
          part: 'canopy',
          height: treeHeightM,
          baseHeight: trunkHeightM,
          color: canopyColor,
        },
        geometry: {
          type: 'Polygon',
          coordinates: [canopyCoords],
        },
      });
    }
  }

  return { type: 'FeatureCollection', features };
}

/**
 * Generate GeoJSON point features for the heatmap layer.
 */
export function generateHeatmapGeoJSON(trees, speciesMap) {
  const features = trees.map((tree) => {
    const species = speciesMap instanceof Map
      ? speciesMap.get(tree.speciesId)
      : speciesMap[tree.speciesId];
    if (!species) return null;

    return {
      type: 'Feature',
      properties: {
        intensity: species.canopyRadius / 8,
      },
      geometry: {
        type: 'Point',
        coordinates: [tree.lng, tree.lat],
      },
    };
  }).filter(Boolean);

  return { type: 'FeatureCollection', features };
}
