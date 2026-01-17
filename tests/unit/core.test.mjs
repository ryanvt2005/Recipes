/**
 * Unit tests for frontend core module
 *
 * Uses Node.js built-in test runner with assertions
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

// Import the core module functions
import {
  normalizeUnit,
  parseQuantity,
  normalizeIngredientName,
  decimalToFraction,
  formatQuantityWithUnit,
  parseIngredient,
  createIngredientKey,
} from '../../frontend/src/core/ingredients.js';

import {
  CATEGORIES,
  getCategoryList,
  categorizeIngredient,
  groupByCategory,
} from '../../frontend/src/core/categories.js';

import {
  consolidateIngredients,
  mergeIntoShoppingList,
  scaleIngredients,
  calculateScaleFactor,
  parseServings,
  filterExcludedIngredients,
  removeRecipeItems,
  sortByCategory,
} from '../../frontend/src/core/shoppingList.js';

// ============================================
// Ingredient Utilities Tests
// ============================================

describe('normalizeUnit', () => {
  it('should normalize common volume units', () => {
    assert.equal(normalizeUnit('cups'), 'cup');
    assert.equal(normalizeUnit('Tablespoons'), 'tbsp');
    assert.equal(normalizeUnit('teaspoon'), 'tsp');
    assert.equal(normalizeUnit('tbsp'), 'tbsp');
    assert.equal(normalizeUnit('t'), 'tsp');
  });

  it('should normalize weight units', () => {
    assert.equal(normalizeUnit('pounds'), 'lb');
    assert.equal(normalizeUnit('lbs'), 'lb');
    assert.equal(normalizeUnit('ounces'), 'oz');
    assert.equal(normalizeUnit('grams'), 'g');
  });

  it('should handle null/undefined', () => {
    assert.equal(normalizeUnit(null), null);
    assert.equal(normalizeUnit(undefined), null);
  });

  it('should return original if not in map', () => {
    assert.equal(normalizeUnit('unknownunit'), 'unknownunit');
  });
});

describe('parseQuantity', () => {
  it('should parse simple numbers', () => {
    assert.equal(parseQuantity('2'), 2);
    assert.equal(parseQuantity('10'), 10);
    assert.equal(parseQuantity('2.5'), 2.5);
  });

  it('should parse fractions', () => {
    assert.equal(parseQuantity('1/2'), 0.5);
    assert.equal(parseQuantity('3/4'), 0.75);
    assert.equal(parseQuantity('1/4'), 0.25);
  });

  it('should parse mixed numbers', () => {
    assert.equal(parseQuantity('1 1/2'), 1.5);
    assert.equal(parseQuantity('2 1/4'), 2.25);
  });

  it('should parse ranges and return average', () => {
    assert.equal(parseQuantity('2-3'), 2.5);
    assert.equal(parseQuantity('4-6'), 5);
  });

  it('should handle null/undefined', () => {
    assert.equal(parseQuantity(null), null);
    assert.equal(parseQuantity(undefined), null);
    assert.equal(parseQuantity(''), null);
  });
});

describe('normalizeIngredientName', () => {
  it('should lowercase and trim', () => {
    assert.equal(normalizeIngredientName('  Chicken Breast  '), 'chicken breast');
    assert.equal(normalizeIngredientName('FLOUR'), 'flour');
  });
});

describe('decimalToFraction', () => {
  it('should convert common fractions', () => {
    assert.equal(decimalToFraction(0.5), '½');
    assert.equal(decimalToFraction(0.25), '¼');
    assert.equal(decimalToFraction(0.75), '¾');
    assert.equal(decimalToFraction(0.333), '⅓');
  });

  it('should handle whole numbers', () => {
    assert.equal(decimalToFraction(2), '2');
    assert.equal(decimalToFraction(0), '0');
  });

  it('should handle mixed numbers', () => {
    assert.equal(decimalToFraction(1.5), '1 ½');
    assert.equal(decimalToFraction(2.25), '2 ¼');
  });

  it('should round to closest fraction when close', () => {
    // 1.125 matches ⅛ exactly
    assert.equal(decimalToFraction(1.125), '1 ⅛');
    // Values far from common fractions get rounded to 2 decimal places
    assert.equal(decimalToFraction(1.57), '1.57');
  });
});

describe('formatQuantityWithUnit', () => {
  it('should format quantity with unit', () => {
    assert.equal(formatQuantityWithUnit(2, 'cup'), '2 cup');
    assert.equal(formatQuantityWithUnit(0.5, 'tbsp'), '½ tbsp');
  });

  it('should handle null quantity', () => {
    assert.equal(formatQuantityWithUnit(null, 'cup'), 'cup');
    assert.equal(formatQuantityWithUnit(undefined, 'oz'), 'oz');
  });

  it('should handle null unit', () => {
    assert.equal(formatQuantityWithUnit(2, null), '2');
    assert.equal(formatQuantityWithUnit(0.5, undefined), '½');
  });
});

describe('parseIngredient', () => {
  it('should parse with known ingredient name', () => {
    const result = parseIngredient('2 cups flour', 'flour');
    assert.equal(result.name, 'flour');
    assert.equal(result.quantity, 2);
    assert.equal(result.unit, 'cup');
  });

  it('should parse from raw text only', () => {
    const result = parseIngredient('1 lb chicken breast');
    assert.equal(result.name, 'chicken breast');
    assert.equal(result.quantity, 1);
    assert.equal(result.unit, 'lb');
  });

  it('should fallback to full text as name', () => {
    // When text starts with a word (like "salt"), regex parses "salt" as unit
    const result = parseIngredient('pinch of salt');
    assert.equal(result.name, 'of salt');
    assert.equal(result.unit, 'pinch');
    assert.equal(result.quantity, null);
  });
});

describe('createIngredientKey', () => {
  it('should create key from name and unit', () => {
    assert.equal(createIngredientKey('flour', 'cup'), 'flour|cup');
    assert.equal(createIngredientKey('salt', null), 'salt|none');
  });

  it('should include recipe id when provided', () => {
    assert.equal(createIngredientKey('flour', 'cup', '123'), 'flour|cup|123');
  });
});

// ============================================
// Category Tests
// ============================================

describe('CATEGORIES', () => {
  it('should have expected categories', () => {
    assert.equal(CATEGORIES.PRODUCE, 'Produce');
    assert.equal(CATEGORIES.DAIRY, 'Dairy & Eggs');
    assert.equal(CATEGORIES.MEAT, 'Meat & Seafood');
    assert.equal(CATEGORIES.OTHER, 'Other');
  });
});

describe('getCategoryList', () => {
  it('should return array of category values', () => {
    const list = getCategoryList();
    assert.ok(Array.isArray(list));
    assert.ok(list.includes('Produce'));
    assert.ok(list.includes('Other'));
    assert.equal(list.length, Object.keys(CATEGORIES).length);
  });
});

describe('categorizeIngredient', () => {
  it('should categorize produce', () => {
    assert.equal(categorizeIngredient('tomato'), 'Produce');
    assert.equal(categorizeIngredient('apple'), 'Produce');
    assert.equal(categorizeIngredient('spinach'), 'Produce');
  });

  it('should categorize dairy', () => {
    assert.equal(categorizeIngredient('milk'), 'Dairy & Eggs');
    assert.equal(categorizeIngredient('eggs'), 'Dairy & Eggs');
    assert.equal(categorizeIngredient('butter'), 'Dairy & Eggs');
  });

  it('should categorize meat', () => {
    assert.equal(categorizeIngredient('chicken'), 'Meat & Seafood');
    assert.equal(categorizeIngredient('salmon'), 'Meat & Seafood');
  });

  it('should handle partial matches', () => {
    assert.equal(categorizeIngredient('fresh tomatoes'), 'Produce');
    assert.equal(categorizeIngredient('shredded cheddar cheese'), 'Dairy & Eggs');
  });

  it('should default to Other for unknown', () => {
    assert.equal(categorizeIngredient('dragon fruit extract'), 'Other');
    assert.equal(categorizeIngredient(''), 'Other');
  });
});

describe('groupByCategory', () => {
  it('should group items by category', () => {
    const items = [
      { category: 'Produce', ingredient_name: 'tomato' },
      { category: 'Dairy & Eggs', ingredient_name: 'milk' },
      { category: 'Produce', ingredient_name: 'lettuce' },
    ];

    const groups = groupByCategory(items);
    assert.equal(groups.get('Produce').length, 2);
    assert.equal(groups.get('Dairy & Eggs').length, 1);
  });

  it('should not include empty categories', () => {
    const items = [{ category: 'Produce', ingredient_name: 'tomato' }];
    const groups = groupByCategory(items);
    assert.ok(!groups.has('Meat & Seafood'));
  });
});

// ============================================
// Shopping List Utilities Tests
// ============================================

describe('consolidateIngredients', () => {
  it('should consolidate same ingredients', () => {
    const ingredients = [
      { ingredient_name: 'flour', quantity: 1, unit: 'cup', recipe_id: '1' },
      { ingredient_name: 'flour', quantity: 2, unit: 'cup', recipe_id: '1' },
    ];

    const result = consolidateIngredients(ingredients, false);
    assert.equal(result.length, 1);
    assert.equal(result[0].quantity, 3);
  });

  it('should keep items from different recipes separate when keepRecipeSeparate is true', () => {
    const ingredients = [
      { ingredient_name: 'flour', quantity: 1, unit: 'cup', recipe_id: '1' },
      { ingredient_name: 'flour', quantity: 2, unit: 'cup', recipe_id: '2' },
    ];

    const result = consolidateIngredients(ingredients, true);
    assert.equal(result.length, 2);
  });
});

describe('scaleIngredients', () => {
  it('should scale quantities by factor', () => {
    const ingredients = [
      { quantity: 1, unit: 'cup' },
      { quantity: 2, unit: 'tbsp' },
    ];

    const scaled = scaleIngredients(ingredients, 2);
    assert.equal(scaled[0].quantity, 2);
    assert.equal(scaled[1].quantity, 4);
  });

  it('should preserve null quantities', () => {
    const ingredients = [{ quantity: null, unit: 'cup' }];
    const scaled = scaleIngredients(ingredients, 2);
    assert.equal(scaled[0].quantity, null);
  });
});

describe('parseServings', () => {
  it('should parse simple numbers', () => {
    assert.equal(parseServings('4'), 4);
    assert.equal(parseServings('8'), 8);
  });

  it('should parse "X servings" format', () => {
    assert.equal(parseServings('4 servings'), 4);
    assert.equal(parseServings('6 Servings'), 6);
  });

  it('should parse "serves X" format', () => {
    assert.equal(parseServings('serves 4'), 4);
    assert.equal(parseServings('Serves 8'), 8);
  });

  it('should handle ranges by taking lower bound', () => {
    assert.equal(parseServings('4-6'), 4);
    assert.equal(parseServings('8-10'), 8);
  });

  it('should handle null/undefined', () => {
    assert.equal(parseServings(null), null);
    assert.equal(parseServings(undefined), null);
  });
});

describe('calculateScaleFactor', () => {
  it('should calculate scale factor correctly', () => {
    assert.equal(calculateScaleFactor(4, 8), 2);
    assert.equal(calculateScaleFactor(4, 2), 0.5);
    assert.equal(calculateScaleFactor('4 servings', 8), 2);
  });

  it('should return 1 for invalid inputs', () => {
    assert.equal(calculateScaleFactor(null, 4), 1);
    assert.equal(calculateScaleFactor(4, 0), 1);
    assert.equal(calculateScaleFactor(4, -1), 1);
  });
});

describe('filterExcludedIngredients', () => {
  it('should filter out excluded ids', () => {
    const ingredients = [
      { id: 1, name: 'flour' },
      { id: 2, name: 'sugar' },
      { id: 3, name: 'salt' },
    ];

    const filtered = filterExcludedIngredients(ingredients, [2]);
    assert.equal(filtered.length, 2);
    assert.ok(!filtered.some((i) => i.id === 2));
  });

  it('should return all if no exclusions', () => {
    const ingredients = [{ id: 1, name: 'flour' }];
    const filtered = filterExcludedIngredients(ingredients, []);
    assert.equal(filtered.length, 1);
  });
});

describe('removeRecipeItems', () => {
  it('should remove items from specified recipe', () => {
    const items = [
      { recipe_id: '1', name: 'flour' },
      { recipe_id: '2', name: 'sugar' },
      { recipe_id: '1', name: 'eggs' },
    ];

    const result = removeRecipeItems(items, '1');
    assert.equal(result.length, 1);
    assert.equal(result[0].name, 'sugar');
  });
});

describe('sortByCategory', () => {
  it('should sort items by category order', () => {
    const items = [
      { category: 'Other', ingredient_name: 'misc' },
      { category: 'Produce', ingredient_name: 'tomato' },
      { category: 'Dairy & Eggs', ingredient_name: 'milk' },
    ];

    const sorted = sortByCategory(items);
    assert.equal(sorted[0].category, 'Produce');
    assert.equal(sorted[1].category, 'Dairy & Eggs');
    assert.equal(sorted[2].category, 'Other');
  });

  it('should sort by name within same category', () => {
    const items = [
      { category: 'Produce', ingredient_name: 'zucchini' },
      { category: 'Produce', ingredient_name: 'apple' },
    ];

    const sorted = sortByCategory(items);
    assert.equal(sorted[0].ingredient_name, 'apple');
    assert.equal(sorted[1].ingredient_name, 'zucchini');
  });
});

describe('mergeIntoShoppingList', () => {
  it('should merge new items with existing', () => {
    const existing = [{ id: 1, ingredient_name: 'flour', quantity: 1, unit: 'cup' }];

    const newItems = [{ ingredient_name: 'flour', quantity: 2, unit: 'cup', category: 'Pantry' }];

    const merged = mergeIntoShoppingList(existing, newItems);
    assert.equal(merged.length, 1);
    assert.equal(merged[0].quantity, 3);
    assert.equal(merged[0].existing, true);
  });

  it('should add new items that do not exist', () => {
    const existing = [{ id: 1, ingredient_name: 'flour', quantity: 1, unit: 'cup' }];

    const newItems = [{ ingredient_name: 'sugar', quantity: 2, unit: 'cup', category: 'Pantry' }];

    const merged = mergeIntoShoppingList(existing, newItems);
    assert.equal(merged.length, 2);

    const newItem = merged.find((i) => i.ingredient_name === 'sugar');
    assert.ok(newItem);
    assert.equal(newItem.existing, false);
  });
});
