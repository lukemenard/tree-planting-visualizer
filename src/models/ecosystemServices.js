/**
 * Ecosystem services valuation module.
 *
 * Calculates annual and cumulative dollar values for:
 *   - Stormwater interception
 *   - Energy savings (cooling)
 *   - Air quality improvement (PM2.5, O3, NO2)
 *   - Carbon sequestration valuation
 *   - Property value uplift
 *
 * Methodology aligned with i-Tree Eco (USFS) and EPA guidelines.
 */

// ─── Rate Constants ──────────────────────────────────────────────────────

const RATES = {
  // Stormwater: interception coefficient & utility rate
  stormwater: {
    interceptFraction: 0.18,       // 18% of rainfall intercepted by canopy
    annualRainfallInches: 40,      // US average (user could override)
    cubicFtPerGallon: 0.1337,
    costPerGallon: 0.012,          // $/gal stormwater treatment cost
  },
  // Energy savings
  energy: {
    shadeFactor: 0.15,             // fraction of cooling load offset per sq ft canopy
    avgCoolingKwhPerSqFt: 1.2,    // annual cooling kWh per sq ft canopy coverage
    electricityRate: 0.13,         // $/kWh national average
    heatingReduction: 0.03,        // fraction of heating saved (windbreak effect)
    avgHeatingCostPerSqFt: 0.60,  // $/sq ft annual heating cost
  },
  // Air quality: removal rates and damage costs
  airQuality: {
    // lbs removed per sq ft leaf area per year (i-Tree Eco averages)
    pm25: { removalRate: 0.0000045, damageCost: 160 },   // $/lb
    pm10: { removalRate: 0.0000065, damageCost: 22 },     // $/lb
    o3:   { removalRate: 0.000012,  damageCost: 7.5 },    // $/lb
    no2:  { removalRate: 0.0000060, damageCost: 7.0 },    // $/lb
    so2:  { removalRate: 0.0000035, damageCost: 4.5 },    // $/lb
    co:   { removalRate: 0.0000020, damageCost: 1.5 },    // $/lb
  },
  // Carbon: social cost of carbon (EPA IWG 2024, 3% discount rate)
  carbon: {
    socialCostPerTonneCo2: 51,     // $/tonne CO2
    lbsPerTonne: 2204.62,
  },
  // Property value
  property: {
    baseUpliftPercent: 0.07,       // 7% for mature trees
    maturityThresholdDbh: 18,      // DBH at which uplift is fully realized
    defaultPropertyValue: 300000,  // $300k default
    maxUpliftPercent: 0.15,        // cap at 15%
  },
};

// ─── Per-Tree Ecosystem Services ─────────────────────────────────────────

/**
 * Calculate annual ecosystem service values for a single tree.
 *
 * @param {Object} tree - projected tree output from forestryModel.projectStand()
 *   { dbhInches, heightFt, crownWidthFt, leafAreaSqFt, co2StoredLbs, alive }
 * @param {Object} [options] - optional overrides
 *   { rainfallInches, electricityRate, propertyValue }
 * @returns {Object} annual service values in both physical units and dollars
 */
