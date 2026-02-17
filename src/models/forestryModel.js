/**
 * Core forestry growth & yield engine.
 *
 * projectStand() projects a collection of planted trees forward in time,
 * computing per-tree dimensions, biomass, volume, carbon, and
 * stand-level density metrics with competition-dependent mortality.
 */

import {
  getGroupCoeffs,
  predictHeight,
  predictCrownWidth,
  predictAboveGroundBiomass,
  predictBelowGroundBiomass,
  predictVolumeBF,
  predictLeafArea,
  annualDbhIncrement,
  basalArea,
  quadraticMeanDiameter,
  standDensityIndex,
  biomassRegionCorrection,
} from './allometry.js';
import { detectFvsVariant } from '../data/fvsSpeciesCodes.js';

// ─── Site Index Helpers ──────────────────────────────────────────────────

/**
 * Derive a site index multiplier (0.7-1.3) from a soil texture class string.
 * Higher values = better growing conditions.
 */
export function siteIndexFromSoil(soilTexture) {
  if (!soilTexture) return 1.0;
  const t = soilTexture.toLowerCase();
  if (t.includes('loam') && !t.includes('sandy') && !t.includes('clay')) return 1.2;
  if (t.includes('silt loam') || t.includes('silty')) return 1.15;
  if (t.includes('sandy loam')) return 1.05;
  if (t.includes('loam')) return 1.1;
  if (t.includes('clay loam')) return 0.95;
  if (t.includes('clay')) return 0.85;
  if (t.includes('sand')) return 0.80;
  if (t.includes('rocky') || t.includes('gravel')) return 0.70;
  if (t.includes('muck') || t.includes('peat')) return 0.90;
  return 1.0;
}

/**
 * Convert a numeric site index (40-100 scale) to a multiplier.
 * 70 = baseline (1.0), each 10 points = ±0.15.
 */
export function siteIndexToMultiplier(numericSI) {
  return 1.0 + (numericSI - 70) * 0.015;
}

// ─── Competition Modifier ────────────────────────────────────────────────

/**
 * Compute a growth reduction factor based on relative stand density.
 * Calibrated against FVS diameter growth trajectories for even-aged stands:
 *   relDensity < 0.25 → free growth (1.0)
 *   0.25-0.55 → increasing competition as canopy closes (1.0 → 0.45)
 *   0.55-0.80 → heavy competition, post-closure (0.45 → 0.18)
 *   > 0.80 → severe overstocking (0.18 → 0.08)
 */
function competitionModifier(relDensity) {
  // Calibrated against FVS QMD trajectories for loblolly, ponderosa, Douglas-fir,
  // and oak-hickory stands. Growth reduction kicks in earlier (relD=0.20) and
  // drops more steeply than previous version, matching FVS mid-rotation growth
  // decline of 40-60% by full stocking.
  if (relDensity < 0.20) return 1.0;
  if (relDensity < 0.50) return 1.0 - 0.65 * ((relDensity - 0.20) / 0.30);
  if (relDensity < 0.80) return 0.35 - 0.23 * ((relDensity - 0.50) / 0.30);
  return Math.max(0.05, 0.12 - 0.07 * ((relDensity - 0.80) / 0.20));
}

// ─── Context Detection ───────────────────────────────────────────────────

/**
 * Infer whether a planting is urban or natural forestry based on
 * observable characteristics.
 *
 * Heuristics (combined scoring):
 *  - Estimated TPA: urban plantings are typically 15-80 TPA;
 *    plantation forestry runs 200-600+; natural regen can exceed 1000.
 *  - Planting area: very small areas (< 0.3 acres) skew urban.
 *  - Tree count: < 20 trees is almost certainly urban/residential.
 *
 * Returns a value in [0, 1] where 0 = fully urban and 1 = fully natural.
 */
function inferForestryContext(treeCount, areaAcres) {
  let score = 0.5; // neutral start

  const tpa = treeCount / Math.max(0.01, areaAcres);

  // TPA signal (strongest indicator)
  if (tpa < 40)       score -= 0.3;
  else if (tpa < 100)  score -= 0.15;
  else if (tpa > 300)  score += 0.2;
  else if (tpa > 150)  score += 0.1;

  // Area signal
  if (areaAcres < 0.15)      score -= 0.15;
  else if (areaAcres < 0.5)  score -= 0.05;
  else if (areaAcres > 5)    score += 0.1;

  // Tree count signal
  if (treeCount <= 10)      score -= 0.15;
  else if (treeCount <= 30) score -= 0.05;
  else if (treeCount > 200) score += 0.1;

  return Math.max(0, Math.min(1, score));
}

