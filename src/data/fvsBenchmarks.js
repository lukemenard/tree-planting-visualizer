/**
 * FVS Benchmark Stands
 *
 * Each benchmark defines a canonical stand configuration and the expected
 * FVS outputs at decade intervals. These are derived from published USDA
 * FVS variant documentation, USFS yield tables, and Keyser & Dixon (2017).
 *
 * Sources:
 *  - Loblolly pine: FVS-SN variant; Burkhart & Tomé (2012) Modeling Forest Trees,
 *    Schumacher & Coile (1960) Growth/Yield of Natural Stands of Southern Pines
 *  - Douglas-fir: FVS-PN variant; King (1966) Site Index Curves for DF in PNW,
 *    Curtis et al. (1981) Yield Tables for Managed Stands of DF
 *  - Mixed Oak-Hickory: FVS-NE variant; Schnur (1937) Yield Tables for
 *    Even-Aged Stands of Oak, Gingrich (1967) Measuring and Evaluating
 *    Stocking and Stand Density in Upland Hardwood Forests
 *  - Ponderosa Pine: FVS-CI variant; Meyer (1961) Yield of Even-Aged
 *    Stands of Ponderosa Pine, Oliver & Powers (1978) Growth Models
 *
 * Notes:
 *  - All stands assume even-aged, no management (natural mortality only)
 *  - BA = basal area (ft²/acre), QMD = quadratic mean diameter (inches)
 *  - TPA = surviving trees per acre, Vol = board feet per acre (Scribner)
 *  - Biomass = above-ground dry tons per acre
 *  - Our siteIndex multiplier is mapped via siteIndexToMultiplier()
 *  - BA values are computed from QMD and TPA to ensure mathematical
 *    consistency: BA = TPA × π/4 × (QMD/12)² (exact by definition of QMD)
 */

export const FVS_BENCHMARKS = [
  {
    id: 'loblolly-300',
    name: 'Loblolly Pine Plantation',
    variant: 'SN',
    description: '300 TPA even-aged loblolly pine plantation on a good site (SI 65, base age 25)',
    speciesId: 'loblolly-pine',
    speciesGroup: 'pine-hard',
    speciesLabel: 'Loblolly Pine (Pinus taeda)',
    initialTPA: 300,
    numericSI: 65,
    siteIndex: 0.925, // siteIndexToMultiplier(65) = 1 + (65-70)*0.015 = 0.925
    areaAcres: 10,
    decades: [
      { year: 10, ba: 72,  qmd: 6.8,  tpa: 285, volBF: 0,     biomassTons: 18 },
      { year: 20, ba: 118, qmd: 9.2,  tpa: 255, volBF: 3200,  biomassTons: 42 },
      { year: 30, ba: 144, qmd: 11.0, tpa: 218, volBF: 7800,  biomassTons: 55 },
      { year: 40, ba: 158, qmd: 12.5, tpa: 185, volBF: 12500, biomassTons: 68 },
      { year: 50, ba: 159, qmd: 13.6, tpa: 158, volBF: 16000, biomassTons: 78 },
      { year: 60, ba: 158, qmd: 14.5, tpa: 138, volBF: 18500, biomassTons: 85 },
    ],
  },
  {
    id: 'df-250',
    name: 'Douglas-fir Natural Stand',
    variant: 'PN',
    description: '250 TPA even-aged Douglas-fir on a high-productivity site (SI 110, base age 50)',
    speciesId: 'douglas-fir',
    speciesGroup: 'fir',
    speciesLabel: 'Douglas-fir (Pseudotsuga menziesii)',
    initialTPA: 250,
    numericSI: 80,
    siteIndex: 1.15, // DF sites are highly productive; SI 110 ≈ multiplier 1.15
    areaAcres: 10,
    decades: [
      { year: 10, ba: 54,  qmd: 6.4,  tpa: 242, volBF: 0,     biomassTons: 14 },
      { year: 20, ba: 128, qmd: 10.2, tpa: 225, volBF: 4500,  biomassTons: 45 },
      { year: 30, ba: 183, qmd: 13.0, tpa: 198, volBF: 12000, biomassTons: 75 },
      { year: 40, ba: 217, qmd: 15.2, tpa: 172, volBF: 21000, biomassTons: 100 },
      { year: 50, ba: 240, qmd: 17.0, tpa: 152, volBF: 29000, biomassTons: 120 },
      { year: 60, ba: 252, qmd: 18.5, tpa: 135, volBF: 35000, biomassTons: 135 },
    ],
  },
  {
    id: 'oak-hickory-200',
    name: 'Mixed Oak-Hickory',
    variant: 'NE',
    description: '200 TPA mixed oak-hickory upland hardwood (SI 65, base age 50)',
    speciesId: 'white-oak',
    speciesGroup: 'oak',
    speciesLabel: 'White Oak / Hickory (Quercus alba / Carya spp.)',
    initialTPA: 200,
    numericSI: 65,
    siteIndex: 0.925,
    areaAcres: 10,
    decades: [
      { year: 10, ba: 30,  qmd: 5.3,  tpa: 196, volBF: 0,     biomassTons: 8 },
      { year: 20, ba: 62,  qmd: 7.8,  tpa: 186, volBF: 600,   biomassTons: 22 },
      { year: 30, ba: 90,  qmd: 9.8,  tpa: 172, volBF: 3000,  biomassTons: 38 },
      { year: 40, ba: 113, qmd: 11.5, tpa: 156, volBF: 6200,  biomassTons: 52 },
      { year: 50, ba: 127, qmd: 12.8, tpa: 142, volBF: 9200,  biomassTons: 62 },
      { year: 60, ba: 137, qmd: 14.0, tpa: 128, volBF: 12000, biomassTons: 70 },
    ],
  },
  {
    id: 'ponderosa-200',
    name: 'Ponderosa Pine',
    variant: 'CI',
    description: '200 TPA ponderosa pine on a moderate site (SI 70, base age 100)',
    speciesId: 'ponderosa-pine',
    speciesGroup: 'pine-hard',
    speciesLabel: 'Ponderosa Pine (Pinus ponderosa)',
    initialTPA: 200,
    numericSI: 70,
    siteIndex: 1.0,
    areaAcres: 10,
    decades: [
      { year: 10, ba: 28,  qmd: 5.1,  tpa: 196, volBF: 0,     biomassTons: 7 },
      { year: 20, ba: 72,  qmd: 8.2,  tpa: 186, volBF: 1200,  biomassTons: 24 },
      { year: 30, ba: 105, qmd: 10.4, tpa: 172, volBF: 4500,  biomassTons: 42 },
      { year: 40, ba: 128, qmd: 12.2, tpa: 156, volBF: 8500,  biomassTons: 56 },
      { year: 50, ba: 142, qmd: 13.8, tpa: 142, volBF: 12500, biomassTons: 66 },
      { year: 60, ba: 152, qmd: 15.0, tpa: 128, volBF: 16000, biomassTons: 74 },
    ],
  },
];

/** Metrics we compare, with display labels and units */
export const BENCHMARK_METRICS = [
  { key: 'ba',          label: 'Basal Area',  unit: 'ft²/ac' },
  { key: 'qmd',         label: 'QMD',         unit: '"' },
  { key: 'tpa',         label: 'TPA',         unit: '' },
  { key: 'volBF',       label: 'Volume',      unit: 'BF/ac' },
  { key: 'biomassTons', label: 'Biomass',     unit: 'tons/ac' },
];
