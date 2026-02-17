/**
 * Flora API client (Perenual) for fetching tree species data.
 *
 * Key behaviors:
 *  - Uses Perenual v2 API endpoints
 *  - The species-list endpoint does NOT return a `type` field, so we
 *    identify trees by searching for known tree genera/names and by
 *    fetching details for promising results.
 *  - Caches results in localStorage with a 7-day TTL.
 *  - When no API key is configured, returns empty results and the app
 *    falls back to bundled species.
 */

const API_BASE = 'https://perenual.com/api/v2';
const CACHE_PREFIX = 'flora_cache_';
const CACHE_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

function getApiKey() {
  return import.meta.env.VITE_FLORA_API_KEY || null;
}

// ─── Cache helpers ──────────────────────────────────────────────────────

function getCached(key) {
  try {
    const raw = localStorage.getItem(CACHE_PREFIX + key);
    if (!raw) return null;
    const { data, timestamp } = JSON.parse(raw);
    if (Date.now() - timestamp > CACHE_TTL_MS) {
      localStorage.removeItem(CACHE_PREFIX + key);
      return null;
    }
    return data;
  } catch {
    return null;
  }
}

function setCache(key, data) {
  try {
    localStorage.setItem(
      CACHE_PREFIX + key,
      JSON.stringify({ data, timestamp: Date.now() })
    );
  } catch {
    // localStorage may be full
  }
}

// ─── Hardiness zones per state ──────────────────────────────────────────

const STATE_HARDINESS = {
  AL: '7', AK: '4', AZ: '7', AR: '7', CA: '9',
  CO: '5', CT: '6', DE: '7', FL: '9', GA: '8',
  HI: '11', ID: '5', IL: '5', IN: '5', IA: '5',
  KS: '6', KY: '6', LA: '9', ME: '4', MD: '7',
  MA: '6', MI: '5', MN: '4', MS: '8', MO: '6',
  MT: '4', NE: '5', NV: '6', NH: '5', NJ: '7',
  NM: '6', NY: '6', NC: '7', ND: '3', OH: '6',
  OK: '7', OR: '7', PA: '6', RI: '6', SC: '8',
  SD: '4', TN: '7', TX: '8', UT: '5', VT: '4',
  VA: '7', WA: '7', WV: '6', WI: '4', WY: '4',
};

// ─── Tree-specific search queries ───────────────────────────────────────
// The species-list endpoint doesn't have a "type=tree" filter, so we
// search for known tree terms and filter by genus.

const TREE_SEARCH_TERMS = [
  'oak', 'maple', 'pine', 'birch', 'elm', 'willow',
  'cedar', 'spruce', 'palm', 'ash', 'poplar', 'beech',
  'hickory', 'walnut', 'magnolia', 'dogwood', 'cherry',
  'redwood', 'cypress', 'sycamore',
];

// Known tree genera (for filtering species-list results that lack `type`)
const TREE_GENERA = new Set([
  'quercus', 'acer', 'pinus', 'betula', 'ulmus', 'salix',
  'cedrus', 'picea', 'abies', 'populus', 'fagus', 'carya',
  'juglans', 'magnolia', 'cornus', 'prunus', 'sequoia',
  'taxodium', 'cupressus', 'cupressocyparis', 'platanus', 'tilia', 'fraxinus',
  'liquidambar', 'liriodendron', 'cercis', 'gleditsia',
  'nyssa', 'tsuga', 'thuja', 'juniperus', 'larix',
  'roystonea', 'sabal', 'washingtonia', 'phoenix', 'syagrus',
  'lagerstroemia', 'ginkgo', 'metasequoia', 'cryptomeria',
  'catalpa', 'robinia', 'ailanthus', 'koelreuteria',
  'zelkova', 'malus', 'pyrus', 'ficus', 'morus',
  'celtis', 'carpinus', 'ostrya', 'sassafras', 'diospyros',
  'araucaria', 'podocarpus', 'ilex', 'persea', 'citrus',
  'davidia', 'halesia', 'oxydendrum', 'chionanthus', 'amelanchier',
  'crataegus', 'sorbus', 'alnus', 'taxus', 'chamaecyparis',
  'calocedrus', 'pseudotsuga', 'libocedrus',
]);

// ─── Canopy shape inference ─────────────────────────────────────────────

