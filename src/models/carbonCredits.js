/**
 * Carbon Credit Estimation Module
 *
 * Implements IFM (Improved Forest Management) and A/R (Afforestation/
 * Reforestation) carbon credit estimation aligned with major registries:
 *   - Verra VCS (VM0003, VM0047)
 *   - American Carbon Registry (ACR)
 *   - Climate Action Reserve (CAR Forest Protocol)
 *
 * This is a planning-grade estimation tool. Actual credit issuance
 * requires third-party verification and field measurements.
 */

import { projectStand } from './forestryModel.js';

// ─── Constants ──────────────────────────────────────────────────────────

const LBS_CO2_PER_TONNE = 2204.62;
const CREDITING_PERIOD_YEARS = 40; // Standard VCS project crediting period
const DEFAULT_CREDIT_PRICE = 15; // $/tCO2e (mid-range for forestry credits)

/**
 * Carbon credit price ranges by market ($/tCO2e).
 */
export const CREDIT_PRICE_RANGES = {
  voluntary_low: 5,
  voluntary_mid: 15,
  voluntary_high: 35,
  compliance: 50,
};

// ─── Core Calculations ──────────────────────────────────────────────────

/**
 * Calculate total carbon stock over time for a project scenario.
 * Returns an array of { year, carbonTonnesCO2e } for each year.
 *
 * @param {Array} trees - tree objects
 * @param {Map|Object} speciesMap - species lookup
 * @param {Object|null} prescription - management prescription
 * @param {number} years - projection horizon
 * @param {number} siteIndex - site index multiplier
 * @returns {Array<{year: number, carbonTonnesCO2e: number, standingCarbonLbs: number}>}
 */
export function calculateProjectCarbon(trees, speciesMap, prescription, years, siteIndex) {
  const timeline = [];
  for (let y = 0; y <= years; y++) {
    const result = projectStand(trees, speciesMap, y, siteIndex, null, prescription);
    const standingCarbonLbs = result.stand.totalCarbonLbs || 0;
    // Include harvested wood products carbon (assume 50% remains in long-lived products)
    const hwpCarbonLbs = (result.stand.harvestedCarbonLbs || 0) * 0.5;
    const totalCarbonLbs = standingCarbonLbs + hwpCarbonLbs;
    timeline.push({
      year: y,
      carbonTonnesCO2e: (totalCarbonLbs * 3.67) / LBS_CO2_PER_TONNE,
      standingCarbonLbs,
    });
  }
  return timeline;
}

/**
 * Calculate baseline carbon (no-management scenario).
 * For A/R: baseline = no trees (current land use = 0 carbon)
 * For IFM: baseline = no-management projection
 */
export function calculateBaselineCarbon(trees, speciesMap, years, siteIndex, projectType = 'afforestation') {
  if (projectType === 'afforestation') {
    // A/R baseline: current land has no trees
    return Array.from({ length: years + 1 }, (_, y) => ({
      year: y,
      carbonTonnesCO2e: 0,
      standingCarbonLbs: 0,
    }));
  }

  // IFM baseline: project the stand with no management
  return calculateProjectCarbon(trees, speciesMap, null, years, siteIndex);
}

/**
 * Calculate annual additionality (net carbon beyond baseline).
 *
 * @param {Array} projectTimeline - from calculateProjectCarbon
 * @param {Array} baselineTimeline - from calculateBaselineCarbon
 * @returns {Array<{year: number, annualAdditionality: number, cumulativeAdditionality: number}>}
 */
export function calculateAdditionality(projectTimeline, baselineTimeline) {
  let cumulative = 0;
  return projectTimeline.map((pt, i) => {
    const bt = baselineTimeline[i] || { carbonTonnesCO2e: 0 };
    const annual = pt.carbonTonnesCO2e - bt.carbonTonnesCO2e;
    // Only count positive additionality (net increase)
    const creditableAnnual = Math.max(0, annual - (i > 0 ? projectTimeline[i - 1].carbonTonnesCO2e - (baselineTimeline[i - 1]?.carbonTonnesCO2e || 0) : 0));
    cumulative += Math.max(0, creditableAnnual);
    return {
      year: pt.year,
      netStockChange: annual,
      annualAdditionality: Math.max(0, creditableAnnual),
      cumulativeAdditionality: cumulative,
    };
  });
}

/**
 * Calculate buffer pool deduction for permanence risk.
 *
 * Verra VCS Buffer Pool: 10-60% depending on risk factors:
 *   - Internal risks (project management, financial viability): 3-15%
 *   - External risks (fire, pest, extreme weather): 2-30%
 *   - Natural disturbance risk (region-specific): 2-15%
 *
 * @param {number} totalCredits - gross tCO2e
 * @param {Object} riskFactors - risk assessment inputs
 * @returns {{ bufferPercentage: number, bufferDeduction: number, netCredits: number }}
 */