// ─── Mortality ───────────────────────────────────────────────────────────

/**
 * Check if a tree dies this year.
 * Background mortality + density-dependent mortality when overstocked,
 * weighted by crown ratio (suppressed trees die first).
 *
 * `contextScore` (0-1) blends between urban (0) and natural (1) curves:
 *  - Urban: lower density-dependent mortality (managed, irrigated, pruned)
 *  - Natural: standard silvicultural mortality (self-thinning under competition)
 *
 * `crownRatio` (0-1) is the single most important predictor of mortality
 * in FVS (Wykoff 1986). Trees with CR < 0.2 are heavily suppressed and
 * have 3-5x the mortality of trees with CR > 0.5.
 */
function checkMortality(backgroundRate, relDensity, rng, contextScore = 0.5, crownRatio = 0.5) {
  let mortalityProb = backgroundRate;

  // Natural forestry curve — calibrated against FVS TPA trajectories.
  // Uses a power function for smooth onset with accelerating mortality
  // at high relative densities (classical self-thinning).
  // Note: coefficients account for vigor-variation-induced suppression
  // mortality (through the crown ratio mechanism), so explicit density
  // additions are slightly lower than if all trees grew identically.
  let naturalAdd = 0;
  if (relDensity > 0.25) {
    naturalAdd += 0.035 * Math.pow((relDensity - 0.25) / 0.75, 1.5);
  }
  if (relDensity > 0.55) {
    naturalAdd += 0.07 * Math.pow((relDensity - 0.55) / 0.45, 2.0);
  }

  // Urban forestry curve (managed, lower competition pressure)
  let urbanAdd = 0;
  if (relDensity > 0.75) {
    urbanAdd += 0.004 * ((relDensity - 0.75) / 0.25);
  }
  if (relDensity > 0.95) {
    urbanAdd += 0.01 * ((relDensity - 0.95) / 0.05);
  }

  // Blend based on context
  mortalityProb += urbanAdd + (naturalAdd - urbanAdd) * contextScore;

  // Crown ratio weighting (key FVS mortality driver):
  //   CR > 0.5  → 0.7x base mortality (vigorous, dominant)
  //   CR 0.3-0.5 → 1.0x (intermediate)
  //   CR 0.2-0.3 → 2.0x (suppressed)
  //   CR < 0.2  → 4.0x (heavily suppressed, high probability of death)
  let crMultiplier = 1.0;
  if (crownRatio > 0.5)       crMultiplier = 0.7;
  else if (crownRatio > 0.3)  crMultiplier = 1.0;
  else if (crownRatio > 0.2)  crMultiplier = 2.0;
  else                         crMultiplier = 4.0;

  mortalityProb *= crMultiplier;

  return rng < mortalityProb;
}

/**
 * Update crown ratio for a tree based on its relative canopy position.
 *
 * Trees near the bottom of the canopy (small BA rank) lose CR faster.
 * Trees at the top maintain or slowly increase CR after thinning.
 *
 * relPosition: 0 = smallest tree in stand, 1 = largest
 * relDensity: current stand relative density (0-1)
 */
function updateCrownRatio(currentCR, relPosition, relDensity) {
  // Base CR change depends on canopy position:
  //  - Top of canopy (relPos > 0.7): slight increase (+0.005 to +0.01)
  //  - Mid canopy (0.3-0.7): stable to slight decrease
  //  - Bottom of canopy (< 0.3): decrease proportional to density
  let crChange;
  if (relPosition > 0.7) {
    crChange = 0.005 + 0.005 * (relPosition - 0.7) / 0.3;
  } else if (relPosition > 0.3) {
    crChange = -0.005 * relDensity;
  } else {
    crChange = -0.01 - 0.02 * relDensity * (1 - relPosition);
  }

  // Stands at low density: all trees recover CR
  if (relDensity < 0.35) {
    crChange = Math.max(crChange, 0.005);
  }

  const newCR = currentCR + crChange;
  return Math.max(0.05, Math.min(0.95, newCR));
}

// ─── Seeded RNG for deterministic projections ────────────────────────────

/**
 * Hash a string into a 32-bit integer (djb2 algorithm).
 */