function inferCanopyShape(plant) {
  const name = (plant.common_name || '').toLowerCase();
  const genus = (plant.genus || '').toLowerCase();

  if (name.includes('palm') || name.includes('palmetto') ||
      ['roystonea', 'sabal', 'washingtonia', 'phoenix', 'syagrus'].includes(genus)) return 'fan';
  if (name.includes('willow') || name.includes('weeping') || genus === 'salix') return 'weeping';
  if (name.includes('cypress') || name.includes('arborvitae') || name.includes('juniper') ||
      ['cupressus', 'cupressocyparis', 'chamaecyparis', 'thuja', 'juniperus'].includes(genus)) return 'columnar';
  if (name.includes('pine') || name.includes('spruce') || name.includes('fir') ||
      name.includes('cedar') || name.includes('hemlock') ||
      ['pinus', 'picea', 'abies', 'cedrus', 'tsuga', 'larix', 'cryptomeria'].includes(genus)) return 'conical';
  if (name.includes('elm') || name.includes('zelkova') ||
      ['ulmus', 'zelkova'].includes(genus)) return 'vase';
  if (name.includes('live oak') || name.includes('spreading') ||
      (genus === 'quercus' && name.includes('live'))) return 'spreading';
  if (['sequoia', 'metasequoia', 'liriodendron', 'liquidambar', 'ginkgo'].includes(genus)) return 'columnar';
  if (genus === 'quercus') return 'round';
  if (genus === 'acer') return 'oval';

  return 'round';
}

function inferCategory(plant) {
  const name = (plant.common_name || '').toLowerCase();
  const genus = (plant.genus || '').toLowerCase();

  if (['roystonea', 'sabal', 'washingtonia', 'phoenix', 'syagrus'].includes(genus) ||
      name.includes('palm') || name.includes('palmetto')) return 'tropical';
  if (['malus', 'pyrus', 'prunus', 'citrus', 'persea', 'ficus', 'diospyros', 'carya', 'juglans'].includes(genus) ||
      name.includes('apple') || name.includes('pear') || name.includes('cherry') ||
      name.includes('peach') || name.includes('plum') || name.includes('pecan') ||
      name.includes('walnut') || name.includes('fig')) return 'fruit';
  if (['pinus', 'picea', 'abies', 'cedrus', 'tsuga', 'thuja', 'juniperus',
       'cupressus', 'sequoia', 'metasequoia', 'cryptomeria', 'larix',
       'araucaria', 'podocarpus', 'ilex'].includes(genus) ||
      name.includes('pine') || name.includes('spruce') || name.includes('fir') ||
      name.includes('cedar') || name.includes('redwood') || name.includes('cypress')) return 'evergreen';

  return 'deciduous';
}

function assignColor(category, canopyShape, sciName) {
  // Generate a unique hue from a hash of the scientific name so every species
  // gets its own color, while staying within a category-appropriate range.
  let hash = 0;
  const seed = sciName || canopyShape || 'tree';
  for (let i = 0; i < seed.length; i++) {
    hash = ((hash << 5) - hash + seed.charCodeAt(i)) | 0;
  }
  hash = Math.abs(hash);

  // Category determines the hue range and saturation/lightness envelope
  const ranges = {
    deciduous: { hMin: 60, hMax: 160, s: [30, 55], l: [28, 45] },
    evergreen: { hMin: 100, hMax: 175, s: [25, 50], l: [20, 38] },
    tropical:  { hMin: 90, hMax: 165, s: [40, 60], l: [30, 45] },
    fruit:     { hMin: 50, hMax: 140, s: [35, 55], l: [30, 45] },
  };
  const r = ranges[category] || ranges.deciduous;

  const hue = r.hMin + (hash % (r.hMax - r.hMin));
  const sat = r.s[0] + ((hash >> 8) % (r.s[1] - r.s[0]));
  const lit = r.l[0] + ((hash >> 16) % (r.l[1] - r.l[0]));

  // Convert HSL to hex
  const h = hue / 360, s = sat / 100, l = lit / 100;
  const hue2rgb = (p, q, t) => {
    if (t < 0) t += 1;
    if (t > 1) t -= 1;
    if (t < 1/6) return p + (q - p) * 6 * t;
    if (t < 1/2) return q;
    if (t < 2/3) return p + (q - p) * (2/3 - t) * 6;
    return p;
  };
  const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
  const p = 2 * l - q;
  const R = Math.round(hue2rgb(p, q, h + 1/3) * 255);
  const G = Math.round(hue2rgb(p, q, h) * 255);
  const B = Math.round(hue2rgb(p, q, h - 1/3) * 255);
  return '#' + [R, G, B].map(c => c.toString(16).padStart(2, '0')).join('');
}

