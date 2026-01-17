/**
 * Shopping List Aggregation Integration Tests
 *
 * Tests the complete flow of shopping list creation, adding recipes,
 * and removing recipes with the v2 aggregation engine.
 *
 * These are unit tests that test the consolidateIngredients function
 * which is the integration point between the controller and aggregation engine.
 */

const { aggregateIngredients, normalizeIngredientName, areUnitsCompatible } = require('../src/utils/ingredientAggregator');
const { categorizeIngredient } = require('../src/utils/ingredientCategorizer');

/**
 * Simulates the consolidateIngredients function from shoppingListController
 * This is a standalone version for testing without database dependencies
 */
function consolidateIngredients(recipeIngredients, options = {}) {
  const { keepRecipeSeparate = true } = options;

  // Transform to aggregator input format
  const lines = recipeIngredients.map((ing) => ({
    recipeId: ing.recipe_id,
    originalText: ing.raw_text,
    name: ing.ingredient_name || ing.name,
    quantity: ing.quantity,
    unit: ing.unit,
  }));

  if (keepRecipeSeparate) {
    const byRecipe = new Map();
    lines.forEach((line) => {
      const recipeId = line.recipeId || 'unknown';
      if (!byRecipe.has(recipeId)) {
        byRecipe.set(recipeId, []);
      }
      byRecipe.get(recipeId).push(line);
    });

    const results = [];
    for (const [recipeId, recipeLines] of byRecipe) {
      const aggregated = aggregateIngredients(recipeLines);
      aggregated.forEach((item) => {
        results.push({
          ingredient_name: item.displayName.toLowerCase(),
          display_name: item.displayName,
          canonical_key: item.canonicalKey,
          quantity: item.totalQuantity,
          unit: item.unit,
          category: categorizeIngredient(item.canonicalKey),
          recipe_id: recipeId,
          components: item.components,
          notes: item.notes,
          source_lines: item.sourceLines,
        });
      });
    }
    return results;
  }

  const aggregated = aggregateIngredients(lines);
  return aggregated.map((item) => ({
    ingredient_name: item.displayName.toLowerCase(),
    display_name: item.displayName,
    canonical_key: item.canonicalKey,
    quantity: item.totalQuantity,
    unit: item.unit,
    category: categorizeIngredient(item.canonicalKey),
    recipe_id: null,
    components: item.components,
    notes: item.notes,
    source_lines: item.sourceLines,
  }));
}

/**
 * Simulates merging new ingredients into existing shopping list items
 * This mirrors the logic in addRecipesToList
 */
function mergeIntoExistingList(existingItems, newIngredients) {
  const mergedItems = {};

  // Add existing items
  existingItems.forEach((item) => {
    const { canonicalKey } = normalizeIngredientName(item.ingredient_name);
    const key = `${canonicalKey}|${item.unit || 'none'}`;
    mergedItems[key] = {
      id: item.id,
      ingredient_name: item.ingredient_name,
      canonical_key: canonicalKey,
      quantity: item.quantity,
      unit: item.unit,
      category: item.category,
      existing: true,
    };
  });

  // Merge new ingredients
  newIngredients.forEach((ing) => {
    const canonicalKey = ing.canonical_key;
    const key = `${canonicalKey}|${ing.unit || 'none'}`;

    if (mergedItems[key]) {
      if (areUnitsCompatible(mergedItems[key].unit, ing.unit)) {
        if (ing.quantity !== null && mergedItems[key].quantity !== null) {
          mergedItems[key].quantity += ing.quantity;
        } else if (ing.quantity !== null) {
          mergedItems[key].quantity = ing.quantity;
        }
      }
    } else {
      mergedItems[key] = {
        ingredient_name: ing.ingredient_name,
        canonical_key: canonicalKey,
        quantity: ing.quantity,
        unit: ing.unit,
        category: ing.category,
        existing: false,
      };
    }
  });

  return Object.values(mergedItems);
}

// ============================================
// Test Data: Sample Recipes
// ============================================

