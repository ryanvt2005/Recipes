/**
 * Ingredient Aggregation Engine v2
 *
 * Aggregates shopping list ingredients with:
 * - Common-sense string normalization ("salt and pepper" → "salt & pepper")
 * - Bell pepper variant aggregation with color breakdown
 * - Unit compatibility checking and quantity summing
 * - Safe behavior (never incorrectly combine unrelated items)
 *
 * @module ingredientAggregator
 */

const { normalizeUnit, parseQuantity, parseIngredientString, UNIT_MAP } = require('./ingredientParser');

// ============================================
// Unit Compatibility
// ============================================

/**
 * Unit groups that can be combined (with conversion factors to base unit)
 * Base units: tsp (volume-small), cup (volume-large), g (weight-metric), oz (weight-imperial), piece (count)
 */
const UNIT_CONVERSION = {
  // Small volume (base: tsp)
  tsp: { group: 'volume-small', toBase: 1 },
  tbsp: { group: 'volume-small', toBase: 3 },

  // Large volume (base: cup)
  cup: { group: 'volume-large', toBase: 1 },
  'fl oz': { group: 'volume-large', toBase: 0.125 },
  pint: { group: 'volume-large', toBase: 2 },
  quart: { group: 'volume-large', toBase: 4 },
  gallon: { group: 'volume-large', toBase: 16 },
  ml: { group: 'volume-metric', toBase: 1 },
  l: { group: 'volume-metric', toBase: 1000 },

  // Weight metric (base: g)
  g: { group: 'weight-metric', toBase: 1 },
  kg: { group: 'weight-metric', toBase: 1000 },

  // Weight imperial (base: oz)
  oz: { group: 'weight-imperial', toBase: 1 },
  lb: { group: 'weight-imperial', toBase: 16 },

  // Count units (each is its own group - not convertible)
  piece: { group: 'count-piece', toBase: 1 },
  whole: { group: 'count-whole', toBase: 1 },
  can: { group: 'count-can', toBase: 1 },
  package: { group: 'count-package', toBase: 1 },
  jar: { group: 'count-jar', toBase: 1 },
  bottle: { group: 'count-bottle', toBase: 1 },
  box: { group: 'count-box', toBase: 1 },
  bag: { group: 'count-bag', toBase: 1 },
  bunch: { group: 'count-bunch', toBase: 1 },
  head: { group: 'count-head', toBase: 1 },
  clove: { group: 'count-clove', toBase: 1 },
  slice: { group: 'count-slice', toBase: 1 },
  stalk: { group: 'count-stalk', toBase: 1 },
  stick: { group: 'count-stick', toBase: 1 },
  sprig: { group: 'count-sprig', toBase: 1 },
  pinch: { group: 'count-pinch', toBase: 1 },
  dash: { group: 'count-dash', toBase: 1 },
  handful: { group: 'count-handful', toBase: 1 },
  large: { group: 'count-size', toBase: 1 },
  medium: { group: 'count-size', toBase: 1 },
  small: { group: 'count-size', toBase: 1 },
};

/**
 * Check if two units are compatible for summing
 * @param {string|null} unitA - First unit
 * @param {string|null} unitB - Second unit
 * @returns {boolean} True if units can be combined
 */
function areUnitsCompatible(unitA, unitB) {
  // Both null = compatible (unitless items)
  if (unitA === null && unitB === null) return true;

  // One null, one not = incompatible
  if (unitA === null || unitB === null) return false;

  // Same unit = compatible
  const normA = normalizeUnit(unitA) || unitA?.toLowerCase();
  const normB = normalizeUnit(unitB) || unitB?.toLowerCase();

  if (normA === normB) return true;

  // Check if in same conversion group
  const convA = UNIT_CONVERSION[normA];
  const convB = UNIT_CONVERSION[normB];

  if (convA && convB && convA.group === convB.group) {
    return true;
  }

  return false;
}

/**
 * Get the preferred display unit for a group
 * @param {string} unit - A unit in the group
 * @returns {string} The preferred unit for display
 */
function getPreferredUnit(unit) {
  const norm = normalizeUnit(unit) || unit?.toLowerCase();
  const conv = UNIT_CONVERSION[norm];

  if (!conv) return norm;

  // Prefer common units for display
  const preferredByGroup = {
    'volume-small': 'tbsp',
    'volume-large': 'cup',
    'volume-metric': 'ml',
    'weight-metric': 'g',
    'weight-imperial': 'oz',
  };

  return preferredByGroup[conv.group] || norm;
}

// ============================================
// Ingredient Name Normalization
// ============================================

/**
 * Bell pepper color variants that should be grouped together
 */
const BELL_PEPPER_COLORS = ['red', 'green', 'yellow', 'orange', 'mixed'];

/**
 * Patterns for bell pepper detection
 */
