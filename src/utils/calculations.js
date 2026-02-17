import { getSpeciesById } from '../data/treeSpecies';
import { getGrowthFactor } from './geoUtils';
import { projectStand } from '../models/forestryModel';
import { standAnnualServices } from '../models/ecosystemServices';

/**
 * Look up a species by ID, checking a dynamic speciesMap first, then bundled data.
 */
function lookupSpecies(speciesId, speciesMap) {
  if (speciesMap instanceof Map) return speciesMap.get(speciesId) || getSpeciesById(speciesId);
  return speciesMap?.[speciesId] || getSpeciesById(speciesId);
}

/**
 * Calculate total canopy area in square meters.
 * Uses the forestry model when a projection year is provided.
 */
export function calculateCanopyArea(trees, speciesMap, projectionYear, siteIndex) {
  if (trees.length === 0) return 0;

  if (projectionYear !== null && projectionYear !== undefined && siteIndex !== undefined) {
    const result = projectStand(trees, speciesMap, projectionYear, siteIndex);
    const totalArea = result.trees.filter(t => t.alive).reduce((sum, t) => {
      const radiusFt = (t.crownWidthFt || 0) / 2;
      const radiusM = radiusFt * 0.3048;
      return sum + Math.PI * radiusM * radiusM;
    }, 0);
    const overlapFactor = trees.length > 10 ? 0.85 : 0.95;
    return totalArea * overlapFactor;
  }

  // Fallback to legacy method
  const totalRaw = trees.reduce((sum, tree) => {
    const species = lookupSpecies(tree.speciesId, speciesMap);
    if (!species) return sum;
    const gf = getGrowthFactor(projectionYear, species.growthSpeed ?? species.growthRate);
    const r = species.canopyRadius * gf;
    return sum + Math.PI * r * r;
  }, 0);
  const overlapFactor = trees.length > 10 ? 0.85 : 0.95;
  return totalRaw * overlapFactor;
}

/**
 * Calculate total CO2 absorbed per year in kg.
 * Uses the forestry model when site index is provided.
 */
export function calculateCO2(trees, speciesMap, projectionYear, siteIndex) {
  if (trees.length === 0) return 0;

  if (projectionYear !== null && projectionYear !== undefined && siteIndex !== undefined) {
    const result = projectStand(trees, speciesMap, projectionYear, siteIndex);
    // Convert total CO2 stored (lbs) to annual sequestration (kg/yr) approximation
    const prevResult = projectionYear > 0
      ? projectStand(trees, speciesMap, projectionYear - 1, siteIndex)
      : { stand: { totalCo2Lbs: 0 } };
    const deltaCo2Lbs = result.stand.totalCo2Lbs - prevResult.stand.totalCo2Lbs;
    return Math.max(0, deltaCo2Lbs * 0.453592); // lbs to kg
  }

  return trees.reduce((sum, tree) => {
    const species = lookupSpecies(tree.speciesId, speciesMap);
    if (!species) return sum;
    if (projectionYear === null || projectionYear === undefined) {
      return sum + species.co2PerYear;
    }
    const gf = getGrowthFactor(projectionYear, species.growthSpeed ?? species.growthRate);
    const absorptionFactor = gf * gf;
    return sum + species.co2PerYear * absorptionFactor;
  }, 0);
}

/**
 * Calculate cumulative carbon stored over time for all trees.
 * Uses the forestry model for projections up to 80 years.
 */
export function calculateCarbonOverTime(trees, speciesMap, siteIndex, prescription) {
  const decades = [10, 20, 30, 40, 50, 60, 70, 80];

  if (siteIndex !== undefined && trees.length > 0) {
    let prevCo2Lbs = 0;
    return decades.map((year) => {
      const result = projectStand(trees, speciesMap, year, siteIndex, null, prescription);
      const totalCo2Lbs = result.stand.totalCo2Lbs;
      const decadeDeltaLbs = totalCo2Lbs - prevCo2Lbs;
      const annualKg = (decadeDeltaLbs / 10) * 0.453592;
      const cumulativeKg = totalCo2Lbs * 0.453592;
      prevCo2Lbs = totalCo2Lbs;
      return {
        year,
        annual: Math.round(annualKg),
        cumulative: Math.round(cumulativeKg),
      };
    });
  }

  // Legacy fallback
  const legacyDecades = [10, 20, 30, 40];
  let cumulativeTotal = 0;
  return legacyDecades.map((year, i) => {
    let annualAtDecade = 0;
    let decadeAbsorption = 0;
    trees.forEach((tree) => {
      const species = lookupSpecies(tree.speciesId, speciesMap);
      if (!species) return;
      const curve = species.co2Curve || [0.3, 0.7, 1.0, 1.0];
      const spd = species.growthSpeed ?? (species.growthRate === 'fast' ? 1.4 : species.growthRate === 'slow' ? 0.6 : 1.0);
      const speedShift = (spd - 1.0) * 1.5;
      const adjustedIdx = Math.min(curve.length - 1, Math.max(0, i + speedShift));
      const floorIdx = Math.floor(adjustedIdx);
      const ceilIdx = Math.min(curve.length - 1, floorIdx + 1);
      const frac = adjustedIdx - floorIdx;
      const mult = curve[floorIdx] * (1 - frac) + curve[ceilIdx] * frac;
      annualAtDecade += species.co2PerYear * mult;
      decadeAbsorption += species.co2PerYear * mult * 10;
    });
    cumulativeTotal += decadeAbsorption;
    return { year, annual: Math.round(annualAtDecade), cumulative: Math.round(cumulativeTotal) };
  });
}

/**
 * Estimate temperature reduction in degrees C.
 */
export function calculateTempReduction(trees, speciesMap, projectionYear, siteIndex) {
  if (trees.length === 0) return 0;
  const canopyArea = calculateCanopyArea(trees, speciesMap, projectionYear, siteIndex);
  const rawReduction = (canopyArea / 200) * 0.5;
  return Math.min(rawReduction, 5.0);
}

/**
 * Calculate full ecosystem services valuation.
 * Returns the standAnnualServices result from the ecosystem model.
 */
export function calculateEcosystemValue(trees, speciesMap, year, siteIndex, options) {
  if (!trees || trees.length === 0) return null;
  const result = projectStand(trees, speciesMap, year || 0, siteIndex || 1.0);
  return standAnnualServices(result.trees, options);
}

/**
 * Format CO2 with appropriate units (kg or tonnes).
 */
export function formatCO2(kgCO2) {
  if (kgCO2 >= 1000) {
    return (kgCO2 / 1000).toFixed(1) + ' t/yr';
  }
  return Math.round(kgCO2) + ' kg/yr';
}

/**
 * Format a number with appropriate units.
 */
export function formatNumber(value, decimals = 1) {
  if (value >= 1000) {
    return (value / 1000).toFixed(decimals) + 'k';
  }
  return value.toFixed(decimals);
}
