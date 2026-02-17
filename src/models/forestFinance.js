/**
 * Forest Finance Module
 *
 * Timber product classification, species-group stumpage pricing,
 * management cost assumptions, and investment analysis (NPV, LEV, IRR).
 *
 * Pricing sources: Timber Mart-South, USFS FPL, state forestry agency
 * price reports (2023-2025 US national averages).
 */

// ─── Product Classification ──────────────────────────────────────────────

/**
 * Classify a tree into product classes based on DBH.
 * Returns the highest-value product class the tree qualifies for.
 *
 * Standard thresholds (varies by region, using conservative national averages):
 *   Veneer:      ≥ 18" DBH (high-quality hardwoods only)
 *   Sawtimber:   ≥ 11" DBH (hardwood) / ≥ 9" (softwood)
 *   Poletimber:  ≥ 7" DBH, < sawtimber threshold
 *   Pulpwood:    ≥ 5" DBH, < poletimber threshold
 *   Non-merch:   < 5" DBH
 */
export function classifyProduct(dbhInches, groupCode) {
  const isSoftwood = ['pine-hard', 'pine-soft', 'spruce', 'fir', 'cedar',
    'cypress', 'redwood'].includes(groupCode);
  const hasVeneerPotential = ['oak', 'walnut', 'maple', 'hickory', 'birch'].includes(groupCode);

  if (dbhInches >= 18 && hasVeneerPotential) return 'veneer';
  if (dbhInches >= (isSoftwood ? 9 : 11)) return 'sawtimber';
  if (dbhInches >= 7) return 'poletimber';
  if (dbhInches >= 5) return 'pulpwood';
  return 'non-merchantable';
}

// ─── Stumpage Prices ─────────────────────────────────────────────────────

/**
 * Stumpage prices by species group and product class ($/MBF or $/ton).
 *
 * Sawtimber/veneer: $/MBF (thousand board feet, Scribner)
 * Pulpwood/poletimber: $/ton (green weight)
 *
 * Sources: Timber Mart-South Q3 2024, NH/VT/ME Timber Crier 2024,
 * Oregon/WA DNR reports. These are US-wide rough averages.
 */
const STUMPAGE_PRICES = {
  oak:        { veneer: 800,  sawtimber: 350, poletimber: 45, pulpwood: 12 },
  maple:      { veneer: 600,  sawtimber: 280, poletimber: 40, pulpwood: 10 },
  walnut:     { veneer: 2500, sawtimber: 800, poletimber: 50, pulpwood: 12 },
  hickory:    { veneer: 500,  sawtimber: 250, poletimber: 40, pulpwood: 12 },
  ash:        { veneer: 400,  sawtimber: 200, poletimber: 35, pulpwood: 10 },
  birch:      { veneer: 500,  sawtimber: 250, poletimber: 35, pulpwood: 10 },
  beech:      { veneer: 0,    sawtimber: 150, poletimber: 25, pulpwood: 8 },
  poplar:     { veneer: 0,    sawtimber: 120, poletimber: 20, pulpwood: 8 },
  sycamore:   { veneer: 0,    sawtimber: 130, poletimber: 25, pulpwood: 8 },
  sweetgum:   { veneer: 0,    sawtimber: 130, poletimber: 25, pulpwood: 8 },
  elm:        { veneer: 0,    sawtimber: 150, poletimber: 30, pulpwood: 8 },
  'pine-hard':  { veneer: 0,  sawtimber: 250, poletimber: 30, pulpwood: 10 },
  'pine-soft':  { veneer: 300, sawtimber: 200, poletimber: 25, pulpwood: 9 },
  spruce:     { veneer: 0,    sawtimber: 180, poletimber: 25, pulpwood: 9 },
  fir:        { veneer: 0,    sawtimber: 220, poletimber: 28, pulpwood: 9 },
  cedar:      { veneer: 0,    sawtimber: 300, poletimber: 35, pulpwood: 10 },
  cypress:    { veneer: 0,    sawtimber: 350, poletimber: 35, pulpwood: 10 },
  redwood:    { veneer: 0,    sawtimber: 600, poletimber: 50, pulpwood: 15 },
  default:    { veneer: 0,    sawtimber: 180, poletimber: 25, pulpwood: 8 },
};

export function getStumpagePrice(groupCode, productClass) {
  const prices = STUMPAGE_PRICES[groupCode] || STUMPAGE_PRICES.default;
  return prices[productClass] || 0;
}

// ─── Management Cost Assumptions ─────────────────────────────────────────

/**
 * Silvicultural cost assumptions ($/acre, US averages 2024).
 * Sources: USDA Forest Service cost-share program data,
 * state forestry extension publications.
 */
