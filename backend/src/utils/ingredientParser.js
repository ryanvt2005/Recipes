/**
 * Ingredient Parsing & Normalization Utility
 *
 * Parses ingredient strings into structured data:
 * - quantity (number)
 * - unit (normalized string)
 * - ingredient (name)
 * - preparation (optional method like "chopped", "diced")
 * - originalText (raw input for fallback)
 *
 * Handles:
 * - Unicode fractions (½, ¼, ⅓, etc.)
 * - Mixed numbers (1 1/2, 2 ½)
 * - Ranges (2-3, 2 to 3)
 * - Unit synonyms (tablespoon → tbsp, pounds → lb)
 * - Unitless ingredients (2 eggs, salt to taste)
 */

/**
 * Unicode fraction to decimal mapping
 */
const UNICODE_FRACTIONS = {
  '½': 0.5,
  '⅓': 0.333,
  '⅔': 0.666,
  '¼': 0.25,
  '¾': 0.75,
  '⅕': 0.2,
  '⅖': 0.4,
  '⅗': 0.6,
  '⅘': 0.8,
  '⅙': 0.166,
  '⅚': 0.833,
  '⅛': 0.125,
  '⅜': 0.375,
  '⅝': 0.625,
  '⅞': 0.875,
};

/**
 * Unit normalization map - maps various spellings to standard abbreviations
 */
const UNIT_MAP = {
  // Volume - teaspoon
  teaspoon: 'tsp',
  teaspoons: 'tsp',
  tsp: 'tsp',
  tsps: 'tsp',
  t: 'tsp',

  // Volume - tablespoon
  tablespoon: 'tbsp',
  tablespoons: 'tbsp',
  tbsp: 'tbsp',
  tbsps: 'tbsp',
  tbs: 'tbsp',
  T: 'tbsp',
  Tbsp: 'tbsp',
  Tbs: 'tbsp',

  // Volume - cup
  cup: 'cup',
  cups: 'cup',
  c: 'cup',
  C: 'cup',

  // Volume - fluid ounce
  'fluid ounce': 'fl oz',
  'fluid ounces': 'fl oz',
  'fl oz': 'fl oz',
  floz: 'fl oz',

  // Volume - pint/quart/gallon
  pint: 'pint',
  pints: 'pint',
  pt: 'pint',
  quart: 'quart',
  quarts: 'quart',
  qt: 'quart',
  gallon: 'gallon',
  gallons: 'gallon',
  gal: 'gallon',

  // Volume - metric
  milliliter: 'ml',
  milliliters: 'ml',
  ml: 'ml',
  mL: 'ml',
  liter: 'l',
  liters: 'l',
  l: 'l',
  L: 'l',

  // Weight - imperial
  pound: 'lb',
  pounds: 'lb',
  lb: 'lb',
  lbs: 'lb',
  ounce: 'oz',
  ounces: 'oz',
  oz: 'oz',

  // Weight - metric
  gram: 'g',
  grams: 'g',
  g: 'g',
  kilogram: 'kg',
  kilograms: 'kg',
  kg: 'kg',

  // Count/container units
  piece: 'piece',
  pieces: 'piece',
  whole: 'whole',
  large: 'large',
  medium: 'medium',
  small: 'small',
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
  bag: 'bag',
  bags: 'bag',
  bunch: 'bunch',
  bunches: 'bunch',
  head: 'head',
  heads: 'head',
  clove: 'clove',
  cloves: 'clove',
  slice: 'slice',
  slices: 'slice',
  stalk: 'stalk',
  stalks: 'stalk',
  stick: 'stick',
  sticks: 'stick',
  sprig: 'sprig',
  sprigs: 'sprig',
  pinch: 'pinch',
  pinches: 'pinch',
  dash: 'dash',
  dashes: 'dash',
  handful: 'handful',
  handfuls: 'handful',
};

/**
 * Patterns indicating "to taste" or optional quantities
 * These ingredients should have null quantity but preserve the phrase
 */
const TO_TASTE_PATTERNS = [
  /\bto\s+taste\b/i,
  /\bas\s+needed\b/i,
  /\bto\s+your\s+(liking|preference)\b/i,
  /\boptional\b/i,
  /\bfor\s+garnish\b/i,
  /\bfor\s+serving\b/i,
];

