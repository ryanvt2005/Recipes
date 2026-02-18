/**
 * Ingredient Utilities
 *
 * Pure functions for ingredient parsing, normalization, and formatting.
 * Framework-agnostic - no React or DOM dependencies.
 */

/**
 * Standard unit mappings for normalization
 * @type {Record<string, string>}
 */
const UNIT_MAP = {
  // Volume
  cup: 'cup',
  cups: 'cup',
  c: 'cup',
  tablespoon: 'tbsp',
  tablespoons: 'tbsp',
  tbsp: 'tbsp',
  T: 'tbsp',
  teaspoon: 'tsp',
  teaspoons: 'tsp',
  tsp: 'tsp',
  t: 'tsp',
  'fluid ounce': 'fl oz',
  'fluid ounces': 'fl oz',
  'fl oz': 'fl oz',
  pint: 'pint',
  pints: 'pint',
  pt: 'pint',
  quart: 'quart',
  quarts: 'quart',
  qt: 'quart',
  gallon: 'gallon',
  gallons: 'gallon',
  gal: 'gallon',
  milliliter: 'ml',
  milliliters: 'ml',
  ml: 'ml',
  liter: 'l',
  liters: 'l',
  l: 'l',

  // Weight
  pound: 'lb',
  pounds: 'lb',
  lb: 'lb',
  lbs: 'lb',
  ounce: 'oz',
  ounces: 'oz',
  oz: 'oz',
  gram: 'g',
  grams: 'g',
  g: 'g',
  kilogram: 'kg',
  kilograms: 'kg',
  kg: 'kg',

  // Count
  piece: 'piece',
  pieces: 'piece',
  whole: 'whole',
  can: 'can',
  cans: 'can',
  package: 'package',
  packages: 'package',
  pkg: 'package',
  jar: 'jar',
  jars: 'jar',
  bottle: 'bottle',
  bottles: 'bottle',
  box: 'box',
  boxes: 'box',
  bunch: 'bunch',
  bunches: 'bunch',
  clove: 'clove',
  cloves: 'clove',
  slice: 'slice',
  slices: 'slice',
  stalk: 'stalk',
  stalks: 'stalk',
  stick: 'stick',
  sticks: 'stick',
};

/**
 * Normalize a unit string to its standard form
 * @param {string|null|undefined} unit - Raw unit string (e.g., "tablespoons", "CUPS", "lbs")
 * @returns {string|null} Normalized unit string or original if not found
 */
export function normalizeUnit(unit) {
  if (!unit) {
    return null;
  }

  const normalized = unit.toLowerCase().trim();
  return UNIT_MAP[normalized] || normalized;
}

/**
 * Parse a quantity string into a number
 * Handles fractions, mixed numbers, ranges, and decimals
 *
 * @param {string|null|undefined} quantityStr - Raw quantity string (e.g., "1/2", "1 1/2", "2-3", "2.5")
 * @returns {number|null} Parsed number or null if unparseable
 */
export function parseQuantity(quantityStr) {
  if (!quantityStr) {
    return null;
  }

  const str = String(quantityStr).trim();

  // Handle fractions like "1/2" or "1 1/2"
  const fractionMatch = str.match(/^(\d+)?\s*(\d+)\/(\d+)$/);
  if (fractionMatch) {
    const whole = parseInt(fractionMatch[1]) || 0;
    const numerator = parseInt(fractionMatch[2]);
    const denominator = parseInt(fractionMatch[3]);
    return whole + numerator / denominator;
  }

  // Handle ranges like "2-3" - take the average
  const rangeMatch = str.match(/^(\d+\.?\d*)\s*-\s*(\d+\.?\d*)$/);
  if (rangeMatch) {
    return (parseFloat(rangeMatch[1]) + parseFloat(rangeMatch[2])) / 2;
  }

  // Handle simple numbers
  const numberMatch = str.match(/^(\d+\.?\d*)/);
  if (numberMatch) {
    return parseFloat(numberMatch[1]);
  }

  return null;
}

