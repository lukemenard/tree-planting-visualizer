/**
 * Allometric equations for forestry growth & yield modeling.
 *
 * Sources:
 *  - Jenkins et al. 2003 (biomass equations, 10 species groups)
 *  - USFS FIA National Scale Volume & Biomass Estimators
 *  - i-Tree Eco allometric models
 *  - Reineke (1933) Stand Density Index
 *  - FVS NE/SN/PN variant expected diameter growth (Keyser & Dixon 2017)
 *
 * All equations operate on DBH (diameter at breast height, inches).
 */

// ─── Species Group Coefficients ──────────────────────────────────────────
//
// Each species group has coefficients for:
//   height:  Chapman-Richards  H = b1 * (1 - exp(-b2 * DBH))^b3  (feet)
//   crown:   Linear  CW = a + b * DBH  (feet)
//   biomass: Jenkins et al.  AGB_lbs = exp(b0 + b1 * ln(DBH_cm))  * 2.205
//   volume:  V = b1 * DBH^b2 * H^b3  (board feet, Scribner)
//   leafArea: LA = a * DBH^b  (sq ft)
//   maxIncrement: peak annual DBH growth (inches/yr) -- calibrated against
//                 FVS NE/SN variant expected diameter growth at SI 70
//   rootShootRatio: below-ground / above-ground biomass ratio
//
// maxIncrement = effective peak annual DBH growth (inches/yr) for our growth
// curve model. Because our model sustains near-peak growth for multiple years,
// these values are ~80% of the absolute biological peak. Calibrated against FVS
// variant first-decade QMD trajectories for canonical benchmark stands:
//   - FVS-NE: oak SI65 → QMD 5.3 at year 10
//   - FVS-SN: loblolly SI65 → QMD 6.8 at year 10
//   - FVS-PN: Douglas-fir SI80 → QMD 6.4 at year 10
//   - FVS-CI: ponderosa SI70 → QMD 5.1 at year 10