const RECIPE_PASTA = {
  id: 'recipe-pasta',
  name: 'Spaghetti Bolognese',
  ingredients: [
    { raw_text: '1 lb ground beef', ingredient_name: 'ground beef', quantity: 1, unit: 'lb', recipe_id: 'recipe-pasta' },
    { raw_text: '2 cups onion, diced', ingredient_name: 'onion', quantity: 2, unit: 'cup', recipe_id: 'recipe-pasta' },
    { raw_text: '3 cloves garlic, minced', ingredient_name: 'garlic', quantity: 3, unit: 'clove', recipe_id: 'recipe-pasta' },
    { raw_text: '1 can crushed tomatoes', ingredient_name: 'crushed tomatoes', quantity: 1, unit: 'can', recipe_id: 'recipe-pasta' },
    { raw_text: 'salt and pepper to taste', ingredient_name: 'salt and pepper', quantity: null, unit: null, recipe_id: 'recipe-pasta' },
    { raw_text: '1 lb spaghetti', ingredient_name: 'spaghetti', quantity: 1, unit: 'lb', recipe_id: 'recipe-pasta' },
  ],
};

const RECIPE_SALAD = {
  id: 'recipe-salad',
  name: 'Garden Salad',
  ingredients: [
    { raw_text: '1 head lettuce', ingredient_name: 'lettuce', quantity: 1, unit: 'head', recipe_id: 'recipe-salad' },
    { raw_text: '1 red bell pepper, sliced', ingredient_name: 'red bell pepper', quantity: 1, unit: null, recipe_id: 'recipe-salad' },
    { raw_text: '2 green bell peppers', ingredient_name: 'green bell peppers', quantity: 2, unit: null, recipe_id: 'recipe-salad' },
    { raw_text: '1 cup onion, sliced', ingredient_name: 'onion', quantity: 1, unit: 'cup', recipe_id: 'recipe-salad' },
    { raw_text: 'salt & pepper', ingredient_name: 'salt & pepper', quantity: null, unit: null, recipe_id: 'recipe-salad' },
    { raw_text: '3 tbsp olive oil', ingredient_name: 'olive oil', quantity: 3, unit: 'tbsp', recipe_id: 'recipe-salad' },
  ],
};

const RECIPE_STIR_FRY = {
  id: 'recipe-stir-fry',
  name: 'Vegetable Stir Fry',
  ingredients: [
    { raw_text: '1 yellow bell pepper', ingredient_name: 'yellow bell pepper', quantity: 1, unit: null, recipe_id: 'recipe-stir-fry' },
    { raw_text: '2 cups broccoli', ingredient_name: 'broccoli', quantity: 2, unit: 'cup', recipe_id: 'recipe-stir-fry' },
    { raw_text: '4 cloves garlic', ingredient_name: 'garlic', quantity: 4, unit: 'clove', recipe_id: 'recipe-stir-fry' },
    { raw_text: '2 tbsp soy sauce', ingredient_name: 'soy sauce', quantity: 2, unit: 'tbsp', recipe_id: 'recipe-stir-fry' },
    { raw_text: '1 tbsp olive oil', ingredient_name: 'olive oil', quantity: 1, unit: 'tbsp', recipe_id: 'recipe-stir-fry' },
  ],
};

// ============================================
// Tests
// ============================================