// ─── Growth speed by genus (continuous multiplier, 1.0 = moderate) ──────

const GENUS_GROWTH_SPEED = {
  // Very fast (>36"/yr)
  populus: 1.8, ailanthus: 1.9, salix: 1.7, liriodendron: 1.7,
  // Fast (24-36"/yr)
  acer: 1.2, betula: 1.4, fraxinus: 1.3, platanus: 1.4, robinia: 1.5,
  ulmus: 1.4, gleditsia: 1.4, liquidambar: 1.3, morus: 1.3,
  sequoia: 1.8, metasequoia: 1.6, catalpa: 1.4,
  roystonea: 1.6, washingtonia: 1.2,
  // Moderate (12-24"/yr)
  quercus: 0.9, tilia: 1.0, pinus: 1.1, larix: 1.1,
  juglans: 0.9, carya: 0.8, celtis: 1.1, alnus: 1.2,
  zelkova: 1.0, ginkgo: 0.6, nyssa: 0.8, sassafras: 0.9,
  malus: 0.9, pyrus: 0.9, prunus: 1.0, ficus: 1.1,
  // Slow (6-12"/yr)
  fagus: 0.6, picea: 0.6, abies: 0.7, cedrus: 0.6, tsuga: 0.6,
  thuja: 0.7, juniperus: 0.6, cupressus: 0.7, cupressocyparis: 1.0,
  chamaecyparis: 0.6, taxodium: 0.8, cryptomeria: 0.7,
  magnolia: 0.7, cornus: 0.5, cercis: 0.8, lagerstroemia: 1.1,
  ilex: 0.6, carpinus: 0.6, ostrya: 0.5, taxus: 0.4,
  // Very slow (<6"/yr)
  sabal: 0.4, phoenix: 0.5, diospyros: 0.5,
  halesia: 0.6, oxydendrum: 0.5, chionanthus: 0.5,
  amelanchier: 0.7, crataegus: 0.6, sorbus: 0.7, davidia: 0.6,
};
const DEFAULT_GROWTH_SPEED = 0.9;

function growthSpeedToRate(speed) {
  if (speed >= 1.3) return 'fast';
  if (speed >= 0.8) return 'moderate';
  return 'slow';
}

// ─── Size estimation by genus ───────────────────────────────────────────

const GENUS_SIZE_ESTIMATES = {
  quercus:       { heightFt: 65, spreadFt: 55 },
  acer:          { heightFt: 50, spreadFt: 40 },
  pinus:         { heightFt: 60, spreadFt: 25 },
  betula:        { heightFt: 50, spreadFt: 30 },
  ulmus:         { heightFt: 65, spreadFt: 50 },
  salix:         { heightFt: 45, spreadFt: 45 },
  picea:         { heightFt: 60, spreadFt: 20 },
  abies:         { heightFt: 55, spreadFt: 20 },
  fraxinus:      { heightFt: 55, spreadFt: 40 },
  fagus:         { heightFt: 60, spreadFt: 50 },
  platanus:      { heightFt: 75, spreadFt: 55 },
  tilia:         { heightFt: 60, spreadFt: 40 },
  magnolia:      { heightFt: 40, spreadFt: 30 },
  cornus:        { heightFt: 25, spreadFt: 25 },
  prunus:        { heightFt: 30, spreadFt: 25 },
  lagerstroemia: { heightFt: 20, spreadFt: 15 },
  malus:         { heightFt: 25, spreadFt: 25 },
  ginkgo:        { heightFt: 55, spreadFt: 30 },
  sequoia:       { heightFt: 150, spreadFt: 25 },
  roystonea:     { heightFt: 50, spreadFt: 15 },
  sabal:         { heightFt: 35, spreadFt: 10 },
};
const DEFAULT_SIZE = { heightFt: 40, spreadFt: 24 };

// ─── Soil preferences by genus ──────────────────────────────────────────

