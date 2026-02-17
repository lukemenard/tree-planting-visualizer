/**
 * Silvicultural Prescriptions
 *
 * Pre-defined management regimes that can be applied to a stand projection.
 * Each prescription defines a series of timed actions (thinnings, harvests)
 * that modify the stand over the projection horizon.
 *
 * Action types:
 *   pct           – pre-commercial thinning (no merchantable volume tracked)
 *   thin-below    – low thinning: remove smallest stems first
 *   thin-above    – crown thinning: remove some co-dominant/dominant stems
 *   thin-mechanical – remove every nth tree (systematic)
 *   selection     – single-tree selection: remove largest merchantable stems
 *   clearcut      – remove all (or nearly all) stems
 *   shelterwood-seed    – first entry: remove ~40-50% of overstory
 *   shelterwood-removal – final entry: remove remaining overstory
 *   sanitation    – remove weakest/smallest stems (vigor thinning)
 *
 * Selection logic for each action type:
 *   thin-below / pct:     sort ascending by DBH, remove from bottom
 *   thin-above:           sort descending by DBH, skip top 20%, remove from next tier
 *   thin-mechanical:      remove every nth tree (deterministic by index)
 *   selection:            sort descending by DBH, remove from top
 *   clearcut:             remove all
 *   shelterwood-seed:     remove ~40-60% (thin-above pattern)
 *   shelterwood-removal:  remove remaining overstory (clearcut residuals)
 *   sanitation:           remove trees with worst vigor score (smallest relative to avg)
 */