function hashString(str) {
  let hash = 5381;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) + hash) + str.charCodeAt(i);
    hash |= 0; // Convert to 32-bit int
  }
  return hash >>> 0; // Unsigned
}

/**
 * Seeded pseudo-random in [0, 1).
 * Uses mulberry32 — a fast 32-bit PRNG with excellent distribution.
 * Critical: avoids the spatial correlation of Math.sin()-based PRNGs
 * that caused strip-pattern mortality in grid-planted stands.
 */
function seededRandom(seed) {
  let t = (seed + 0x6D2B79F5) | 0;
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}

/**
 * Generate a persistent vigor multiplier for a tree.
 *
 * In real stands, even same-age, same-species trees grow at different rates
 * due to microsite variation, genetic diversity, and early competition effects.
 * This creates the natural diameter distribution (typically CV 15-30%) that
 * FVS captures through individual tree records.
 *
 * Uses Box-Muller transform on two seeded uniform randoms to produce a
 * normal(1.0, σ=0.12) multiplier, clamped to [0.65, 1.35].
 *
 * σ=0.12 produces a CV ~12% which, when compounded over 30+ years of
 * differential growth, yields a stand-level DBH CV of ~20-25% — matching
 * observed even-aged stand distributions (Weibull shape parameter ~4-6).
 *
 * The multiplier is deterministic per tree ID — the same tree always gets
 * the same vigor — which ensures reproducibility.
 */
function treeVigorMultiplier(treeId) {
  const seed = hashString(treeId);
  const u1 = Math.max(1e-10, seededRandom(seed));
  const u2 = seededRandom(seed + 1);
  const normal = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
  return Math.max(0.65, Math.min(1.35, 1.0 + normal * 0.12));
}

// ─── Area Estimation ─────────────────────────────────────────────────────

/**
 * Estimate the planting area in acres from a set of tree positions.
 * Uses bounding-box area with a buffer equal to half the average spacing.
 * Returns at least 0.05 acres to avoid division-by-near-zero.
 */
export function estimateAreaAcres(trees) {
  if (!trees || trees.length <= 1) return 0.25; // single tree = small plot

  let minLng = Infinity, maxLng = -Infinity, minLat = Infinity, maxLat = -Infinity;
  for (const t of trees) {
    if (t.lng < minLng) minLng = t.lng;
    if (t.lng > maxLng) maxLng = t.lng;
    if (t.lat < minLat) minLat = t.lat;
    if (t.lat > maxLat) maxLat = t.lat;
  }

  const centerLat = (minLat + maxLat) / 2;
  const metersPerDegLat = 111320;
  const metersPerDegLng = 111320 * Math.cos((centerLat * Math.PI) / 180);

  // Add buffer (~30ft / ~10m on each side to account for canopy edge)
  const bufferDeg = 10 / metersPerDegLat;
  const widthM = (maxLng - minLng + bufferDeg * 2) * metersPerDegLng;
  const heightM = (maxLat - minLat + bufferDeg * 2) * metersPerDegLat;

  const areaSqM = widthM * heightM;
  const areaAcres = areaSqM / 4046.86;

  return Math.max(0.05, areaAcres);
}

// ─── Harvest Execution ───────────────────────────────────────────────────

/**
 * Sort trees by DBH with a deterministic random tiebreaker that varies
 * by an epoch seed (typically the simulation year).
 *
 * In even-aged monocultures all trees have identical DBH, so without a
 * tiebreaker the sort preserves array order (= spatial placement order from
 * the fill tool: south-to-north, row by row).  A fixed tiebreaker (e.g.
 * hash of ID alone) merely replaces one deterministic ordering with another,
 * so successive thinning events still walk through the same fixed ranking —
 * producing progressive strips.
 *
 * By mixing the tree ID hash with an epoch seed we get a DIFFERENT random
 * ordering each year.  Each thinning event thus selects a spatially
 * independent subset, and crown-ratio rankings reshuffle annually so no
 * tree is permanently "suppressed" in an equal-DBH cohort.
 */
function sortByDbhWithTiebreaker(trees, ascending = true, epochSeed = 0) {
  return [...trees].sort((a, b) => {
    const diff = a.dbhInches - b.dbhInches;
    if (Math.abs(diff) > 0.01) return ascending ? diff : -diff;
    // Tiebreaker: seeded random that varies per tree AND per epoch
    const ha = seededRandom(hashString(a.id) + epochSeed * 7919);
    const hb = seededRandom(hashString(b.id) + epochSeed * 7919);
    return ascending ? ha - hb : hb - ha;
  });
}

