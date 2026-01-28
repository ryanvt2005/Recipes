/**
 * Recipe Scaling Utilities
 * Handles parsing servings and scaling recipe quantities
 */

/**
 * Rounding rules for specific ingredient types
 * Each rule specifies how to round quantities for practical cooking
 */
const ROUNDING_RULES = {
  // Items that must be whole numbers
  whole: {
    roundTo: 1,
    minQuantity: 1,
    ingredients: [
      'egg',
      'eggs',
      'egg yolk',
      'egg yolks',
      'egg white',
      'egg whites',
      'bay leaf',
      'bay leaves',
      'chicken breast',
      'chicken breasts',
      'chicken thigh',
      'chicken thighs',
      'steak',
      'steaks',
      'pork chop',
      'pork chops',
      'slice',
      'slices',
    ],
  },
  // Items that round to halves
  halves: {
    roundTo: 0.5,
    ingredients: [
      'onion',
      'onions',
      'lemon',
      'lemons',
      'lime',
      'limes',
      'orange',
      'oranges',
      'avocado',
      'avocados',
      'apple',
      'apples',
      'banana',
      'bananas',
      'pepper',
      'peppers',
      'bell pepper',
      'bell peppers',
    ],
  },
  // Items that round to quarters (common for teaspoons/tablespoons)
  quarters: {
    roundTo: 0.25,
    ingredients: ['salt', 'pepper', 'sugar', 'baking powder', 'baking soda', 'cinnamon', 'vanilla'],
  },
  // Items that round to eighths (standard fraction measurements)
  eighths: {
    roundTo: 0.125,
    ingredients: ['butter', 'flour', 'milk', 'cream', 'oil', 'water', 'broth', 'stock'],
  },
};

/**
 * Get the rounding precision for an ingredient
 * @param {string} ingredientName - The name of the ingredient
 * @param {string} unit - The unit of measurement (optional)
 * @returns {Object} - Rounding configuration { roundTo, minQuantity }
 */
function getRoundingRule(ingredientName, unit) {
  if (!ingredientName) {
    return { roundTo: 0.125, minQuantity: 0.125 }; // Default to eighths
  }

  const normalizedName = ingredientName.toLowerCase().trim();

  // Check each rule category
  for (const [, rule] of Object.entries(ROUNDING_RULES)) {
    for (const ingredient of rule.ingredients) {
      if (normalizedName.includes(ingredient) || normalizedName === ingredient) {
        return {
          roundTo: rule.roundTo,
          minQuantity: rule.minQuantity || rule.roundTo,
        };
      }
    }
  }

  // Default rounding based on unit type
  if (unit) {
    const normalizedUnit = unit.toLowerCase().trim();
    // Whole units (count-based)
    if (['piece', 'pieces', 'whole', 'head', 'heads', 'bunch', 'bunches', 'clove', 'cloves'].includes(normalizedUnit)) {
      return { roundTo: 1, minQuantity: 1 };
    }
    // Small measurements (teaspoons, etc.)
    if (['tsp', 'teaspoon', 'teaspoons', 'pinch', 'dash'].includes(normalizedUnit)) {
      return { roundTo: 0.25, minQuantity: 0.125 };
    }
    // Tablespoons
    if (['tbsp', 'tablespoon', 'tablespoons'].includes(normalizedUnit)) {
      return { roundTo: 0.5, minQuantity: 0.5 };
    }
  }

  // Default to eighths for most ingredients
  return { roundTo: 0.125, minQuantity: 0.125 };
}

/**
 * Unit conversion definitions for volume measurements
 * Conversions are defined in terms of teaspoons (base unit)
 */
const VOLUME_UNITS = {
  // Teaspoon variations (base unit = 1)
  tsp: { teaspoons: 1, display: 'tsp', plural: 'tsp' },
  teaspoon: { teaspoons: 1, display: 'teaspoon', plural: 'teaspoons' },
  teaspoons: { teaspoons: 1, display: 'teaspoon', plural: 'teaspoons' },
  // Tablespoon variations (3 tsp = 1 tbsp)
  tbsp: { teaspoons: 3, display: 'tbsp', plural: 'tbsp' },
  tablespoon: { teaspoons: 3, display: 'tablespoon', plural: 'tablespoons' },
  tablespoons: { teaspoons: 3, display: 'tablespoon', plural: 'tablespoons' },
  // Fluid ounce (6 tsp = 1 fl oz)
  'fl oz': { teaspoons: 6, display: 'fl oz', plural: 'fl oz' },
  'fluid ounce': { teaspoons: 6, display: 'fluid ounce', plural: 'fluid ounces' },
  'fluid ounces': { teaspoons: 6, display: 'fluid ounce', plural: 'fluid ounces' },
  // Cup variations (48 tsp = 1 cup)
  cup: { teaspoons: 48, display: 'cup', plural: 'cups' },
  cups: { teaspoons: 48, display: 'cup', plural: 'cups' },
  c: { teaspoons: 48, display: 'cup', plural: 'cups' },
  // Pint (96 tsp = 1 pint)
  pint: { teaspoons: 96, display: 'pint', plural: 'pints' },
  pints: { teaspoons: 96, display: 'pint', plural: 'pints' },
  pt: { teaspoons: 96, display: 'pint', plural: 'pints' },
  // Quart (192 tsp = 1 quart)
  quart: { teaspoons: 192, display: 'quart', plural: 'quarts' },
  quarts: { teaspoons: 192, display: 'quart', plural: 'quarts' },
  qt: { teaspoons: 192, display: 'quart', plural: 'quarts' },
};

/**
 * Preferred units for display, in order of preference (largest to smallest)
 * Each entry has the unit key and the threshold (min quantity to use this unit)
 */
