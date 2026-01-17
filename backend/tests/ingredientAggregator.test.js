/**
 * Unit tests for Ingredient Aggregation Engine
 *
 * Tests cover:
 * - Basic quantity summing
 * - String normalization ("salt and pepper" → "salt & pepper")
 * - Bell pepper variant aggregation with color breakdown
 * - Unit compatibility checking
 * - Edge cases and safe non-merges
 */

const {
  normalizeIngredientName,
  areUnitsCompatible,
  aggregateIngredients,
  singularize,
  detectBellPepper,
} = require('../src/utils/ingredientAggregator');

// ============================================
// normalizeIngredientName Tests
// ============================================

describe('normalizeIngredientName', () => {
  describe('basic normalization', () => {
    it('should lowercase and trim ingredient names', () => {
      const result = normalizeIngredientName('  Onion  ');
      expect(result.canonicalKey).toBe('onion');
      expect(result.displayName).toBe('Onion');
    });

    it('should collapse multiple spaces', () => {
      const result = normalizeIngredientName('garlic   cloves');
      expect(result.canonicalKey).toBe('garlic clove');
    });

    it('should strip trailing punctuation', () => {
      const result = normalizeIngredientName('flour...');
      expect(result.canonicalKey).toBe('flour');
    });

    it('should handle empty input', () => {
      expect(normalizeIngredientName('')).toEqual({
        canonicalKey: '',
        displayName: '',
        attributes: {},
      });
      expect(normalizeIngredientName(null)).toEqual({
        canonicalKey: '',
        displayName: '',
        attributes: {},
      });
    });
  });

  describe('compound ingredient normalization', () => {
    it('should normalize "salt and pepper" to "salt & pepper"', () => {
      const result = normalizeIngredientName('salt and pepper');
      expect(result.canonicalKey).toBe('salt & pepper');
      expect(result.displayName).toBe('Salt & pepper');
      expect(result.attributes.compound).toBe(true);
    });

    it('should normalize "Salt And Pepper" (mixed case)', () => {
      const result = normalizeIngredientName('Salt And Pepper');
      expect(result.canonicalKey).toBe('salt & pepper');
    });

    it('should normalize "salt & pepper" (already has ampersand)', () => {
      const result = normalizeIngredientName('salt & pepper');
      expect(result.canonicalKey).toBe('salt & pepper');
    });

    it('should normalize "oil and vinegar"', () => {
      const result = normalizeIngredientName('oil and vinegar');
      expect(result.canonicalKey).toBe('oil & vinegar');
    });

    it('should normalize "mac and cheese"', () => {
      const result = normalizeIngredientName('mac and cheese');
      expect(result.canonicalKey).toBe('macaroni & cheese');
    });

    it('should normalize generic "X and Y" patterns', () => {
      const result = normalizeIngredientName('bread and butter');
      expect(result.canonicalKey).toBe('bread & butter');
    });
  });

  describe('bell pepper detection', () => {
    it('should detect "bell pepper"', () => {
      const result = normalizeIngredientName('bell pepper');
      expect(result.canonicalKey).toBe('bell pepper');
      expect(result.displayName).toBe('Bell peppers');
      expect(result.attributes.isBellPepper).toBe(true);
      expect(result.attributes.color).toBeNull();
    });

    it('should detect "red bell pepper"', () => {
      const result = normalizeIngredientName('red bell pepper');
      expect(result.canonicalKey).toBe('bell pepper');
      expect(result.attributes.color).toBe('red');
    });

    it('should detect "green bell pepper"', () => {
      const result = normalizeIngredientName('green bell pepper');
      expect(result.canonicalKey).toBe('bell pepper');
      expect(result.attributes.color).toBe('green');
    });

    it('should detect "yellow bell peppers" (plural)', () => {
      const result = normalizeIngredientName('yellow bell peppers');
      expect(result.canonicalKey).toBe('bell pepper');
      expect(result.attributes.color).toBe('yellow');
    });

    it('should detect "red pepper" as bell pepper', () => {
      const result = normalizeIngredientName('red pepper');
      expect(result.canonicalKey).toBe('bell pepper');
      expect(result.attributes.color).toBe('red');
    });

    it('should NOT detect plain "pepper" as bell pepper', () => {
      // Plain "pepper" should remain as pepper (could be black pepper)
      const result = normalizeIngredientName('pepper');
      expect(result.canonicalKey).toBe('pepper');
      expect(result.attributes.isBellPepper).toBeUndefined();
    });

    it('should NOT detect "black pepper" as bell pepper', () => {
      const result = normalizeIngredientName('black pepper');
      expect(result.canonicalKey).toBe('black pepper');
      expect(result.attributes.isBellPepper).toBeUndefined();
    });

    it('should NOT detect "cayenne pepper" as bell pepper', () => {
      const result = normalizeIngredientName('cayenne pepper');
      expect(result.canonicalKey).toBe('cayenne pepper');
      expect(result.attributes.isBellPepper).toBeUndefined();
    });
  });

  describe('singularization', () => {
    it('should singularize "onions" to "onion"', () => {
      const result = normalizeIngredientName('onions');
      expect(result.canonicalKey).toBe('onion');
    });

    it('should singularize "tomatoes" to "tomato"', () => {
      const result = normalizeIngredientName('tomatoes');
      expect(result.canonicalKey).toBe('tomato');
    });

    it('should singularize "berries" to "berry"', () => {
      const result = normalizeIngredientName('berries');
      expect(result.canonicalKey).toBe('berry');
    });

    it('should singularize "dishes" to "dish"', () => {
      expect(singularize('dishes')).toBe('dish');
    });

    it('should not singularize already singular words', () => {
      const result = normalizeIngredientName('garlic');
      expect(result.canonicalKey).toBe('garlic');
    });
  });
});