/**
 * Normalize an ingredient name for consistent comparison
 * @param {string} name - Raw ingredient name
 * @returns {string} Normalized name (lowercase, trimmed)
 */
export function normalizeIngredientName(name) {
  return name.trim().toLowerCase();
}

/**
 * Convert a decimal to a display-friendly fraction string
 * @param {number} decimal - Number to convert (e.g., 0.5, 1.25)
 * @returns {string} Formatted string with Unicode fractions where appropriate
 */
export function decimalToFraction(decimal) {
  if (decimal === 0) return '0';

  const whole = Math.floor(decimal);
  const remainder = decimal - whole;

  // Common fractions with Unicode characters
  /** @type {Array<[number, string]>} */
  const fractions = [
    [0.125, '⅛'],
    [0.25, '¼'],
    [0.333, '⅓'],
    [0.375, '⅜'],
    [0.5, '½'],
    [0.625, '⅝'],
    [0.666, '⅔'],
    [0.75, '¾'],
    [0.875, '⅞'],
  ];

  // Find closest fraction
  let closestFraction = '';
  let minDiff = Infinity;

  for (const [value, symbol] of fractions) {
    const diff = Math.abs(remainder - value);
    if (diff < minDiff && diff < 0.05) {
      minDiff = diff;
      closestFraction = symbol;
    }
  }

  if (whole === 0 && closestFraction) {
    return closestFraction;
  }

  if (whole > 0 && closestFraction) {
    return `${whole} ${closestFraction}`;
  }

  // Round to reasonable precision
  const rounded = Math.round(decimal * 100) / 100;
  return rounded.toString();
}

/**
 * Format quantity and unit for display
 * @param {number|null|undefined} quantity - Numeric quantity
 * @param {string|null|undefined} unit - Unit string
 * @param {Object} [options] - Display options
 * @param {boolean} [options.showAsNeeded=false] - Show "as needed" for null quantities
 * @returns {string} Formatted display string (e.g., "1 ½ cups", "2 lbs")
 */
export function formatQuantityWithUnit(quantity, unit, options = {}) {
  const { showAsNeeded = false } = options;

  if (quantity === null || quantity === undefined) {
    if (showAsNeeded) {
      return unit ? `${unit} (as needed)` : 'as needed';
    }
    return unit || '';
  }

  const formattedQty = decimalToFraction(quantity);

  if (!unit) {
    return formattedQty;
  }

  return `${formattedQty} ${unit}`;
}

/**
 * Parse raw ingredient text into structured components
 * @param {string} rawText - Full ingredient text (e.g., "2 cups flour, sifted")
 * @param {string} [knownIngredientName] - Optional pre-parsed ingredient name
 * @returns {{quantity: number|null, unit: string|null, name: string}} Parsed ingredient object
 */
export function parseIngredient(rawText, knownIngredientName) {
  // If we have a known ingredient name, extract quantity and unit from rawText
  if (knownIngredientName) {
    const pattern = /^(\d+\/\d+|\d+\s+\d+\/\d+|\d+\.?\d*|\d+-\d+)?\s*([a-zA-Z]+)?\s+/;
    const match = rawText.match(pattern);

    if (match) {
      return {
        quantity: parseQuantity(match[1]),
        unit: normalizeUnit(match[2]),
        name: normalizeIngredientName(knownIngredientName),
      };
    }

    return {
      quantity: null,
      unit: null,
      name: normalizeIngredientName(knownIngredientName),
    };
  }

  // Parse from rawText only
  const pattern = /^(\d+\/\d+|\d+\s+\d+\/\d+|\d+\.?\d*|\d+-\d+)?\s*([a-zA-Z]+)?\s+(.+)$/;
  const match = rawText.match(pattern);

  if (match) {
    return {
      quantity: parseQuantity(match[1]),
      unit: normalizeUnit(match[2]),
      name: normalizeIngredientName(match[3]),
    };
  }

  // Fallback: just use the full text as ingredient name
  return {
    quantity: null,
    unit: null,
    name: normalizeIngredientName(rawText),
  };
}