/**
 * Common countable ingredients that should infer "piece" unit when unitless
 */
const COUNTABLE_INGREDIENTS = new Set([
  'egg',
  'eggs',
  'banana',
  'bananas',
  'apple',
  'apples',
  'orange',
  'oranges',
  'lemon',
  'lemons',
  'lime',
  'limes',
  'onion',
  'onions',
  'potato',
  'potatoes',
  'tomato',
  'tomatoes',
  'carrot',
  'carrots',
  'avocado',
  'avocados',
  'cucumber',
  'cucumbers',
  'zucchini',
  'bell pepper',
  'bell peppers',
  'jalapeño',
  'jalapeños',
  'jalapeno',
  'jalapenos',
  'shallot',
  'shallots',
]);

/**
 * Words that are NOT units but might look like them
 * These should be treated as part of the ingredient name
 */
const NON_UNIT_WORDS = new Set([
  'and',
  'or',
  'of',
  'to',
  'for',
  'with',
  'fresh',
  'dried',
  'ground',
  'chopped',
  'minced',
  'diced',
  'sliced',
  'grated',
  'shredded',
  'crushed',
  'melted',
  'softened',
  'room',
  'temperature',
  'cold',
  'warm',
  'hot',
  'cooked',
  'raw',
  'ripe',
  'unripe',
  'peeled',
  'seeded',
  'pitted',
  'boneless',
  'skinless',
  'lean',
  'extra',
  'virgin',
  'light',
  'dark',
  'sweet',
  'unsweetened',
  'salted',
  'unsalted',
  'plain',
  'all',
  'purpose',
  'self',
  'rising',
  'active',
  'dry',
  'instant',
  'quick',
  'rolled',
  'steel',
  'cut',
  'old',
  'fashioned',
  'taste',
]);

/**
 * Normalize a unit string to its standard abbreviation
 * @param {string} unit - Raw unit string
 * @returns {string|null} Normalized unit or null if not a known unit
 */
function normalizeUnit(unit) {
  if (!unit) {
    return null;
  }

  const lower = unit.toLowerCase().trim();

  // Check if it's a non-unit word
  if (NON_UNIT_WORDS.has(lower)) {
    return null;
  }

  return UNIT_MAP[lower] || UNIT_MAP[unit] || null;
}

/**
 * Parse a quantity string into a number
 * Handles fractions, mixed numbers, ranges, and Unicode fractions
 *
 * @param {string} quantityStr - Raw quantity string
 * @returns {number|null} Parsed numeric value or null
 */
function parseQuantity(quantityStr) {
  if (!quantityStr) {
    return null;
  }

  let str = String(quantityStr).trim();

  // Normalize spacing around Unicode fractions (handle "1 ½" and "1½" consistently)
  for (const frac of Object.keys(UNICODE_FRACTIONS)) {
    // Normalize "1 ½" to "1½" for consistent parsing
    str = str.replace(new RegExp(`(\\d+)\\s+${frac}`, 'g'), `$1${frac}`);
  }

  // Replace Unicode fractions with decimals
  for (const [frac, decimal] of Object.entries(UNICODE_FRACTIONS)) {
    if (str.includes(frac)) {
      // Handle mixed numbers like "1½"
      const mixedMatch = str.match(new RegExp(`(\\d+)${frac}`));
      if (mixedMatch) {
        return parseInt(mixedMatch[1], 10) + decimal;
      }
      // Just the fraction
      if (str === frac) {
        return decimal;
      }
      str = str.replace(frac, String(decimal));
    }
  }

  // Handle text fractions like "1/2" or "1 1/2"
  const mixedFractionMatch = str.match(/^(\d+)\s+(\d+)\/(\d+)$/);
  if (mixedFractionMatch) {
    const whole = parseInt(mixedFractionMatch[1], 10);
    const numerator = parseInt(mixedFractionMatch[2], 10);
    const denominator = parseInt(mixedFractionMatch[3], 10);
    return whole + numerator / denominator;
  }

  // Handle simple fractions like "1/2"
  const fractionMatch = str.match(/^(\d+)\/(\d+)$/);
  if (fractionMatch) {
    return parseInt(fractionMatch[1], 10) / parseInt(fractionMatch[2], 10);
  }

  // Handle ranges like "2-3" or "2 to 3" or "2 or 3" - take the average
  const rangeMatch = str.match(/^(\d+\.?\d*)\s*(?:-|to|or)\s*(\d+\.?\d*)$/i);
  if (rangeMatch) {
    return (parseFloat(rangeMatch[1]) + parseFloat(rangeMatch[2])) / 2;
  }

  // Handle simple decimals or integers
  const numberMatch = str.match(/^(\d+\.?\d*)$/);
  if (numberMatch) {
    return parseFloat(numberMatch[1]);
  }

  return null;
}