export function treeAnnualServices(tree, options = {}) {
  if (!tree.alive) return emptyServices();

  const leafArea = tree.leafAreaSqFt || 0;
  const canopyAreaSqFt = Math.PI * Math.pow((tree.crownWidthFt || 0) / 2, 2);
  const dbh = tree.dbhInches || 0;

  // ── Stormwater ──
  const rainfallIn = options.rainfallInches || RATES.stormwater.annualRainfallInches;
  const canopyAreaSqFtClean = Math.max(0, canopyAreaSqFt);
  const rainfallCuFt = (rainfallIn / 12) * canopyAreaSqFtClean;
  const interceptedCuFt = rainfallCuFt * RATES.stormwater.interceptFraction;
  const interceptedGallons = interceptedCuFt / RATES.stormwater.cubicFtPerGallon;
  const stormwaterValue = interceptedGallons * RATES.stormwater.costPerGallon;

  // ── Energy savings ──
  const coolingKwh = canopyAreaSqFtClean * RATES.energy.avgCoolingKwhPerSqFt * RATES.energy.shadeFactor;
  const elecRate = options.electricityRate || RATES.energy.electricityRate;
  const coolingValue = coolingKwh * elecRate;
  const heatingValue = canopyAreaSqFtClean * RATES.energy.avgHeatingCostPerSqFt * RATES.energy.heatingReduction;
  const energyValue = coolingValue + heatingValue;

  // ── Air quality ──
  let airQualityValue = 0;
  const airDetails = {};
  for (const [pollutant, params] of Object.entries(RATES.airQuality)) {
    const lbsRemoved = leafArea * params.removalRate;
    const value = lbsRemoved * params.damageCost;
    airDetails[pollutant] = { lbsRemoved: Math.round(lbsRemoved * 10000) / 10000, value: Math.round(value * 100) / 100 };
    airQualityValue += value;
  }

  // ── Carbon value ──
  // Annual sequestration approximated from co2StoredLbs delta
  // For a single snapshot, use a growth-proportional estimate
  const annualCo2Lbs = estimateAnnualCo2Seq(dbh);
  const carbonValueAnnual = (annualCo2Lbs / RATES.carbon.lbsPerTonne) * RATES.carbon.socialCostPerTonneCo2;

  // ── Property value ──
  const propVal = options.propertyValue || RATES.property.defaultPropertyValue;
  const maturityFactor = Math.min(1, dbh / RATES.property.maturityThresholdDbh);
  const upliftPct = RATES.property.baseUpliftPercent * maturityFactor;
  const propertyValueUplift = propVal * Math.min(upliftPct, RATES.property.maxUpliftPercent);

  return {
    stormwater: {
      gallonsIntercepted: Math.round(interceptedGallons),
      annualValue: round2(stormwaterValue),
    },
    energy: {
      coolingKwh: round2(coolingKwh),
      annualValue: round2(energyValue),
    },
    airQuality: {
      details: airDetails,
      annualValue: round2(airQualityValue),
    },
    carbon: {
      annualCo2Lbs: round2(annualCo2Lbs),
      annualValue: round2(carbonValueAnnual),
    },
    property: {
      upliftPercent: round2(upliftPct * 100),
      annualValue: round2(propertyValueUplift),
    },
    totalAnnualValue: round2(stormwaterValue + energyValue + airQualityValue + carbonValueAnnual + propertyValueUplift),
  };
}

// ─── Aggregate Services for a Stand ──────────────────────────────────────

/**
 * Compute aggregate ecosystem services for all trees in a stand projection.
 *
 * @param {Array} projectedTrees - array of tree objects from projectStand()
 * @param {Object} [options] - overrides for rates
 * @returns {Object} aggregated services
 */
export function standAnnualServices(projectedTrees, options = {}) {
  if (!projectedTrees || projectedTrees.length === 0) return emptyServices();

  const aliveTrees = projectedTrees.filter(t => t.alive);
  const perTreeServices = aliveTrees.map(t => treeAnnualServices(t, options));

  const sumField = (arr, path) => arr.reduce((s, svc) => {
    const val = path.split('.').reduce((o, k) => o?.[k], svc);
    return s + (val || 0);
  }, 0);

  return {
    stormwater: {
      gallonsIntercepted: Math.round(sumField(perTreeServices, 'stormwater.gallonsIntercepted')),
      annualValue: round2(sumField(perTreeServices, 'stormwater.annualValue')),
    },
    energy: {
      coolingKwh: round2(sumField(perTreeServices, 'energy.coolingKwh')),
      annualValue: round2(sumField(perTreeServices, 'energy.annualValue')),
    },
    airQuality: {
      annualValue: round2(sumField(perTreeServices, 'airQuality.annualValue')),
    },
    carbon: {
      annualCo2Lbs: round2(sumField(perTreeServices, 'carbon.annualCo2Lbs')),
      annualValue: round2(sumField(perTreeServices, 'carbon.annualValue')),
    },
    property: {
      annualValue: round2(sumField(perTreeServices, 'property.annualValue')),
    },
    totalAnnualValue: round2(sumField(perTreeServices, 'totalAnnualValue')),
    treeCount: aliveTrees.length,
  };
}

// ─── Helpers ─────────────────────────────────────────────────────────────

/**
 * Rough estimate of annual CO2 sequestered (lbs) based on DBH.
 * Uses an approximation derived from i-Tree Eco data:
 * small trees (~3" DBH) ≈ 10 lbs/yr, medium (~12") ≈ 50 lbs/yr, large (~24") ≈ 90 lbs/yr
 */
function estimateAnnualCo2Seq(dbhInches) {
  if (dbhInches <= 0) return 0;
  return 3.5 * Math.pow(dbhInches, 0.85);
}

function round2(n) {
  return Math.round(n * 100) / 100;
}

function emptyServices() {
  return {
    stormwater: { gallonsIntercepted: 0, annualValue: 0 },
    energy: { coolingKwh: 0, annualValue: 0 },
    airQuality: { annualValue: 0, details: {} },
    carbon: { annualCo2Lbs: 0, annualValue: 0 },
    property: { upliftPercent: 0, annualValue: 0 },
    totalAnnualValue: 0,
  };
}

export { RATES };