/**
 * Execute a single harvest/thinning action on alive trees.
 * Returns an array of tree IDs that were harvested.
 *
 * Selection logic varies by action type — see silviculturalPrescriptions.js
 * for full documentation of action types.
 */
function executeHarvestAction(action, aliveStates, year) {
  const count = aliveStates.length;
  if (count === 0) return [];

  const toRemove = Math.round(count * (action.removePct || 0));
  if (toRemove <= 0) return [];

  let candidates;

  switch (action.type) {
    case 'pct':
    case 'thin-below':
    case 'sanitation':
      // Remove smallest stems first (low thinning / PCT / sanitation)
      candidates = sortByDbhWithTiebreaker(aliveStates, true, year);
      break;

    case 'thin-above':
    case 'shelterwood-seed':
      // Crown thinning: remove from the upper canopy, but preserve the very
      // largest 15-20% as residual dominant crop trees
      candidates = sortByDbhWithTiebreaker(aliveStates, false, year);
      // Skip top 20% (keep largest trees)
      const skipTop = Math.max(1, Math.round(count * 0.20));
      candidates = candidates.slice(skipTop);
      break;

    case 'selection':
      // Single-tree selection: remove the largest merchantable stems
      candidates = sortByDbhWithTiebreaker(aliveStates, false, year);
      break;

    case 'clearcut':
    case 'shelterwood-removal':
      // Remove (almost) everything — random order
      candidates = [...aliveStates];
      break;

    case 'thin-mechanical': {
      // Remove every nth tree based on original position order
      const n = Math.max(2, Math.round(1 / (action.removePct || 0.25)));
      candidates = aliveStates.filter((_, i) => i % n === 0);
      return candidates.slice(0, toRemove).map(t => t.id);
    }

    default:
      candidates = sortByDbhWithTiebreaker(aliveStates, true, year);
  }

  // Apply minimum merchantable DBH filter for commercial actions
  const minDbh = action.minMerchDbh || 0;
  if (minDbh > 0 && action.type !== 'pct' && action.type !== 'sanitation') {
    // For thin-below: only remove trees above minDbh
    // For selection/clearcut: only count trees above minDbh as harvestable
    // But for PCT, we ignore minDbh (non-commercial)
  }

  return candidates.slice(0, toRemove).map(t => t.id);
}

// ─── Main Projection Function ────────────────────────────────────────────

/**
 * Project a stand of trees to a given year.
 *
 * @param {Array} trees - array of tree objects, each with at least:
 *   { id, speciesId, lat, lng, plantedYear? }
 * @param {Map|Object} speciesMap - keyed by speciesId, each species has at least:
 *   { speciesGroup, maxDbhInches, typicalDbhIncrement, mortalityRate,
 *     leafAreaIndex, woodDensityLbsPerCuFt, matureHeightFt, matureSpreadFt }
 * @param {number} year - projection year (0 = planting year)
 * @param {number} siteIndex - site index multiplier (0.7-1.3)
 * @param {number} [areaAcres=null] - project area in acres (auto-estimated if null)
 * @param {Object} [prescription=null] - silvicultural prescription with .actions array
 * @returns {{ trees: Array, stand: Object, mortalityEvents: Array, harvestEvents: Array }}
 */