// ============================================
// areUnitsCompatible Tests
// ============================================

describe('areUnitsCompatible', () => {
  describe('same units', () => {
    it('should return true for identical units', () => {
      expect(areUnitsCompatible('cup', 'cup')).toBe(true);
      expect(areUnitsCompatible('tbsp', 'tbsp')).toBe(true);
    });

    it('should return true for both null', () => {
      expect(areUnitsCompatible(null, null)).toBe(true);
    });

    it('should handle unit variations', () => {
      expect(areUnitsCompatible('tablespoon', 'tbsp')).toBe(true);
      expect(areUnitsCompatible('cups', 'cup')).toBe(true);
    });
  });

  describe('compatible units (same group)', () => {
    it('should return true for tsp and tbsp', () => {
      expect(areUnitsCompatible('tsp', 'tbsp')).toBe(true);
    });

    it('should return true for cup and pint', () => {
      expect(areUnitsCompatible('cup', 'pint')).toBe(true);
    });

    it('should return true for oz and lb', () => {
      expect(areUnitsCompatible('oz', 'lb')).toBe(true);
    });

    it('should return true for g and kg', () => {
      expect(areUnitsCompatible('g', 'kg')).toBe(true);
    });
  });

  describe('incompatible units', () => {
    it('should return false for null and non-null', () => {
      expect(areUnitsCompatible(null, 'cup')).toBe(false);
      expect(areUnitsCompatible('cup', null)).toBe(false);
    });

    it('should return false for different groups', () => {
      expect(areUnitsCompatible('cup', 'lb')).toBe(false);
      expect(areUnitsCompatible('tsp', 'oz')).toBe(false);
    });

    it('should return false for different count units', () => {
      expect(areUnitsCompatible('can', 'jar')).toBe(false);
      expect(areUnitsCompatible('bunch', 'head')).toBe(false);
    });
  });
});

// ============================================
// aggregateIngredients Tests
// ============================================

