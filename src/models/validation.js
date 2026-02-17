/**
 * FVS Benchmark Validation Runner
 *
 * Generates synthetic stands, runs them through projectStand(),
 * and compares outputs to published FVS/yield-table benchmarks.
 */

import { FVS_BENCHMARKS, BENCHMARK_METRICS } from '../data/fvsBenchmarks.js';
import { projectStand } from './forestryModel.js';

// ─── Synthetic Tree Generation ──────────────────────────────────────────

/**
 * Create a uniform grid of trees for a benchmark stand.
 * All trees are the same species, planted on a 1-acre parcel.
 */
function generateSyntheticTrees(benchmark) {
  const tpa = benchmark.initialTPA;
  const numTrees = tpa; // 1 acre at the given TPA

  // Grid layout: evenly spaced within a ~208 ft × 208 ft acre (1 acre ≈ 43,560 ft²)
  const cols = Math.ceil(Math.sqrt(numTrees));
  const rows = Math.ceil(numTrees / cols);

  // Use region-appropriate coordinates so biomass correction detects the
  // correct FVS variant for each benchmark species.
  const VARIANT_COORDS = {
    sn: { lat: 33.0, lng: -85.0 },   // Alabama (Southern)
    pn: { lat: 46.0, lng: -122.0 },  // Oregon (Pacific NW)
    ne: { lat: 42.0, lng: -73.0 },   // New York (Northeast)
    cr: { lat: 39.0, lng: -107.0 },  // Colorado (Central Rockies)
    ci: { lat: 46.0, lng: -115.0 },  // Idaho (Inland Empire)
    ca: { lat: 37.0, lng: -120.0 },  // California
  };
  const coords = VARIANT_COORDS[benchmark.variant] || { lat: 38.0, lng: -97.0 };
  const baseLat = coords.lat;
  const baseLng = coords.lng;
  const ftToDeg = 1 / 364000; // rough conversion at mid-latitudes

  const spacing = Math.sqrt(43560 / numTrees); // feet between trees
  const trees = [];

  for (let i = 0; i < numTrees; i++) {
    const r = Math.floor(i / cols);
    const c = i % cols;
    trees.push({
      id: `${benchmark.id}-${i}`,
      speciesId: benchmark.speciesId,
      lat: baseLat + r * spacing * ftToDeg,
      lng: baseLng + c * spacing * ftToDeg,
      placedAt: Date.now(),
    });
  }

  return trees;
}

/**
 * Build a minimal speciesMap that provides the fields projectStand expects.
 * Uses species-specific typicalDbhIncrement from the benchmark data so that
 * validation accuracy reflects the actual growth rates users would see.
 */
function buildSpeciesMap(benchmark) {
  const speciesDefaults = {
    'pine-hard': { maxDbh: 40, increment: 0.45, mortality: 0.008, lai: 3.5, density: 32 },
    'fir':       { maxDbh: 60, increment: 0.42, mortality: 0.006, lai: 7.0, density: 33 },
    'oak':       { maxDbh: 48, increment: 0.35, mortality: 0.005, lai: 5.0, density: 47 },
  };
  const speciesOverrides = {
    'loblolly-pine':  { maxDbh: 40, increment: 0.60, mortality: 0.006 },
    'douglas-fir':    { maxDbh: 60, increment: 0.50, mortality: 0.010 },
    'white-oak':      { maxDbh: 48, increment: 0.42, mortality: 0.005 },
    'ponderosa-pine': { maxDbh: 48, increment: 0.42, mortality: 0.010 },
  };

  const defaults = speciesDefaults[benchmark.speciesGroup] || { maxDbh: 40, increment: 0.42, mortality: 0.008, lai: 4, density: 35 };
  const overrides = speciesOverrides[benchmark.speciesId] || {};

  return {
    [benchmark.speciesId]: {
      id: benchmark.speciesId,
      name: benchmark.speciesLabel,
      speciesGroup: benchmark.speciesGroup,
      maxDbhInches: overrides.maxDbh || defaults.maxDbh,
      typicalDbhIncrement: overrides.increment || defaults.increment,
      mortalityRate: overrides.mortality || defaults.mortality,
      leafAreaIndex: defaults.lai || 4,
      woodDensityLbsPerCuFt: defaults.density || 35,
    },
  };
}

// ─── Metric Extraction ──────────────────────────────────────────────────

/**
 * Extract the comparable metric values from a projectStand result.
 * Returns an object keyed by the same keys as benchmark decade records.
 */