export const SPECIES_GROUPS = {
  'oak': {
    // Red/white/black oaks — FVS-NE: QMD 5.3 at y10, 9.8 at y30
    // Height calibrated: 14" oak → ~60ft, 30" oak → ~84ft (matches FVS-NE SI 65)
    height: { b1: 95, b2: 0.075, b3: 1.1 },
    crown: { a: 5.0, b: 1.05 },
    biomass: { b0: -2.0773, b1: 2.3323 },
    volume: { b1: 0.0058, b2: 1.94, b3: 1.08 },
    leafArea: { a: 1.5, b: 1.55 },
    maxIncrement: 0.35,
    rootShootRatio: 0.25,
    maxSdi: 450,
  },
  'maple': {
    // Sugar/red maple
    height: { b1: 85, b2: 0.04, b3: 1.15 },
    crown: { a: 5.5, b: 1.0 },
    biomass: { b0: -1.9123, b1: 2.3651 },
    volume: { b1: 0.0052, b2: 1.90, b3: 1.10 },
    leafArea: { a: 1.8, b: 1.50 },
    maxIncrement: 0.30,
    rootShootRatio: 0.22,
    maxSdi: 400,
  },
  'elm': {
    // American/slippery elm
    height: { b1: 90, b2: 0.038, b3: 1.12 },
    crown: { a: 6.0, b: 1.10 },
    biomass: { b0: -2.0773, b1: 2.3323 },
    volume: { b1: 0.0055, b2: 1.92, b3: 1.09 },
    leafArea: { a: 1.6, b: 1.52 },
    maxIncrement: 0.35,
    rootShootRatio: 0.23,
    maxSdi: 420,
  },
  'poplar': {
    // Yellow-poplar, cottonwood, aspen: fast growers
    height: { b1: 100, b2: 0.05, b3: 1.0 },
    crown: { a: 4.0, b: 0.85 },
    biomass: { b0: -2.0773, b1: 2.3323 },
    volume: { b1: 0.006, b2: 1.88, b3: 1.12 },
    leafArea: { a: 1.4, b: 1.48 },
    maxIncrement: 0.45,
    rootShootRatio: 0.20,
    maxSdi: 350,
  },
  'birch': {
    // Yellow/paper birch
    height: { b1: 75, b2: 0.045, b3: 1.1 },
    crown: { a: 4.5, b: 0.90 },
    biomass: { b0: -2.0773, b1: 2.3323 },
    volume: { b1: 0.005, b2: 1.85, b3: 1.10 },
    leafArea: { a: 1.5, b: 1.48 },
    maxIncrement: 0.28,
    rootShootRatio: 0.22,
    maxSdi: 380,
  },
  'ash': {
    // White/green ash
    height: { b1: 85, b2: 0.042, b3: 1.1 },
    crown: { a: 5.0, b: 0.95 },
    biomass: { b0: -2.0773, b1: 2.3323 },
    volume: { b1: 0.0055, b2: 1.90, b3: 1.10 },
    leafArea: { a: 1.5, b: 1.50 },
    maxIncrement: 0.32,
    rootShootRatio: 0.24,
    maxSdi: 410,
  },
  'beech': {
    // American beech: slow; peak ~0.28"/yr
    height: { b1: 80, b2: 0.032, b3: 1.2 },
    crown: { a: 6.0, b: 1.15 },
    biomass: { b0: -2.0773, b1: 2.3323 },
    volume: { b1: 0.0052, b2: 1.92, b3: 1.08 },
    leafArea: { a: 2.0, b: 1.55 },
    maxIncrement: 0.22,
    rootShootRatio: 0.25,
    maxSdi: 420,
  },
  'walnut': {
    // Black walnut
    height: { b1: 80, b2: 0.036, b3: 1.15 },
    crown: { a: 5.5, b: 1.05 },
    biomass: { b0: -2.4800, b1: 2.4835 },
    volume: { b1: 0.006, b2: 1.95, b3: 1.05 },
    leafArea: { a: 1.4, b: 1.50 },
    maxIncrement: 0.33,
    rootShootRatio: 0.25,
    maxSdi: 380,
  },
  'hickory': {
    // Shagbark/bitternut hickory: slow
    height: { b1: 85, b2: 0.033, b3: 1.15 },
    crown: { a: 5.0, b: 0.95 },
    biomass: { b0: -2.4800, b1: 2.4835 },
    volume: { b1: 0.0055, b2: 1.92, b3: 1.08 },
    leafArea: { a: 1.3, b: 1.48 },
    maxIncrement: 0.22,
    rootShootRatio: 0.26,
    maxSdi: 400,
  },
  'sycamore': {
    // American sycamore: fast
    height: { b1: 95, b2: 0.04, b3: 1.05 },
    crown: { a: 6.0, b: 1.12 },
    biomass: { b0: -2.0773, b1: 2.3323 },
    volume: { b1: 0.006, b2: 1.92, b3: 1.08 },
    leafArea: { a: 1.8, b: 1.55 },
    maxIncrement: 0.42,
    rootShootRatio: 0.22,
    maxSdi: 400,
  },
  'sweetgum': {
    // Sweetgum
    height: { b1: 85, b2: 0.04, b3: 1.1 },
    crown: { a: 4.5, b: 0.95 },
    biomass: { b0: -2.0773, b1: 2.3323 },
    volume: { b1: 0.0055, b2: 1.90, b3: 1.10 },
    leafArea: { a: 1.6, b: 1.52 },
    maxIncrement: 0.35,
    rootShootRatio: 0.23,
    maxSdi: 400,
  },
  'pine-hard': {
    // Loblolly/slash/longleaf/ponderosa (group default;
    // species-specific typicalDbhIncrement overrides for fast growers like loblolly)
    // Height calibrated: 14.5" loblolly → ~69ft (matches FVS-SN SI 65)
    height: { b1: 110, b2: 0.065, b3: 0.95 },
    crown: { a: 4.0, b: 0.90 },
    biomass: { b0: -2.5356, b1: 2.4349 },
    volume: { b1: 0.0065, b2: 1.98, b3: 1.05 },
    leafArea: { a: 0.8, b: 1.40 },
    maxIncrement: 0.45,
    rootShootRatio: 0.28,
    maxSdi: 500,
  },
  'pine-soft': {
    // White/red pine
    height: { b1: 100, b2: 0.04, b3: 1.05 },
    crown: { a: 5.0, b: 0.82 },
    biomass: { b0: -2.6177, b1: 2.4638 },
    volume: { b1: 0.007, b2: 2.0, b3: 1.02 },
    leafArea: { a: 0.9, b: 1.42 },
    maxIncrement: 0.40,
    rootShootRatio: 0.26,
    maxSdi: 550,
  },
  'spruce': {
    // Red/white/Sitka spruce
    height: { b1: 80, b2: 0.04, b3: 1.1 },
    crown: { a: 4.0, b: 0.92 },
    biomass: { b0: -2.6177, b1: 2.4638 },
    volume: { b1: 0.006, b2: 1.95, b3: 1.08 },
    leafArea: { a: 1.0, b: 1.45 },
    maxIncrement: 0.28,
    rootShootRatio: 0.28,
    maxSdi: 600,
  },
  'fir': {
    // Douglas-fir / balsam fir — moderate height calibration
    height: { b1: 130, b2: 0.050, b3: 1.05 },
    crown: { a: 5.0, b: 0.88 },
    biomass: { b0: -2.6177, b1: 2.4638 },
    volume: { b1: 0.0065, b2: 1.96, b3: 1.06 },
    leafArea: { a: 1.1, b: 1.45 },
    maxIncrement: 0.42,
    rootShootRatio: 0.27,
    maxSdi: 580,
  },
  'cedar': {
    // Eastern/western red cedar, arborvitae: slow
    height: { b1: 70, b2: 0.035, b3: 1.15 },
    crown: { a: 5.0, b: 0.80 },
    biomass: { b0: -2.6177, b1: 2.4638 },
    volume: { b1: 0.005, b2: 1.88, b3: 1.10 },
    leafArea: { a: 1.0, b: 1.42 },
    maxIncrement: 0.20,
    rootShootRatio: 0.28,
    maxSdi: 500,
  },
  'cypress': {
    // Bald cypress
    height: { b1: 85, b2: 0.035, b3: 1.1 },
    crown: { a: 5.0, b: 0.82 },
    biomass: { b0: -2.6177, b1: 2.4638 },
    volume: { b1: 0.006, b2: 1.92, b3: 1.08 },
    leafArea: { a: 0.9, b: 1.40 },
    maxIncrement: 0.28,
    rootShootRatio: 0.26,
    maxSdi: 480,
  },
  'redwood': {
    // Coast redwood / giant sequoia
    height: { b1: 200, b2: 0.022, b3: 1.2 },
    crown: { a: 4.0, b: 0.65 },
    biomass: { b0: -2.6177, b1: 2.4638 },
    volume: { b1: 0.008, b2: 2.05, b3: 1.02 },
    leafArea: { a: 1.2, b: 1.50 },
    maxIncrement: 0.42,
    rootShootRatio: 0.20,
    maxSdi: 700,
  },
  'palm': {
    // Palms: no FVS equivalent; kept at original value
    height: { b1: 60, b2: 0.06, b3: 0.9 },
    crown: { a: 4.0, b: 0.45 },
    biomass: { b0: -3.0, b1: 2.10 },
    volume: { b1: 0, b2: 0, b3: 0 },
    leafArea: { a: 2.0, b: 1.30 },
    maxIncrement: 0.20,
    rootShootRatio: 0.30,
    maxSdi: 300,
  },
  'small-deciduous': {
    // Dogwood, redbud, crape myrtle: understory/ornamental; peak ~0.28"/yr
    height: { b1: 35, b2: 0.06, b3: 1.0 },
    crown: { a: 5.0, b: 0.85 },
    biomass: { b0: -2.4800, b1: 2.4835 },
    volume: { b1: 0.004, b2: 1.80, b3: 1.12 },
    leafArea: { a: 1.8, b: 1.48 },
    maxIncrement: 0.22,
    rootShootRatio: 0.25,
    maxSdi: 350,
  },
  'fruit': {
    // Apple, cherry, pear
    height: { b1: 30, b2: 0.065, b3: 1.0 },
    crown: { a: 5.0, b: 0.90 },
    biomass: { b0: -2.4800, b1: 2.4835 },
    volume: { b1: 0.003, b2: 1.75, b3: 1.15 },
    leafArea: { a: 1.9, b: 1.50 },
    maxIncrement: 0.26,
    rootShootRatio: 0.28,
    maxSdi: 320,
  },
  'default': {
    height: { b1: 70, b2: 0.038, b3: 1.1 },
    crown: { a: 5.0, b: 0.90 },
    biomass: { b0: -2.0773, b1: 2.3323 },
    volume: { b1: 0.005, b2: 1.88, b3: 1.10 },
    leafArea: { a: 1.5, b: 1.48 },
    maxIncrement: 0.32,
    rootShootRatio: 0.24,
    maxSdi: 400,
  },
};