const GENUS_SOIL_PREFERENCE = {
  quercus:       { pref: ['loam', 'sand'], tol: ['clay', 'silt'], ph: [4.5, 7.5], root: 'taproot', rootSpread: 60 },
  acer:          { pref: ['loam', 'silt'], tol: ['clay', 'sand'], ph: [5.0, 7.5], root: 'shallow', rootSpread: 45 },
  pinus:         { pref: ['sand', 'loam'], tol: ['clay', 'rocky'], ph: [4.5, 7.0], root: 'taproot', rootSpread: 35 },
  betula:        { pref: ['loam', 'sand'], tol: ['silt', 'clay'], ph: [5.0, 7.0], root: 'shallow', rootSpread: 30 },
  ulmus:         { pref: ['loam', 'silt'], tol: ['clay', 'wet'], ph: [5.5, 8.0], root: 'shallow', rootSpread: 55 },
  salix:         { pref: ['wet', 'loam'], tol: ['clay', 'silt'], ph: [5.0, 7.5], root: 'shallow', rootSpread: 50 },
  fraxinus:      { pref: ['loam', 'silt'], tol: ['clay', 'wet'], ph: [5.0, 7.5], root: 'moderate', rootSpread: 40 },
  fagus:         { pref: ['loam', 'silt'], tol: ['clay'], ph: [5.0, 7.0], root: 'shallow', rootSpread: 50 },
  platanus:      { pref: ['loam', 'wet'], tol: ['clay', 'silt'], ph: [5.5, 7.5], root: 'shallow', rootSpread: 55 },
  tilia:         { pref: ['loam', 'silt'], tol: ['clay'], ph: [5.5, 7.5], root: 'deep', rootSpread: 40 },
  magnolia:      { pref: ['loam', 'silt'], tol: ['clay', 'sand'], ph: [5.0, 6.5], root: 'moderate', rootSpread: 30 },
  cornus:        { pref: ['loam', 'silt'], tol: ['sand', 'clay'], ph: [5.5, 6.5], root: 'shallow', rootSpread: 20 },
  prunus:        { pref: ['loam', 'sand'], tol: ['silt', 'clay'], ph: [5.5, 7.5], root: 'moderate', rootSpread: 25 },
  lagerstroemia: { pref: ['loam', 'sand'], tol: ['clay'], ph: [5.0, 7.5], root: 'moderate', rootSpread: 15 },
  malus:         { pref: ['loam'], tol: ['clay', 'silt', 'sand'], ph: [6.0, 7.0], root: 'moderate', rootSpread: 25 },
  ginkgo:        { pref: ['loam', 'sand'], tol: ['clay', 'silt'], ph: [5.0, 8.0], root: 'deep', rootSpread: 40 },
  populus:       { pref: ['loam', 'wet'], tol: ['sand', 'clay'], ph: [5.0, 7.5], root: 'shallow', rootSpread: 60 },
  liriodendron:  { pref: ['loam', 'silt'], tol: ['clay'], ph: [5.0, 7.5], root: 'deep', rootSpread: 40 },
  taxodium:      { pref: ['wet', 'loam'], tol: ['clay', 'silt'], ph: [4.5, 7.0], root: 'deep', rootSpread: 40 },
  cercis:        { pref: ['loam'], tol: ['clay', 'sand', 'silt'], ph: [5.0, 8.0], root: 'moderate', rootSpread: 20 },
  liquidambar:   { pref: ['loam', 'silt'], tol: ['clay', 'wet'], ph: [5.0, 7.5], root: 'shallow', rootSpread: 45 },
  gleditsia:     { pref: ['loam'], tol: ['clay', 'sand', 'silt'], ph: [5.0, 8.0], root: 'deep', rootSpread: 40 },
  juglans:       { pref: ['loam', 'silt'], tol: ['clay'], ph: [6.0, 7.5], root: 'taproot', rootSpread: 60 },
  carya:         { pref: ['loam', 'silt'], tol: ['clay'], ph: [5.5, 7.0], root: 'taproot', rootSpread: 50 },
  nyssa:         { pref: ['wet', 'loam'], tol: ['clay', 'silt'], ph: [4.5, 6.5], root: 'deep', rootSpread: 35 },
  robinia:       { pref: ['sand', 'loam'], tol: ['clay', 'rocky'], ph: [5.0, 8.0], root: 'shallow', rootSpread: 40 },
  catalpa:       { pref: ['loam'], tol: ['clay', 'sand', 'wet'], ph: [5.5, 7.5], root: 'moderate', rootSpread: 35 },
  picea:         { pref: ['loam', 'silt'], tol: ['clay', 'sand'], ph: [5.0, 7.0], root: 'shallow', rootSpread: 30 },
  abies:         { pref: ['loam', 'silt'], tol: ['clay'], ph: [5.0, 6.5], root: 'shallow', rootSpread: 30 },
  cedrus:        { pref: ['loam', 'sand'], tol: ['clay'], ph: [5.5, 7.5], root: 'deep', rootSpread: 40 },
  tsuga:         { pref: ['loam', 'silt'], tol: ['sand'], ph: [4.5, 6.5], root: 'shallow', rootSpread: 30 },
  thuja:         { pref: ['loam'], tol: ['clay', 'wet'], ph: [5.5, 7.5], root: 'shallow', rootSpread: 15 },
  juniperus:     { pref: ['sand', 'loam'], tol: ['clay', 'rocky'], ph: [5.0, 8.0], root: 'deep', rootSpread: 20 },
  sequoia:       { pref: ['loam', 'silt'], tol: ['clay'], ph: [5.0, 7.0], root: 'shallow', rootSpread: 50 },
  roystonea:     { pref: ['sand', 'loam'], tol: ['clay'], ph: [6.0, 8.0], root: 'moderate', rootSpread: 15 },
  sabal:         { pref: ['sand', 'loam'], tol: ['clay', 'wet'], ph: [5.5, 8.0], root: 'moderate', rootSpread: 10 },
};
const DEFAULT_SOIL = { pref: ['loam'], tol: ['clay', 'sand'], ph: [5.0, 7.5], root: 'moderate', rootSpread: 30 };