const PREFERRED_VOLUME_UNITS = [
  { unit: 'cup', minQuantity: 0.25, maxQuantity: 8 },
  { unit: 'tbsp', minQuantity: 0.5, maxQuantity: 16 },
  { unit: 'tsp', minQuantity: 0.125, maxQuantity: 12 },
];

/**
 * Check if a unit is a volume unit that can be converted
 * @param {string} unit - The unit to check
 * @returns {boolean} - Whether the unit is a convertible volume unit
 */
function isVolumeUnit(unit) {
  if (!unit) {
    return false;
  }
  return Object.prototype.hasOwnProperty.call(VOLUME_UNITS, unit.toLowerCase().trim());
}

/**
 * Convert a quantity from one volume unit to another
 * @param {number} quantity - The quantity to convert
 * @param {string} fromUnit - The source unit
 * @param {string} toUnit - The target unit
 * @returns {number} - The converted quantity
 */
function convertVolume(quantity, fromUnit, toUnit) {
  if (!quantity || !fromUnit || !toUnit) {return quantity;}

  const from = VOLUME_UNITS[fromUnit.toLowerCase().trim()];
  const to = VOLUME_UNITS[toUnit.toLowerCase().trim()];

  if (!from || !to) {return quantity;}

  // Convert to teaspoons, then to target unit
  const inTeaspoons = quantity * from.teaspoons;
  return inTeaspoons / to.teaspoons;
}

/**
 * Find the best unit for displaying a volume quantity
 * Converts awkward measurements (e.g., 24 tsp) to more practical ones (e.g., 8 tbsp or ½ cup)
 * @param {number} quantity - The quantity
 * @param {string} unit - The current unit
 * @returns {Object} - { quantity, unit, converted } with the best representation
 */
function optimizeVolumeUnit(quantity, unit) {
  if (!quantity || !unit || !isVolumeUnit(unit)) {
    return { quantity, unit, converted: false };
  }

  const normalizedUnit = unit.toLowerCase().trim();
  const currentUnitInfo = VOLUME_UNITS[normalizedUnit];
  if (!currentUnitInfo) {
    return { quantity, unit, converted: false };
  }

  // Convert to teaspoons as base
  const inTeaspoons = quantity * currentUnitInfo.teaspoons;

  // Try each preferred unit to find the best fit
  for (const pref of PREFERRED_VOLUME_UNITS) {
    const prefUnitInfo = VOLUME_UNITS[pref.unit];
    const convertedQuantity = inTeaspoons / prefUnitInfo.teaspoons;

    // Check if this unit produces a nice quantity within acceptable range
    if (convertedQuantity >= pref.minQuantity && convertedQuantity <= pref.maxQuantity) {
      // Check if it's a "clean" fraction (eighths or better)
      const remainder = convertedQuantity % 0.125;
      const isClean = remainder < 0.01 || remainder > 0.115;

      if (isClean) {
        // Determine if singular or plural
        const displayUnit = convertedQuantity === 1 ? prefUnitInfo.display : prefUnitInfo.plural;

        return {
          quantity: Math.round(convertedQuantity * 1000) / 1000,
          unit: displayUnit,
          converted: normalizedUnit !== pref.unit,
          originalUnit: unit,
          originalQuantity: quantity,
        };
      }
    }
  }

  // No better unit found, return original
  return { quantity, unit, converted: false };
}

/**
 * Round a quantity to a practical cooking measurement
 * @param {number} quantity - The raw scaled quantity
 * @param {string} ingredientName - The name of the ingredient
 * @param {string} unit - The unit of measurement
 * @returns {number} - The rounded quantity
 */
function roundToPractical(quantity, ingredientName, unit) {
  if (!quantity || quantity <= 0) {
    return quantity;
  }

  const { roundTo, minQuantity } = getRoundingRule(ingredientName, unit);

  // Round to the nearest practical increment
  let rounded = Math.round(quantity / roundTo) * roundTo;

  // Ensure minimum quantity
  if (rounded < minQuantity && quantity > 0) {
    rounded = minQuantity;
  }

  // Clean up floating point errors
  return Math.round(rounded * 1000) / 1000;
}

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

  // Scale ingredients with smart rounding and unit optimization
  const scaledIngredients = recipe.ingredients.map((ingredient) => {
    if (!ingredient.quantity) {
      return {
        ...ingredient,
        originalQuantity: null,
        originalUnit: ingredient.unit,
        scaled: false,
      };
    }

    const rawScaled = ingredient.quantity * scaleFactor;
    const ingredientName = ingredient.ingredientName || ingredient.ingredient || '';
    const unit = ingredient.unit || '';

    // First, round to practical quantity
    const roundedQuantity = roundToPractical(rawScaled, ingredientName, unit);

    // Then, optimize the unit if it's a volume measurement
    const optimized = optimizeVolumeUnit(roundedQuantity, unit);

    // Apply rounding again after unit conversion
    const finalQuantity = optimized.converted
      ? roundToPractical(optimized.quantity, ingredientName, optimized.unit)
      : optimized.quantity;

    return {
      ...ingredient,
      quantity: finalQuantity,
      unit: optimized.unit,
      rawScaledQuantity: rawScaled, // Keep raw value for reference
      originalQuantity: ingredient.quantity,
      originalUnit: ingredient.unit,
      scaled: true,
      wasRounded: Math.abs(finalQuantity - rawScaled) > 0.001,
      unitConverted: optimized.converted,
    };
  });

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
  getRoundingRule,
  roundToPractical,
  ROUNDING_RULES,
  VOLUME_UNITS,
  isVolumeUnit,
  convertVolume,
  optimizeVolumeUnit,
};