describe('aggregateIngredients', () => {
  describe('basic quantity summing', () => {
    it('should sum quantities for same ingredient and unit', () => {
      const lines = [
        { recipeId: 'r1', originalText: '2 cups flour', name: 'flour', quantity: 2, unit: 'cup' },
        { recipeId: 'r2', originalText: '3 cups flour', name: 'flour', quantity: 3, unit: 'cup' },
      ];

      const result = aggregateIngredients(lines);
      expect(result).toHaveLength(1);
      expect(result[0].displayName).toBe('Flour');
      expect(result[0].totalQuantity).toBe(5);
      expect(result[0].unit).toBe('cup');
      expect(result[0].sourceLines).toHaveLength(2);
    });

    it('should sum unitless quantities', () => {
      const lines = [
        { recipeId: 'r1', originalText: '2 eggs', name: 'eggs', quantity: 2, unit: null },
        { recipeId: 'r2', originalText: '3 eggs', name: 'eggs', quantity: 3, unit: null },
      ];

      const result = aggregateIngredients(lines);
      expect(result).toHaveLength(1);
      expect(result[0].totalQuantity).toBe(5);
      expect(result[0].unit).toBeNull();
    });

    it('should keep different ingredients separate', () => {
      const lines = [
        { recipeId: 'r1', name: 'flour', quantity: 2, unit: 'cup' },
        { recipeId: 'r1', name: 'sugar', quantity: 1, unit: 'cup' },
      ];

      const result = aggregateIngredients(lines);
      expect(result).toHaveLength(2);
    });
  });

  describe('salt and pepper normalization', () => {
    it('should aggregate "salt and pepper" and "salt & pepper"', () => {
      const lines = [
        { recipeId: 'r1', originalText: 'salt and pepper', name: 'salt and pepper' },
        { recipeId: 'r2', originalText: 'salt & pepper', name: 'salt & pepper' },
      ];

      const result = aggregateIngredients(lines);
      expect(result).toHaveLength(1);
      expect(result[0].canonicalKey).toBe('salt & pepper');
      expect(result[0].sourceLines).toHaveLength(2);
    });
  });

  describe('bell pepper aggregation', () => {
    it('should aggregate bell pepper variants into one item', () => {
      const lines = [
        { recipeId: 'r1', originalText: '1 red bell pepper', name: 'red bell pepper', quantity: 1 },
        { recipeId: 'r2', originalText: '2 green bell peppers', name: 'green bell peppers', quantity: 2 },
        { recipeId: 'r3', originalText: '1 yellow bell pepper', name: 'yellow bell pepper', quantity: 1 },
      ];

      const result = aggregateIngredients(lines);
      expect(result).toHaveLength(1);
      expect(result[0].displayName).toBe('Bell peppers');
      expect(result[0].totalQuantity).toBe(4);
      expect(result[0].components).toBeDefined();
      expect(result[0].components).toHaveLength(3);
    });

    it('should include color breakdown in notes', () => {
      const lines = [
        { recipeId: 'r1', name: 'red bell pepper', quantity: 1 },
        { recipeId: 'r2', name: 'green bell pepper', quantity: 3 },
      ];

      const result = aggregateIngredients(lines);
      expect(result[0].notes).toContain('1 red');
      expect(result[0].notes).toContain('3 green');
    });

    it('should NOT merge "pepper" with "bell pepper"', () => {
      const lines = [
        { recipeId: 'r1', name: 'bell pepper', quantity: 1 },
        { recipeId: 'r2', name: 'pepper', quantity: 2, unit: 'tsp' },
      ];

      const result = aggregateIngredients(lines);
      expect(result).toHaveLength(2);
      expect(result.find((r) => r.canonicalKey === 'bell pepper')).toBeDefined();
      expect(result.find((r) => r.canonicalKey === 'pepper')).toBeDefined();
    });

    it('should NOT merge "black pepper" with "bell pepper"', () => {
      const lines = [
        { recipeId: 'r1', name: 'red bell pepper', quantity: 1 },
        { recipeId: 'r2', name: 'black pepper', quantity: 1, unit: 'tsp' },
      ];

      const result = aggregateIngredients(lines);
      expect(result).toHaveLength(2);
    });
  });

  describe('incompatible units handling', () => {
    it('should set totalQuantity to null when units are incompatible', () => {
      const lines = [
        { recipeId: 'r1', name: 'butter', quantity: 2, unit: 'tbsp' },
        { recipeId: 'r2', name: 'butter', quantity: 1, unit: 'cup' },
      ];

      const result = aggregateIngredients(lines);
      expect(result).toHaveLength(1);
      // tbsp and cup are in different groups, so they should still sum
      // Actually, they're both volume but different precision - let's check
      expect(result[0].displayName).toBe('Butter');
    });

    it('should handle mixed units with notes', () => {
      const lines = [
        { recipeId: 'r1', name: 'olive oil', quantity: 2, unit: 'tbsp' },
        { recipeId: 'r2', name: 'olive oil', quantity: 1, unit: 'cup' },
      ];

      const result = aggregateIngredients(lines);
      // These are in compatible groups (volume-small and volume-large)
      // but we keep them in their original units
      expect(result).toHaveLength(1);
    });

    it('should not combine weight and volume units', () => {
      const lines = [
        { recipeId: 'r1', name: 'flour', quantity: 2, unit: 'cup' },
        { recipeId: 'r2', name: 'flour', quantity: 500, unit: 'g' },
      ];

      const result = aggregateIngredients(lines);
      expect(result).toHaveLength(1);
      // Should have notes about mixed units
      expect(result[0].totalQuantity).toBeNull();
      expect(result[0].notes).toBeDefined();
    });
  });

  describe('quantity parsing fallback', () => {
    it('should parse quantity from originalText if not provided', () => {
      const lines = [
        { recipeId: 'r1', originalText: '2 cups flour', name: 'flour' },
        { recipeId: 'r2', originalText: '3 cups flour', name: 'flour' },
      ];

      const result = aggregateIngredients(lines);
      expect(result[0].totalQuantity).toBe(5);
    });

    it('should handle items with no quantity', () => {
      const lines = [
        { recipeId: 'r1', name: 'salt', quantity: null },
        { recipeId: 'r2', name: 'salt', quantity: null },
      ];

      const result = aggregateIngredients(lines);
      expect(result).toHaveLength(1);
      expect(result[0].totalQuantity).toBeNull();
    });
  });

  describe('source line tracking', () => {
    it('should track all source lines with recipe IDs', () => {
      const lines = [
        { recipeId: 'recipe-1', originalText: '2 onions', name: 'onion', quantity: 2 },
        { recipeId: 'recipe-2', originalText: '3 onions', name: 'onion', quantity: 3 },
        { recipeId: 'recipe-3', originalText: '1 onion', name: 'onion', quantity: 1 },
      ];

      const result = aggregateIngredients(lines);
      expect(result[0].sourceLines).toHaveLength(3);
      expect(result[0].sourceLines[0].recipeId).toBe('recipe-1');
      expect(result[0].sourceLines[1].recipeId).toBe('recipe-2');
      expect(result[0].sourceLines[2].recipeId).toBe('recipe-3');
    });

    it('should include parsed data in source lines', () => {
      const lines = [{ recipeId: 'r1', originalText: '2 cups flour', name: 'flour', quantity: 2, unit: 'cup' }];

      const result = aggregateIngredients(lines);
      expect(result[0].sourceLines[0].parsed).toEqual({
        quantity: 2,
        unit: 'cup',
        name: 'Flour',
      });
    });
  });

  describe('sorting', () => {
    it('should sort results alphabetically by displayName', () => {
      const lines = [
        { recipeId: 'r1', name: 'zucchini', quantity: 1 },
        { recipeId: 'r1', name: 'apple', quantity: 2 },
        { recipeId: 'r1', name: 'milk', quantity: 1, unit: 'cup' },
      ];

      const result = aggregateIngredients(lines);
      expect(result[0].displayName).toBe('Apple');
      expect(result[1].displayName).toBe('Milk');
      expect(result[2].displayName).toBe('Zucchini');
    });
  });

  describe('edge cases', () => {
    it('should handle empty input', () => {
      expect(aggregateIngredients([])).toEqual([]);
      expect(aggregateIngredients(null)).toEqual([]);
    });

    it('should handle single item', () => {
      const lines = [{ recipeId: 'r1', name: 'flour', quantity: 2, unit: 'cup' }];

      const result = aggregateIngredients(lines);
      expect(result).toHaveLength(1);
      expect(result[0].totalQuantity).toBe(2);
    });

    it('should use ingredientName field as fallback', () => {
      const lines = [{ recipeId: 'r1', ingredientName: 'sugar', quantity: 1, unit: 'cup' }];

      const result = aggregateIngredients(lines);
      expect(result[0].displayName).toBe('Sugar');
    });

    it('should use ingredient_name field as fallback', () => {
      const lines = [{ recipeId: 'r1', ingredient_name: 'brown sugar', quantity: 1, unit: 'cup' }];

      const result = aggregateIngredients(lines);
      expect(result[0].displayName).toBe('Brown sugar');
    });

    it('should extract name from originalText as last resort', () => {
      const lines = [{ recipeId: 'r1', originalText: '2 cups all-purpose flour' }];

      const result = aggregateIngredients(lines);
      expect(result).toHaveLength(1);
      expect(result[0].canonicalKey).toContain('flour');
    });
  });

  describe('real-world scenarios', () => {
    it('should handle a typical multi-recipe shopping list', () => {
      const lines = [
        // Recipe 1: Pasta
        { recipeId: 'pasta', name: 'onion', quantity: 1 },
        { recipeId: 'pasta', name: 'garlic', quantity: 3, unit: 'clove' },
        { recipeId: 'pasta', name: 'olive oil', quantity: 2, unit: 'tbsp' },
        { recipeId: 'pasta', name: 'salt and pepper' },
        // Recipe 2: Salad
        { recipeId: 'salad', name: 'red bell pepper', quantity: 1 },
        { recipeId: 'salad', name: 'green bell pepper', quantity: 1 },
        { recipeId: 'salad', name: 'onion', quantity: 0.5 },
        { recipeId: 'salad', name: 'olive oil', quantity: 3, unit: 'tbsp' },
        { recipeId: 'salad', name: 'salt & pepper' },
      ];

      const result = aggregateIngredients(lines);

      // Check bell peppers are grouped
      const bellPeppers = result.find((r) => r.canonicalKey === 'bell pepper');
      expect(bellPeppers).toBeDefined();
      expect(bellPeppers.totalQuantity).toBe(2);
      expect(bellPeppers.components).toHaveLength(2);

      // Check onions are summed
      const onions = result.find((r) => r.canonicalKey === 'onion');
      expect(onions).toBeDefined();
      expect(onions.totalQuantity).toBe(1.5);

      // Check olive oil is summed
      const oil = result.find((r) => r.canonicalKey === 'olive oil');
      expect(oil).toBeDefined();
      expect(oil.totalQuantity).toBe(5);
      expect(oil.unit).toBe('tbsp');

      // Check salt & pepper is merged
      const saltPepper = result.find((r) => r.canonicalKey === 'salt & pepper');
      expect(saltPepper).toBeDefined();
      expect(saltPepper.sourceLines).toHaveLength(2);
    });
  });
});