const BELL_PEPPER_PATTERNS = [
  /^(red|green|yellow|orange)\s+bell\s+pepper/i,
  /^bell\s+pepper/i,
  /^(red|green|yellow|orange)\s+pepper$/i, // "red pepper" without "bell" - be careful
];

/**
 * Common compound ingredients that should normalize to a canonical form
 */
const COMPOUND_NORMALIZATIONS = {
  'salt and pepper': 'salt & pepper',
  'salt & pepper': 'salt & pepper',
  'salt n pepper': 'salt & pepper',
  'salt pepper': 'salt & pepper',
  'oil and vinegar': 'oil & vinegar',
  'oil & vinegar': 'oil & vinegar',
  'bread and butter': 'bread & butter',
  'bread & butter': 'bread & butter',
  'peanut butter and jelly': 'peanut butter & jelly',
  'peanut butter & jelly': 'peanut butter & jelly',
  'macaroni and cheese': 'macaroni & cheese',
  'macaroni & cheese': 'macaroni & cheese',
  'mac and cheese': 'macaroni & cheese',
  'mac & cheese': 'macaroni & cheese',
};

/**
 * Normalize an ingredient name to produce a canonical key and display name
 *
 * @param {string} nameOrText - Ingredient name or raw text
 * @returns {{ canonicalKey: string, displayName: string, attributes: Object }}
 */
function normalizeIngredientName(nameOrText) {
  if (!nameOrText || typeof nameOrText !== 'string') {
    return {
      canonicalKey: '',
      displayName: '',
      attributes: {},
    };
  }

  let text = nameOrText.trim();

  // Step 1: Basic normalization
  // - Collapse multiple spaces
  // - Strip trailing punctuation
  // - Normalize unicode (already handled by parser, but be safe)
  text = text.replace(/\s+/g, ' ').replace(/[.,;:!?]+$/, '');

  // Step 2: Lowercase for comparison
  const lower = text.toLowerCase();

  // Step 3: Check for compound normalizations
  if (COMPOUND_NORMALIZATIONS[lower]) {
    const canonical = COMPOUND_NORMALIZATIONS[lower];
    return {
      canonicalKey: canonical,
      displayName: capitalizeFirst(canonical),
      attributes: { compound: true },
    };
  }

  // Step 4: "and" → "&" normalization for short ingredient conjunctions
  // Only apply to patterns like "X and Y" where X and Y are short words
  const andPattern = /^(\w{2,12})\s+and\s+(\w{2,12})$/i;
  const andMatch = lower.match(andPattern);
  if (andMatch) {
    const normalized = `${andMatch[1]} & ${andMatch[2]}`;
    return {
      canonicalKey: normalized,
      displayName: capitalizeFirst(normalized),
      attributes: { compound: true },
    };
  }

  // Step 5: Bell pepper variant detection
  const bellPepperResult = detectBellPepper(lower);
  if (bellPepperResult) {
    return bellPepperResult;
  }

  // Step 6: Standard normalization
  // - Singularize common plurals
  // - Normalize spacing
  const singularized = singularize(lower);

  return {
    canonicalKey: singularized,
    displayName: capitalizeFirst(singularized),
    attributes: {},
  };
}

/**
 * Detect if an ingredient is a bell pepper variant
 * @param {string} lower - Lowercased ingredient name
 * @returns {Object|null} Normalization result or null if not a bell pepper
 */
function detectBellPepper(lower) {
  // Check for explicit bell pepper mentions
  const bellPepperMatch = lower.match(/^(red|green|yellow|orange)?\s*bell\s+peppers?$/i);
  if (bellPepperMatch) {
    const color = bellPepperMatch[1]?.toLowerCase() || null;
    return {
      canonicalKey: 'bell pepper',
      displayName: 'Bell peppers',
      attributes: {
        isBellPepper: true,
        color: color,
      },
    };
  }

  // Check for "red/green/yellow pepper" (without "bell") - only if clearly a bell pepper context
  // IMPORTANT: Plain "pepper" should NOT match - it could be black pepper
  const colorPepperMatch = lower.match(/^(red|green|yellow|orange)\s+peppers?$/i);
  if (colorPepperMatch) {
    const color = colorPepperMatch[1].toLowerCase();
    // These colored peppers are typically bell peppers
    return {
      canonicalKey: 'bell pepper',
      displayName: 'Bell peppers',
      attributes: {
        isBellPepper: true,
        color: color,
      },
    };
  }

  return null;
}

/**
 * Simple singularization for common ingredient plurals
 * @param {string} word - Word to singularize
 * @returns {string} Singularized word
 */