// ─── Genus to species-group mapping ──────────────────────────────────────

export const GENUS_TO_GROUP = {
  // ── Oaks & relatives ──
  quercus: 'oak', castanea: 'oak',
  // ── Maples & similar ──
  acer: 'maple', tilia: 'maple', ginkgo: 'maple', aesculus: 'maple',
  // ── Elms & similar ──
  ulmus: 'elm', celtis: 'elm', zelkova: 'elm',
  // ── Birch ──
  betula: 'birch',
  // ── Ash ──
  fraxinus: 'ash',
  // ── Beech ──
  fagus: 'beech',
  // ── Sycamore ──
  platanus: 'sycamore',
  // ── Poplar / fast-growing ──
  liriodendron: 'poplar', populus: 'poplar', salix: 'poplar',
  robinia: 'poplar', gleditsia: 'poplar', catalpa: 'poplar',
  ailanthus: 'poplar', paulownia: 'poplar', albizia: 'poplar',
  triadica: 'poplar', gymnocladus: 'poplar', alnus: 'poplar',
  // ── Walnut ──
  juglans: 'walnut',
  // ── Hickory ──
  carya: 'hickory',
  // ── Sweetgum ──
  liquidambar: 'sweetgum', nyssa: 'sweetgum',
  // ── Pines ──
  pinus: 'pine-hard',
  // ── Spruce ──
  picea: 'spruce',
  // ── Fir / hemlock / larch ──
  abies: 'fir', pseudotsuga: 'fir', tsuga: 'fir', larix: 'fir',
  // ── Cedar / juniper ──
  cedrus: 'cedar', thuja: 'cedar', juniperus: 'cedar', calocedrus: 'cedar',
  // ── Cypress ──
  taxodium: 'cypress', metasequoia: 'cypress',
  // ── Redwood ──
  sequoia: 'redwood', sequoiadendron: 'redwood',
  // ── Palm ──
  roystonea: 'palm', sabal: 'palm', phoenix: 'palm', washingtonia: 'palm',
  // ── Small deciduous / ornamental ──
  cornus: 'small-deciduous', cercis: 'small-deciduous',
  lagerstroemia: 'small-deciduous', magnolia: 'small-deciduous',
  chilopsis: 'small-deciduous', sassafras: 'small-deciduous',
  maclura: 'small-deciduous', arbutus: 'small-deciduous',
  elaeagnus: 'small-deciduous',
  // ── Fruit / nut ──
  malus: 'fruit', prunus: 'fruit', pyrus: 'fruit',
  diospyros: 'fruit', asimina: 'fruit',
};