// ─── Forestry parameters by genus ───────────────────────────────────────
import { GENUS_TO_GROUP } from '../models/allometry.js';

const GENUS_FORESTRY = {
  quercus:   { maxDbh: 42, dbhInc: 0.30, maxSdi: 450, mort: 0.007, lai: 5.5, wd: 46 },
  acer:      { maxDbh: 30, dbhInc: 0.28, maxSdi: 400, mort: 0.009, lai: 5.5, wd: 40 },
  pinus:     { maxDbh: 40, dbhInc: 0.35, maxSdi: 520, mort: 0.008, lai: 3.5, wd: 28 },
  betula:    { maxDbh: 24, dbhInc: 0.30, maxSdi: 380, mort: 0.012, lai: 4.5, wd: 38 },
  ulmus:     { maxDbh: 42, dbhInc: 0.35, maxSdi: 420, mort: 0.012, lai: 5.5, wd: 35 },
  salix:     { maxDbh: 30, dbhInc: 0.40, maxSdi: 350, mort: 0.015, lai: 4.0, wd: 25 },
  picea:     { maxDbh: 30, dbhInc: 0.18, maxSdi: 600, mort: 0.008, lai: 7.5, wd: 27 },
  abies:     { maxDbh: 36, dbhInc: 0.22, maxSdi: 580, mort: 0.007, lai: 7.0, wd: 26 },
  fraxinus:  { maxDbh: 36, dbhInc: 0.30, maxSdi: 410, mort: 0.010, lai: 5.0, wd: 42 },
  fagus:     { maxDbh: 42, dbhInc: 0.20, maxSdi: 420, mort: 0.006, lai: 6.0, wd: 45 },
  platanus:  { maxDbh: 48, dbhInc: 0.38, maxSdi: 400, mort: 0.008, lai: 5.5, wd: 35 },
  tilia:     { maxDbh: 36, dbhInc: 0.28, maxSdi: 400, mort: 0.008, lai: 6.0, wd: 32 },
  magnolia:  { maxDbh: 24, dbhInc: 0.22, maxSdi: 350, mort: 0.010, lai: 5.5, wd: 35 },
  cornus:    { maxDbh: 12, dbhInc: 0.18, maxSdi: 350, mort: 0.015, lai: 5.5, wd: 40 },
  prunus:    { maxDbh: 18, dbhInc: 0.22, maxSdi: 320, mort: 0.012, lai: 5.0, wd: 38 },
  lagerstroemia: { maxDbh: 8, dbhInc: 0.25, maxSdi: 350, mort: 0.015, lai: 4.5, wd: 36 },
  malus:     { maxDbh: 18, dbhInc: 0.22, maxSdi: 320, mort: 0.012, lai: 5.0, wd: 42 },
  ginkgo:    { maxDbh: 36, dbhInc: 0.20, maxSdi: 400, mort: 0.005, lai: 4.0, wd: 34 },
  sequoia:   { maxDbh: 100, dbhInc: 0.40, maxSdi: 700, mort: 0.003, lai: 8.0, wd: 26 },
  roystonea: { maxDbh: 24, dbhInc: 0.30, maxSdi: 300, mort: 0.010, lai: 3.0, wd: 25 },
  sabal:     { maxDbh: 18, dbhInc: 0.15, maxSdi: 300, mort: 0.008, lai: 2.5, wd: 22 },
  populus:   { maxDbh: 36, dbhInc: 0.45, maxSdi: 350, mort: 0.015, lai: 4.5, wd: 25 },
  liriodendron: { maxDbh: 42, dbhInc: 0.45, maxSdi: 350, mort: 0.008, lai: 5.0, wd: 28 },
  taxodium:  { maxDbh: 60, dbhInc: 0.25, maxSdi: 480, mort: 0.005, lai: 3.5, wd: 32 },
  cercis:    { maxDbh: 10, dbhInc: 0.20, maxSdi: 350, mort: 0.012, lai: 5.0, wd: 38 },
  liquidambar: { maxDbh: 36, dbhInc: 0.35, maxSdi: 400, mort: 0.008, lai: 5.5, wd: 36 },
  gleditsia: { maxDbh: 36, dbhInc: 0.35, maxSdi: 350, mort: 0.010, lai: 4.0, wd: 42 },
  juglans:   { maxDbh: 42, dbhInc: 0.28, maxSdi: 380, mort: 0.008, lai: 5.0, wd: 38 },
  carya:     { maxDbh: 42, dbhInc: 0.22, maxSdi: 400, mort: 0.006, lai: 5.0, wd: 46 },
  nyssa:     { maxDbh: 30, dbhInc: 0.22, maxSdi: 400, mort: 0.008, lai: 5.0, wd: 36 },
  robinia:   { maxDbh: 24, dbhInc: 0.35, maxSdi: 350, mort: 0.012, lai: 4.0, wd: 48 },
  catalpa:   { maxDbh: 30, dbhInc: 0.35, maxSdi: 350, mort: 0.012, lai: 5.5, wd: 27 },
  cedrus:    { maxDbh: 36, dbhInc: 0.20, maxSdi: 500, mort: 0.006, lai: 5.0, wd: 33 },
  tsuga:     { maxDbh: 36, dbhInc: 0.20, maxSdi: 580, mort: 0.008, lai: 7.0, wd: 28 },
  thuja:     { maxDbh: 24, dbhInc: 0.18, maxSdi: 500, mort: 0.008, lai: 5.0, wd: 22 },
  juniperus: { maxDbh: 18, dbhInc: 0.15, maxSdi: 500, mort: 0.008, lai: 4.0, wd: 33 },
  chilopsis: { maxDbh: 8, dbhInc: 0.30, maxSdi: 350, mort: 0.020, lai: 3.5, wd: 30 },
  ailanthus: { maxDbh: 36, dbhInc: 0.50, maxSdi: 350, mort: 0.020, lai: 4.5, wd: 25 },
};
const DEFAULT_FORESTRY = { maxDbh: 30, dbhInc: 0.28, maxSdi: 400, mort: 0.010, lai: 5.0, wd: 35 };