describe('Shopping List Integration: Create from Multiple Recipes', () => {
  describe('Adding 2 recipes aggregates correctly', () => {
    it('should aggregate onions from pasta and salad recipes', () => {
      const allIngredients = [...RECIPE_PASTA.ingredients, ...RECIPE_SALAD.ingredients];
      const consolidated = consolidateIngredients(allIngredients, { keepRecipeSeparate: false });

      const onion = consolidated.find((item) => item.canonical_key === 'onion');
      expect(onion).toBeDefined();
      expect(onion.quantity).toBe(3); // 2 cup + 1 cup = 3 cup
      expect(onion.unit).toBe('cup');
    });

    it('should aggregate "salt and pepper" and "salt & pepper"', () => {
      const allIngredients = [...RECIPE_PASTA.ingredients, ...RECIPE_SALAD.ingredients];
      const consolidated = consolidateIngredients(allIngredients, { keepRecipeSeparate: false });

      const saltPepper = consolidated.find((item) => item.canonical_key === 'salt & pepper');
      expect(saltPepper).toBeDefined();
      expect(saltPepper.source_lines.length).toBe(2);
    });

    it('should aggregate bell pepper variants into one item with color breakdown', () => {
      const allIngredients = [...RECIPE_SALAD.ingredients, ...RECIPE_STIR_FRY.ingredients];
      const consolidated = consolidateIngredients(allIngredients, { keepRecipeSeparate: false });

      const bellPepper = consolidated.find((item) => item.canonical_key === 'bell pepper');
      expect(bellPepper).toBeDefined();
      expect(bellPepper.display_name).toBe('Bell peppers');
      expect(bellPepper.quantity).toBe(4); // 1 red + 2 green + 1 yellow
      expect(bellPepper.components).toBeDefined();
      expect(bellPepper.components.length).toBe(3);

      const colors = bellPepper.components.map((c) => c.label);
      expect(colors).toContain('red');
      expect(colors).toContain('green');
      expect(colors).toContain('yellow');
    });

    it('should aggregate olive oil across recipes', () => {
      const allIngredients = [...RECIPE_SALAD.ingredients, ...RECIPE_STIR_FRY.ingredients];
      const consolidated = consolidateIngredients(allIngredients, { keepRecipeSeparate: false });

      const oliveOil = consolidated.find((item) => item.canonical_key === 'olive oil');
      expect(oliveOil).toBeDefined();
      expect(oliveOil.quantity).toBe(4); // 3 tbsp + 1 tbsp
      expect(oliveOil.unit).toBe('tbsp');
    });

    it('should aggregate garlic across recipes', () => {
      const allIngredients = [...RECIPE_PASTA.ingredients, ...RECIPE_STIR_FRY.ingredients];
      const consolidated = consolidateIngredients(allIngredients, { keepRecipeSeparate: false });

      const garlic = consolidated.find((item) => item.canonical_key === 'garlic');
      expect(garlic).toBeDefined();
      expect(garlic.quantity).toBe(7); // 3 cloves + 4 cloves
      expect(garlic.unit).toBe('clove');
    });
  });

  describe('keepRecipeSeparate maintains recipe provenance', () => {
    it('should keep items from different recipes separate when keepRecipeSeparate is true', () => {
      const allIngredients = [...RECIPE_PASTA.ingredients, ...RECIPE_SALAD.ingredients];
      const consolidated = consolidateIngredients(allIngredients, { keepRecipeSeparate: true });

      // Should have separate onion entries for each recipe
      const onions = consolidated.filter((item) => item.canonical_key === 'onion');
      expect(onions.length).toBe(2);

      const pastaOnion = onions.find((o) => o.recipe_id === 'recipe-pasta');
      const saladOnion = onions.find((o) => o.recipe_id === 'recipe-salad');

      expect(pastaOnion).toBeDefined();
      expect(pastaOnion.quantity).toBe(2);

      expect(saladOnion).toBeDefined();
      expect(saladOnion.quantity).toBe(1);
    });
  });
});

