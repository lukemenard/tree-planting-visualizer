/**
 * USDA Soil Data Access (SDA) integration.
 *
 * - WMS raster tiles for visual soil overlay on Mapbox
 * - SDA Tabular REST endpoint for point-based soil texture identification
 * - Maps SDA texture classes to the app's soil vocabulary
 */

const SDA_WMS_BASE = 'https://sdmdataaccess.sc.egov.usda.gov/Spatial2/service.ows';
const SDA_TABULAR_URL = 'https://sdmdataaccess.nrcs.usda.gov/Tabular/post.rest';

// In-memory cache keyed by rounded coordinates
const pointCache = new Map();
const CACHE_PRECISION = 5; // ~1 meter precision

// ─── WMS tile URL for Mapbox raster source ─────────────────────────────

export function getSoilWmsTileUrl() {
  const params = new URLSearchParams({
    SERVICE: 'WMS',
    VERSION: '1.3.0',
    REQUEST: 'GetMap',
    LAYERS: 'mapunitpoly',
    CRS: 'EPSG:3857',
    WIDTH: '256',
    HEIGHT: '256',
    FORMAT: 'image/png',
    TRANSPARENT: 'TRUE',
    STYLES: '',
  });
  return `${SDA_WMS_BASE}?${params.toString()}&BBOX={bbox-epsg-3857}`;
}

// ─── SDA texture class → app soil vocabulary ────────────────────────────

const TEXTURE_MAP = {
  'sand': 'sand',
  'loamy sand': 'sand',
  'sandy loam': 'sand',
  'fine sandy loam': 'sand',
  'very fine sandy loam': 'sand',
  'coarse sandy loam': 'sand',
  'loam': 'loam',
  'fine sandy loam': 'loam',
  'silt loam': 'silt',
  'silt': 'silt',
  'sandy clay loam': 'clay',
  'clay loam': 'clay',
  'silty clay loam': 'clay',
  'sandy clay': 'clay',
  'silty clay': 'clay',
  'clay': 'clay',
  'muck': 'wet',
  'peat': 'wet',
  'mucky peat': 'wet',
  'peaty muck': 'wet',
};

function mapTextureToSoilType(textureDesc) {
  if (!textureDesc) return null;
  const lower = textureDesc.toLowerCase().trim();
  if (TEXTURE_MAP[lower]) return TEXTURE_MAP[lower];

  // Fuzzy fallback
  if (lower.includes('sand')) return 'sand';
  if (lower.includes('clay')) return 'clay';
  if (lower.includes('silt')) return 'silt';
  if (lower.includes('loam')) return 'loam';
  if (lower.includes('muck') || lower.includes('peat')) return 'wet';
  if (lower.includes('rock') || lower.includes('gravel') || lower.includes('cobble')) return 'rocky';
  return 'loam'; // default
}

// ─── Soil color palette for legend ──────────────────────────────────────

export const SOIL_COLORS = {
  sand: { label: 'Sandy', color: '#d4a843', bg: 'bg-amber-700/30', text: 'text-amber-400' },
  loam: { label: 'Loam', color: '#4ade80', bg: 'bg-emerald-700/30', text: 'text-emerald-400' },
  clay: { label: 'Clay', color: '#a0522d', bg: 'bg-orange-800/30', text: 'text-orange-400' },
  silt: { label: 'Silty', color: '#94a3b8', bg: 'bg-slate-600/30', text: 'text-slate-400' },
  wet: { label: 'Wetland', color: '#38bdf8', bg: 'bg-sky-700/30', text: 'text-sky-400' },
  rocky: { label: 'Rocky', color: '#78716c', bg: 'bg-stone-600/30', text: 'text-stone-400' },
};

// ─── Point query ────────────────────────────────────────────────────────

function roundCoord(val) {
  return parseFloat(val.toFixed(CACHE_PRECISION));
}

function cacheKey(lng, lat) {
  return `${roundCoord(lng)},${roundCoord(lat)}`;
}

/**
 * Query the SDA tabular endpoint for soil texture at a given point.
 * Returns { textureClass, soilType, componentName, sand, silt, clay, drainageClass } or null.
 */
export async function fetchSoilAtPoint(lng, lat) {
  const key = cacheKey(lng, lat);
  if (pointCache.has(key)) return pointCache.get(key);

  const wkt = `POINT(${lng} ${lat})`;

  const query = `
    SELECT TOP 1
      co.compname,
      co.comppct_r,
      co.drainagecl,
      chtg.texdesc,
      ch.sandtotal_r,
      ch.silttotal_r,
      ch.claytotal_r
    FROM component co
    INNER JOIN chorizon ch ON ch.cokey = co.cokey
    INNER JOIN chtexturegrp chtg ON chtg.chkey = ch.chkey
    WHERE co.mukey IN (
      SELECT * FROM SDA_Get_Mukey_from_intersection_with_WktWgs84('${wkt}')
    )
    AND co.majcompflag = 'Yes'
    AND chtg.rvindicator = 'Yes'
    AND ch.hzdept_r = 0
    ORDER BY co.comppct_r DESC
  `;

  try {
    const response = await fetch(SDA_TABULAR_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: `query=${encodeURIComponent(query)}&format=JSON`,
    });

    if (!response.ok) {
      console.warn('SDA query failed:', response.status);
      return null;
    }

    const data = await response.json();
    const table = data?.Table;
    if (!table || table.length === 0) {
      pointCache.set(key, null);
      return null;
    }

    // SDA returns arrays, not objects. Column order matches the SELECT:
    // 0: compname, 1: comppct_r, 2: drainagecl, 3: texdesc,
    // 4: sandtotal_r, 5: silttotal_r, 6: claytotal_r
    const row = table[0];
    const result = {
      textureClass: row[3] || null,
      soilType: mapTextureToSoilType(row[3]),
      componentName: row[0] || null,
      sand: row[4] ? parseFloat(row[4]) : null,
      silt: row[5] ? parseFloat(row[5]) : null,
      clay: row[6] ? parseFloat(row[6]) : null,
      drainageClass: row[2] || null,
    };

    pointCache.set(key, result);
    return result;
  } catch (err) {
    console.warn('SDA query error (possible CORS):', err.message);
    return null;
  }
}

/**
 * Check soil compatibility for a species against a detected soil type.
 * Returns 'ideal' | 'tolerant' | 'incompatible' | null
 */
export function getSoilCompatibility(species, soilType) {
  if (!soilType || !species) return null;
  if (species.soilPreference?.includes(soilType)) return 'ideal';
  if (species.soilTolerance?.includes(soilType)) return 'tolerant';
  return 'incompatible';
}