export function projectStand(trees, speciesMap, year, siteIndex = 1.0, areaAcres = null, prescription = null) {
  if (!trees || trees.length === 0) {
    return {
      trees: [],
      stand: emptyStandMetrics(),
      mortalityEvents: [],
      harvestEvents: [],
    };
  }

  // Auto-estimate area from tree positions if not explicitly provided
  if (areaAcres == null) {
    areaAcres = estimateAreaAcres(trees);
  }

  // Resolve species map if it's a Map object
  const getSpecies = (id) => {
    if (speciesMap instanceof Map) return speciesMap.get(id);
    return speciesMap[id];
  };

  // Build a lookup of prescription actions by year for O(1) access
  const actionsByYear = {};
  if (prescription?.actions) {
    for (const action of prescription.actions) {
      if (!actionsByYear[action.year]) actionsByYear[action.year] = [];
      actionsByYear[action.year].push(action);
    }
  }

  // Initialize per-tree state at year 0
  const treeStates = trees.map((tree, idx) => {
    const sp = getSpecies(tree.speciesId || tree.species?.id) || {};
    const groupCode = sp.speciesGroup || 'default';
    const coeffs = getGroupCoeffs(groupCode);
    const maxDbh = sp.maxDbhInches || 30;
    const maxInc = sp.typicalDbhIncrement || coeffs.maxIncrement || 0.28;
    const bgMort = sp.mortalityRate || 0.01;

    const treeId = tree.id || `tree-${idx}`;
    return {
      id: treeId,
      speciesId: tree.speciesId || tree.species?.id,
      speciesName: sp.name || 'Unknown',
      lat: tree.lat,
      lng: tree.lng,
      groupCode,
      coeffs,
      maxDbh,
      maxInc,
      bgMort,
      vigor: treeVigorMultiplier(treeId), // Individual tree growth variation
      dbhInches: 1.0, // 1" DBH seedling
      crownRatio: 0.60, // Seedling crown ratio: 60%
      alive: true,
      harvested: false,
      harvestedYear: null,
      diedYear: null,
    };
  });

  const mortalityEvents = [];
  const harvestEvents = [];
  let currentRelDensity = 0;

  // Detect FVS region for biomass correction from tree coordinates
  const refTree = trees[0] || {};
  const fvsVariant = detectFvsVariant(refTree.lat || 38, refTree.lng || -97);

  // Infer context once (urban vs natural) from planting characteristics
  const contextScore = inferForestryContext(trees.length, areaAcres);

  // Step through each year
  for (let y = 1; y <= year; y++) {
    // Compute current stand density
    const aliveStates = treeStates.filter(t => t.alive && !t.harvested);
    const aliveDbhs = aliveStates.map(t => t.dbhInches);
    if (aliveDbhs.length === 0) break;

    const tpa = aliveDbhs.length / Math.max(0.01, areaAcres);
    const qmd = quadraticMeanDiameter(aliveDbhs);
    const sdi = standDensityIndex(tpa, qmd);

    // Use average maxSdi across species for relative density
    const avgMaxSdi = aliveStates.reduce((s, t) => {
      const spMaxSdi = t.coeffs.maxSdi || 400;
      return s + spMaxSdi;
    }, 0) / aliveStates.length;

    currentRelDensity = sdi / avgMaxSdi;
    const compMod = competitionModifier(currentRelDensity);

    // ── Execute any prescription actions scheduled for this year ──
    if (actionsByYear[y]) {
      for (const action of actionsByYear[y]) {
        const currentAlive = treeStates.filter(t => t.alive && !t.harvested);
        const harvestedIds = executeHarvestAction(action, currentAlive, y);
        const harvestedIdSet = new Set(harvestedIds);

        let actionVolumeBF = 0;
        let actionBiomassLbs = 0;
        let actionCount = 0;

        for (const ts of treeStates) {
          if (harvestedIdSet.has(ts.id)) {
            ts.harvested = true;
            ts.harvestedYear = y;
            ts.alive = false;
            actionCount++;

            // Compute harvest volume for this tree (with regional biomass correction)
            const c = ts.coeffs;
            const heightFt = predictHeight(ts.dbhInches, c);
            const volBF = predictVolumeBF(ts.dbhInches, heightFt, c);
            const bioCorr = biomassRegionCorrection(ts.groupCode, fvsVariant);
            const agBio = predictAboveGroundBiomass(ts.dbhInches, c) * bioCorr;
            const isMerchantable = ts.dbhInches >= (action.minMerchDbh || 0);

            actionVolumeBF += isMerchantable ? volBF : 0;
            actionBiomassLbs += agBio;
          }
        }

        if (actionCount > 0) {
          // Collect per-tree details for financial analysis
          const treeDetails = [];
          for (const ts of treeStates) {
            if (harvestedIdSet.has(ts.id)) {
              const c = ts.coeffs;
              const hFt = predictHeight(ts.dbhInches, c);
              const harvestBioCorr = biomassRegionCorrection(ts.groupCode, fvsVariant);
              const agBio = predictAboveGroundBiomass(ts.dbhInches, c) * harvestBioCorr;
              const vBF = predictVolumeBF(ts.dbhInches, hFt, c);
              treeDetails.push({
                id: ts.id,
                dbhInches: Math.round(ts.dbhInches * 10) / 10,
                heightFt: Math.round(hFt * 10) / 10,
                agBiomassLbs: Math.round(agBio),
                volumeBF: Math.round(vBF),
                groupCode: ts.groupCode,
              });
            }
          }

          harvestEvents.push({
            year: y,
            type: action.type,
            label: action.label || action.type,
            treesRemoved: actionCount,
            volumeBF: Math.round(actionVolumeBF),
            biomassLbs: Math.round(actionBiomassLbs),
            carbonReleasedLbs: Math.round(actionBiomassLbs * 0.5),
            treeDetails,
          });
        }
      }
    }

    // ── Compute BA rank for crown ratio updates ──
    // Sort alive trees by DBH with year-varying tiebreaker to prevent
    // spatial bias and permanent suppression in even-aged stands
    const sortedAlive = sortByDbhWithTiebreaker(aliveStates, true, y);
    const rankMap = new Map();
    for (let i = 0; i < sortedAlive.length; i++) {
      rankMap.set(sortedAlive[i].id, i / Math.max(1, sortedAlive.length - 1));
    }

    // ── Natural mortality & growth ──
    for (const ts of treeStates) {
      if (!ts.alive || ts.harvested) continue;

      // Mortality check (now weighted by crown ratio)
      const rng = seededRandom(hashString(ts.id) + y * 31);
      if (checkMortality(ts.bgMort, currentRelDensity, rng, contextScore, ts.crownRatio)) {
        ts.alive = false;
        ts.diedYear = y;
        mortalityEvents.push({ treeId: ts.id, year: y, speciesName: ts.speciesName });
        continue;
      }

      // Update crown ratio based on relative canopy position
      const relPosition = rankMap.get(ts.id) ?? 0.5;
      ts.crownRatio = updateCrownRatio(ts.crownRatio, relPosition, currentRelDensity);

      // Growth (modulated by individual tree vigor)
      const dDbh = annualDbhIncrement(
        ts.dbhInches, ts.maxDbh, ts.maxInc, siteIndex, compMod
      ) * ts.vigor;
      ts.dbhInches = Math.min(ts.maxDbh, ts.dbhInches + dDbh);
    }
  }

  // Compute final per-tree metrics
  const resultTrees = treeStates.map(ts => {
    const dbh = ts.dbhInches;
    const c = ts.coeffs;
    const heightFt = predictHeight(dbh, c);
    const crownWidthFt = predictCrownWidth(dbh, c);
    // Apply regional biomass correction (Jenkins → CRM-equivalent)
    const bioCorr = biomassRegionCorrection(ts.groupCode, fvsVariant);
    const agBiomassLbs = predictAboveGroundBiomass(dbh, c) * bioCorr;
    const bgBiomassLbs = predictBelowGroundBiomass(agBiomassLbs, c);
    const totalCarbonLbs = (agBiomassLbs + bgBiomassLbs) * 0.5;
    const co2StoredLbs = totalCarbonLbs * 3.67;
    const volumeBF = predictVolumeBF(dbh, heightFt, c);
    const leafAreaSqFt = predictLeafArea(dbh, c);

    return {
      id: ts.id,
      speciesId: ts.speciesId,
      speciesName: ts.speciesName,
      lat: ts.lat,
      lng: ts.lng,
      dbhInches: Math.round(dbh * 10) / 10,
      heightFt: Math.round(heightFt * 10) / 10,
      crownWidthFt: Math.round(crownWidthFt * 10) / 10,
      crownRatio: Math.round(ts.crownRatio * 100) / 100,
      agBiomassLbs: Math.round(agBiomassLbs),
      bgBiomassLbs: Math.round(bgBiomassLbs),
      totalCarbonLbs: Math.round(totalCarbonLbs),
      co2StoredLbs: Math.round(co2StoredLbs),
      volumeBF: Math.round(volumeBF),
      leafAreaSqFt: Math.round(leafAreaSqFt),
      alive: ts.alive,
      harvested: ts.harvested || false,
      harvestedYear: ts.harvestedYear,
      diedYear: ts.diedYear,
    };
  });

  // Compute stand-level metrics (only non-harvested, alive trees)
  const standingTrees = resultTrees.filter(t => t.alive && !t.harvested);
  const standingDbhs = standingTrees.map(t => t.dbhInches);
  const finalTpa = standingTrees.length / Math.max(0.01, areaAcres);
  const finalQmd = quadraticMeanDiameter(standingDbhs);
  const finalSdi = standDensityIndex(finalTpa, finalQmd);
  const totalBA = standingTrees.reduce((s, t) => s + basalArea(t.dbhInches), 0);
  const baPerAcre = totalBA / Math.max(0.01, areaAcres);

  const standingGroupCodes = treeStates.filter(t => t.alive && !t.harvested).map(t => t.groupCode);
  const avgMaxSdi = standingGroupCodes.length > 0
    ? standingGroupCodes.reduce((s, gc) => s + (getGroupCoeffs(gc).maxSdi || 400), 0) / standingGroupCodes.length
    : 400;

  // Harvest totals
  const totalHarvestedVolBF = harvestEvents.reduce((s, e) => s + e.volumeBF, 0);
  const totalHarvestedTrees = harvestEvents.reduce((s, e) => s + e.treesRemoved, 0);
  const totalHarvestedBiomass = harvestEvents.reduce((s, e) => s + e.biomassLbs, 0);

  const contextLabel = contextScore < 0.3 ? 'urban'
    : contextScore < 0.6 ? 'suburban'
    : 'natural forest';

  const deadFromMortality = resultTrees.filter(t => !t.alive && !t.harvested).length;

  const stand = {
    treesPerAcre: Math.round(finalTpa * 10) / 10,
    basalAreaSqFt: Math.round(baPerAcre * 10) / 10,
    sdi: Math.round(finalSdi),
    maxSdi: Math.round(avgMaxSdi),
    relDensity: Math.round((finalSdi / avgMaxSdi) * 100) / 100,
    qmd: Math.round(finalQmd * 10) / 10,
    totalVolumeBF: standingTrees.reduce((s, t) => s + t.volumeBF, 0),
    totalBiomassLbs: standingTrees.reduce((s, t) => s + t.agBiomassLbs + t.bgBiomassLbs, 0),
    totalCarbonLbs: standingTrees.reduce((s, t) => s + t.totalCarbonLbs, 0),
    totalCo2Lbs: standingTrees.reduce((s, t) => s + t.co2StoredLbs, 0),
    aliveTrees: standingTrees.length,
    deadTrees: deadFromMortality,
    harvestedTrees: totalHarvestedTrees,
    totalTrees: resultTrees.length,
    areaAcres,
    stockingLevel: stockingLabel(finalSdi / avgMaxSdi),
    contextScore: Math.round(contextScore * 100) / 100,
    contextLabel,
    // Cumulative harvest totals
    harvestedVolumeBF: totalHarvestedVolBF,
    harvestedBiomassLbs: totalHarvestedBiomass,
    harvestedCarbonLbs: Math.round(totalHarvestedBiomass * 0.5),
  };

  return { trees: resultTrees, stand, mortalityEvents, harvestEvents };
}