// ─── Regional Biomass Correction Factors ─────────────────────────────────
//
// Jenkins et al. (2003) national equations systematically overestimate
// above-ground biomass compared to FVS's Component Ratio Method (CRM),
// which uses regional FIA equations calibrated to local conditions.
//
// Correction factors derived from:
//   - Domke et al. 2012 "Consequences of applying the FIA/CRM biomass
//     estimation approach to trees harvested on National Forest System lands"
//   - Woodall et al. 2011 "An overview of the FIA volume-to-biomass approach"
//   - Comparison of Jenkins vs CRM by FVS variant region and wood type
//
// Applied as: correctedBiomass = jenkinsBiomass × factor
//
// Factors are < 1.0 because Jenkins overestimates relative to CRM.
// Split by softwood/hardwood because the overestimation magnitude differs.

export const BIOMASS_CORRECTIONS = {
  sn: { softwood: 0.87, hardwood: 0.90 },  // Southern: ~13% SW, ~10% HW overestimate
  ne: { softwood: 0.85, hardwood: 0.90 },  // Northeast/Lake/Central: ~15% SW, ~10% HW
  pn: { softwood: 0.78, hardwood: 0.85 },  // Pacific NW: ~22% SW, ~15% HW
  cr: { softwood: 0.82, hardwood: 0.87 },  // Central Rockies: ~18% SW, ~13% HW
  ci: { softwood: 0.82, hardwood: 0.87 },  // Inland Empire: ~18% SW, ~13% HW
  ca: { softwood: 0.80, hardwood: 0.85 },  // Inland CA: ~20% SW, ~15% HW
};