describe('Shopping List Integration: Remove Recipe Updates Quantities', () => {
  describe('Simulating remove recipe flow', () => {
    it('should recalculate correctly after removing one recipe', () => {
      // Start with 3 recipes
      const allIngredients = [
        ...RECIPE_PASTA.ingredients,
        ...RECIPE_SALAD.ingredients,
        ...RECIPE_STIR_FRY.ingredients,
      ];

      // Initial list
      const initialList = consolidateIngredients(allIngredients, { keepRecipeSeparate: false });

      // Get bell peppers before removal (1 red + 2 green + 1 yellow = 4)
      const bellPeppersBefore = initialList.find((item) => item.canonical_key === 'bell pepper');
      expect(bellPeppersBefore.quantity).toBe(4);

      // Simulate removing stir-fry recipe (which has 1 yellow bell pepper)
      const remainingIngredients = [...RECIPE_PASTA.ingredients, ...RECIPE_SALAD.ingredients];
      const afterRemoval = consolidateIngredients(remainingIngredients, { keepRecipeSeparate: false });

      // Bell peppers should now be 3 (1 red + 2 green)
      const bellPeppersAfter = afterRemoval.find((item) => item.canonical_key === 'bell pepper');
      expect(bellPeppersAfter.quantity).toBe(3);
    });

    it('should completely remove ingredients only in removed recipe', () => {
      const allIngredients = [
        ...RECIPE_PASTA.ingredients,
        ...RECIPE_SALAD.ingredients,
        ...RECIPE_STIR_FRY.ingredients,
      ];

      const initialList = consolidateIngredients(allIngredients, { keepRecipeSeparate: false });

      // Soy sauce only in stir-fry
      const soySauceBefore = initialList.find((item) => item.canonical_key === 'soy sauce');
      expect(soySauceBefore).toBeDefined();
      expect(soySauceBefore.quantity).toBe(2);

      // Remove stir-fry
      const remainingIngredients = [...RECIPE_PASTA.ingredients, ...RECIPE_SALAD.ingredients];
      const afterRemoval = consolidateIngredients(remainingIngredients, { keepRecipeSeparate: false });

      // Soy sauce should be gone
      const soySauceAfter = afterRemoval.find((item) => item.canonical_key === 'soy sauce');
      expect(soySauceAfter).toBeUndefined();
    });

    it('should update garlic quantity after removing one recipe', () => {
      const allIngredients = [...RECIPE_PASTA.ingredients, ...RECIPE_STIR_FRY.ingredients];

      const initialList = consolidateIngredients(allIngredients, { keepRecipeSeparate: false });
      const garlicBefore = initialList.find((item) => item.canonical_key === 'garlic');
      expect(garlicBefore.quantity).toBe(7); // 3 + 4

      // Remove stir-fry (4 cloves)
      const remainingIngredients = [...RECIPE_PASTA.ingredients];
      const afterRemoval = consolidateIngredients(remainingIngredients, { keepRecipeSeparate: false });

      const garlicAfter = afterRemoval.find((item) => item.canonical_key === 'garlic');
      expect(garlicAfter.quantity).toBe(3); // Only pasta's 3 cloves
    });

    it('should handle removing all recipes (empty list)', () => {
      const afterRemoval = consolidateIngredients([], { keepRecipeSeparate: false });
      expect(afterRemoval).toHaveLength(0);
    });
  });
});

describe('Shopping List Integration: Add Recipes to Existing List', () => {
  describe('Merging new recipes into existing list', () => {
    it('should merge and sum matching ingredients', () => {
      // Existing list (from pasta recipe)
      const existingItems = [
        { id: 1, ingredient_name: 'onion', quantity: 2, unit: 'cup', category: 'Produce' },
        { id: 2, ingredient_name: 'garlic', quantity: 3, unit: 'clove', category: 'Produce' },
      ];

      // New ingredients (from stir-fry recipe, aggregated)
      const newIngredients = consolidateIngredients(RECIPE_STIR_FRY.ingredients, { keepRecipeSeparate: false });

      const merged = mergeIntoExistingList(existingItems, newIngredients);

      // Garlic should be summed
      const garlic = merged.find((item) => item.canonical_key === 'garlic');
      expect(garlic.quantity).toBe(7); // 3 + 4
      expect(garlic.existing).toBe(true); // Was updated, not new

      // Broccoli should be added (new)
      const broccoli = merged.find((item) => item.canonical_key === 'broccoli');
      expect(broccoli).toBeDefined();
      expect(broccoli.existing).toBe(false);
    });

    it('should aggregate salt & pepper variations when merging', () => {
      // Existing list has "salt and pepper"
      const existingItems = [
        { id: 1, ingredient_name: 'salt and pepper', quantity: null, unit: null, category: 'Spices' },
      ];

      // New recipe has "salt & pepper"
      const newIngredients = [
        {
          ingredient_name: 'salt & pepper',
          canonical_key: 'salt & pepper',
          quantity: null,
          unit: null,
          category: 'Spices',
        },
      ];

      const merged = mergeIntoExistingList(existingItems, newIngredients);

      // Should recognize they're the same and update existing
      const saltPepper = merged.find((item) => item.canonical_key === 'salt & pepper');
      expect(saltPepper).toBeDefined();
      expect(saltPepper.existing).toBe(true);
      expect(merged.filter((item) => item.canonical_key === 'salt & pepper').length).toBe(1);
    });
  });
});