/**
 * Create a unique key for an ingredient (for merging/deduplication)
 * @param {string} name - Normalized ingredient name
 * @param {string|null} unit - Normalized unit
 * @param {string|number} [recipeId] - Optional recipe ID for provenance tracking
 * @returns {string} Unique key string
 */
export function createIngredientKey(name, unit, recipeId) {
  const baseKey = `${name}|${unit || 'none'}`;
  return recipeId !== undefined ? `${baseKey}|${recipeId}` : baseKey;
}

/**
 * Format an ingredient object for display in the standard format:
 * "<quantity> <unit> <ingredient name>"
 *
 * Examples:
 * - "1 tbsp Paprika"
 * - "3 cups Milk"
 * - "½ tsp Salt"
 * - "2 Eggs"
 * - "Salt to taste" (fallback to rawText)
 *
 * @param {Object} ingredient - Ingredient object from API
 * @param {string} [ingredient.rawText] - Original raw text (fallback)
 * @param {number|null} [ingredient.quantity] - Numeric quantity
 * @param {string|null} [ingredient.unit] - Unit string
 * @param {string} [ingredient.ingredientName] - Ingredient name
 * @param {string} [ingredient.ingredient] - Alternative ingredient name field
 * @param {string|null} [ingredient.preparation] - Preparation method
 * @returns {string} Formatted ingredient string
 */
export function formatIngredientDisplay(ingredient) {
  if (!ingredient) return '';

  const quantity = ingredient.quantity;
  const unit = ingredient.unit;
  const name = ingredient.ingredientName || ingredient.ingredient || '';
  const rawText = ingredient.rawText || '';
  const preparation = ingredient.preparation;

  // If no structured data, fall back to raw text
  if (quantity === null && !unit && !name) {
    return rawText;
  }

  const parts = [];

  // Add formatted quantity
  if (quantity !== null && quantity !== undefined) {
    parts.push(decimalToFraction(quantity));
  }

  // Add unit (capitalize for display)
  if (unit) {
    parts.push(unit);
  }

  // Add ingredient name (capitalize first letter)
  if (name) {
    const capitalizedName = name.charAt(0).toUpperCase() + name.slice(1);
    parts.push(capitalizedName);
  }

  // If we have nothing useful, return raw text
  if (parts.length === 0) {
    return rawText;
  }

  let result = parts.join(' ');

  // Add preparation notes if present
  if (preparation) {
    result += `, ${preparation}`;
  }

  return result;
}

/**
 * Format an ingredient with scaling information
 * Shows the scaled quantity and optionally the original
 *
 * @param {Object} ingredient - Ingredient object
 * @param {boolean} [showOriginal=false] - Whether to show original quantity
 * @returns {{display: string, scaled: boolean, originalDisplay: string|null}} Formatted display info
 */
export function formatScaledIngredient(ingredient, showOriginal = false) {
  if (!ingredient) {
    return { display: '', scaled: false, originalDisplay: null };
  }

  const display = formatIngredientDisplay(ingredient);
  const isScaled =
    ingredient.originalQuantity !== undefined &&
    ingredient.originalQuantity !== null &&
    ingredient.quantity !== ingredient.originalQuantity;

  let originalDisplay = null;

  if (isScaled && showOriginal) {
    const originalParts = [];
    originalParts.push(decimalToFraction(ingredient.originalQuantity));
    // Use originalUnit if unit was converted, otherwise use current unit
    const unitToShow = ingredient.originalUnit || ingredient.unit;
    if (unitToShow) {
      originalParts.push(unitToShow);
    }
    originalDisplay = originalParts.join(' ');
  }

  // Check if unit was converted (e.g., tsp → tbsp)
  const unitConverted = ingredient.unitConverted === true;

  return {
    display,
    scaled: isScaled,
    originalDisplay,
    unitConverted,
  };
}
