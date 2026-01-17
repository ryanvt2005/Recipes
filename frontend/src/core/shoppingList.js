/**
 * Shopping List Utilities
 *
 * Pure functions for shopping list operations like merging, consolidating, and scaling.
 * Framework-agnostic - no React or DOM dependencies.
 */

import { parseQuantity, normalizeUnit, normalizeIngredientName, createIngredientKey } from './ingredients.js';
import { categorizeIngredient } from './categories.js';

/**
 * Parse an ingredient from raw text and optional name
 * @param {string} rawText
 * @param {string} [ingredientName]
 * @returns {{quantity: number|null, unit: string|null, name: string}}
 */
function parseIngredientForConsolidation(rawText, ingredientName) {
  if (ingredientName) {
    // Try to extract quantity and unit from rawText
    const pattern = /^(\d+\/\d+|\d+\s+\d+\/\d+|\d+\.?\d*|\d+-\d+)?\s*([a-zA-Z]+)?\s+/;
    const match = rawText.match(pattern);

    if (match) {
      return {
        quantity: parseQuantity(match[1]),
        unit: normalizeUnit(match[2]),
        name: normalizeIngredientName(ingredientName),
      };
    }

    return {
      quantity: null,
      unit: null,
      name: normalizeIngredientName(ingredientName),
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
 * Consolidate ingredients from multiple sources
 * Combines ingredients with the same name and unit, keeping recipe provenance
 *
 * @param {Array<{raw_text?: string, ingredient_name?: string, quantity?: number|null, unit?: string|null, recipe_id?: string|number, category?: string}>} ingredients - Array of ingredients to consolidate
 * @param {boolean} [keepRecipeSeparate=true] - If true, items from different recipes won't be merged
 * @returns {Array<{ingredient_name: string, quantity: number|null, unit: string|null, category: string, recipe_id?: string|number, recipe_ids?: (string|number)[]}>}
 */
export function consolidateIngredients(ingredients, keepRecipeSeparate = true) {
  const consolidated = {};

  for (const ing of ingredients) {
    const rawText = ing.raw_text || '';
    const parsed = ing.ingredient_name
      ? {
          quantity: ing.quantity ?? parseQuantity(rawText),
          unit: ing.unit ? normalizeUnit(ing.unit) : null,
          name: normalizeIngredientName(ing.ingredient_name),
        }
      : parseIngredientForConsolidation(rawText, ing.ingredient_name);

    // Create key - optionally include recipe_id to keep items separate
    const key = keepRecipeSeparate
      ? createIngredientKey(parsed.name, parsed.unit, ing.recipe_id)
      : createIngredientKey(parsed.name, parsed.unit);

    if (consolidated[key]) {
      // Add quantities if both exist
      if (parsed.quantity !== null && consolidated[key].quantity !== null) {
        consolidated[key].quantity += parsed.quantity;
      } else if (parsed.quantity !== null) {
        consolidated[key].quantity = parsed.quantity;
      }
      // Track all recipe IDs
      if (ing.recipe_id && consolidated[key].recipe_ids) {
        if (!consolidated[key].recipe_ids.includes(ing.recipe_id)) {
          consolidated[key].recipe_ids.push(ing.recipe_id);
        }
      }
    } else {
      consolidated[key] = {
        ingredient_name: parsed.name,
        quantity: parsed.quantity,
        unit: parsed.unit,
        category: ing.category || categorizeIngredient(parsed.name),
        recipe_id: ing.recipe_id,
        recipe_ids: ing.recipe_id ? [ing.recipe_id] : [],
      };
    }
  }

  return Object.values(consolidated);
}

/**
 * Merge new ingredients into existing shopping list items
 * Updates quantities for matching items, adds new items
 *
 * @param {Array<{id?: string|number, ingredient_name: string, quantity?: number|null, unit?: string|null, category?: string}>} existingItems - Current items in the shopping list
 * @param {Array<{ingredient_name: string, quantity: number|null, unit: string|null, category: string, recipe_id?: string|number}>} newIngredients - New ingredients to add
 * @returns {Array<{id?: string|number, ingredient_name: string, quantity: number|null, unit: string|null, category: string, recipe_id?: string|number, existing: boolean}>}
 */
export function mergeIntoShoppingList(existingItems, newIngredients) {
  const merged = {};

  // Add existing items
  for (const item of existingItems) {
    const key = createIngredientKey(
      normalizeIngredientName(item.ingredient_name),
      item.unit ? normalizeUnit(item.unit) : null
    );

    merged[key] = {
      id: item.id,
      ingredient_name: item.ingredient_name,
      quantity: item.quantity ?? null,
      unit: item.unit ?? null,
      category: item.category || categorizeIngredient(item.ingredient_name),
      existing: true,
    };
  }

  // Add or merge new ingredients
  for (const ing of newIngredients) {
    const key = createIngredientKey(
      normalizeIngredientName(ing.ingredient_name),
      ing.unit ? normalizeUnit(ing.unit) : null
    );

    if (merged[key]) {
      // Update existing item quantity
      if (ing.quantity !== null && merged[key].quantity !== null) {
        merged[key].quantity += ing.quantity;
      } else if (ing.quantity !== null) {
        merged[key].quantity = ing.quantity;
      }
    } else {
      // Add new item
      merged[key] = {
        ingredient_name: ing.ingredient_name,
        quantity: ing.quantity,
        unit: ing.unit,
        category: ing.category || categorizeIngredient(ing.ingredient_name),
        recipe_id: ing.recipe_id,
        existing: false,
      };
    }
  }

  return Object.values(merged);
}

/**
 * Scale ingredient quantities by a factor
 *
 * @template T
 * @param {T[]} ingredients - Array of ingredients to scale
 * @param {number} scaleFactor - Multiplier for quantities (e.g., 2 for double, 0.5 for half)
 * @returns {T[]} New array with scaled quantities
 */
export function scaleIngredients(ingredients, scaleFactor) {
  return ingredients.map((ing) => ({
    ...ing,
    quantity: ing.quantity !== null && ing.quantity !== undefined
      ? ing.quantity * scaleFactor
      : ing.quantity,
  }));
}

/**
 * Calculate scale factor from original and target servings
 *
 * @param {number|string|null|undefined} originalServings - Original serving count (number or string like "4 servings")
 * @param {number} targetServings - Desired serving count
 * @returns {number} Scale factor, or 1 if calculation fails
 */
export function calculateScaleFactor(originalServings, targetServings) {
  if (!originalServings || targetServings <= 0) {
    return 1;
  }

  const parsed = typeof originalServings === 'number'
    ? originalServings
    : parseServings(originalServings);

  if (!parsed || parsed <= 0) {
    return 1;
  }

  return targetServings / parsed;
}

/**
 * Parse a servings string to extract the numeric value
 * Handles formats like "4 servings", "4-6", "4", "serves 4"
 *
 * @param {string|null|undefined} servingsStr - Servings string to parse
 * @returns {number|null} Numeric value or null if unparseable
 */
export function parseServings(servingsStr) {
  if (!servingsStr) {
    return null;
  }

  const str = String(servingsStr).trim().toLowerCase();

  // Handle ranges like "4-6" - take the lower bound
  const rangeMatch = str.match(/^(\d+)\s*-\s*\d+/);
  if (rangeMatch) {
    return parseInt(rangeMatch[1], 10);
  }

  // Handle "serves X" or "X servings"
  const servesMatch = str.match(/(?:serves?\s*)?(\d+)(?:\s*servings?)?/);
  if (servesMatch) {
    return parseInt(servesMatch[1], 10);
  }

  // Try parsing as plain number
  const num = parseInt(str, 10);
  return isNaN(num) ? null : num;
}

/**
 * Filter out ingredients by their IDs
 *
 * @template T
 * @param {T[]} ingredients - Array of ingredients with id property
 * @param {(string|number)[]} excludedIds - Array of IDs to exclude
 * @returns {T[]} Filtered array without excluded ingredients
 */
export function filterExcludedIngredients(ingredients, excludedIds) {
  if (!excludedIds || excludedIds.length === 0) {
    return ingredients;
  }

  const excludeSet = new Set(excludedIds.map(String));
  return ingredients.filter((ing) => !ing.id || !excludeSet.has(String(ing.id)));
}

/**
 * Remove items from a shopping list by recipe ID
 *
 * @template T
 * @param {T[]} items - Current shopping list items
 * @param {string|number} recipeIdToRemove - Recipe ID whose items should be removed
 * @returns {T[]} Filtered array without items from the specified recipe
 */
export function removeRecipeItems(items, recipeIdToRemove) {
  const targetId = String(recipeIdToRemove);
  return items.filter((item) => String(item.recipe_id) !== targetId);
}

/**
 * Sort shopping list items by category, then by name
 *
 * @template T
 * @param {T[]} items - Items to sort
 * @param {string[]} [categoryOrder] - Optional custom category order
 * @returns {T[]} Sorted array (new array, original unchanged)
 */
export function sortByCategory(items, categoryOrder) {
  const order = categoryOrder || [
    'Produce',
    'Dairy & Eggs',
    'Meat & Seafood',
    'Bakery',
    'Pantry',
    'Spices & Seasonings',
    'Canned & Jarred',
    'Condiments & Sauces',
    'Frozen',
    'Beverages',
    'Snacks',
    'Other',
  ];

  const orderMap = new Map(order.map((cat, i) => [cat, i]));
  const defaultOrder = order.length;

  return [...items].sort((a, b) => {
    const catA = orderMap.get(a.category || 'Other') ?? defaultOrder;
    const catB = orderMap.get(b.category || 'Other') ?? defaultOrder;

    if (catA !== catB) {
      return catA - catB;
    }

    return a.ingredient_name.localeCompare(b.ingredient_name);
  });
}
