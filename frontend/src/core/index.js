/**
 * Core Module
 *
 * Framework-agnostic utilities for ingredient parsing, categorization,
 * and shopping list operations. Can be used in React, React Native,
 * or any other JavaScript environment.
 */

// Ingredient utilities
export {
  normalizeUnit,
  parseQuantity,
  normalizeIngredientName,
  decimalToFraction,
  formatQuantityWithUnit,
  parseIngredient,
  createIngredientKey,
  formatIngredientDisplay,
  formatScaledIngredient,
} from './ingredients.js';

// Category utilities
export {
  CATEGORIES,
  getCategoryList,
  categorizeIngredient,
  groupByCategory,
} from './categories.js';

// Shopping list utilities
export {
  consolidateIngredients,
  mergeIntoShoppingList,
  scaleIngredients,
  calculateScaleFactor,
  parseServings,
  filterExcludedIngredients,
  removeRecipeItems,
  sortByCategory,
} from './shoppingList.js';