/**
 * Parse an ingredient string into structured components
 *
 * @param {string} rawText - The complete ingredient line
 * @param {number} [sortOrder=0] - Optional sort order
 * @returns {Object} Parsed ingredient object
 */
function parseIngredientString(rawText, sortOrder = 0) {
  if (!rawText || typeof rawText !== 'string') {
    return {
      rawText: rawText || '',
      sortOrder,
      quantity: null,
      unit: null,
      ingredient: rawText || '',
      preparation: null,
      group: null,
    };
  }

  const original = rawText.trim();

  // Check for "to taste" patterns - these have null quantity
  let matchedToTastePhrase = null;
  const toTastePhrasePatterns = [
    { regex: /\bto\s+taste\b/i, phrase: 'to taste' },
    { regex: /\bas\s+needed\b/i, phrase: 'as needed' },
    { regex: /\bto\s+your\s+(liking|preference)\b/i, phrase: 'to taste' },
    { regex: /\boptional\b/i, phrase: 'optional' },
    { regex: /\bfor\s+garnish\b/i, phrase: 'for garnish' },
    { regex: /\bfor\s+serving\b/i, phrase: 'for serving' },
  ];

  for (const { regex, phrase } of toTastePhrasePatterns) {
    if (regex.test(original)) {
      matchedToTastePhrase = phrase;
      break;
    }
  }

  // If "to taste" pattern found, return early with the full text as ingredient
  if (matchedToTastePhrase) {
    // Try to extract the ingredient name (remove the "to taste" part for cleaner display)
    let ingredientName = original
      .replace(
        /,?\s*(to\s+taste|as\s+needed|to\s+your\s+(liking|preference)|optional|for\s+garnish|for\s+serving)/gi,
        ''
      )
      .trim();
    // Remove trailing comma if any
    ingredientName = ingredientName.replace(/,\s*$/, '').trim();

    return {
      rawText: original,
      sortOrder,
      quantity: null,
      unit: null,
      ingredient: ingredientName || original,
      preparation: null,
      notes: matchedToTastePhrase,
      group: null,
    };
  }

  // First, try to split by comma for preparation notes
  // e.g., "2 cups flour, sifted" → ingredient: "flour", preparation: "sifted"
  let mainPart = original;
  let preparation = null;

  const commaIndex = original.indexOf(',');
  if (commaIndex > 0) {
    mainPart = original.substring(0, commaIndex).trim();
    preparation = original.substring(commaIndex + 1).trim();
  }

  // Also check for parenthetical notes
  const parenMatch = mainPart.match(/^(.+?)\s*\(([^)]+)\)\s*$/);
  if (parenMatch) {
    mainPart = parenMatch[1].trim();
    preparation = preparation ? `${parenMatch[2]}, ${preparation}` : parenMatch[2];
  }

  // Build regex pattern for quantity detection
  // Matches: numbers, fractions, mixed numbers, Unicode fractions, ranges
  const quantityPattern =
    /^(\d+\s+\d+\/\d+|\d+\/\d+|\d+\.?\d*\s*[½⅓⅔¼¾⅕⅖⅗⅘⅙⅚⅛⅜⅝⅞]|[½⅓⅔¼¾⅕⅖⅗⅘⅙⅚⅛⅜⅝⅞]|\d+\.?\d*(?:\s*(?:-|to|or)\s*\d+\.?\d*)?)\s*/i;

  const quantityMatch = mainPart.match(quantityPattern);

  let quantity = null;
  let remainingText = mainPart;

  if (quantityMatch) {
    quantity = parseQuantity(quantityMatch[1]);
    remainingText = mainPart.substring(quantityMatch[0].length).trim();
  }

  // Now try to extract unit from the remaining text
  // Look for the first word that might be a unit
  let unit = null;
  let ingredientName = remainingText;

  // Split remaining text into words
  const words = remainingText.split(/\s+/);

  if (words.length > 0) {
    // Check if first word is a unit
    const normalizedUnit = normalizeUnit(words[0]);
    if (normalizedUnit) {
      unit = normalizedUnit;
      ingredientName = words.slice(1).join(' ').trim();
    }
    // Special case: "fluid ounce" is two words
    else if (
      words.length > 1 &&
      words[0].toLowerCase() === 'fluid' &&
      words[1].toLowerCase().startsWith('oz')
    ) {
      unit = 'fl oz';
      ingredientName = words.slice(2).join(' ').trim();
    }
  }

  // Clean up ingredient name
  // Remove leading "of" (e.g., "cup of flour" → "flour")
  if (ingredientName.toLowerCase().startsWith('of ')) {
    ingredientName = ingredientName.substring(3).trim();
  }

  // If we still don't have an ingredient name, use the whole original text
  if (!ingredientName) {
    ingredientName = original;
  }

  // Infer "piece" unit for countable ingredients that have quantity but no unit
  if (quantity !== null && !unit) {
    const lowerIngredient = ingredientName.toLowerCase();
    if (COUNTABLE_INGREDIENTS.has(lowerIngredient)) {
      unit = 'piece';
    }
  }

  return {
    rawText: original,
    sortOrder,
    quantity,
    unit,
    ingredient: ingredientName,
    preparation,
    group: null,
  };
}