/**
 * Return a stocking label based on relative density.
 */
function stockingLabel(relDensity) {
  if (relDensity < 0.25) return 'understocked';
  if (relDensity < 0.35) return 'low';
  if (relDensity < 0.55) return 'fully-stocked';
  if (relDensity < 0.80) return 'overstocked';
  return 'self-thinning';
}

/**
 * Empty stand metrics for 0-tree case.
 */
function emptyStandMetrics() {
  return {
    treesPerAcre: 0, basalAreaSqFt: 0, sdi: 0, maxSdi: 400,
    relDensity: 0, qmd: 0, totalVolumeBF: 0, totalBiomassLbs: 0,
    totalCarbonLbs: 0, totalCo2Lbs: 0, aliveTrees: 0, deadTrees: 0,
    harvestedTrees: 0, totalTrees: 0, areaAcres: 1, stockingLevel: 'understocked',
    harvestedVolumeBF: 0, harvestedBiomassLbs: 0, harvestedCarbonLbs: 0,
  };
}

/**
 * Quick helper: project stand at multiple decades for charting.
 * Returns array of { year, stand, mortalityEvents }.
 */
export function projectStandTimeSeries(trees, speciesMap, maxYear, siteIndex, areaAcres, prescription = null, stepSize = 5) {
  const series = [];
  for (let y = 0; y <= maxYear; y += stepSize) {
    const result = projectStand(trees, speciesMap, y, siteIndex, areaAcres, prescription);
    series.push({
      year: y,
      stand: result.stand,
      trees: result.trees,
      mortalityEvents: result.mortalityEvents,
      harvestEvents: result.harvestEvents,
    });
  }
  return series;
}