export const PRESCRIPTIONS = [
  // ─────────────────────────────────────────────────────────────────────────
  {
    id: 'no-management',
    name: 'No Management',
    category: 'passive',
    icon: '🌿',
    description:
      'Let the stand develop naturally with no interventions. Mortality is driven entirely by background rates and density-dependent competition.',
    actions: [],
  },

  // ─────────────────────────────────────────────────────────────────────────
  {
    id: 'pct-only',
    name: 'Pre-commercial Thin',
    category: 'even-aged',
    icon: '✂️',
    description:
      'A single early thinning at age 12 to reduce stocking and promote diameter growth on residual stems. No merchantable harvest.',
    actions: [
      { year: 12, type: 'pct', removePct: 0.35, label: 'PCT to 65% stocking' },
    ],
  },

  // ─────────────────────────────────────────────────────────────────────────
  {
    id: 'even-aged-sawtimber',
    name: 'Even-aged Sawtimber',
    category: 'even-aged',
    icon: '🪵',
    description:
      'Classic even-aged regime: PCT at 12, two commercial thinnings from below at 25 and 40, final clearcut harvest at 60. Optimized for sawtimber volume.',
    actions: [
      { year: 12, type: 'pct', removePct: 0.30, label: 'PCT' },
      { year: 25, type: 'thin-below', removePct: 0.25, minMerchDbh: 8, label: '1st commercial thin' },
      { year: 40, type: 'thin-below', removePct: 0.30, minMerchDbh: 10, label: '2nd commercial thin' },
      { year: 60, type: 'clearcut', removePct: 0.95, minMerchDbh: 8, label: 'Final harvest' },
    ],
  },

  // ─────────────────────────────────────────────────────────────────────────
  {
    id: 'even-aged-pulpwood',
    name: 'Short-rotation Pulpwood',
    category: 'even-aged',
    icon: '📄',
    description:
      'Shorter rotation focused on fiber production: PCT at 10, one commercial thin at 20, clearcut at 35. Best for fast-growing species (poplars, pines).',
    actions: [
      { year: 10, type: 'pct', removePct: 0.35, label: 'PCT' },
      { year: 20, type: 'thin-below', removePct: 0.30, minMerchDbh: 5, label: 'Commercial thin' },
      { year: 35, type: 'clearcut', removePct: 0.95, minMerchDbh: 5, label: 'Final harvest' },
    ],
  },

  // ─────────────────────────────────────────────────────────────────────────
  {
    id: 'shelterwood',
    name: 'Shelterwood',
    category: 'even-aged',
    icon: '🏕️',
    description:
      'Two-stage regeneration method: seed cut at 50 removes ~50% of overstory to promote regeneration under partial shade, followed by removal cut at 60.',
    actions: [
      { year: 15, type: 'pct', removePct: 0.30, label: 'PCT' },
      { year: 30, type: 'thin-below', removePct: 0.25, minMerchDbh: 8, label: 'Commercial thin' },
      { year: 50, type: 'shelterwood-seed', removePct: 0.50, minMerchDbh: 10, label: 'Seed cut' },
      { year: 60, type: 'shelterwood-removal', removePct: 0.90, minMerchDbh: 8, label: 'Removal cut' },
    ],
  },

  // ─────────────────────────────────────────────────────────────────────────
  {
    id: 'selection-system',
    name: 'Single-tree Selection',
    category: 'uneven-aged',
    icon: '🎯',
    description:
      'Uneven-aged management: periodic selection harvests every 15 years remove the largest merchantable stems to maintain a balanced diameter distribution (BDq approach).',
    actions: [
      { year: 20, type: 'selection', removePct: 0.25, minMerchDbh: 10, label: '1st selection cut' },
      { year: 35, type: 'selection', removePct: 0.25, minMerchDbh: 10, label: '2nd selection cut' },
      { year: 50, type: 'selection', removePct: 0.25, minMerchDbh: 10, label: '3rd selection cut' },
      { year: 65, type: 'selection', removePct: 0.25, minMerchDbh: 10, label: '4th selection cut' },
    ],
  },

  // ─────────────────────────────────────────────────────────────────────────
  {
    id: 'group-selection',
    name: 'Group Selection',
    category: 'uneven-aged',
    icon: '🔘',
    description:
      'Create small openings (0.25-0.5 acre) in the canopy every 15 years. Simulated as removing 20% of trees in each entry, weighted toward mature stems.',
    actions: [
      { year: 20, type: 'thin-above', removePct: 0.20, minMerchDbh: 10, label: '1st group opening' },
      { year: 35, type: 'thin-above', removePct: 0.20, minMerchDbh: 10, label: '2nd group opening' },
      { year: 50, type: 'thin-above', removePct: 0.20, minMerchDbh: 10, label: '3rd group opening' },
      { year: 65, type: 'thin-above', removePct: 0.20, minMerchDbh: 10, label: '4th group opening' },
    ],
  },

  // ─────────────────────────────────────────────────────────────────────────
  {
    id: 'carbon-max',
    name: 'Carbon Maximization',
    category: 'special',
    icon: '🌍',
    description:
      'Optimized for long-term carbon storage: only sanitation removals of suppressed/dying stems at years 20 and 40. No commercial harvest — all carbon remains in the standing forest.',
    actions: [
      { year: 20, type: 'sanitation', removePct: 0.10, label: 'Sanitation thin' },
      { year: 40, type: 'sanitation', removePct: 0.10, label: 'Sanitation thin' },
    ],
  },

  // ─────────────────────────────────────────────────────────────────────────
  {
    id: 'urban-amenity',
    name: 'Urban Amenity',
    category: 'special',
    icon: '🏙️',
    description:
      'Management for urban canopy cover and aesthetics: remove poorly-performing specimens at 15 and 30 years, maintain crown spacing. No commercial timber goal.',
    actions: [
      { year: 15, type: 'sanitation', removePct: 0.15, label: 'Selective removal' },
      { year: 30, type: 'sanitation', removePct: 0.10, label: 'Selective removal' },
    ],
  },

  // ─────────────────────────────────────────────────────────────────────────
  {
    id: 'crop-tree-release',
    name: 'Crop Tree Release',
    category: 'even-aged',
    icon: '⭐',
    description:
      'Identify the best 40-60 TPA as crop trees, then thin around them at years 15 and 30 to free their crowns. Final harvest of crop trees at 50.',
    actions: [
      { year: 15, type: 'thin-below', removePct: 0.35, label: '1st crop tree release' },
      { year: 30, type: 'thin-below', removePct: 0.25, minMerchDbh: 8, label: '2nd release' },
      { year: 50, type: 'clearcut', removePct: 0.90, minMerchDbh: 10, label: 'Crop tree harvest' },
    ],
  },
];

/**
 * Get a prescription by ID.
 */
export function getPrescription(id) {
  return PRESCRIPTIONS.find(p => p.id === id) || PRESCRIPTIONS[0];
}

/**
 * Get prescriptions filtered by category.
 */
export function getPrescriptionsByCategory(category) {
  if (!category) return PRESCRIPTIONS;
  return PRESCRIPTIONS.filter(p => p.category === category);
}