/**
 * Format an ingredient for display: quantity unit ingredient
 *
 * @param {Object} ingredient - Parsed ingredient object
 * @returns {string} Formatted display string
 */
function formatIngredientDisplay(ingredient) {
  if (!ingredient) {
    return '';
  }

  const { quantity, unit, ingredient: name, rawText } = ingredient;

  // If no parsed data, return raw text
  if (quantity === null && !unit && (!name || name === rawText)) {
    return rawText || '';
  }

  const parts = [];

  // Format quantity with fractions
  if (quantity !== null) {
    parts.push(formatQuantityDisplay(quantity));
  }

  // Add unit if present
  if (unit) {
    parts.push(unit);
  }

  // Add ingredient name
  if (name && name !== rawText) {
    parts.push(name);
  } else if (!parts.length) {
    // Fallback to raw text if nothing else
    return rawText || '';
  }

  return parts.join(' ').trim();
}

/**
 * Format a numeric quantity for display, converting to fractions where appropriate
 *
 * @param {number} quantity - Numeric quantity
 * @returns {string} Formatted quantity string
 */
function formatQuantityDisplay(quantity) {
  if (quantity === null || quantity === undefined) {
    return '';
  }

  const whole = Math.floor(quantity);
  const remainder = quantity - whole;

  // Common fractions with their Unicode equivalents
  const fractionMap = [
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
  let closestFrac = null;
  let minDiff = Infinity;

  for (const [value, symbol] of fractionMap) {
    const diff = Math.abs(remainder - value);
    if (diff < minDiff && diff < 0.05) {
      minDiff = diff;
      closestFrac = symbol;
    }
  }

  if (whole === 0 && closestFrac) {
    return closestFrac;
  }

  if (whole > 0 && closestFrac) {
    return `${whole} ${closestFrac}`;
  }

  // No close fraction match - format as decimal
  if (remainder > 0.01) {
    return quantity.toFixed(2).replace(/\.?0+$/, '');
  }

  return String(whole);
}

/**
 * Decimal to display fraction (standalone function for use elsewhere)
 */
function decimalToFraction(decimal) {
  return formatQuantityDisplay(decimal);
}

/**
 * Safely coerce a value to a number
 * Handles strings from PostgreSQL, null/undefined, and invalid values
 *
 * @param {any} value - Value to coerce
 * @returns {number|null} Numeric value or null if invalid
 */
function toNumber(value) {
  if (value === null || value === undefined) {
    return null;
  }
  const num = typeof value === 'string' ? parseFloat(value) : Number(value);
  return isNaN(num) ? null : num;
}

module.exports = {
  parseIngredientString,
  parseQuantity,
  normalizeUnit,
  formatIngredientDisplay,
  formatQuantityDisplay,
  decimalToFraction,
  toNumber,
  UNIT_MAP,
  UNICODE_FRACTIONS,
  TO_TASTE_PATTERNS,
  COUNTABLE_INGREDIENTS,
};