function extractMetrics(result, areaAcres) {
  const { stand, trees: resultTrees } = result;
  const standingTrees = resultTrees.filter(t => t.alive && !t.harvested);

  // AG biomass in tons per acre
  const agBiomassLbs = standingTrees.reduce((s, t) => s + t.agBiomassLbs, 0);
  const agBiomassTonsPerAcre = (agBiomassLbs / 2000) / Math.max(0.01, areaAcres);

  // Volume per acre
  const volPerAcre = stand.totalVolumeBF / Math.max(0.01, areaAcres);

  return {
    ba: stand.basalAreaSqFt,
    qmd: stand.qmd,
    tpa: stand.treesPerAcre,
    volBF: Math.round(volPerAcre),
    biomassTons: Math.round(agBiomassTonsPerAcre * 10) / 10,
  };
}

// ─── Deviation Computation ──────────────────────────────────────────────

/**
 * Compute percent deviation between model and benchmark.
 * Positive = model overestimates, negative = model underestimates.
 * Returns null for metrics where benchmark is 0.
 */
function pctDeviation(model, benchmark) {
  if (benchmark === 0 && model === 0) return 0;
  if (benchmark === 0) return null; // can't compute
  return Math.round(((model - benchmark) / benchmark) * 1000) / 10;
}

// ─── Main Runner ────────────────────────────────────────────────────────

/**
 * Run all benchmarks and return structured comparison results.
 *
 * Returns: Array of benchmark results, each containing:
 *   - id, name, description, variant
 *   - decades: Array of { year, fvs: {...}, model: {...}, deviation: {...} }
 *   - summary: { avgAbsDeviation per metric, overallScore }
 */
export function runValidation() {
  return FVS_BENCHMARKS.map(benchmark => {
    const trees = generateSyntheticTrees(benchmark);
    const speciesMap = buildSpeciesMap(benchmark);
    const areaAcres = 1; // 1 acre for clean per-acre math

    const decadeResults = benchmark.decades.map(fvsDecade => {
      const result = projectStand(
        trees,
        speciesMap,
        fvsDecade.year,
        benchmark.siteIndex,
        areaAcres,
        null, // no prescription
      );

      const modelMetrics = extractMetrics(result, areaAcres);

      const deviation = {};
      for (const m of BENCHMARK_METRICS) {
        deviation[m.key] = pctDeviation(modelMetrics[m.key], fvsDecade[m.key]);
      }

      return {
        year: fvsDecade.year,
        fvs: fvsDecade,
        model: modelMetrics,
        deviation,
      };
    });

    // Summary: average absolute deviation per metric across all decades
    const summaryByMetric = {};
    for (const m of BENCHMARK_METRICS) {
      const deviations = decadeResults
        .map(d => d.deviation[m.key])
        .filter(v => v !== null);
      const avgAbsDev = deviations.length > 0
        ? Math.round(deviations.reduce((s, v) => s + Math.abs(v), 0) / deviations.length * 10) / 10
        : null;
      summaryByMetric[m.key] = avgAbsDev;
    }

    // Overall accuracy score: 100 - average of all mean absolute deviations
    const allAvgDevs = Object.values(summaryByMetric).filter(v => v !== null);
    const overallMeanDev = allAvgDevs.length > 0
      ? allAvgDevs.reduce((s, v) => s + v, 0) / allAvgDevs.length
      : 0;
    const overallScore = Math.max(0, Math.round((100 - overallMeanDev) * 10) / 10);

    return {
      id: benchmark.id,
      name: benchmark.name,
      variant: benchmark.variant,
      description: benchmark.description,
      speciesLabel: benchmark.speciesLabel,
      decades: decadeResults,
      summary: {
        byMetric: summaryByMetric,
        overallScore,
        overallMeanDeviation: Math.round(overallMeanDev * 10) / 10,
      },
    };
  });
}

/**
 * Compute a single aggregate accuracy score across all benchmarks.
 */
export function overallAccuracyScore(validationResults) {
  if (!validationResults || validationResults.length === 0) return 0;
  const scores = validationResults.map(r => r.summary.overallScore);
  return Math.round(scores.reduce((s, v) => s + v, 0) / scores.length * 10) / 10;
}

/**
 * Grade an accuracy score as a letter grade.
 */
export function accuracyGrade(score) {
  if (score >= 90) return { letter: 'A', color: '#22c55e', label: 'Excellent' };
  if (score >= 80) return { letter: 'B', color: '#84cc16', label: 'Good' };
  if (score >= 70) return { letter: 'C', color: '#eab308', label: 'Fair' };
  if (score >= 60) return { letter: 'D', color: '#f97316', label: 'Below Average' };
  return { letter: 'F', color: '#ef4444', label: 'Poor' };
}

/**
 * Color a deviation value for display (green = close, red = far).
 */
export function deviationColor(dev) {
  if (dev === null) return '#64748b';
  const abs = Math.abs(dev);
  if (abs <= 10) return '#22c55e';
  if (abs <= 20) return '#84cc16';
  if (abs <= 35) return '#eab308';
  if (abs <= 50) return '#f97316';
  return '#ef4444';
}