const SOFTWOOD_GROUPS = new Set([
  'pine-hard', 'pine-soft', 'spruce', 'fir', 'cedar', 'cypress', 'redwood',
]);

/**
 * Get the biomass correction factor for a species group in a given FVS variant region.
 * Returns a multiplier < 1.0 to convert Jenkins biomass to CRM-equivalent.
 *
 * @param {string} groupCode - species group code (e.g. 'oak', 'pine-hard')
 * @param {string} fvsVariant - FVS variant code (e.g. 'sn', 'ne', 'pn')
 * @returns {number} correction multiplier (default 0.85 if region unknown)
 */
export function biomassRegionCorrection(groupCode, fvsVariant) {
  const regionFactors = BIOMASS_CORRECTIONS[fvsVariant];
  if (!regionFactors) return 0.85; // conservative default
  return SOFTWOOD_GROUPS.has(groupCode) ? regionFactors.softwood : regionFactors.hardwood;
}

// ─── Allometric Functions ────────────────────────────────────────────────

/**
 * Get the species group coefficients for a given group code.
 */
export function getGroupCoeffs(groupCode) {
  return SPECIES_GROUPS[groupCode] || SPECIES_GROUPS['default'];
}

/**
 * Chapman-Richards height prediction (feet) from DBH (inches).
 */
export function predictHeight(dbhInches, coeffs) {
  const { b1, b2, b3 } = coeffs.height;
  if (dbhInches <= 0) return 4.5; // breast height
  return b1 * Math.pow(1 - Math.exp(-b2 * dbhInches), b3);
}

/**
 * Crown width prediction (feet) from DBH (inches).
 */
export function predictCrownWidth(dbhInches, coeffs) {
  const { a, b } = coeffs.crown;
  return Math.max(2, a + b * dbhInches);
}

/**
 * Above-ground biomass (lbs dry weight) from DBH (inches).
 * Jenkins et al. (2003) equations operate on DBH in cm,
 * output in kg, then convert.
 */
export function predictAboveGroundBiomass(dbhInches, coeffs) {
  if (dbhInches <= 0) return 0;
  const dbhCm = dbhInches * 2.54;
  const { b0, b1 } = coeffs.biomass;
  const biomassKg = Math.exp(b0 + b1 * Math.log(dbhCm));
  return biomassKg * 2.20462; // kg to lbs
}

/**
 * Below-ground biomass (lbs) from above-ground biomass.
 */
export function predictBelowGroundBiomass(agBiomassLbs, coeffs) {
  return agBiomassLbs * coeffs.rootShootRatio;
}

/**
 * Merchantable volume in board feet (Scribner) from DBH and height.
 *
 * Uses a soft threshold from 8-12" DBH to approximate the effect of natural
 * DBH variance in even-aged stands. In reality, stands with QMD near 10" have
 * a distribution of individual tree sizes (CV ~15-25%), so some trees exceed
 * the 10" sawtimber threshold while others don't. The linear ramp from 8-12"
 * approximates the fraction of trees that would contribute merchantable volume
 * in a real stand at any given QMD.
 */
export function predictVolumeBF(dbhInches, heightFt, coeffs) {
  if (dbhInches < 8) return 0;
  const { b1, b2, b3 } = coeffs.volume;
  if (b1 === 0) return 0; // palms etc
  const fullVol = Math.max(0, b1 * Math.pow(dbhInches, b2) * Math.pow(heightFt, b3));
  if (dbhInches < 12) {
    // Smooth ramp: 0 at 8", 100% at 12"
    return fullVol * (dbhInches - 8) / 4;
  }
  return fullVol;
}