export const MANAGEMENT_COSTS = {
  sitePrepPerAcre: 250,          // mechanical site prep
  plantingPerAcre: 350,          // planting labor + seedlings (~600 TPA)
  pctPerAcre: 200,               // pre-commercial thinning
  commercialThinHarvestCost: 0,  // commercial thins are net-revenue (paid by buyer)
  clearcutHarvestCost: 0,        // clearcut is net-revenue
  annualPropertyTaxPerAcre: 8,   // typical bare-land forestry rate
  annualManagementPerAcre: 5,    // fire lanes, boundaries, admin
  forestManagementPlanCost: 1500, // one-time plan preparation (not per-acre)
  cruisingPerAcre: 50,           // timber cruise before commercial entries
};

// ─── Revenue Calculation per Tree ────────────────────────────────────────

/**
 * Calculate harvest revenue for a single tree at its current dimensions.
 *
 * Sawtimber/veneer: priced per MBF (using board-foot volume)
 * Pulpwood/poletimber: priced per cord (using Honer 1983 cord volume)
 *   Fallback to green-ton pricing if cord volume unavailable
 *
 * @returns {{ productClass, volumeBF, cords, tons, priceUnit, unitPrice, revenue }}
 */
export function treeHarvestValue(dbhInches, heightFt, agBiomassLbs, groupCode, volumeBF) {
  const productClass = classifyProduct(dbhInches, groupCode);

  if (productClass === 'non-merchantable') {
    return { productClass, volumeBF: 0, cords: 0, tons: 0, priceUnit: '-', unitPrice: 0, revenue: 0 };
  }

  const unitPrice = getStumpagePrice(groupCode, productClass);

  if (productClass === 'sawtimber' || productClass === 'veneer') {
    const mbf = (volumeBF || 0) / 1000;
    return {
      productClass,
      volumeBF: volumeBF || 0,
      cords: 0,
      tons: 0,
      priceUnit: '$/MBF',
      unitPrice,
      revenue: Math.round(mbf * unitPrice * 100) / 100,
    };
  }

  // Pulpwood & poletimber: use cord volume (Honer 1983)
  // 1 cord ≈ 2.4 green tons for hardwoods, ~2.6 for softwoods
  const cords = 0.0042 * Math.pow(Math.max(5, dbhInches), 1.9) * Math.pow(Math.max(20, heightFt || 30), 0.85);
  // Price per cord: pulpwood $8-15/ton * ~2.5 tons/cord = ~$20-38/cord
  const cordPrice = unitPrice * 2.5; // convert $/ton to $/cord
  const revenue = cords * cordPrice;

  return {
    productClass,
    volumeBF: 0,
    cords: Math.round(cords * 1000) / 1000,
    tons: Math.round(cords * 2.5 * 100) / 100,
    priceUnit: '$/cord',
    unitPrice: Math.round(cordPrice),
    revenue: Math.round(revenue * 100) / 100,
  };
}

// ─── Harvest Event Financial Summary ─────────────────────────────────────

/**
 * Enrich a harvestEvent from projectStand with detailed per-product financials.
 *
 * @param {Object} harvestEvent - { year, type, label, treesRemoved, ... }
 * @param {Array} harvestedTreeStates - array of tree state objects for the harvested trees
 * @param {Function} getCoeffs - function to get allometric coefficients from group code
 * @returns {Object} enriched harvest event with revenue breakdown
 */
export function enrichHarvestEvent(harvestEvent, harvestedTreeDetails) {
  const products = { veneer: 0, sawtimber: 0, poletimber: 0, pulpwood: 0 };
  const counts = { veneer: 0, sawtimber: 0, poletimber: 0, pulpwood: 0, 'non-merchantable': 0 };
  let totalRevenue = 0;

  for (const tree of harvestedTreeDetails) {
    const val = treeHarvestValue(
      tree.dbhInches, tree.heightFt, tree.agBiomassLbs,
      tree.groupCode, tree.volumeBF
    );
    products[val.productClass] = (products[val.productClass] || 0) + val.revenue;
    counts[val.productClass] = (counts[val.productClass] || 0) + 1;
    totalRevenue += val.revenue;
  }

  return {
    ...harvestEvent,
    revenue: Math.round(totalRevenue * 100) / 100,
    productBreakdown: products,
    productCounts: counts,
  };
}

// ─── Investment Analysis ─────────────────────────────────────────────────

/**
 * Calculate Net Present Value of a series of cash flows.
 *
 * @param {Array} cashflows - [{ year, amount }] (negative = cost, positive = revenue)
 * @param {number} discountRate - annual real discount rate (e.g., 0.04 for 4%)
 * @returns {number} NPV in today's dollars
 */
export function calculateNPV(cashflows, discountRate) {
  return cashflows.reduce((npv, cf) => {
    return npv + cf.amount / Math.pow(1 + discountRate, cf.year);
  }, 0);
}