function singularize(word) {
  // Special cases
  const irregulars = {
    tomatoes: 'tomato',
    potatoes: 'potato',
    leaves: 'leaf',
    halves: 'half',
    loaves: 'loaf',
    knives: 'knife',
    shelves: 'shelf',
  };

  if (irregulars[word]) {
    return irregulars[word];
  }

  // Common patterns
  if (word.endsWith('ies') && word.length > 4) {
    return word.slice(0, -3) + 'y';
  }

  if (word.endsWith('es') && (word.endsWith('shes') || word.endsWith('ches') || word.endsWith('xes') || word.endsWith('sses'))) {
    return word.slice(0, -2);
  }

  if (word.endsWith('s') && !word.endsWith('ss') && word.length > 3) {
    return word.slice(0, -1);
  }

  return word;
}

/**
 * Capitalize first letter of a string
 * @param {string} str - String to capitalize
 * @returns {string} Capitalized string
 */
function capitalizeFirst(str) {
  if (!str) return '';
  return str.charAt(0).toUpperCase() + str.slice(1);
}

// ============================================
// Aggregation Engine
// ============================================

/**
 * Aggregate ingredient lines from multiple recipes into a shopping list
 *
 * @param {Array<Object>} lines - Array of ingredient line objects
 * @param {Object} [options] - Aggregation options
 * @param {boolean} [options.groupByRecipe=false] - Keep recipe separation in output
 * @returns {Array<AggregatedItem>} Aggregated shopping list items
 *
 * Input format (per line):
 * {
 *   recipeId: string,
 *   originalText: string,
 *   quantity?: number|null,
 *   unit?: string|null,
 *   name?: string|null,
 *   ingredientName?: string|null,  // Alternative field name
 * }
 *
 * Output format (AggregatedItem):
 * {
 *   displayName: string,
 *   canonicalKey: string,
 *   totalQuantity: number|null,
 *   unit: string|null,
 *   components?: Array<{ label, quantity, unit }>,
 *   sourceLines: Array<{ recipeId, originalText, parsed }>,
 *   notes?: string,
 * }
 */
function aggregateIngredients(lines, options = {}) {
  if (!Array.isArray(lines) || lines.length === 0) {
    return [];
  }

  // Map to group items by canonical key
  const groups = new Map();

  for (const line of lines) {
    // Extract name from various possible fields
    const rawName = line.name || line.ingredientName || line.ingredient_name || extractNameFromText(line.originalText || line.rawText || '');

    // Normalize the ingredient name
    const { canonicalKey, displayName, attributes } = normalizeIngredientName(rawName);

    if (!canonicalKey) {
      // Skip items that can't be normalized
      continue;
    }

    // Get or create group
    if (!groups.has(canonicalKey)) {
      groups.set(canonicalKey, {
        canonicalKey,
        displayName,
        attributes,
        items: [],
      });
    }

    const group = groups.get(canonicalKey);

    // Normalize unit - may come from line or need to be parsed
    let unit = normalizeUnit(line.unit) || line.unit || null;

    // Parse quantity if needed
    let quantity = line.quantity;
    if ((quantity === undefined || quantity === null) && line.originalText) {
      // Parse the full ingredient text to extract quantity and unit
      const parsed = parseIngredientString(line.originalText);
      quantity = parsed.quantity;
      if (!unit && parsed.unit) {
        unit = normalizeUnit(parsed.unit) || parsed.unit;
      }
    }

    // Add item to group
    group.items.push({
      recipeId: line.recipeId || line.recipe_id || 'unknown',
      originalText: line.originalText || line.rawText || rawName,
      quantity: quantity ?? null,
      unit,
      attributes: { ...attributes },
    });
  }

  // Process each group into an AggregatedItem
  const results = [];

  for (const [canonicalKey, group] of groups) {
    const aggregated = processGroup(group);
    results.push(aggregated);
  }

  // Sort alphabetically by displayName
  results.sort((a, b) => a.displayName.localeCompare(b.displayName));

  return results;
}

/**
 * Process a group of items into an AggregatedItem
 * @param {Object} group - Group object with items
 * @returns {AggregatedItem} Aggregated item
 */
function processGroup(group) {
  const { canonicalKey, displayName, attributes, items } = group;

  // Build source lines
  const sourceLines = items.map((item) => ({
    recipeId: item.recipeId,
    originalText: item.originalText,
    parsed: {
      quantity: item.quantity,
      unit: item.unit,
      name: displayName,
    },
  }));

  // Handle bell pepper special case with color breakdown
  if (attributes.isBellPepper) {
    return processBellPepperGroup(canonicalKey, displayName, items, sourceLines);
  }

  // Standard aggregation: try to sum quantities if units are compatible
  const { totalQuantity, unit, canSum } = sumQuantities(items);

  const result = {
    displayName,
    canonicalKey,
    totalQuantity,
    unit,
    sourceLines,
  };

  // Add notes if we couldn't sum everything
  if (!canSum && items.length > 1) {
    result.notes = buildNotesFromItems(items);
  }

  return result;
}