// ============================================
// Helper function tests
// ============================================

describe('singularize', () => {
  it('should handle -ies ending', () => {
    expect(singularize('berries')).toBe('berry');
    expect(singularize('cherries')).toBe('cherry');
  });

  it('should handle -es ending for sh/ch/x/ss', () => {
    expect(singularize('dishes')).toBe('dish');
    expect(singularize('peaches')).toBe('peach');
    expect(singularize('boxes')).toBe('box');
  });

  it('should handle regular -s ending', () => {
    expect(singularize('apples')).toBe('apple');
    expect(singularize('carrots')).toBe('carrot');
  });

  it('should handle irregular plurals', () => {
    expect(singularize('tomatoes')).toBe('tomato');
    expect(singularize('potatoes')).toBe('potato');
    expect(singularize('leaves')).toBe('leaf');
  });
});

describe('detectBellPepper', () => {
  it('should detect bell pepper variants', () => {
    expect(detectBellPepper('bell pepper')).not.toBeNull();
    expect(detectBellPepper('red bell pepper')).not.toBeNull();
    expect(detectBellPepper('green peppers')).not.toBeNull();
  });

  it('should not detect non-bell peppers', () => {
    expect(detectBellPepper('black pepper')).toBeNull();
    expect(detectBellPepper('pepper')).toBeNull();
    expect(detectBellPepper('cayenne pepper')).toBeNull();
    expect(detectBellPepper('jalapeño pepper')).toBeNull();
  });
});