describe('Shopping List Integration: No Duplicate Rows', () => {
  it('should not create duplicate rows for identical ingredients', () => {
    const ingredients = [
      { raw_text: '2 cups flour', ingredient_name: 'flour', quantity: 2, unit: 'cup', recipe_id: 'r1' },
      { raw_text: '1 cup flour', ingredient_name: 'flour', quantity: 1, unit: 'cup', recipe_id: 'r1' },
    ];

    const consolidated = consolidateIngredients(ingredients, { keepRecipeSeparate: true });

    const flourItems = consolidated.filter((item) => item.canonical_key === 'flour');
    expect(flourItems.length).toBe(1); // Should be merged into one
    expect(flourItems[0].quantity).toBe(3); // 2 + 1
  });

  it('should not duplicate bell pepper variants', () => {
    const ingredients = [
      { raw_text: '1 red bell pepper', ingredient_name: 'red bell pepper', quantity: 1, unit: null, recipe_id: 'r1' },
      { raw_text: '1 red pepper', ingredient_name: 'red pepper', quantity: 1, unit: null, recipe_id: 'r1' },
      { raw_text: '2 bell peppers', ingredient_name: 'bell peppers', quantity: 2, unit: null, recipe_id: 'r1' },
    ];

    const consolidated = consolidateIngredients(ingredients, { keepRecipeSeparate: true });

    const bellPepperItems = consolidated.filter((item) => item.canonical_key === 'bell pepper');
    expect(bellPepperItems.length).toBe(1);
    expect(bellPepperItems[0].quantity).toBe(4); // All merged
  });
});

describe('Shopping List Integration: Idempotent Recompute', () => {
  it('should produce same result when recomputed multiple times', () => {
    const ingredients = [...RECIPE_PASTA.ingredients, ...RECIPE_SALAD.ingredients];

    const result1 = consolidateIngredients(ingredients, { keepRecipeSeparate: false });
    const result2 = consolidateIngredients(ingredients, { keepRecipeSeparate: false });
    const result3 = consolidateIngredients(ingredients, { keepRecipeSeparate: false });

    // Compare lengths
    expect(result1.length).toBe(result2.length);
    expect(result2.length).toBe(result3.length);

    // Compare specific items
    const onion1 = result1.find((i) => i.canonical_key === 'onion');
    const onion2 = result2.find((i) => i.canonical_key === 'onion');
    const onion3 = result3.find((i) => i.canonical_key === 'onion');

    expect(onion1.quantity).toBe(onion2.quantity);
    expect(onion2.quantity).toBe(onion3.quantity);
  });

  it('should produce consistent ordering', () => {
    const ingredients = [...RECIPE_PASTA.ingredients, ...RECIPE_SALAD.ingredients];

    const result1 = consolidateIngredients(ingredients, { keepRecipeSeparate: false });
    const result2 = consolidateIngredients(ingredients, { keepRecipeSeparate: false });

    const names1 = result1.map((i) => i.canonical_key);
    const names2 = result2.map((i) => i.canonical_key);

    expect(names1).toEqual(names2);
  });
});