// Root system notes by type
const ROOT_NOTES = {
  shallow: 'Shallow, spreading roots. May lift pavement if planted too close to hardscape.',
  moderate: 'Moderate root depth. Generally safe near structures with adequate spacing.',
  deep: 'Deep root system. Rarely causes surface damage. Good for urban settings.',
  taproot: 'Deep taproot provides stability. Minimal surface root issues.',
};

// ─── Normalization ──────────────────────────────────────────────────────

function normalizeSpecies(plant) {
  const canopyShape = inferCanopyShape(plant);
  const category = inferCategory(plant);
  const genus = (plant.genus || '').toLowerCase();
  const sciName = Array.isArray(plant.scientific_name)
    ? plant.scientific_name[0]
    : plant.scientific_name || '';
  const color = assignColor(category, canopyShape, sciName);
  const commonName = plant.common_name || sciName || 'Unknown';

  // Create a URL-safe ID
  const id = (sciName || commonName || `species-${plant.id}`)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');

  // Use genus-based size estimates (the list endpoint has no dimensions)
  const size = GENUS_SIZE_ESTIMATES[genus] || DEFAULT_SIZE;
  const soilData = GENUS_SOIL_PREFERENCE[genus] || DEFAULT_SOIL;
  const heightFt = size.heightFt;
  const spreadFt = size.spreadFt;
  const heightM = heightFt / 3.28;
  const canopyRadiusM = (spreadFt / 3.28) / 2;

  const sizeCategory = heightFt > 60 ? 'large' : heightFt > 30 ? 'medium' : 'small';
  const co2Estimates = { large: 22, medium: 12, small: 5 };

  return {
    id,
    name: commonName,
    scientificName: sciName,
    category,
    emoji: category === 'tropical' ? '🌴' : category === 'evergreen' ? '🌲' : category === 'fruit' ? '🍎' : '🌳',
    canopyRadius: Math.max(2, Math.min(12, canopyRadiusM)),
    height: Math.max(4, Math.min(30, heightM)),
    trunkHeight: heightM * 0.3,
    trunkRadius: Math.max(0.1, heightM * 0.025),
    co2PerYear: co2Estimates[sizeCategory],
    co2Curve: [0.3, 0.7, 1.0, 1.0],
    carbonStorageAt30: co2Estimates[sizeCategory] * 18,
    waterNeeds: 'moderate',
    sunNeeds: 'full',
    growthRate: growthSpeedToRate(GENUS_GROWTH_SPEED[genus] || DEFAULT_GROWTH_SPEED),
    growthSpeed: GENUS_GROWTH_SPEED[genus] || DEFAULT_GROWTH_SPEED,
    matureHeightFt: Math.round(heightFt),
    matureSpreadFt: Math.round(spreadFt),
    spacingFt: Math.round(spreadFt * 0.8),
    lifespan: sizeCategory === 'large' ? 200 : sizeCategory === 'medium' ? 100 : 50,
    color,
    canopyColor: color.replace('#', 'rgba(') + ', 0.45)',
    canopyShape,
    nativeRegions: [],
    invasiveRegions: [],
    // Soil & root data from genus lookup
    soilPreference: soilData.pref,
    soilTolerance: soilData.tol,
    phRange: soilData.ph,
    rootSystem: soilData.root,
    rootSpreadFt: soilData.rootSpread,
    rootNotes: ROOT_NOTES[soilData.root] || ROOT_NOTES.moderate,
    gardenNotes: `${commonName} (${sciName}). Suitable for hardiness zones in this region.`,
    imageUrl: plant.default_image?.regular_url || plant.default_image?.medium_url || null,
    source: 'api',
    apiId: plant.id,
    // Forestry model parameters
    speciesGroup: GENUS_TO_GROUP[genus] || 'default',
    maxDbhInches: (GENUS_FORESTRY[genus] || DEFAULT_FORESTRY).maxDbh,
    typicalDbhIncrement: (GENUS_FORESTRY[genus] || DEFAULT_FORESTRY).dbhInc,
    maxSdi: (GENUS_FORESTRY[genus] || DEFAULT_FORESTRY).maxSdi,
    mortalityRate: (GENUS_FORESTRY[genus] || DEFAULT_FORESTRY).mort,
    leafAreaIndex: (GENUS_FORESTRY[genus] || DEFAULT_FORESTRY).lai,
    woodDensityLbsPerCuFt: (GENUS_FORESTRY[genus] || DEFAULT_FORESTRY).wd,
  };
}

