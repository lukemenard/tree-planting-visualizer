/**
 * Realistic top-down aerial-view SVG canopy icons.
 * Each shape simulates what the species canopy looks like from directly above
 * on satellite imagery -- irregular leaf clusters, branch patterns, natural edges.
 * Rendered at 128x128 for detail; Mapbox scales them geographically via expressions.
 */

import { getGrowthFactor } from './geoUtils';

const SIZE = 128;
const C = SIZE / 2; // center

function svgToImage(svgString, size = SIZE) {
  return new Promise((resolve) => {
    const img = new Image(size, size);
    const blob = new Blob([svgString], { type: 'image/svg+xml' });
    const url = URL.createObjectURL(blob);
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.src = url;
  });
}

// Simple color utility functions
function lighten(hex, pct) {
  const [r, g, b] = hexToRgb(hex);
  return rgbToHex(
    Math.min(255, r + Math.round((255 - r) * pct / 100)),
    Math.min(255, g + Math.round((255 - g) * pct / 100)),
    Math.min(255, b + Math.round((255 - b) * pct / 100))
  );
}

function darken(hex, pct) {
  const [r, g, b] = hexToRgb(hex);
  return rgbToHex(
    Math.max(0, Math.round(r * (1 - pct / 100))),
    Math.max(0, Math.round(g * (1 - pct / 100))),
    Math.max(0, Math.round(b * (1 - pct / 100)))
  );
}

function hexToRgb(hex) {
  return [
    parseInt(hex.slice(1, 3), 16),
    parseInt(hex.slice(3, 5), 16),
    parseInt(hex.slice(5, 7), 16),
  ];
}

function rgbToHex(r, g, b) {
  return '#' + [r, g, b].map(c => c.toString(16).padStart(2, '0')).join('');
}

/**
 * Generate a set of overlapping leaf cluster circles to create an organic canopy.
 * Returns SVG circle elements as a string.
 */
function leafClusters(cx, cy, baseR, color, count, spread, opRange = [0.3, 0.7]) {
  let svg = '';
  const rng = mulberry32(cx * 100 + cy); // deterministic pseudo-random
  for (let i = 0; i < count; i++) {
    const angle = rng() * Math.PI * 2;
    const dist = rng() * spread;
    const x = cx + Math.cos(angle) * dist;
    const y = cy + Math.sin(angle) * dist;
    const r = baseR * (0.4 + rng() * 0.6);
    const op = opRange[0] + rng() * (opRange[1] - opRange[0]);
    const shade = rng() > 0.5 ? lighten(color, rng() * 25) : darken(color, rng() * 20);
    svg += `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="${r.toFixed(1)}" fill="${shade}" opacity="${op.toFixed(2)}"/>`;
  }
  return svg;
}

