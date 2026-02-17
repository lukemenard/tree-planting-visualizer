/**
 * Seasonal Canopy Color System
 *
 * Provides species-appropriate canopy colors for each season.
 * Deciduous trees change color; evergreens stay green year-round.
 *
 * Seasons:
 *   spring  – light green, flowering species have pink/white accents
 *   summer  – full dark green (default)
 *   fall    – species-specific fall colors
 *   winter  – deciduous: transparent/bare; evergreens: unchanged
 */

/**
 * Species-specific fall colors (by species group or ID).
 */
const FALL_COLORS = {
  // Species IDs
  'red-maple':        '#CC2222',
  'sugar-maple':      '#FF6600',
  'red-oak':          '#8B4513',
  'white-oak':        '#A0522D',
  'sweetgum':         '#800080',
  'ginkgo':           '#FFD700',
  'black-tupelo':     '#CC0000',
  'sassafras':        '#FF4500',

  // Species groups (fallback)
  'oak':              '#A0522D',
  'maple':            '#FF4500',
  'elm':              '#DAA520',
  'birch':            '#FFD700',
  'ash':              '#9370DB',
  'beech':            '#CD853F',
  'poplar':           '#FFD700',
  'walnut':           '#DAA520',
  'hickory':          '#CD853F',
  'sycamore':         '#DAA520',
  'sweetgum':         '#800080',
  'small-deciduous':  '#FF6347',
  'fruit':            '#FF4500',
};

/**
 * Spring colors (lighter, fresh green; flowering species get blush tones).
 */
const SPRING_FLOWERING = new Set([
  'dogwood', 'redbud', 'magnolia', 'cherry', 'crabapple', 'pear',
  'cornus', 'cercis', 'prunus', 'malus', 'pyrus',
]);

/**
 * Get the seasonal color for a tree.
 *
 * @param {Object} species - species object
 * @param {string} season - 'spring' | 'summer' | 'fall' | 'winter'
 * @returns {{ canopyColor: string, opacity: number }}
 */
export function getSeasonalColor(species, season) {
  if (!species) return { canopyColor: '#2d5a27', opacity: 1.0 };

  const baseColor = species.color || '#2d5a27';
  const isDeciduous = species.category === 'deciduous' ||
    !['conifer', 'evergreen', 'palm'].includes(species.category);
  const isEvergreen = species.category === 'conifer' || species.category === 'evergreen';

  switch (season) {
    case 'spring': {
      if (isDeciduous) {
        // Check for flowering species
        const name = (species.name || '').toLowerCase();
        const id = species.id || '';
        const isFlowering = SPRING_FLOWERING.has(id) ||
          Array.from(SPRING_FLOWERING).some(f => name.includes(f));

        if (isFlowering) {
          return { canopyColor: '#FFB7C5', opacity: 0.85 }; // Cherry blossom pink
        }
        return { canopyColor: lightenColor(baseColor, 0.3), opacity: 0.85 };
      }
      return { canopyColor: baseColor, opacity: 1.0 };
    }

    case 'summer':
      return { canopyColor: baseColor, opacity: 1.0 };

    case 'fall': {
      if (isDeciduous) {
        const fallColor = FALL_COLORS[species.id] ||
          FALL_COLORS[species.speciesGroup] ||
          '#CD853F'; // default tan
        return { canopyColor: fallColor, opacity: 0.9 };
      }
      // Evergreens stay green but slightly muted
      return { canopyColor: baseColor, opacity: 0.95 };
    }

    case 'winter': {
      if (isDeciduous) {
        // Bare branches - very reduced opacity, grey-brown
        return { canopyColor: '#8B7355', opacity: 0.15 };
      }
      // Palms
      if (species.category === 'palm') {
        return { canopyColor: baseColor, opacity: 0.9 };
      }
      // Evergreens unchanged but slightly darker
      return { canopyColor: darkenColor(baseColor, 0.1), opacity: 0.95 };
    }

    default:
      return { canopyColor: baseColor, opacity: 1.0 };
  }
}

/**
 * Get current season from month.
 */
export function getCurrentSeason() {
  const month = new Date().getMonth();
  if (month >= 2 && month <= 4) return 'spring';
  if (month >= 5 && month <= 7) return 'summer';
  if (month >= 8 && month <= 10) return 'fall';
  return 'winter';
}

/**
 * Available seasons for the toggle.
 */
export const SEASONS = [
  { id: 'spring', label: 'Spring', icon: '🌸', color: '#90EE90' },
  { id: 'summer', label: 'Summer', icon: '☀️', color: '#228B22' },
  { id: 'fall', label: 'Fall', icon: '🍂', color: '#FF8C00' },
  { id: 'winter', label: 'Winter', icon: '❄️', color: '#B0C4DE' },
];

// ─── Color Utilities ────────────────────────────────────────────────────

function lightenColor(hex, amount) {
  const rgb = hexToRgb(hex);
  if (!rgb) return hex;
  return rgbToHex(
    Math.min(255, Math.round(rgb.r + (255 - rgb.r) * amount)),
    Math.min(255, Math.round(rgb.g + (255 - rgb.g) * amount)),
    Math.min(255, Math.round(rgb.b + (255 - rgb.b) * amount)),
  );
}

function darkenColor(hex, amount) {
  const rgb = hexToRgb(hex);
  if (!rgb) return hex;
  return rgbToHex(
    Math.max(0, Math.round(rgb.r * (1 - amount))),
    Math.max(0, Math.round(rgb.g * (1 - amount))),
    Math.max(0, Math.round(rgb.b * (1 - amount))),
  );
}

function hexToRgb(hex) {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result ? {
    r: parseInt(result[1], 16),
    g: parseInt(result[2], 16),
    b: parseInt(result[3], 16),
  } : null;
}

function rgbToHex(r, g, b) {
  return '#' + [r, g, b].map(x => x.toString(16).padStart(2, '0')).join('');
}