/**
 * Land Expectation Value (LEV / Faustmann formula).
 * The NPV of an infinite series of identical rotations.
 *
 * LEV = NPV_rotation / (1 - (1+r)^(-T))
 *
 * @param {number} npvOneRotation - NPV of a single rotation
 * @param {number} rotationLength - rotation length in years
 * @param {number} discountRate - annual real discount rate
 * @returns {number} LEV ($/acre)
 */
export function calculateLEV(npvOneRotation, rotationLength, discountRate) {
  if (discountRate <= 0 || rotationLength <= 0) return npvOneRotation;
  const denominator = 1 - Math.pow(1 + discountRate, -rotationLength);
  if (denominator <= 0) return npvOneRotation;
  return npvOneRotation / denominator;
}

/**
 * Internal Rate of Return (IRR) via bisection method.
 * Finds the discount rate that makes NPV = 0.
 *
 * @param {Array} cashflows - [{ year, amount }]
 * @returns {number|null} IRR as decimal (e.g., 0.08 for 8%), or null if not found
 */
export function calculateIRR(cashflows) {
  let lo = -0.5, hi = 2.0;

  // Check if there are both positive and negative cashflows
  const hasPositive = cashflows.some(cf => cf.amount > 0);
  const hasNegative = cashflows.some(cf => cf.amount < 0);
  if (!hasPositive || !hasNegative) return null;

  for (let iter = 0; iter < 100; iter++) {
    const mid = (lo + hi) / 2;
    const npv = calculateNPV(cashflows, mid);

    if (Math.abs(npv) < 0.01) return Math.round(mid * 10000) / 10000;

    if (npv > 0) lo = mid;
    else hi = mid;
  }

  const finalRate = (lo + hi) / 2;
  return Math.abs(calculateNPV(cashflows, finalRate)) < 100
    ? Math.round(finalRate * 10000) / 10000
    : null;
}

/**
 * Build a complete financial analysis for a prescription applied to a stand.
 *
 * @param {Array} harvestEvents - enriched harvest events with revenue
 * @param {number} areaAcres - stand area in acres
 * @param {number} rotationLength - rotation length (years to last harvest or projection end)
 * @param {Object} [costOverrides] - optional cost overrides
 * @param {number} [discountRate=0.04] - real discount rate (default 4%)
 * @returns {Object} financial summary
 */
export function analyzeInvestment(harvestEvents, areaAcres, rotationLength, costOverrides = {}, discountRate = 0.04) {
  const costs = { ...MANAGEMENT_COSTS, ...costOverrides };
  const area = Math.max(0.01, areaAcres);

  // ── Build cash flow timeline ──
  const cashflows = [];

  // Year 0: establishment costs
  const establishmentCost = (costs.sitePrepPerAcre + costs.plantingPerAcre) * area;
  cashflows.push({ year: 0, amount: -establishmentCost, label: 'Establishment' });

  // Annual costs (property tax + management)
  const annualCost = (costs.annualPropertyTaxPerAcre + costs.annualManagementPerAcre) * area;
  for (let y = 1; y <= rotationLength; y++) {
    cashflows.push({ year: y, amount: -annualCost, label: 'Annual costs' });
  }

  // Harvest revenues
  for (const ev of harvestEvents) {
    if (ev.type === 'pct') {
      // PCT is a cost, not revenue
      cashflows.push({ year: ev.year, amount: -(costs.pctPerAcre * area), label: ev.label });
    } else if (ev.type === 'sanitation') {
      // Sanitation is usually cost-neutral or small cost
      cashflows.push({ year: ev.year, amount: -(costs.pctPerAcre * area * 0.5), label: ev.label });
    } else {
      // Cruising cost before commercial entry
      cashflows.push({ year: ev.year, amount: -(costs.cruisingPerAcre * area), label: `Cruise for ${ev.label}` });
      // Revenue
      cashflows.push({ year: ev.year, amount: ev.revenue || 0, label: ev.label });
    }
  }

  // ── Calculate metrics ──
  const npv = calculateNPV(cashflows, discountRate);
  const lev = calculateLEV(npv, rotationLength, discountRate);
  const irr = calculateIRR(cashflows);

  const totalRevenue = harvestEvents.reduce((s, e) => s + (e.revenue || 0), 0);
  const totalCosts = cashflows.filter(cf => cf.amount < 0).reduce((s, cf) => s + Math.abs(cf.amount), 0);
  const netIncome = totalRevenue - totalCosts;

  return {
    cashflows,
    npv: Math.round(npv),
    npvPerAcre: Math.round(npv / area),
    lev: Math.round(lev),
    levPerAcre: Math.round(lev / area),
    irr,
    irrPercent: irr !== null ? Math.round(irr * 1000) / 10 : null,
    totalRevenue: Math.round(totalRevenue),
    totalCosts: Math.round(totalCosts),
    netIncome: Math.round(netIncome),
    establishmentCost: Math.round(establishmentCost),
    annualCostPerAcre: Math.round(annualCost / area),
    discountRate,
    rotationLength,
    areaAcres: area,
  };
}
