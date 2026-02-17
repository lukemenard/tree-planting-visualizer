/**
 * FVS Species Code Mapping
 *
 * Maps scientific names to FVS 2-letter species codes per variant.
 * Variants: ne=Northeast, sn=Southern, pn=Pacific NW,
 *           cr=Central Rockies, ci=Inland Empire, ca=Inland CA
 *
 * Sources:
 *   - FVS NE Variant Overview (Keyser & Dixon 2017)
 *   - FVS SN Variant Overview (Keyser 2008)
 *   - FVS PN/CR/CI/CA Variant Overviews (Keyser 2008)
 *
 * Each entry: { ne, sn, pn, cr, ci, ca } — null if not present in that variant.
 */

export const FVS_SPECIES_CODES = {
  // ── Oaks ──
  'Quercus rubra':       { ne: 'RO', sn: 'NR', pn: null, cr: null, ci: null, ca: null, fiaCode: 833 },
  'Quercus alba':        { ne: 'WO', sn: 'WO', pn: null, cr: null, ci: null, ca: null, fiaCode: 802 },
  'Quercus palustris':   { ne: 'PN', sn: 'WL', pn: null, cr: null, ci: null, ca: null, fiaCode: 830 },
  'Quercus virginiana':  { ne: null, sn: 'LO', pn: null, cr: null, ci: null, ca: null, fiaCode: 812 },
  'Quercus macrocarpa':  { ne: 'BU', sn: null, pn: null, cr: 'BU', ci: null, ca: null, fiaCode: 823 },
  'Quercus velutina':    { ne: 'BO', sn: 'BK', pn: null, cr: null, ci: null, ca: null, fiaCode: 837 },
  'Quercus coccinea':    { ne: 'SK', sn: 'SK', pn: null, cr: null, ci: null, ca: null, fiaCode: 806 },
  'Quercus garryana':    { ne: null, sn: null, pn: 'WO', cr: null, ci: null, ca: 'WO', fiaCode: 815 },
  'Quercus falcata':     { ne: null, sn: 'SO', pn: null, cr: null, ci: null, ca: null, fiaCode: 812 },
  'Quercus pagoda':      { ne: null, sn: 'CB', pn: null, cr: null, ci: null, ca: null, fiaCode: 813 },
  'Quercus phellos':     { ne: null, sn: 'WL', pn: null, cr: null, ci: null, ca: null, fiaCode: 831 },
  'Quercus stellata':    { ne: null, sn: 'PO', pn: null, cr: null, ci: null, ca: null, fiaCode: 835 },
  'Quercus bicolor':     { ne: 'SW', sn: null, pn: null, cr: null, ci: null, ca: null, fiaCode: 804 },
  'Quercus nigra':       { ne: null, sn: 'WN', pn: null, cr: null, ci: null, ca: null, fiaCode: 827 },
  'Quercus lobata':      { ne: null, sn: null, pn: 'VO', cr: null, ci: null, ca: 'VO', fiaCode: 821 },
  'Quercus kelloggii':   { ne: null, sn: null, pn: 'BO', cr: null, ci: null, ca: 'BO', fiaCode: 818 },
  'Quercus gambelii':    { ne: null, sn: null, pn: 'GO', cr: 'GO', ci: null, ca: null, fiaCode: 814 },

  // ── Maples ──
  'Acer saccharum':      { ne: 'SM', sn: 'SM', pn: null, cr: null, ci: null, ca: null, fiaCode: 318 },
  'Acer rubrum':         { ne: 'RM', sn: 'RM', pn: null, cr: null, ci: null, ca: null, fiaCode: 316 },
  'Acer saccharinum':    { ne: 'SV', sn: 'SV', pn: null, cr: null, ci: null, ca: null, fiaCode: 317 },
  'Acer macrophyllum':   { ne: null, sn: null, pn: 'BM', cr: null, ci: null, ca: 'BM', fiaCode: 312 },
  'Acer negundo':        { ne: 'BE', sn: 'BE', pn: null, cr: 'BE', ci: null, ca: null, fiaCode: 313 },

  // ── Other hardwoods ──
  'Liriodendron tulipifera': { ne: 'YP', sn: 'YP', pn: null, cr: null, ci: null, ca: null, fiaCode: 621 },
  'Fraxinus americana':  { ne: 'WA', sn: 'WA', pn: null, cr: null, ci: null, ca: null, fiaCode: 541 },
  'Fraxinus pennsylvanica': { ne: 'GA', sn: 'GA', pn: null, cr: 'GA', ci: null, ca: null, fiaCode: 544 },
  'Fagus grandifolia':   { ne: 'AB', sn: 'AB', pn: null, cr: null, ci: null, ca: null, fiaCode: 531 },
  'Betula alleghaniensis': { ne: 'YB', sn: null, pn: null, cr: null, ci: null, ca: null, fiaCode: 371 },
  'Betula papyrifera':   { ne: 'PB', sn: null, pn: 'PB', cr: 'PB', ci: 'PB', ca: null, fiaCode: 375 },
  'Juglans nigra':       { ne: 'BW', sn: 'BW', pn: null, cr: null, ci: null, ca: null, fiaCode: 602 },
  'Carya ovata':         { ne: 'SH', sn: 'SH', pn: null, cr: null, ci: null, ca: null, fiaCode: 407 },
  'Platanus occidentalis': { ne: 'SY', sn: 'SY', pn: null, cr: null, ci: null, ca: null, fiaCode: 731 },
  'Liquidambar styraciflua': { ne: null, sn: 'SG', pn: null, cr: null, ci: null, ca: null, fiaCode: 611 },
  'Ulmus americana':     { ne: 'AE', sn: 'AE', pn: null, cr: null, ci: null, ca: null, fiaCode: 972 },
  'Prunus serotina':     { ne: 'BC', sn: 'BC', pn: null, cr: null, ci: null, ca: null, fiaCode: 762 },
  'Robinia pseudoacacia':{ ne: 'BL', sn: 'BL', pn: null, cr: null, ci: null, ca: null, fiaCode: 901 },
  'Gleditsia triacanthos':{ ne: 'HK', sn: 'HK', pn: null, cr: null, ci: null, ca: null, fiaCode: 552 },
  'Tilia americana':     { ne: 'BA', sn: 'BA', pn: null, cr: null, ci: null, ca: null, fiaCode: 951 },
  'Nyssa sylvatica':     { ne: 'BG', sn: 'BG', pn: null, cr: null, ci: null, ca: null, fiaCode: 693 },
  'Sassafras albidum':   { ne: 'SA', sn: 'SA', pn: null, cr: null, ci: null, ca: null, fiaCode: 931 },
  'Catalpa speciosa':    { ne: 'NC', sn: 'NC', pn: null, cr: null, ci: null, ca: null, fiaCode: 451 },
  'Alnus rubra':         { ne: null, sn: null, pn: 'RA', cr: null, ci: 'RA', ca: null, fiaCode: 351 },

  // ── Pines ──
  'Pinus strobus':       { ne: 'WP', sn: 'WP', pn: null, cr: null, ci: 'WP', ca: null, fiaCode: 129 },
  'Pinus taeda':         { ne: null, sn: 'LP', pn: null, cr: null, ci: null, ca: null, fiaCode: 131 },
  'Pinus echinata':      { ne: null, sn: 'SP', pn: null, cr: null, ci: null, ca: null, fiaCode: 110 },
  'Pinus palustris':     { ne: null, sn: 'LL', pn: null, cr: null, ci: null, ca: null, fiaCode: 121 },
  'Pinus ponderosa':     { ne: null, sn: null, pn: 'PP', cr: 'PP', ci: 'PP', ca: 'PP', fiaCode: 122 },
  'Pinus resinosa':      { ne: 'RP', sn: null, pn: null, cr: null, ci: null, ca: null, fiaCode: 125 },
  'Pinus virginiana':    { ne: 'VP', sn: 'VP', pn: null, cr: null, ci: null, ca: null, fiaCode: 132 },
  'Pinus elliottii':     { ne: null, sn: 'SA', pn: null, cr: null, ci: null, ca: null, fiaCode: 111 },
  'Pinus contorta':      { ne: null, sn: null, pn: 'LP', cr: 'LP', ci: 'LP', ca: 'LP', fiaCode: 108 },
  'Pinus banksiana':     { ne: 'JP', sn: null, pn: null, cr: null, ci: null, ca: null, fiaCode: 105 },
  'Pinus monticola':     { ne: null, sn: null, pn: 'WP', cr: null, ci: 'WP', ca: null, fiaCode: 119 },
  'Pinus lambertiana':   { ne: null, sn: null, pn: 'SP', cr: null, ci: null, ca: 'SP', fiaCode: 117 },
  'Pinus radiata':       { ne: null, sn: null, pn: null, cr: null, ci: null, ca: null, fiaCode: 124 },
  'Pinus sabiniana':     { ne: null, sn: null, pn: 'GP', cr: null, ci: null, ca: 'GP', fiaCode: 127 },
  'Pinus clausa':        { ne: null, sn: 'SC', pn: null, cr: null, ci: null, ca: null, fiaCode: 107 },
  'Pinus flexilis':      { ne: null, sn: null, pn: 'LM', cr: 'LM', ci: 'LM', ca: null, fiaCode: 113 },
  'Pinus edulis':        { ne: null, sn: null, pn: 'PI', cr: 'PI', ci: null, ca: null, fiaCode: 106 },

  // ── Spruces & Firs ──
  'Picea rubens':        { ne: 'RS', sn: null, pn: null, cr: null, ci: null, ca: null, fiaCode: 97 },
  'Picea glauca':        { ne: 'WS', sn: null, pn: null, cr: 'WS', ci: 'WS', ca: null, fiaCode: 94 },
  'Picea sitchensis':    { ne: null, sn: null, pn: 'SS', cr: null, ci: null, ca: null, fiaCode: 98 },
  'Abies balsamea':      { ne: 'BF', sn: null, pn: null, cr: null, ci: null, ca: null, fiaCode: 12 },
  'Abies procera':       { ne: null, sn: null, pn: 'NF', cr: null, ci: null, ca: null, fiaCode: 22 },
  'Abies grandis':       { ne: null, sn: null, pn: 'GF', cr: null, ci: 'GF', ca: null, fiaCode: 17 },
  'Abies amabilis':      { ne: null, sn: null, pn: 'AF', cr: null, ci: null, ca: null, fiaCode: 11 },
  'Abies lasiocarpa':    { ne: null, sn: null, pn: 'SF', cr: 'SF', ci: 'SF', ca: null, fiaCode: 19 },
  'Abies concolor':      { ne: null, sn: null, pn: null, cr: 'WF', ci: 'WF', ca: 'WF', fiaCode: 15 },
  'Picea engelmannii':   { ne: null, sn: null, pn: 'ES', cr: 'ES', ci: 'ES', ca: null, fiaCode: 93 },
  'Picea pungens':       { ne: null, sn: null, pn: null, cr: 'BS', ci: null, ca: null, fiaCode: 96 },

  // ── Other conifers ──
  'Pseudotsuga menziesii': { ne: null, sn: null, pn: 'DF', cr: 'DF', ci: 'DF', ca: 'DF', fiaCode: 202 },
  'Tsuga canadensis':    { ne: 'EH', sn: 'EH', pn: null, cr: null, ci: null, ca: null, fiaCode: 261 },
  'Tsuga heterophylla':  { ne: null, sn: null, pn: 'WH', cr: null, ci: 'WH', ca: null, fiaCode: 263 },
  'Thuja occidentalis':  { ne: 'EC', sn: null, pn: null, cr: null, ci: null, ca: null, fiaCode: 241 },
  'Thuja plicata':       { ne: null, sn: null, pn: 'RC', cr: null, ci: 'RC', ca: null, fiaCode: 242 },
  'Taxodium distichum':  { ne: null, sn: 'BC', pn: null, cr: null, ci: null, ca: null, fiaCode: 221 },
  'Sequoia sempervirens':{ ne: null, sn: null, pn: 'RW', cr: null, ci: null, ca: 'RW', fiaCode: 211 },
  'Juniperus virginiana':{ ne: 'RC', sn: 'RC', pn: null, cr: 'RC', ci: null, ca: null, fiaCode: 68 },
  'Larix laricina':      { ne: 'TL', sn: null, pn: null, cr: null, ci: null, ca: null, fiaCode: 71 },
  'Larix occidentalis':  { ne: null, sn: null, pn: 'WL', cr: 'WL', ci: 'WL', ca: null, fiaCode: 73 },
  'Calocedrus decurrens':{ ne: null, sn: null, pn: 'IC', cr: null, ci: null, ca: 'IC', fiaCode: 81 },
  'Sequoiadendron giganteum': { ne: null, sn: null, pn: 'GS', cr: null, ci: null, ca: 'GS', fiaCode: 212 },
  'Juniperus scopulorum':{ ne: null, sn: null, pn: 'RJ', cr: 'RJ', ci: 'RJ', ca: null, fiaCode: 66 },
  'Juniperus osteosperma':{ ne: null, sn: null, pn: null, cr: 'UJ', ci: null, ca: null, fiaCode: 65 },
  'Taxodium ascendens':  { ne: null, sn: 'PC', pn: null, cr: null, ci: null, ca: null, fiaCode: 222 },
  'Metasequoia glyptostroboides': { ne: null, sn: null, pn: null, cr: null, ci: null, ca: null, fiaCode: null },

  // ── Additional hardwoods ──
  'Carya cordiformis':   { ne: 'BH', sn: 'BH', pn: null, cr: null, ci: null, ca: null, fiaCode: 402 },
  'Castanea dentata':    { ne: 'AC', sn: 'AC', pn: null, cr: null, ci: null, ca: null, fiaCode: 421 },
  'Celtis occidentalis': { ne: 'HK', sn: 'HK', pn: null, cr: null, ci: null, ca: null, fiaCode: 462 },
  'Populus deltoides':   { ne: 'CW', sn: 'CW', pn: null, cr: 'CW', ci: null, ca: null, fiaCode: 742 },
  'Populus tremuloides':  { ne: 'QA', sn: null, pn: 'AS', cr: 'AS', ci: 'AS', ca: null, fiaCode: 746 },
  'Aesculus glabra':     { ne: 'OH', sn: null, pn: null, cr: null, ci: null, ca: null, fiaCode: 331 },
  'Gymnocladus dioicus': { ne: 'KC', sn: null, pn: null, cr: null, ci: null, ca: null, fiaCode: 571 },
  'Diospyros virginiana':{ ne: null, sn: 'PE', pn: null, cr: null, ci: null, ca: null, fiaCode: 521 },

  // ── Small deciduous / ornamental ──
  'Cornus florida':      { ne: 'DW', sn: 'DW', pn: null, cr: null, ci: null, ca: null, fiaCode: 491 },
  'Cercis canadensis':   { ne: 'RB', sn: 'RB', pn: null, cr: null, ci: null, ca: null, fiaCode: 471 },
  'Magnolia grandiflora':{ ne: null, sn: 'SM', pn: null, cr: null, ci: null, ca: null, fiaCode: 652 },
  'Arbutus menziesii':   { ne: null, sn: null, pn: 'MA', cr: null, ci: null, ca: 'MA', fiaCode: 361 },
};

