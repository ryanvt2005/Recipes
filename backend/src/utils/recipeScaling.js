/**
 * Recipe Scaling Utilities
 * Handles parsing servings and scaling recipe quantities
 */

/**
 * Parse servings string to extract numeric value
 * Handles formats: "4", "4 servings", "4-6", "serves 4", "4 to 6 servings"
 * @param {string} servingsStr - The servings string from recipe
 * @returns {number|null} - The numeric serving size, or null if can't parse
 */
function parseServings(servingsStr) {
  if (!servingsStr) {
    return null;
  }

  // Convert to string and trim
  const str = String(servingsStr).trim().toLowerCase();

  // Match patterns like: "4", "4 servings", "serves 4", "4-6", "4 to 6", "makes 12", etc.
  const patterns = [
    /^(\d+)$/, // "4"
    /^(\d+)\s*servings?$/, // "4 servings" or "4 serving(s)"
    /^serves?\s*(\d+)/, // "serves 4"
    /^makes?\s*(\d+)/, // "makes 12" or "makes 15-18 truffles"
    /^(\d+)\s*[-to]\s*\d+/, // "4-6" or "4 to 6" - take first number
    /^(\d+)\s*[-to]\s*\d+\s*servings?/, // "4-6 servings"
    /(\d+)\s*serving/, // fallback: any number before "serving"
  ];

  for (const pattern of patterns) {
    const match = str.match(pattern);
    if (match && match[1]) {
      const num = parseInt(match[1], 10);
      if (!isNaN(num) && num > 0) {
        return num;
      }
    }
  }

  return null;
}

/**
 * Scale a recipe to a target serving size
 * @param {Object} recipe - The recipe object with ingredients
 * @param {number} targetServings - The desired number of servings
 * @returns {Object} - Scaled recipe with modified quantities
 */
function scaleRecipe(recipe, targetServings) {
  if (!recipe || !targetServings || targetServings <= 0) {
    return recipe;
  }

  const originalServings = parseServings(recipe.servings);

  // Can't scale if we don't know the original servings
  if (!originalServings) {
    return {
      ...recipe,
      scalingError: `Cannot scale recipe: original servings not specified or invalid. Current value: "${recipe.servings || '(empty)'}"`,
      canScale: false,
    };
  }

  const scaleFactor = targetServings / originalServings;

  // Scale ingredients
  const scaledIngredients = recipe.ingredients.map((ingredient) => ({
    ...ingredient,
    quantity: ingredient.quantity ? ingredient.quantity * scaleFactor : null,
    originalQuantity: ingredient.quantity,
    scaled: ingredient.quantity ? true : false,
  }));

  return {
    ...recipe,
    servings: String(targetServings),
    originalServings: String(originalServings),
    scaleFactor: scaleFactor,
    ingredients: scaledIngredients,
    canScale: true,
    isScaled: scaleFactor !== 1,
  };
}

/**
 * Convert decimal to fraction string for better display
 * @param {number} decimal - The decimal number
 * @returns {string} - Fraction representation or decimal
 */
function decimalToFraction(decimal) {
  if (!decimal || decimal === 0) {
    return '0';
  }

  const tolerance = 1.0e-6;
  const whole = Math.floor(decimal);
  const fraction = decimal - whole;

  // Common fractions mapping
  const commonFractions = [
    { decimal: 0.125, fraction: '⅛' },
    { decimal: 0.25, fraction: '¼' },
    { decimal: 0.333, fraction: '⅓' },
    { decimal: 0.375, fraction: '⅜' },
    { decimal: 0.5, fraction: '½' },
    { decimal: 0.625, fraction: '⅝' },
    { decimal: 0.666, fraction: '⅔' },
    { decimal: 0.75, fraction: '¾' },
    { decimal: 0.875, fraction: '⅞' },
  ];

  // Check if it's close to a common fraction
  for (const { decimal: d, fraction: f } of commonFractions) {
    if (Math.abs(fraction - d) < tolerance) {
      return whole > 0 ? `${whole} ${f}` : f;
    }
  }

  // If not a common fraction, round to 2 decimal places
  if (fraction < tolerance) {
    return String(whole);
  }

  return decimal.toFixed(2);
}

/**
 * Format a scaled quantity for display
 * @param {number} quantity - The scaled quantity
 * @param {number} originalQuantity - The original quantity
 * @returns {Object} - Formatted display strings
 */
function formatScaledQuantity(quantity, originalQuantity) {
  if (!quantity) {
    return { display: '', showOriginal: false };
  }

  const scaledDisplay = decimalToFraction(quantity);
  const originalDisplay = originalQuantity ? decimalToFraction(originalQuantity) : null;

  return {
    display: scaledDisplay,
    original: originalDisplay,
    showOriginal: originalQuantity && Math.abs(quantity - originalQuantity) > 0.01,
  };
}

module.exports = {
  parseServings,
  scaleRecipe,
  decimalToFraction,
  formatScaledQuantity,
};