// ─── API fetch helpers ──────────────────────────────────────────────────

async function fetchSpeciesList(params) {
  const apiKey = getApiKey();
  const searchParams = new URLSearchParams({ key: apiKey, ...params });
  const url = `${API_BASE}/species-list?${searchParams}`;

  const res = await fetch(url);
  if (!res.ok) {
    console.warn(`Flora API ${res.status}: ${res.statusText} for ${url}`);
    return [];
  }
  const json = await res.json();
  return json.data || [];
}

/**
 * Filter a raw API species list to keep only tree species.
 * Uses genus matching since the list endpoint has no `type` field.
 */
function filterToTrees(plants) {
  return plants.filter((plant) => {
    const genus = (plant.genus || '').toLowerCase();
    if (TREE_GENERA.has(genus)) return true;

    // Also check common name for tree keywords
    const name = (plant.common_name || '').toLowerCase();
    return name.includes('tree') || name.includes(' oak') || name.includes(' maple') ||
           name.includes(' pine') || name.includes(' elm') || name.includes(' palm') ||
           name.includes(' birch') || name.includes(' willow') || name.includes(' fir') ||
           name.includes(' spruce') || name.includes(' cedar') || name.includes(' ash') ||
           name.includes(' poplar') || name.includes(' beech') || name.includes(' walnut') ||
           name.includes(' hickory') || name.includes(' magnolia') || name.includes(' redwood') ||
           name.includes(' cypress') || name.includes(' sycamore') || name.includes(' hemlock');
  });
}