/**
 * Auto-detect FVS variant from latitude/longitude.
 *
 * Supported variants:
 *   ne = Northeast (NE/LS/CS)    sn = Southern
 *   pn = Pacific NW              cr = Central Rockies
 *   ci = Inland Empire / N. Rockies   ca = Inland California
 *
 * Geographic boundaries are approximate; the user should confirm in FVS Suppose.
 */
export function detectFvsVariant(lat, lng) {
  // Pacific coast (west of Cascades/Sierra crest)
  if (lng < -120 && lat >= 42) return 'pn';       // WA, OR west side
  if (lng < -119 && lat < 42 && lat >= 34) return 'ca'; // CA
  if (lng < -120 && lat < 34) return 'ca';         // Southern CA

  // Inland West
  if (lng <= -115 && lat >= 42) return 'ci';       // ID, MT, inland WA/OR
  if (lng <= -115 && lat < 42) return 'ca';        // NV side → CA variant

  // Rocky Mountains
  if (lng < -104 && lng >= -115 && lat >= 37) return 'cr'; // CO, WY, UT, SW MT
  if (lng < -104 && lng >= -115 && lat < 37) return 'cr';  // NM, AZ highlands

  // Southern US (east of ~100°W, south of ~37°N, excludes the Rockies)
  if (lat < 37 && lng >= -100) return 'sn';

  // Great Plains / western fringe of the East
  if (lng < -100 && lng >= -104) return 'cr'; // Western Great Plains → CR

  // Northeast / Lake States / Central States (everything else east)
  return 'ne';
}

/**
 * Get the FVS species code for a given scientific name and variant.
 * Returns { code, variant, fallback } where fallback=true if a different
 * variant's code was used because the primary variant had no mapping.
 *
 * Fallback priority: sn → ne → pn → cr → ci → ca (skipping the primary).
 */
export function getFvsCode(scientificName, variant) {
  const entry = FVS_SPECIES_CODES[scientificName];
  if (!entry) return null;

  // Primary variant match
  if (entry[variant]) {
    return { code: entry[variant], variant, fallback: false };
  }

  // Fallback: try other variants in priority order
  const fallbackOrder = ['sn', 'ne', 'pn', 'cr', 'ci', 'ca'];
  for (const fb of fallbackOrder) {
    if (fb !== variant && entry[fb]) {
      return { code: entry[fb], variant: fb, fallback: true };
    }
  }

  return null;
}

/**
 * Get all species codes for a variant (for TREELIST output).
 */
export function getAvailableSpeciesForVariant(variant) {
  const result = [];
  for (const [sciName, codes] of Object.entries(FVS_SPECIES_CODES)) {
    if (codes[variant]) {
      result.push({ scientificName: sciName, code: codes[variant], fiaCode: codes.fiaCode });
    }
  }
  return result;
}