/**
 * Pulpwood volume in cords from DBH and height.
 * Applicable for trees 5-10" DBH (below sawtimber threshold).
 *
 * Uses Honer et al. (1983) combined-variable cord volume equation:
 *   Cords = 0.0042 * DBH^1.9 * H^0.85
 * where 1 cord = 128 cubic feet (stacked 4x4x8 ft).
 *
 * Source: Honer, Ker, & Alemdag (1983). "Metric Timber Tables for the
 * Commercial Tree Species of Central and Eastern Canada" (CFS Info Report PI-X-5)
 */
export function predictPulpwoodCords(dbhInches, heightFt) {
  if (dbhInches < 5 || dbhInches >= 10) return 0;
  return Math.max(0, 0.0042 * Math.pow(dbhInches, 1.9) * Math.pow(heightFt, 0.85));
}

/**
 * Total cubic foot volume from DBH and height.
 * Uses the combined-variable equation: V_cf = 0.003 * DBH^2 * H
 * Applicable for all merchantable trees >= 5" DBH.
 */
export function predictTotalCubicFt(dbhInches, heightFt) {
  if (dbhInches < 5) return 0;
  return Math.max(0, 0.003 * dbhInches * dbhInches * heightFt);
}

/**
 * Leaf area (sq ft) from DBH (inches).
 * Used for ecosystem services calculations.
 */
export function predictLeafArea(dbhInches, coeffs) {
  if (dbhInches <= 0) return 0;
  const { a, b } = coeffs.leafArea;
  return a * Math.pow(dbhInches, b);
}

/**
 * Annual DBH increment (inches) as a function of current DBH, max DBH,
 * site index modifier, and competition modifier.
 *
 * Uses a modified beta-distribution shape: growth peaks at ~10% of max DBH,
 * then declines steeply as the tree approaches its maximum size.
 */
export function annualDbhIncrement(dbhInches, maxDbhInches, maxIncrement, siteModifier, competitionModifier) {
  if (dbhInches >= maxDbhInches) return 0;
  const ratio = dbhInches / maxDbhInches;

  // Realistic forestry growth curve: fast juvenile growth, steeper post-peak decline.
  // Peak growth occurs at ~8-10% of maximum DBH (realistic for most species).
  //
  // Uses a modified beta-distribution shape: (ratio+0.01)^0.3 * (1-ratio)^2.5
  // Steeper decline (exponent 2.5 vs 1.5) better matches FVS diameter growth
  // trajectories where growth drops 40-60% by midpoint of rotation.
  // Peak value ≈ 0.385 at ratio ≈ 0.10.
  const shape = Math.pow(ratio + 0.01, 0.3) * Math.pow(1 - ratio, 2.5);
  const baseGrowth = maxIncrement * (shape / 0.385);

  // Seedling floor: only very young trees (< 3" DBH) get a growth floor.
  // Larger trees under competition must be able to slow down realistically.
  const minGrowth = dbhInches < 3 ? maxIncrement * 0.4 : 0;

  return Math.max(minGrowth, baseGrowth) * siteModifier * competitionModifier;
}

/**
 * Basal area of a single tree (sq ft) from DBH (inches).
 * BA = pi * (DBH/2)^2 / 144
 */
export function basalArea(dbhInches) {
  return (Math.PI * Math.pow(dbhInches / 2, 2)) / 144;
}

/**
 * Quadratic mean diameter from an array of DBH values.
 */
export function quadraticMeanDiameter(dbhArray) {
  if (dbhArray.length === 0) return 0;
  const sumSq = dbhArray.reduce((s, d) => s + d * d, 0);
  return Math.sqrt(sumSq / dbhArray.length);
}

/**
 * Reineke's Stand Density Index.
 * SDI = TPA * (QMD / 10)^1.605
 */
export function standDensityIndex(treesPerAcre, qmd) {
  if (treesPerAcre <= 0 || qmd <= 0) return 0;
  return treesPerAcre * Math.pow(qmd / 10, 1.605);
}