// ─── Public API ─────────────────────────────────────────────────────────

export function isFloraApiConfigured() {
  return !!getApiKey();
}

/**
 * Fetch tree species for a given US state code.
 *
 * Strategy:
 *  - The Perenual API's `q` and `hardiness` params DON'T work together
 *    (combining them returns 0 results — API bug).
 *  - So we fetch by hardiness zone only (several pages) and filter to
 *    tree genera on our side.
 *
 * Results are cached in localStorage for 7 days.
 */
export async function fetchTreesForState(stateCode) {
  const apiKey = getApiKey();
  if (!apiKey) return [];

  const cacheKey = `trees_v4_${stateCode}`;
  const cached = getCached(cacheKey);
  if (cached) {
    console.log(`[FloraAPI] Cache hit for ${stateCode}: ${cached.length} species`);
    return cached;
  }

  const hardinessZone = STATE_HARDINESS[stateCode];
  if (!hardinessZone) {
    console.warn(`[FloraAPI] No hardiness zone for state: ${stateCode}`);
    return [];
  }

  console.log(`[FloraAPI] Fetching trees for ${stateCode} (hardiness zone ${hardinessZone})...`);

  try {
    // Fetch pages 1-5 in parallel (up to ~150 species).
    // This is cached for 7 days per state, so it's a one-time cost.
    const pageNums = [1, 2, 3, 4, 5];
    const pagePromises = pageNums.map((page) =>
      fetchSpeciesList({ hardiness: hardinessZone, page: String(page) })
        .catch(() => [])
    );

    const allPages = await Promise.all(pagePromises);
    const combined = allPages.flat();

    console.log(`[FloraAPI] Fetched ${combined.length} total plants across ${pageNums.length} pages`);

    // Deduplicate by API id
    const seen = new Set();
    const unique = combined.filter((plant) => {
      if (!plant.id || seen.has(plant.id)) return false;
      seen.add(plant.id);
      return true;
    });

    // Filter to trees only using genus matching
    const treePlants = filterToTrees(unique);
    console.log(`[FloraAPI] Filtered to ${treePlants.length} tree species (from ${unique.length} total plants)`);

    // Normalize to our species format
    const normalized = treePlants
      .map((plant) => normalizeSpecies(plant))
      .filter((s) => s.name !== 'Unknown' && s.id);

    // Deduplicate by our generated id
    const idSeen = new Set();
    const result = normalized.filter((s) => {
      if (idSeen.has(s.id)) return false;
      idSeen.add(s.id);
      return true;
    });

    console.log(`[FloraAPI] ${result.length} unique tree species ready for ${stateCode}`);
    setCache(cacheKey, result);
    return result;
  } catch (err) {
    console.warn('[FloraAPI] Fetch error:', err);
    return [];
  }
}

/**
 * Fetch additional species details from the details endpoint.
 */
export async function fetchSpeciesDetail(apiId) {
  const apiKey = getApiKey();
  if (!apiKey || !apiId) return null;

  const cacheKey = `detail_${apiId}`;
  const cached = getCached(cacheKey);
  if (cached) return cached;

  try {
    const url = `${API_BASE}/species/details/${apiId}?key=${apiKey}`;
    const res = await fetch(url);
    if (!res.ok) return null;

    const data = await res.json();
    setCache(cacheKey, data);
    return data;
  } catch {
    return null;
  }
}

/**
 * Search for tree species by name (uses q param without hardiness).
 */
export async function searchSpecies(query) {
  const apiKey = getApiKey();
  if (!apiKey || !query) return [];

  try {
    const plants = await fetchSpeciesList({ q: query, page: '1' });
    // Apply genus filter but also allow name matches
    return plants
      .filter((plant) => {
        const genus = (plant.genus || '').toLowerCase();
        if (TREE_GENERA.has(genus)) return true;
        const name = (plant.common_name || '').toLowerCase();
        return name.includes('tree');
      })
      .map((plant) => normalizeSpecies(plant))
      .filter((s) => s.name !== 'Unknown');
  } catch {
    return [];
  }
}

/**
 * Clear all Flora API caches.
 */
export function clearCache() {
  const keysToRemove = [];
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key?.startsWith(CACHE_PREFIX)) keysToRemove.push(key);
  }
  keysToRemove.forEach((k) => localStorage.removeItem(k));
}