// Simple seeded PRNG for deterministic leaf placement
function mulberry32(seed) {
  let s = seed | 0;
  return function () {
    s = (s + 0x6D2B79F5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Shape generators -- each returns a full SVG string.
 * They produce organic, aerial-view canopy patterns.
 */
const canopyShapes = {
  // Round canopy (Red Oak, Sugar Maple, etc.) -- irregular leafy mass
  round: (color) => {
    const d = darken(color, 25);
    const l = lighten(color, 20);
    const l2 = lighten(color, 35);
    return `<svg xmlns="http://www.w3.org/2000/svg" width="${SIZE}" height="${SIZE}" viewBox="0 0 ${SIZE} ${SIZE}">
      <defs>
        <radialGradient id="bg" cx="45%" cy="42%">
          <stop offset="0%" stop-color="${l}" stop-opacity="0.95"/>
          <stop offset="55%" stop-color="${color}" stop-opacity="0.9"/>
          <stop offset="85%" stop-color="${d}" stop-opacity="0.75"/>
          <stop offset="100%" stop-color="${d}" stop-opacity="0"/>
        </radialGradient>
      </defs>
      <circle cx="${C}" cy="${C}" r="58" fill="url(#bg)"/>
      ${leafClusters(C - 8, C - 10, 18, l, 7, 22, [0.25, 0.5])}
      ${leafClusters(C + 5, C + 3, 16, color, 8, 26, [0.2, 0.45])}
      ${leafClusters(C, C - 5, 12, l2, 5, 18, [0.15, 0.35])}
      <circle cx="${C}" cy="${C}" r="3" fill="${darken(color, 40)}" opacity="0.5"/>
    </svg>`;
  },

  // Oval canopy (Bald Cypress, some Maples) -- taller than wide from above
  oval: (color) => {
    const d = darken(color, 25);
    const l = lighten(color, 20);
    return `<svg xmlns="http://www.w3.org/2000/svg" width="${SIZE}" height="${SIZE}" viewBox="0 0 ${SIZE} ${SIZE}">
      <defs>
        <radialGradient id="bg" cx="45%" cy="40%">
          <stop offset="0%" stop-color="${l}" stop-opacity="0.95"/>
          <stop offset="55%" stop-color="${color}" stop-opacity="0.9"/>
          <stop offset="85%" stop-color="${d}" stop-opacity="0.7"/>
          <stop offset="100%" stop-color="${d}" stop-opacity="0"/>
        </radialGradient>
      </defs>
      <ellipse cx="${C}" cy="${C}" rx="48" ry="56" fill="url(#bg)"/>
      ${leafClusters(C, C - 8, 16, l, 6, 20, [0.25, 0.5])}
      ${leafClusters(C - 5, C + 5, 14, color, 6, 22, [0.2, 0.4])}
      <circle cx="${C}" cy="${C}" r="3" fill="${darken(color, 40)}" opacity="0.45"/>
    </svg>`;
  },

  // Conical canopy (Pine, Spruce, Fir) -- star-shaped from above with radiating branches
  conical: (color) => {
    const d = darken(color, 30);
    const l = lighten(color, 15);
    const l2 = lighten(color, 30);
    // Create radiating branch pattern
    let branches = '';
    for (let i = 0; i < 8; i++) {
      const angle = (i / 8) * Math.PI * 2 + 0.2;
      const len = 38 + (i % 3) * 6;
      const x2 = C + Math.cos(angle) * len;
      const y2 = C + Math.sin(angle) * len;
      branches += `<line x1="${C}" y1="${C}" x2="${x2.toFixed(1)}" y2="${y2.toFixed(1)}" stroke="${d}" stroke-width="2.5" opacity="0.35"/>`;
      // Needle clusters along branch
      for (let j = 1; j <= 3; j++) {
        const frac = j * 0.3;
        const bx = C + Math.cos(angle) * len * frac;
        const by = C + Math.sin(angle) * len * frac;
        const perpA = angle + Math.PI / 2;
        const spread = 8 + j * 4;
        branches += `<ellipse cx="${(bx + Math.cos(perpA) * 3).toFixed(1)}" cy="${(by + Math.sin(perpA) * 3).toFixed(1)}" rx="${spread}" ry="${(spread * 0.5)}" transform="rotate(${(angle * 180 / Math.PI).toFixed(0)} ${bx.toFixed(1)} ${by.toFixed(1)})" fill="${i % 2 ? l : color}" opacity="0.35"/>`;
      }
    }
    return `<svg xmlns="http://www.w3.org/2000/svg" width="${SIZE}" height="${SIZE}" viewBox="0 0 ${SIZE} ${SIZE}">
      <defs>
        <radialGradient id="bg" cx="50%" cy="50%">
          <stop offset="0%" stop-color="${l2}" stop-opacity="0.9"/>
          <stop offset="40%" stop-color="${color}" stop-opacity="0.85"/>
          <stop offset="80%" stop-color="${d}" stop-opacity="0.65"/>
          <stop offset="100%" stop-color="${d}" stop-opacity="0"/>
        </radialGradient>
      </defs>
      <circle cx="${C}" cy="${C}" r="52" fill="url(#bg)"/>
      ${branches}
      ${leafClusters(C, C, 8, l, 4, 10, [0.3, 0.6])}
      <circle cx="${C}" cy="${C}" r="4" fill="${l2}" opacity="0.7"/>
    </svg>`;
  },

  // Columnar canopy (Italian Cypress, Arborvitae) -- tight narrow cluster from above
  columnar: (color) => {
    const d = darken(color, 25);
    const l = lighten(color, 20);
    return `<svg xmlns="http://www.w3.org/2000/svg" width="${SIZE}" height="${SIZE}" viewBox="0 0 ${SIZE} ${SIZE}">
      <defs>
        <radialGradient id="bg" cx="48%" cy="45%">
          <stop offset="0%" stop-color="${l}" stop-opacity="0.95"/>
          <stop offset="50%" stop-color="${color}" stop-opacity="0.9"/>
          <stop offset="85%" stop-color="${d}" stop-opacity="0.7"/>
          <stop offset="100%" stop-color="${d}" stop-opacity="0"/>
        </radialGradient>
      </defs>
      <ellipse cx="${C}" cy="${C}" rx="30" ry="34" fill="url(#bg)"/>
      ${leafClusters(C, C, 10, l, 5, 12, [0.3, 0.55])}
      ${leafClusters(C, C, 7, color, 4, 8, [0.2, 0.4])}
      <circle cx="${C}" cy="${C}" r="3" fill="${darken(color, 40)}" opacity="0.5"/>
    </svg>`;
  },

  // Vase canopy (Elm, Zelkova) -- wide open crown, visible branch structure
  vase: (color) => {
    const d = darken(color, 25);
    const l = lighten(color, 22);
    // Create Y-shaped branching visible through canopy
    let branches = '';
    const angles = [-0.6, -0.2, 0.3, 0.7, 1.2, 1.7, 2.2, 2.7, 3.2, 3.7, 4.2, 4.8];
    angles.forEach((a, i) => {
      const len = 30 + (i % 3) * 10;
      const x2 = C + Math.cos(a) * len;
      const y2 = C + Math.sin(a) * len;
      branches += `<line x1="${C}" y1="${C}" x2="${x2.toFixed(1)}" y2="${y2.toFixed(1)}" stroke="${darken(color, 35)}" stroke-width="1.5" opacity="0.2"/>`;
    });
    return `<svg xmlns="http://www.w3.org/2000/svg" width="${SIZE}" height="${SIZE}" viewBox="0 0 ${SIZE} ${SIZE}">
      <defs>
        <radialGradient id="bg" cx="45%" cy="42%">
          <stop offset="0%" stop-color="${l}" stop-opacity="0.7"/>
          <stop offset="30%" stop-color="${color}" stop-opacity="0.85"/>
          <stop offset="70%" stop-color="${color}" stop-opacity="0.85"/>
          <stop offset="95%" stop-color="${d}" stop-opacity="0.6"/>
          <stop offset="100%" stop-color="${d}" stop-opacity="0"/>
        </radialGradient>
      </defs>
      <circle cx="${C}" cy="${C}" r="56" fill="url(#bg)"/>
      ${branches}
      ${leafClusters(C - 15, C - 12, 16, l, 5, 18, [0.3, 0.55])}
      ${leafClusters(C + 12, C - 8, 14, color, 5, 16, [0.25, 0.5])}
      ${leafClusters(C - 5, C + 14, 15, l, 4, 20, [0.2, 0.45])}
      ${leafClusters(C + 10, C + 10, 13, color, 4, 14, [0.25, 0.5])}
      <circle cx="${C}" cy="${C}" r="6" fill="${darken(color, 30)}" opacity="0.25"/>
    </svg>`;
  },

  // Weeping canopy (Willow) -- large soft circle with feathered drooping edges
  weeping: (color) => {
    const d = darken(color, 20);
    const l = lighten(color, 25);
    // Drooping fringe effect
    let fringe = '';
    for (let i = 0; i < 24; i++) {
      const angle = (i / 24) * Math.PI * 2;
      const baseR = 44 + Math.sin(i * 1.7) * 6;
      const x = C + Math.cos(angle) * baseR;
      const y = C + Math.sin(angle) * baseR;
      fringe += `<ellipse cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" rx="10" ry="6" transform="rotate(${(angle * 180 / Math.PI).toFixed(0)} ${x.toFixed(1)} ${y.toFixed(1)})" fill="${d}" opacity="0.3"/>`;
    }
    return `<svg xmlns="http://www.w3.org/2000/svg" width="${SIZE}" height="${SIZE}" viewBox="0 0 ${SIZE} ${SIZE}">
      <defs>
        <radialGradient id="bg" cx="48%" cy="46%">
          <stop offset="0%" stop-color="${l}" stop-opacity="0.9"/>
          <stop offset="40%" stop-color="${color}" stop-opacity="0.85"/>
          <stop offset="70%" stop-color="${d}" stop-opacity="0.7"/>
          <stop offset="100%" stop-color="${d}" stop-opacity="0"/>
        </radialGradient>
      </defs>
      <circle cx="${C}" cy="${C}" r="60" fill="url(#bg)"/>
      ${fringe}
      ${leafClusters(C, C - 5, 14, l, 6, 20, [0.2, 0.45])}
      ${leafClusters(C, C + 5, 12, color, 5, 16, [0.2, 0.4])}
      <circle cx="${C}" cy="${C}" r="4" fill="${darken(color, 35)}" opacity="0.4"/>
    </svg>`;
  },

  // Spreading canopy (Live Oak) -- very wide, irregular, with visible structure
  spreading: (color) => {
    const d = darken(color, 25);
    const l = lighten(color, 18);
    const l2 = lighten(color, 30);
    // Spreading branches visible underneath
    let branches = '';
    const bAngles = [0.3, 1.0, 1.8, 2.5, 3.3, 4.1, 4.9, 5.6];
    bAngles.forEach((a, i) => {
      const len = 35 + (i % 3) * 8;
      const x2 = C + Math.cos(a) * len;
      const y2 = C + Math.sin(a) * len;
      branches += `<line x1="${C}" y1="${C}" x2="${x2.toFixed(1)}" y2="${y2.toFixed(1)}" stroke="${darken(color, 40)}" stroke-width="2" opacity="0.2"/>`;
    });
    return `<svg xmlns="http://www.w3.org/2000/svg" width="${SIZE}" height="${SIZE}" viewBox="0 0 ${SIZE} ${SIZE}">
      <defs>
        <radialGradient id="bg" cx="42%" cy="44%">
          <stop offset="0%" stop-color="${l}" stop-opacity="0.95"/>
          <stop offset="50%" stop-color="${color}" stop-opacity="0.88"/>
          <stop offset="85%" stop-color="${d}" stop-opacity="0.65"/>
          <stop offset="100%" stop-color="${d}" stop-opacity="0"/>
        </radialGradient>
      </defs>
      <ellipse cx="${C}" cy="${C}" rx="60" ry="50" fill="url(#bg)"/>
      ${branches}
      ${leafClusters(C - 18, C - 8, 18, l, 6, 22, [0.25, 0.5])}
      ${leafClusters(C + 15, C - 5, 16, color, 6, 20, [0.2, 0.45])}
      ${leafClusters(C - 8, C + 12, 15, l, 5, 18, [0.2, 0.45])}
      ${leafClusters(C + 12, C + 14, 14, l2, 4, 16, [0.15, 0.35])}
      <circle cx="${C}" cy="${C}" r="5" fill="${darken(color, 35)}" opacity="0.35"/>
    </svg>`;
  },

  // Fan canopy (Palm) -- star/fan pattern with visible fronds
  fan: (color) => {
    const d = darken(color, 30);
    const l = lighten(color, 25);
    const l2 = lighten(color, 40);
    // Radiating palm fronds
    let fronds = '';
    const frondCount = 12;
    for (let i = 0; i < frondCount; i++) {
      const angle = (i / frondCount) * Math.PI * 2 + 0.15;
      const len = 48;
      const x2 = C + Math.cos(angle) * len;
      const y2 = C + Math.sin(angle) * len;
      // Main frond spine
      fronds += `<line x1="${C}" y1="${C}" x2="${x2.toFixed(1)}" y2="${y2.toFixed(1)}" stroke="${darken(color, 20)}" stroke-width="1.5" opacity="0.5"/>`;
      // Frond leaf shape
      const perpA = angle + Math.PI / 2;
      const midX = C + Math.cos(angle) * len * 0.55;
      const midY = C + Math.sin(angle) * len * 0.55;
      fronds += `<ellipse cx="${midX.toFixed(1)}" cy="${midY.toFixed(1)}" rx="${(len * 0.45).toFixed(1)}" ry="8" transform="rotate(${(angle * 180 / Math.PI).toFixed(0)} ${midX.toFixed(1)} ${midY.toFixed(1)})" fill="${i % 2 ? l : color}" opacity="0.55"/>`;
    }
    return `<svg xmlns="http://www.w3.org/2000/svg" width="${SIZE}" height="${SIZE}" viewBox="0 0 ${SIZE} ${SIZE}">
      <defs>
        <radialGradient id="bg" cx="50%" cy="50%">
          <stop offset="0%" stop-color="${l2}" stop-opacity="0.8"/>
          <stop offset="30%" stop-color="${color}" stop-opacity="0.3"/>
          <stop offset="100%" stop-color="${d}" stop-opacity="0"/>
        </radialGradient>
      </defs>
      <circle cx="${C}" cy="${C}" r="52" fill="url(#bg)"/>
      ${fronds}
      <circle cx="${C}" cy="${C}" r="6" fill="${d}" opacity="0.6"/>
      <circle cx="${C}" cy="${C}" r="3.5" fill="${l2}" opacity="0.5"/>
    </svg>`;
  },
};

/**
 * Load all tree canopy icons into a Mapbox map instance.
 */
export async function loadTreeIcons(map, species) {
  for (const s of species) {
    const iconId = `tree-${s.id}`;
    if (map.hasImage(iconId)) continue;

    const shapeFn = canopyShapes[s.canopyShape] || canopyShapes.round;
    const svgString = shapeFn(s.color);
    const img = await svgToImage(svgString);
    if (!map.hasImage(iconId)) {
      map.addImage(iconId, img, { sdf: false });
    }
  }
}

/**
 * Generate GeoJSON for tree icon symbols.
 * Each feature includes sizeAtZ17 for geographic scaling via Mapbox expressions.
 *
 * At zoom 17, ~0.9 meters/pixel (at mid-latitudes).
 * For a tree with diameter D meters: pixels = D / 0.9, icon-size = pixels / SVG_SIZE
 */
export function generateTreeIconGeoJSON(trees, speciesMap, projectionYear) {
  const features = trees.map((tree) => {
    const species = speciesMap[tree.speciesId];
    if (!species) return null;

    const gf = getGrowthFactor(projectionYear, species.growthSpeed ?? species.growthRate);
    const diameterMeters = species.canopyRadius * 2 * gf;
    // At zoom 17, ~0.9m/px at 40° latitude. icon-size = (diameter_px) / SVG_SIZE
    const pixelsAtZ17 = diameterMeters / 0.9;
    const sizeAtZ17 = Math.max(0.05, pixelsAtZ17 / SIZE);

    return {
      type: 'Feature',
      properties: {
        id: tree.id,
        icon: `tree-${tree.speciesId}`,
        sizeAtZ17: sizeAtZ17,
      },
      geometry: {
        type: 'Point',
        coordinates: [tree.lng, tree.lat],
      },
    };
  }).filter(Boolean);
  return { type: 'FeatureCollection', features };
}

