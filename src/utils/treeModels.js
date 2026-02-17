/**
 * Procedural 3D Tree Model System
 *
 * Generates distinct tree silhouettes using Mapbox custom layers.
 * 7 model types cover the major tree form categories:
 *
 *   1. broadleaf-round:   rounded crown (oaks, maples, beech, elm)
 *   2. columnar-deciduous: tall narrow (poplar, sweetgum, tulip)
 *   3. spreading:          wide low crown (live oak, sycamore, walnut)
 *   4. conical:            classic Christmas tree (spruce, fir, hemlock)
 *   5. irregular-conifer:  flat-topped/asymmetric (pine, cedar)
 *   6. columnar-conifer:   narrow spire (cypress, redwood)
 *   7. palm:               fan-top (palms)
 *
 * Each type is defined by:
 *   - trunkHeightRatio: proportion of total height that is trunk
 *   - crownWidthRatio:  crown width / total height
 *   - crownShape:       'sphere' | 'ellipse' | 'cone' | 'cylinder' | 'fan'
 *   - crownTopRatio:    top width as fraction of max width (0 = pointed, 1 = flat)
 */

export const TREE_MODEL_TYPES = {
  'broadleaf-round': {
    trunkHeightRatio: 0.35,
    crownWidthRatio: 0.9,
    crownShape: 'sphere',
    crownTopRatio: 0.6,
    trunkWidthRatio: 0.06,
  },
  'columnar-deciduous': {
    trunkHeightRatio: 0.40,
    crownWidthRatio: 0.35,
    crownShape: 'ellipse',
    crownTopRatio: 0.5,
    trunkWidthRatio: 0.05,
  },
  'spreading': {
    trunkHeightRatio: 0.30,
    crownWidthRatio: 1.3,
    crownShape: 'sphere',
    crownTopRatio: 0.7,
    trunkWidthRatio: 0.08,
  },
  'conical': {
    trunkHeightRatio: 0.15,
    crownWidthRatio: 0.55,
    crownShape: 'cone',
    crownTopRatio: 0.05,
    trunkWidthRatio: 0.04,
  },
  'irregular-conifer': {
    trunkHeightRatio: 0.35,
    crownWidthRatio: 0.65,
    crownShape: 'cone',
    crownTopRatio: 0.15,
    trunkWidthRatio: 0.05,
  },
  'columnar-conifer': {
    trunkHeightRatio: 0.20,
    crownWidthRatio: 0.25,
    crownShape: 'cylinder',
    crownTopRatio: 0.6,
    trunkWidthRatio: 0.04,
  },
  'palm': {
    trunkHeightRatio: 0.80,
    crownWidthRatio: 0.7,
    crownShape: 'fan',
    crownTopRatio: 0.3,
    trunkWidthRatio: 0.04,
  },
};

/**
 * Map species groups to tree model types.
 */
export const SPECIES_GROUP_TO_MODEL = {
  'oak': 'broadleaf-round',
  'maple': 'broadleaf-round',
  'elm': 'broadleaf-round',
  'beech': 'broadleaf-round',
  'ash': 'broadleaf-round',
  'birch': 'columnar-deciduous',
  'poplar': 'columnar-deciduous',
  'sweetgum': 'columnar-deciduous',
  'walnut': 'spreading',
  'hickory': 'broadleaf-round',
  'sycamore': 'spreading',
  'pine-hard': 'irregular-conifer',
  'pine-soft': 'irregular-conifer',
  'spruce': 'conical',
  'fir': 'conical',
  'cedar': 'columnar-conifer',
  'cypress': 'columnar-conifer',
  'redwood': 'columnar-conifer',
  'palm': 'palm',
  'small-deciduous': 'broadleaf-round',
  'fruit': 'broadleaf-round',
  'default': 'broadleaf-round',
};

/**
 * Map canopyShape values to model types.
 */
export const CANOPY_SHAPE_TO_MODEL = {
  'round': 'broadleaf-round',
  'oval': 'columnar-deciduous',
  'conical': 'conical',
  'columnar': 'columnar-conifer',
  'vase': 'columnar-deciduous',
  'weeping': 'spreading',
  'spreading': 'spreading',
  'fan': 'palm',
};

/**
 * Determine the model type for a species.
 * Uses species group first, falls back to canopyShape mapping.
 */
export function getModelType(species) {
  if (!species) return 'broadleaf-round';

  // Primary: species group mapping (more accurate for forestry)
  if (species.speciesGroup && SPECIES_GROUP_TO_MODEL[species.speciesGroup]) {
    return SPECIES_GROUP_TO_MODEL[species.speciesGroup];
  }

  // Fallback: canopy shape mapping
  if (species.canopyShape && CANOPY_SHAPE_TO_MODEL[species.canopyShape]) {
    return CANOPY_SHAPE_TO_MODEL[species.canopyShape];
  }

  return 'broadleaf-round';
}

/**
 * Get model parameters for rendering.
 * Combines the model type definition with tree-specific dimensions.
 *
 * @param {string} modelType - one of the 7 model types
 * @param {number} heightM - total tree height in meters
 * @param {number} crownWidthM - crown width in meters
 * @returns {Object} rendering parameters
 */
export function getModelParams(modelType, heightM, crownWidthM) {
  const def = TREE_MODEL_TYPES[modelType] || TREE_MODEL_TYPES['broadleaf-round'];

  const trunkHeight = heightM * def.trunkHeightRatio;
  const crownHeight = heightM - trunkHeight;
  const trunkWidth = heightM * def.trunkWidthRatio;

  return {
    modelType,
    trunkHeight,
    crownHeight,
    trunkWidth,
    crownWidth: crownWidthM || heightM * def.crownWidthRatio,
    crownShape: def.crownShape,
    crownTopRatio: def.crownTopRatio,
    totalHeight: heightM,
  };
}

/**
 * Generate GeoJSON with model type information for each tree.
 * This extends the existing tree model GeoJSON with modelType info.
 */
export function enrichTreeGeoJSONWithModelType(features, speciesMap) {
  return features.map(feature => {
    if (!feature?.properties) return feature;

    const speciesId = feature.properties.speciesId;
    const species = speciesMap instanceof Map
      ? speciesMap.get(speciesId)
      : speciesMap?.[speciesId];

    const modelType = getModelType(species);
    const def = TREE_MODEL_TYPES[modelType] || TREE_MODEL_TYPES['broadleaf-round'];

    return {
      ...feature,
      properties: {
        ...feature.properties,
        modelType,
        crownShape: def.crownShape,
        trunkHeightRatio: def.trunkHeightRatio,
        crownWidthRatio: def.crownWidthRatio,
        trunkWidthRatio: def.trunkWidthRatio,
      },
    };
  });
}