/**
 * Process bell pepper group with color breakdown
 */
function processBellPepperGroup(canonicalKey, displayName, items, sourceLines) {
  // Group by color
  const colorGroups = new Map();
  let totalQuantity = 0;
  let hasValidQuantity = false;

  for (const item of items) {
    const color = item.attributes?.color || 'unspecified';

    if (!colorGroups.has(color)) {
      colorGroups.set(color, { quantity: 0, count: 0 });
    }

    const colorGroup = colorGroups.get(color);
    colorGroup.count++;

    if (item.quantity !== null) {
      colorGroup.quantity += item.quantity;
      totalQuantity += item.quantity;
      hasValidQuantity = true;
    }
  }

  // Build components array
  const components = [];
  for (const [color, data] of colorGroups) {
    if (color !== 'unspecified' || colorGroups.size === 1) {
      components.push({
        label: color,
        quantity: data.quantity || data.count,
        unit: null,
      });
    }
  }

  // Build notes string
  let notes = null;
  if (components.length > 1 || (components.length === 1 && components[0].label !== 'unspecified')) {
    const breakdown = components
      .filter((c) => c.label !== 'unspecified')
      .map((c) => `${c.quantity} ${c.label}`)
      .join(', ');
    if (breakdown) {
      notes = `Breakdown: ${breakdown}`;
    }
  }

  return {
    displayName,
    canonicalKey,
    totalQuantity: hasValidQuantity ? totalQuantity : null,
    unit: null, // Bell peppers are typically counted
    components: components.length > 0 ? components : undefined,
    sourceLines,
    notes,
  };
}

/**
 * Sum quantities from items if units are compatible
 * @param {Array} items - Items to sum
 * @returns {{ totalQuantity: number|null, unit: string|null, canSum: boolean }}
 */
function sumQuantities(items) {
  if (items.length === 0) {
    return { totalQuantity: null, unit: null, canSum: true };
  }

  // Check if all items have compatible units
  const firstUnit = items[0].unit;
  let allCompatible = true;
  let totalQuantity = 0;
  let hasAnyQuantity = false;

  for (const item of items) {
    if (!areUnitsCompatible(firstUnit, item.unit)) {
      allCompatible = false;
      break;
    }

    if (item.quantity !== null) {
      // Convert to common unit if needed
      const converted = convertToCommonUnit(item.quantity, item.unit, firstUnit);
      totalQuantity += converted;
      hasAnyQuantity = true;
    }
  }

  if (!allCompatible) {
    return {
      totalQuantity: null,
      unit: null,
      canSum: false,
    };
  }

  return {
    totalQuantity: hasAnyQuantity ? totalQuantity : null,
    unit: firstUnit,
    canSum: true,
  };
}

/**
 * Convert quantity from one unit to another (within same group)
 */
function convertToCommonUnit(quantity, fromUnit, toUnit) {
  if (quantity === null) return 0;

  const normFrom = normalizeUnit(fromUnit) || fromUnit?.toLowerCase();
  const normTo = normalizeUnit(toUnit) || toUnit?.toLowerCase();

  if (normFrom === normTo) return quantity;

  const convFrom = UNIT_CONVERSION[normFrom];
  const convTo = UNIT_CONVERSION[normTo];

  if (!convFrom || !convTo || convFrom.group !== convTo.group) {
    // Can't convert - return as-is
    return quantity;
  }

  // Convert: quantity * fromBase / toBase
  return (quantity * convFrom.toBase) / convTo.toBase;
}

/**
 * Build notes string from items with incompatible units
 */
function buildNotesFromItems(items) {
  const parts = items.map((item) => {
    if (item.quantity !== null && item.unit) {
      return `${item.quantity} ${item.unit}`;
    } else if (item.quantity !== null) {
      return String(item.quantity);
    } else {
      return item.originalText;
    }
  });

  return `Mixed: ${parts.join(' + ')}`;
}

/**
 * Extract ingredient name from raw text (basic fallback)
 */
function extractNameFromText(text) {
  if (!text) return '';

  // Remove quantity patterns
  let name = text.replace(/^[\d\s½⅓⅔¼¾⅕⅖⅗⅘⅙⅚⅛⅜⅝⅞/.-]+/, '').trim();

  // Remove common unit words
  const units = Object.keys(UNIT_MAP);
  const unitPattern = new RegExp(`^(${units.join('|')})\\s+`, 'i');
  name = name.replace(unitPattern, '').trim();

  // Remove leading "of"
  name = name.replace(/^of\s+/i, '').trim();

  return name || text;
}

module.exports = {
  normalizeIngredientName,
  areUnitsCompatible,
  aggregateIngredients,
  // Expose for testing
  singularize,
  detectBellPepper,
  COMPOUND_NORMALIZATIONS,
  UNIT_CONVERSION,
};
