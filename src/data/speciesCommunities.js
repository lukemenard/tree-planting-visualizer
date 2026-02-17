/**
 * Natural forest community types by US ecoregion.
 *
 * Each community represents a historically common or ecologically
 * successful species combination, based on US Forest Service FIA
 * forest type groups and silvicultural best practice.
 *
 * Species are referenced by their id in treeSpecies.js.
 * `proportion` values are approximate target percentages (0-1) for
 * a sustainable mixed planting; they need not sum exactly to 1.
 */

export const SPECIES_COMMUNITIES = [
  // ── Northeast ─────────────────────────────────────────────────────────
  {
    id: 'ne-oak-hickory',
    name: 'Oak-Hickory Forest',
    ecoregions: ['NE', 'MW'],
    description:
      'The dominant upland hardwood community of the eastern US. Oaks provide mast for wildlife; hickories add structural diversity and high-value wood.',
    species: [
      { speciesId: 'red-oak', proportion: 0.25 },
      { speciesId: 'white-oak', proportion: 0.20 },
      { speciesId: 'shagbark-hickory', proportion: 0.15 },
      { speciesId: 'sugar-maple', proportion: 0.15 },
      { speciesId: 'tulip-poplar', proportion: 0.10 },
      { speciesId: 'black-cherry', proportion: 0.10 },
      { speciesId: 'dogwood', proportion: 0.05 },
    ],
  },
  {
    id: 'ne-northern-hardwood',
    name: 'Northern Hardwood (Beech-Birch-Maple)',
    ecoregions: ['NE', 'MW'],
    description:
      'Classic beech-birch-maple association of northern forests. Sugar maple drives high canopy density; beech and birch add structural diversity.',
    species: [
      { speciesId: 'sugar-maple', proportion: 0.30 },
      { speciesId: 'american-beech', proportion: 0.20 },
      { speciesId: 'yellow-birch', proportion: 0.15 },
      { speciesId: 'eastern-hemlock', proportion: 0.15 },
      { speciesId: 'red-maple', proportion: 0.10 },
      { speciesId: 'white-ash', proportion: 0.10 },
    ],
  },
  {
    id: 'ne-white-pine-mixed',
    name: 'White Pine–Hardwood Mix',
    ecoregions: ['NE'],
    description:
      'Evergreen-deciduous blend providing year-round canopy cover. White pine gives rapid height growth; oaks and maples provide fall color and wildlife food.',
    species: [
      { speciesId: 'eastern-white-pine', proportion: 0.30 },
      { speciesId: 'red-oak', proportion: 0.20 },
      { speciesId: 'red-maple', proportion: 0.15 },
      { speciesId: 'eastern-hemlock', proportion: 0.15 },
      { speciesId: 'paper-birch', proportion: 0.10 },
      { speciesId: 'dogwood', proportion: 0.10 },
    ],
  },
  {
    id: 'ne-spruce-fir-boreal',
    name: 'Spruce-Fir Boreal',
    ecoregions: ['NE'],
    description:
      'High-elevation or northern boreal forest. Red spruce and balsam fir dominate with paper birch and tamarack adding deciduous diversity.',
    species: [
      { speciesId: 'red-spruce', proportion: 0.30 },
      { speciesId: 'balsam-fir', proportion: 0.25 },
      { speciesId: 'paper-birch', proportion: 0.20 },
      { speciesId: 'tamarack', proportion: 0.15 },
      { speciesId: 'white-spruce', proportion: 0.10 },
    ],
  },

  // ── Southeast ─────────────────────────────────────────────────────────
  {
    id: 'se-southern-mixed',
    name: 'Southern Mixed Hardwood',
    ecoregions: ['SE'],
    description:
      'Southeastern bottomland hardwood mix. Oaks anchor the canopy; sweetgum and tulip poplar provide fast growth; dogwood fills the understory.',
    species: [
      { speciesId: 'cherrybark-oak', proportion: 0.20 },
      { speciesId: 'white-oak', proportion: 0.15 },
      { speciesId: 'sweetgum', proportion: 0.15 },
      { speciesId: 'tulip-poplar', proportion: 0.15 },
      { speciesId: 'american-sycamore', proportion: 0.10 },
      { speciesId: 'southern-magnolia', proportion: 0.10 },
      { speciesId: 'dogwood', proportion: 0.10 },
      { speciesId: 'redbud', proportion: 0.05 },
    ],
  },
  {
    id: 'se-loblolly-plantation',
    name: 'Loblolly Pine Plantation',
    ecoregions: ['SE'],
    description:
      'Commercial loblolly pine plantation — the most productive timber type in the US Southeast. Pure or with minor hardwood component.',
    species: [
      { speciesId: 'loblolly-pine', proportion: 0.80 },
      { speciesId: 'sweetgum', proportion: 0.10 },
      { speciesId: 'water-oak', proportion: 0.10 },
    ],
  },
  {
    id: 'se-longleaf-savanna',
    name: 'Longleaf Pine Savanna',
    ecoregions: ['SE', 'FL'],
    description:
      'Fire-maintained longleaf pine ecosystem — one of the most biodiverse habitats in North America. Open canopy with diverse understory.',
    species: [
      { speciesId: 'longleaf-pine', proportion: 0.60 },
      { speciesId: 'slash-pine', proportion: 0.15 },
      { speciesId: 'post-oak', proportion: 0.10 },
      { speciesId: 'persimmon', proportion: 0.10 },
      { speciesId: 'eastern-red-cedar', proportion: 0.05 },
    ],
  },
  {
    id: 'se-oak-pine',
    name: 'Oak-Pine Mixed Forest',
    ecoregions: ['SE', 'GP'],
    description:
      'Transitional community between pure pine and hardwood forests. Shortleaf pine and oaks coexist with complementary root strategies.',
    species: [
      { speciesId: 'shortleaf-pine', proportion: 0.25 },
      { speciesId: 'southern-red-oak', proportion: 0.20 },
      { speciesId: 'white-oak', proportion: 0.15 },
      { speciesId: 'sweetgum', proportion: 0.15 },
      { speciesId: 'black-cherry', proportion: 0.10 },
      { speciesId: 'eastern-red-cedar', proportion: 0.10 },
      { speciesId: 'dogwood', proportion: 0.05 },
    ],
  },

  // ── Florida ───────────────────────────────────────────────────────────
  {
    id: 'fl-coastal-hammock',
    name: 'Coastal Hammock',
    ecoregions: ['FL'],
    description:
      'Salt-tolerant hardwood-palm community along the Gulf and Atlantic coasts. Live oaks and palms resist hurricanes; magnolia and cypress provide evergreen structure.',
    species: [
      { speciesId: 'live-oak', proportion: 0.25 },
      { speciesId: 'sabal-palm', proportion: 0.20 },
      { speciesId: 'bald-cypress', proportion: 0.20 },
      { speciesId: 'southern-magnolia', proportion: 0.15 },
      { speciesId: 'royal-palm', proportion: 0.10 },
      { speciesId: 'pond-cypress', proportion: 0.10 },
    ],
  },
  {
    id: 'fl-slash-pine-flatwoods',
    name: 'Slash Pine Flatwoods',
    ecoregions: ['FL'],
    description:
      'Dominant Florida upland ecosystem. Slash pine overstory with open, fire-maintained understory. Critical for many threatened species.',
    species: [
      { speciesId: 'slash-pine', proportion: 0.50 },
      { speciesId: 'longleaf-pine', proportion: 0.20 },
      { speciesId: 'sand-pine', proportion: 0.15 },
      { speciesId: 'sabal-palm', proportion: 0.10 },
      { speciesId: 'live-oak', proportion: 0.05 },
    ],
  },

  // ── Midwest ───────────────────────────────────────────────────────────
  {
    id: 'mw-prairie-border',
    name: 'Prairie-Border Woodland',
    ecoregions: ['MW', 'GP'],
    description:
      'Transition between tallgrass prairie and eastern forest. Drought-tolerant bur oaks and hackberries with fast-growing species for quick establishment.',
    species: [
      { speciesId: 'bur-oak', proportion: 0.25 },
      { speciesId: 'hackberry', proportion: 0.20 },
      { speciesId: 'american-elm', proportion: 0.15 },
      { speciesId: 'green-ash', proportion: 0.15 },
      { speciesId: 'honey-locust', proportion: 0.10 },
      { speciesId: 'eastern-cottonwood', proportion: 0.10 },
      { speciesId: 'redbud', proportion: 0.05 },
    ],
  },
  {
    id: 'mw-riparian-mix',
    name: 'Riparian Bottomland',
    ecoregions: ['MW', 'SE', 'GP'],
    description:
      'Flood-tolerant community for stream corridors. Sycamore, cottonwood, and silver maple handle saturated soils; black walnut adds high timber value.',
    species: [
      { speciesId: 'american-sycamore', proportion: 0.20 },
      { speciesId: 'eastern-cottonwood', proportion: 0.20 },
      { speciesId: 'silver-maple', proportion: 0.15 },
      { speciesId: 'black-walnut', proportion: 0.15 },
      { speciesId: 'green-ash', proportion: 0.15 },
      { speciesId: 'swamp-white-oak', proportion: 0.10 },
      { speciesId: 'bald-cypress', proportion: 0.05 },
    ],
  },
  {
    id: 'mw-red-pine-jack-pine',
    name: 'Red Pine–Jack Pine',
    ecoregions: ['MW', 'NE'],
    description:
      'Great Lakes pine forest on sandy, acidic soils. Red pine provides saw timber value; jack pine pioneers disturbed sites.',
    species: [
      { speciesId: 'red-pine', proportion: 0.40 },
      { speciesId: 'jack-pine', proportion: 0.25 },
      { speciesId: 'white-spruce', proportion: 0.15 },
      { speciesId: 'paper-birch', proportion: 0.10 },
      { speciesId: 'red-oak', proportion: 0.10 },
    ],
  },

  // ── Great Plains ──────────────────────────────────────────────────────
  {
    id: 'gp-shelterbelt',
    name: 'Shelterbelt / Windbreak',
    ecoregions: ['GP'],
    description:
      'Great Plains windbreak design. White spruce and red cedar on windward side; hackberry, bur oak, and cottonwood provide interior shelter and wildlife habitat.',
    species: [
      { speciesId: 'white-spruce', proportion: 0.20 },
      { speciesId: 'eastern-red-cedar', proportion: 0.20 },
      { speciesId: 'bur-oak', proportion: 0.20 },
      { speciesId: 'hackberry', proportion: 0.15 },
      { speciesId: 'eastern-cottonwood', proportion: 0.15 },
      { speciesId: 'honey-locust', proportion: 0.10 },
    ],
  },

  // ── Southwest ─────────────────────────────────────────────────────────
  {
    id: 'sw-desert-riparian',
    name: 'Desert Riparian',
    ecoregions: ['SW'],
    description:
      'Heat- and drought-adapted community for desert washes and irrigated urban sites. Desert willow and pinyon pine tolerate arid conditions.',
    species: [
      { speciesId: 'desert-willow', proportion: 0.30 },
      { speciesId: 'ponderosa-pine', proportion: 0.25 },
      { speciesId: 'pinyon-pine', proportion: 0.20 },
      { speciesId: 'rocky-mountain-juniper', proportion: 0.15 },
      { speciesId: 'gambel-oak', proportion: 0.10 },
    ],
  },
  {
    id: 'sw-pinyon-juniper',
    name: 'Pinyon-Juniper Woodland',
    ecoregions: ['SW', 'RM'],
    description:
      'The most extensive woodland type in the interior West. Slow-growing but extremely drought-tolerant. Provides critical habitat and pine nut crops.',
    species: [
      { speciesId: 'pinyon-pine', proportion: 0.45 },
      { speciesId: 'rocky-mountain-juniper', proportion: 0.40 },
      { speciesId: 'gambel-oak', proportion: 0.15 },
    ],
  },

  // ── Rocky Mountain ────────────────────────────────────────────────────
  {
    id: 'rm-montane-conifer',
    name: 'Montane Conifer Forest',
    ecoregions: ['RM'],
    description:
      'Mid-elevation Rocky Mountain mixed conifer. Ponderosa and Douglas fir dominate; lodgepole pine fills post-fire gaps; aspen adds deciduous diversity.',
    species: [
      { speciesId: 'ponderosa-pine', proportion: 0.25 },
      { speciesId: 'douglas-fir', proportion: 0.25 },
      { speciesId: 'lodgepole-pine', proportion: 0.20 },
      { speciesId: 'quaking-aspen', proportion: 0.15 },
      { speciesId: 'blue-spruce', proportion: 0.15 },
    ],
  },
  {
    id: 'rm-subalpine',
    name: 'Subalpine Spruce-Fir',
    ecoregions: ['RM'],
    description:
      'High-elevation forest at 8000-12000 ft. Engelmann spruce and subalpine fir form dense stands at and below treeline.',
    species: [
      { speciesId: 'engelmann-spruce', proportion: 0.40 },
      { speciesId: 'subalpine-fir', proportion: 0.30 },
      { speciesId: 'limber-pine', proportion: 0.15 },
      { speciesId: 'quaking-aspen', proportion: 0.15 },
    ],
  },

  // ── Pacific Northwest ─────────────────────────────────────────────────
  {
    id: 'nw-douglas-fir-mix',
    name: 'Douglas Fir–Western Hemlock',
    ecoregions: ['NW'],
    description:
      'The signature PNW old-growth association. Douglas fir is the primary canopy species; western hemlock and western red cedar form the climax understory.',
    species: [
      { speciesId: 'douglas-fir', proportion: 0.30 },
      { speciesId: 'western-hemlock', proportion: 0.25 },
      { speciesId: 'western-red-cedar', proportion: 0.20 },
      { speciesId: 'red-alder', proportion: 0.10 },
      { speciesId: 'bigleaf-maple', proportion: 0.10 },
      { speciesId: 'sitka-spruce', proportion: 0.05 },
    ],
  },
  {
    id: 'nw-sitka-spruce-coastal',
    name: 'Sitka Spruce Coastal Forest',
    ecoregions: ['NW'],
    description:
      'Coastal fog-belt forest of the Pacific NW. Sitka spruce reaches enormous size; western hemlock and red cedar fill the understory.',
    species: [
      { speciesId: 'sitka-spruce', proportion: 0.35 },
      { speciesId: 'western-hemlock', proportion: 0.25 },
      { speciesId: 'western-red-cedar', proportion: 0.20 },
      { speciesId: 'red-alder', proportion: 0.10 },
      { speciesId: 'coast-redwood', proportion: 0.10 },
    ],
  },
  {
    id: 'nw-oregon-oak-prairie',
    name: 'Oregon Oak Prairie',
    ecoregions: ['NW'],
    description:
      'Critically endangered oak prairie / savanna. Less than 5% of original habitat remains. Open-canopy Oregon white oak with Pacific madrone.',
    species: [
      { speciesId: 'oregon-white-oak', proportion: 0.50 },
      { speciesId: 'pacific-madrone', proportion: 0.25 },
      { speciesId: 'douglas-fir', proportion: 0.15 },
      { speciesId: 'bigleaf-maple', proportion: 0.10 },
    ],
  },

  // ── California ────────────────────────────────────────────────────────
  {
    id: 'ca-coast-redwood',
    name: 'Coast Redwood–Mixed Evergreen',
    ecoregions: ['CA'],
    description:
      'Fog-belt community dominated by coast redwood. Douglas fir and grand fir add canopy diversity; red alder provides nitrogen fixation.',
    species: [
      { speciesId: 'coast-redwood', proportion: 0.40 },
      { speciesId: 'douglas-fir', proportion: 0.25 },
      { speciesId: 'grand-fir', proportion: 0.15 },
      { speciesId: 'red-alder', proportion: 0.10 },
      { speciesId: 'bigleaf-maple', proportion: 0.10 },
    ],
  },
  {
    id: 'ca-sierra-mixed-conifer',
    name: 'Sierra Mixed Conifer',
    ecoregions: ['CA'],
    description:
      'Classic mid-elevation Sierra Nevada forest. Five-species mix of pines, firs, and cedar at 4000-7000 ft elevation.',
    species: [
      { speciesId: 'ponderosa-pine', proportion: 0.20 },
      { speciesId: 'sugar-pine', proportion: 0.20 },
      { speciesId: 'douglas-fir', proportion: 0.20 },
      { speciesId: 'incense-cedar', proportion: 0.20 },
      { speciesId: 'california-black-oak', proportion: 0.15 },
      { speciesId: 'giant-sequoia', proportion: 0.05 },
    ],
  },
  {
    id: 'ca-valley-oak-savanna',
    name: 'Valley Oak Savanna',
    ecoregions: ['CA'],
    description:
      'California Central Valley and foothill savanna. Valley oaks with massive canopies dot the open grassland landscape.',
    species: [
      { speciesId: 'valley-oak', proportion: 0.50 },
      { speciesId: 'california-black-oak', proportion: 0.20 },
      { speciesId: 'gray-pine', proportion: 0.15 },
      { speciesId: 'live-oak', proportion: 0.15 },
    ],
  },
  {
    id: 'ca-urban-drought',
    name: 'Urban Drought-Tolerant',
    ecoregions: ['CA', 'SW'],
    description:
      'Low-water community for Mediterranean climates. Deep-rooted natives with ornamentals that thrive under water restrictions.',
    species: [
      { speciesId: 'valley-oak', proportion: 0.25 },
      { speciesId: 'live-oak', proportion: 0.20 },
      { speciesId: 'incense-cedar', proportion: 0.15 },
      { speciesId: 'crape-myrtle', proportion: 0.15 },
      { speciesId: 'desert-willow', proportion: 0.15 },
      { speciesId: 'ginkgo', proportion: 0.10 },
    ],
  },

  // ── Universal / multi-region ──────────────────────────────────────────
  {
    id: 'urban-street-mix',
    name: 'Urban Street Tree Diversity',
    ecoregions: ['NE', 'SE', 'MW', 'GP', 'NW', 'CA'],
    description:
      'Practical urban forestry mix following the 10-20-30 rule: no species >10%, no genus >20%, no family >30%. Maximizes resilience against pests and disease.',
    species: [
      { speciesId: 'red-maple', proportion: 0.10 },
      { speciesId: 'ginkgo', proportion: 0.10 },
      { speciesId: 'zelkova', proportion: 0.10 },
      { speciesId: 'london-plane', proportion: 0.10 },
      { speciesId: 'honey-locust', proportion: 0.10 },
      { speciesId: 'red-oak', proportion: 0.10 },
      { speciesId: 'hackberry', proportion: 0.10 },
      { speciesId: 'kentucky-coffeetree', proportion: 0.10 },
      { speciesId: 'dawn-redwood', proportion: 0.10 },
      { speciesId: 'littleleaf-linden', proportion: 0.10 },
    ],
  },
  {
    id: 'food-forest',
    name: 'Food Forest / Edible Canopy',
    ecoregions: ['NE', 'SE', 'MW', 'GP', 'CA'],
    description:
      'Multi-story edible landscape. Pecan and walnut provide nut crops; persimmon and pawpaw offer native fruit; oaks produce wildlife mast.',
    species: [
      { speciesId: 'pecan', proportion: 0.20 },
      { speciesId: 'black-walnut', proportion: 0.15 },
      { speciesId: 'persimmon', proportion: 0.15 },
      { speciesId: 'pawpaw', proportion: 0.15 },
      { speciesId: 'apple', proportion: 0.10 },
      { speciesId: 'american-chestnut', proportion: 0.10 },
      { speciesId: 'white-oak', proportion: 0.10 },
      { speciesId: 'redbud', proportion: 0.05 },
    ],
  },
  {
    id: 'carbon-max',
    name: 'Maximum Carbon Sequestration',
    ecoregions: ['NE', 'SE', 'MW'],
    description:
      'Optimized for maximum carbon capture. Combines fast-growing species for quick sequestration with long-lived species for permanent storage.',
    species: [
      { speciesId: 'tulip-poplar', proportion: 0.20 },
      { speciesId: 'american-sycamore', proportion: 0.15 },
      { speciesId: 'loblolly-pine', proportion: 0.15 },
      { speciesId: 'white-oak', proportion: 0.15 },
      { speciesId: 'bald-cypress', proportion: 0.10 },
      { speciesId: 'eastern-cottonwood', proportion: 0.10 },
      { speciesId: 'dawn-redwood', proportion: 0.10 },
      { speciesId: 'black-walnut', proportion: 0.05 },
    ],
  },
  {
    id: 'pollinator-habitat',
    name: 'Pollinator & Wildlife Habitat',
    ecoregions: ['NE', 'SE', 'MW'],
    description:
      'Focused on supporting pollinators, songbirds, and wildlife with sequential bloom, berry, and mast production throughout the year.',
    species: [
      { speciesId: 'dogwood', proportion: 0.15 },
      { speciesId: 'redbud', proportion: 0.15 },
      { speciesId: 'american-basswood', proportion: 0.15 },
      { speciesId: 'black-cherry', proportion: 0.15 },
      { speciesId: 'sassafras', proportion: 0.10 },
      { speciesId: 'persimmon', proportion: 0.10 },
      { speciesId: 'pawpaw', proportion: 0.10 },
      { speciesId: 'black-gum', proportion: 0.10 },
    ],
  },
];

/**
 * Get communities relevant to a given ecoregion.
 * Returns communities that include the ecoregion, sorted by specificity
 * (communities with fewer ecoregions are more targeted).
 */
export function getCommunitiesForEcoregion(ecoregion) {
  if (!ecoregion) return SPECIES_COMMUNITIES;
  return SPECIES_COMMUNITIES
    .filter((c) => c.ecoregions.includes(ecoregion))
    .sort((a, b) => a.ecoregions.length - b.ecoregions.length);
}