export function calculateBufferPool(totalCredits, riskFactors = {}) {
  const {
    landOwnership = 'private', // 'private' | 'public' | 'tribal' | 'conservation_easement'
    fireRisk = 'moderate',      // 'low' | 'moderate' | 'high'
    commitmentYears = 40,       // project commitment period
    latitude = 40,              // for regional fire risk proxy
  } = riskFactors;

  // Internal risk (project management & financial)
  let internalRisk = 0.08; // base 8%
  if (landOwnership === 'conservation_easement') internalRisk = 0.03;
  else if (landOwnership === 'public') internalRisk = 0.05;
  else if (landOwnership === 'tribal') internalRisk = 0.06;
  if (commitmentYears >= 100) internalRisk -= 0.02;

  // External risk (fire, pest, weather)
  let externalRisk = 0.04; // base 4%
  if (fireRisk === 'high') externalRisk = 0.12;
  else if (fireRisk === 'moderate') externalRisk = 0.06;
  else externalRisk = 0.02;

  // Latitude proxy for fire risk
  if (latitude > 25 && latitude < 38) externalRisk += 0.04; // Southern US / fire-prone
  if (latitude > 38 && latitude < 48) externalRisk += 0.02; // Mid-latitude

  // Natural disturbance
  let disturbanceRisk = 0.04;

  const totalBufferPct = Math.min(0.60, Math.max(0.10, internalRisk + externalRisk + disturbanceRisk));
  const bufferDeduction = totalCredits * totalBufferPct;

  return {
    bufferPercentage: Math.round(totalBufferPct * 100),
    bufferDeduction: Math.round(bufferDeduction * 100) / 100,
    netCredits: Math.round((totalCredits - bufferDeduction) * 100) / 100,
    riskBreakdown: {
      internal: Math.round(internalRisk * 100),
      external: Math.round(externalRisk * 100),
      disturbance: Math.round(disturbanceRisk * 100),
    },
  };
}

/**
 * Estimate leakage from displaced harvesting activity.
 * Standard leakage deduction for IFM projects: 0-40% of net carbon benefit
 * For A/R projects on non-forested land: typically 0-10%
 *
 * @param {Array} harvestEvents - harvest events from projection
 * @param {string} projectType - 'afforestation' | 'ifm'
 * @returns {{ leakagePercentage: number, leakageTonnes: number }}
 */
export function calculateLeakage(harvestEvents, projectType = 'afforestation') {
  if (projectType === 'afforestation') {
    // A/R projects have minimal leakage (land wasn't producing timber before)
    return { leakagePercentage: 5, leakageTonnes: 0 };
  }

  // IFM: leakage depends on how much harvesting was reduced
  const totalHarvestedCarbon = harvestEvents.reduce((s, e) =>
    s + (e.carbonReleasedLbs || 0), 0);
  const harvestedTonnesCO2 = (totalHarvestedCarbon * 3.67) / LBS_CO2_PER_TONNE;

  // Standard IFM leakage rate: 20% of reduced harvesting
  const leakagePct = harvestedTonnesCO2 > 0 ? 20 : 0;
  return {
    leakagePercentage: leakagePct,
    leakageTonnes: Math.round(harvestedTonnesCO2 * 0.20 * 100) / 100,
  };
}

// ─── Full Analysis ──────────────────────────────────────────────────────

/**
 * Run a complete carbon credit analysis.
 *
 * @param {Object} params
 * @returns {Object} Full analysis results
 */
export function analyzeCarbonCredits({
  trees,
  speciesMap,
  prescription,
  siteIndex = 1.0,
  creditingPeriod = CREDITING_PERIOD_YEARS,
  projectType = 'afforestation',
  creditPrice = DEFAULT_CREDIT_PRICE,
  riskFactors = {},
}) {
  if (!trees || trees.length === 0) return null;

  // Project carbon under management
  const projectTimeline = calculateProjectCarbon(
    trees, speciesMap, prescription, creditingPeriod, siteIndex
  );

  // Baseline carbon (no trees for A/R, no management for IFM)
  const baselineTimeline = calculateBaselineCarbon(
    trees, speciesMap, creditingPeriod, siteIndex, projectType
  );

  // Additionality
  const additionality = calculateAdditionality(projectTimeline, baselineTimeline);
  const grossCredits = additionality[additionality.length - 1]?.cumulativeAdditionality || 0;

  // Buffer pool (permanence risk)
  const buffer = calculateBufferPool(grossCredits, riskFactors);

  // Leakage
  const projectResult = projectStand(trees, speciesMap, creditingPeriod, siteIndex, null, prescription);
  const leakage = calculateLeakage(projectResult.harvestEvents, projectType);

  // Net credits
  const netCredits = Math.max(0, buffer.netCredits - leakage.leakageTonnes);

  // Annual vintage breakdown
  const annualVintages = additionality.map((a, i) => {
    if (i === 0) return { year: a.year, vintage: 0 };
    const prevCum = additionality[i - 1].cumulativeAdditionality;
    const thisVintage = a.cumulativeAdditionality - prevCum;
    const bufferAdj = thisVintage * (1 - buffer.bufferPercentage / 100);
    return {
      year: a.year,
      vintage: Math.max(0, Math.round(bufferAdj * 100) / 100),
    };
  });

  // Revenue estimation
  const totalRevenue = netCredits * creditPrice;
  const annualRevenue = totalRevenue / Math.max(1, creditingPeriod);

  // Determine methodology alignment
  const methodology = projectType === 'afforestation'
    ? 'VCS VM0047 (A/R) / ACR Methodology for A/R'
    : 'VCS VM0003 (IFM) / CAR Forest Protocol';

  return {
    projectType,
    creditingPeriod,
    methodology,

    // Timelines
    projectTimeline,
    baselineTimeline,
    additionality,
    annualVintages,

    // Credit quantities
    grossCredits: Math.round(grossCredits * 100) / 100,
    bufferDeduction: buffer.bufferDeduction,
    bufferPercentage: buffer.bufferPercentage,
    leakageDeduction: leakage.leakageTonnes,
    leakagePercentage: leakage.leakagePercentage,
    netCredits: Math.round(netCredits * 100) / 100,

    // Risk assessment
    riskBreakdown: buffer.riskBreakdown,

    // Revenue
    creditPrice,
    totalRevenue: Math.round(totalRevenue),
    annualRevenue: Math.round(annualRevenue),
    revenuePerAcre: Math.round(totalRevenue / Math.max(0.01, projectResult.stand.areaAcres)),
  };
}
