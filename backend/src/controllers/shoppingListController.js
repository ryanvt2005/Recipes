const pool = require('../config/database');
const logger = require('../config/logger');
const { categorizeIngredient } = require('../utils/ingredientCategorizer');
const { ErrorCodes, sendError, errors } = require('../utils/errorResponse');
const {
  aggregateIngredients,
  normalizeIngredientName,
  areUnitsCompatible,
} = require('../utils/ingredientAggregator');
const { toNumber } = require('../utils/ingredientParser');

/**
 * Parse quantity from ingredient text
 * Handles fractions like "1/2", "1 1/2", decimals, and ranges
 */
function parseQuantity(quantityStr) {
  if (!quantityStr) {
    return null;
  }

  // Remove extra whitespace
  quantityStr = quantityStr.trim();

  // Handle fractions like "1/2" or "1 1/2"
  const fractionMatch = quantityStr.match(/^(\d+)?\s*(\d+)\/(\d+)$/);
  if (fractionMatch) {
    const whole = parseInt(fractionMatch[1]) || 0;
    const numerator = parseInt(fractionMatch[2]);
    const denominator = parseInt(fractionMatch[3]);
    return whole + numerator / denominator;
  }

  // Handle ranges like "2-3" - take the average
  const rangeMatch = quantityStr.match(/^(\d+\.?\d*)\s*-\s*(\d+\.?\d*)$/);
  if (rangeMatch) {
    return (parseFloat(rangeMatch[1]) + parseFloat(rangeMatch[2])) / 2;
  }

  // Handle simple numbers
  const numberMatch = quantityStr.match(/^(\d+\.?\d*)/);
  if (numberMatch) {
    return parseFloat(numberMatch[1]);
  }

  return null;
}

/**
 * Normalize unit names to standard forms
 */
function normalizeUnit(unit) {
  if (!unit) {
    return null;
  }

  const unitMap = {
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

  const normalized = unit.toLowerCase().trim();
  return unitMap[normalized] || normalized;
}

/**
 * Parse ingredient text to extract quantity, unit, and name
 */
function parseIngredient(rawText, ingredientName) {
  // If we have ingredient_name from database, use it; otherwise parse rawText
  if (ingredientName) {
    // Try to extract quantity and unit from rawText
    const pattern = /^(\d+\/\d+|\d+\s+\d+\/\d+|\d+\.?\d*|\d+-\d+)?\s*([a-zA-Z]+)?\s+/;
    const match = rawText.match(pattern);

    if (match) {
      return {
        quantity: parseQuantity(match[1]),
        unit: normalizeUnit(match[2]),
        name: ingredientName.trim().toLowerCase(),
      };
    }

    return {
      quantity: null,
      unit: null,
      name: ingredientName.trim().toLowerCase(),
    };
  }

  // Fallback: parse from rawText
  const pattern = /^(\d+\/\d+|\d+\s+\d+\/\d+|\d+\.?\d*|\d+-\d+)?\s*([a-zA-Z]+)?\s+(.+)$/;
  const match = rawText.match(pattern);

  if (match) {
    return {
      quantity: parseQuantity(match[1]),
      unit: normalizeUnit(match[2]),
      name: match[3].trim().toLowerCase(),
    };
  }

  // Fallback: just use the full text as ingredient name
  return {
    quantity: null,
    unit: null,
    name: rawText.trim().toLowerCase(),
  };
}

/**
 * Consolidate ingredients from multiple recipes using the v2 aggregation engine
 * Combines ingredients with the same canonical name, handles bell pepper variants,
 * normalizes "salt and pepper" style compounds, and sums compatible units
 *
 * @param {Array} recipeIngredients - Raw ingredients from database
 * @param {Object} options - Aggregation options
 * @param {boolean} options.keepRecipeSeparate - If true, don't merge across recipes (default: false to enable cross-recipe aggregation)
 * @returns {Array} Consolidated ingredient items ready for database insertion
 */
function consolidateIngredients(recipeIngredients, options = {}) {
  const { keepRecipeSeparate = false } = options;

  // Transform database format to aggregator input format
  const lines = recipeIngredients.map((ing) => {
    const parsed = parseIngredient(ing.raw_text, ing.ingredient_name);
    // Prefer database quantity/unit over parsed values (database has the authoritative data)
    // Only use parsed values as fallback if database values are missing
    // Use centralized toNumber for consistent PostgreSQL string handling
    const quantity = toNumber(ing.quantity ?? parsed.quantity);

    return {
      recipeId: ing.recipe_id,
      originalText: ing.raw_text,
      name: parsed.name || ing.ingredient_name,
      quantity,
      unit: ing.unit ?? parsed.unit,
    };
  });

  if (keepRecipeSeparate) {
    // For initial creation: keep items from different recipes separate
    // Group by recipe first, then aggregate within each recipe
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

  // For merging: aggregate across all recipes
  const aggregated = aggregateIngredients(lines);

  return aggregated.map((item) => ({
    ingredient_name: item.displayName.toLowerCase(),
    display_name: item.displayName,
    canonical_key: item.canonicalKey,
    quantity: item.totalQuantity,
    unit: item.unit,
    category: categorizeIngredient(item.canonicalKey),
    recipe_id: null, // Merged across recipes
    components: item.components,
    notes: item.notes,
    source_lines: item.sourceLines,
  }));
}

/**
 * Create a shopping list from selected recipes
 * Accepts recipeIds as array of strings OR array of {recipeId, scaledServings} objects
 * Accepts excludedIngredientIds array to filter out specific ingredients
 */
async function createFromRecipes(req, res) {
  const { recipeIds, name, excludedIngredientIds = [] } = req.body;
  const userId = req.user.userId;

  try {
    // Validate input
    if (!recipeIds || !Array.isArray(recipeIds) || recipeIds.length === 0) {
      return errors.badRequest(res, 'recipeIds array is required');
    }

    if (!name || name.trim() === '') {
      return errors.badRequest(res, 'Shopping list name is required');
    }

    // Parse recipeIds - support both string array and object array
    const recipeData = recipeIds.map((item) => {
      if (typeof item === 'string') {
        return { recipeId: item, scaledServings: null };
      }
      return { recipeId: item.recipeId, scaledServings: item.scaledServings || null };
    });

    const justIds = recipeData.map((r) => r.recipeId);

    // Get all ingredients AND original servings from selected recipes
    const ingredientsResult = await pool.query(
      `SELECT i.raw_text, i.quantity, i.unit, i.ingredient_name, i.recipe_id, r.servings as recipe_servings
       FROM ingredients i
       INNER JOIN recipes r ON i.recipe_id = r.id
       WHERE r.id = ANY($1) AND r.user_id = $2
       ORDER BY i.sort_order`,
      [justIds, userId]
    );

    if (ingredientsResult.rows.length === 0) {
      return errors.notFound(res, 'No ingredients found for selected recipes');
    }

    // Filter out excluded ingredients
    const filteredIngredients = ingredientsResult.rows.filter(
      (ing) => !excludedIngredientIds.includes(ing.id)
    );

    // Scale ingredients if needed
    const scaledIngredients = filteredIngredients.map((ingredient) => {
      const recipeInfo = recipeData.find((r) => r.recipeId === ingredient.recipe_id);

      if (!recipeInfo || !recipeInfo.scaledServings) {
        // No scaling needed
        return ingredient;
      }

      // Parse original servings
      const { parseServings } = require('../utils/recipeScaling');
      const originalServings = parseServings(ingredient.recipe_servings);

      if (!originalServings) {
        // Can't scale without original servings
        return ingredient;
      }

      const scaleFactor = recipeInfo.scaledServings / originalServings;

      return {
        ...ingredient,
        quantity: ingredient.quantity ? ingredient.quantity * scaleFactor : ingredient.quantity,
      };
    });

    // Consolidate ingredients
    const consolidatedIngredients = consolidateIngredients(scaledIngredients);

    // Create shopping list
    const listResult = await pool.query(
      `INSERT INTO shopping_lists (user_id, name)
       VALUES ($1, $2)
       RETURNING *`,
      [userId, name.trim()]
    );

    const shoppingList = listResult.rows[0];

    // Insert consolidated items
    const itemPromises = consolidatedIngredients.map((item, index) => {
      return pool.query(
        `INSERT INTO shopping_list_items
         (shopping_list_id, ingredient_name, quantity, unit, category, sort_order, recipe_id, notes)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
         RETURNING *`,
        [
          shoppingList.id,
          item.ingredient_name,
          item.quantity,
          item.unit,
          item.category,
          index,
          item.recipe_id,
          item.notes || null,
        ]
      );
    });

    const itemResults = await Promise.all(itemPromises);
    const items = itemResults.map((r) => r.rows[0]);

    // Track which recipes were included in this shopping list
    const recipeAssociationPromises = recipeData.map((recipe) => {
      return pool.query(
        `INSERT INTO shopping_list_recipes
         (shopping_list_id, recipe_id, scaled_servings)
         VALUES ($1, $2, $3)
         ON CONFLICT (shopping_list_id, recipe_id) DO NOTHING`,
        [shoppingList.id, recipe.recipeId, recipe.scaledServings]
      );
    });

    await Promise.all(recipeAssociationPromises);

    logger.info('Shopping list created', {
      userId,
      listId: shoppingList.id,
      recipeCount: recipeIds.length,
      itemCount: items.length,
    });

    res.status(201).json({
      shoppingList,
      items,
      message: `Shopping list created with ${items.length} consolidated items`,
    });
  } catch (error) {
    console.error('=== SHOPPING LIST ERROR ===');
    console.error('Message:', error.message);
    console.error('Stack:', error.stack);
    console.error('User ID:', userId);
    console.error('Recipe IDs:', recipeIds);
    console.error('===========================');

    logger.error('Error creating shopping list from recipes', {
      error: error.message,
      stack: error.stack,
      userId,
      recipeIds,
    });
    return errors.internal(res, 'Failed to create shopping list');
  }
}

/**
 * Get all shopping lists for the current user
 */
async function getUserShoppingLists(req, res) {
  const userId = req.user.userId;

  try {
    const result = await pool.query(
      `SELECT sl.*, COUNT(sli.id) as item_count
       FROM shopping_lists sl
       LEFT JOIN shopping_list_items sli ON sl.id = sli.shopping_list_id
       WHERE sl.user_id = $1
       GROUP BY sl.id
       ORDER BY sl.created_at DESC`,
      [userId]
    );

    res.json({ shoppingLists: result.rows });
  } catch (error) {
    logger.error('Error fetching shopping lists', { error: error.message });
    return errors.internal(res, 'Failed to fetch shopping lists');
  }
}

/**
 * Get a single shopping list with all its items
 */
async function getShoppingList(req, res) {
  const { id } = req.params;
  const userId = req.user.userId;

  try {
    // Get shopping list
    const listResult = await pool.query(
      'SELECT * FROM shopping_lists WHERE id = $1 AND user_id = $2',
      [id, userId]
    );

    if (listResult.rows.length === 0) {
      return errors.notFound(res, 'Shopping list not found');
    }

    // Get items
    const itemsResult = await pool.query(
      `SELECT * FROM shopping_list_items
       WHERE shopping_list_id = $1
       ORDER BY sort_order, ingredient_name`,
      [id]
    );

    // Get associated recipes
    const recipesResult = await pool.query(
      `SELECT r.id, r.title, r.image_url, slr.scaled_servings, slr.added_at
       FROM shopping_list_recipes slr
       INNER JOIN recipes r ON slr.recipe_id = r.id
       WHERE slr.shopping_list_id = $1
       ORDER BY slr.added_at`,
      [id]
    );

    res.json({
      shoppingList: listResult.rows[0],
      items: itemsResult.rows,
      recipes: recipesResult.rows,
    });
  } catch (error) {
    logger.error('Error fetching shopping list', { error: error.message });
    return errors.internal(res, 'Failed to fetch shopping list');
  }
}

/**
 * Update shopping list item (e.g., mark as checked, change category)
 */
async function updateItem(req, res) {
  const { id } = req.params;
  const { isChecked, notes, category } = req.body;
  const userId = req.user.userId;

  try {
    // Verify the item belongs to the user
    const verifyResult = await pool.query(
      `SELECT sli.* FROM shopping_list_items sli
       INNER JOIN shopping_lists sl ON sli.shopping_list_id = sl.id
       WHERE sli.id = $1 AND sl.user_id = $2`,
      [id, userId]
    );

    if (verifyResult.rows.length === 0) {
      return errors.notFound(res, 'Shopping list item not found');
    }

    const item = verifyResult.rows[0];

    // If category is being changed, record it as a learning override
    if (category && category !== item.category) {
      const { recordCategoryOverride } = require('../utils/ingredientCategorizer');
      try {
        await recordCategoryOverride(item.ingredient_name, category, pool);
        logger.info('Category override recorded', {
          ingredient: item.ingredient_name,
          oldCategory: item.category,
          newCategory: category,
        });
      } catch (error) {
        logger.error('Failed to record category override', { error: error.message });
        // Continue with update even if override recording fails
      }
    }

    // Update item
    const result = await pool.query(
      `UPDATE shopping_list_items
       SET is_checked = COALESCE($1, is_checked),
           notes = COALESCE($2, notes),
           category = COALESCE($3, category)
       WHERE id = $4
       RETURNING *`,
      [isChecked, notes, category, id]
    );

    res.json({ item: result.rows[0] });
  } catch (error) {
    logger.error('Error updating shopping list item', { error: error.message });
    return errors.internal(res, 'Failed to update item');
  }
}

/**
 * Delete a single item from a shopping list
 */
async function deleteItem(req, res) {
  const { id } = req.params;
  const userId = req.user.userId;

  try {
    // Verify the item belongs to the user's shopping list
    const verifyResult = await pool.query(
      `SELECT sli.id, sl.id as list_id FROM shopping_list_items sli
       INNER JOIN shopping_lists sl ON sli.shopping_list_id = sl.id
       WHERE sli.id = $1 AND sl.user_id = $2`,
      [id, userId]
    );

    if (verifyResult.rows.length === 0) {
      return errors.notFound(res, 'Shopping list item not found');
    }

    // Delete the item
    await pool.query('DELETE FROM shopping_list_items WHERE id = $1', [id]);

    logger.info('Shopping list item deleted', { userId, itemId: id });
    res.json({ message: 'Item deleted successfully' });
  } catch (error) {
    logger.error('Error deleting shopping list item', { error: error.message });
    return errors.internal(res, 'Failed to delete item');
  }
}

/**
 * Delete a shopping list
 */
async function deleteShoppingList(req, res) {
  const { id } = req.params;
  const userId = req.user.userId;

  try {
    const result = await pool.query(
      'DELETE FROM shopping_lists WHERE id = $1 AND user_id = $2 RETURNING *',
      [id, userId]
    );

    if (result.rows.length === 0) {
      return errors.notFound(res, 'Shopping list not found');
    }

    logger.info('Shopping list deleted', { userId, listId: id });
    res.json({ message: 'Shopping list deleted successfully' });
  } catch (error) {
    logger.error('Error deleting shopping list', { error: error.message });
    return errors.internal(res, 'Failed to delete shopping list');
  }
}

/**
 * Add recipes to an existing shopping list
 * Accepts excludedIngredientIds array to filter out specific ingredients
 */
async function addRecipesToList(req, res) {
  const userId = req.user.userId;
  const listId = req.params.id;
  const { recipeIds, excludedIngredientIds = [] } = req.body;

  try {
    // Validate input
    if (!recipeIds || !Array.isArray(recipeIds) || recipeIds.length === 0) {
      return errors.badRequest(res, 'recipeIds array is required');
    }

    // Verify shopping list exists and belongs to user
    const listResult = await pool.query(
      'SELECT id, name FROM shopping_lists WHERE id = $1 AND user_id = $2',
      [listId, userId]
    );

    if (listResult.rows.length === 0) {
      return errors.notFound(res, 'Shopping list not found');
    }

    // Parse recipeIds - support both string array and object array
    const recipeData = recipeIds.map((item) => {
      if (typeof item === 'string') {
        return { recipeId: item, scaledServings: null };
      }
      return { recipeId: item.recipeId, scaledServings: item.scaledServings || null };
    });

    const justIds = recipeData.map((r) => r.recipeId);

    // Check if any recipes are already in this shopping list
    const existingRecipesResult = await pool.query(
      `SELECT recipe_id FROM shopping_list_recipes
       WHERE shopping_list_id = $1 AND recipe_id = ANY($2)`,
      [listId, justIds]
    );

    if (existingRecipesResult.rows.length > 0) {
      const duplicateRecipeIds = existingRecipesResult.rows.map((row) => row.recipe_id);

      // Get recipe names for better error message
      const recipeNamesResult = await pool.query(
        `SELECT id, title FROM recipes WHERE id = ANY($1)`,
        [duplicateRecipeIds]
      );

      const recipeNames = recipeNamesResult.rows.map((r) => r.title);

      if (duplicateRecipeIds.length === 1) {
        return sendError(
          res,
          400,
          ErrorCodes.DUPLICATE_RECIPE,
          `"${recipeNames[0]}" is already in this shopping list`,
          {
            duplicateRecipes: recipeNames,
          }
        );
      } else {
        return sendError(
          res,
          400,
          ErrorCodes.DUPLICATE_RECIPE,
          `${duplicateRecipeIds.length} recipe(s) are already in this shopping list: ${recipeNames.join(', ')}`,
          {
            duplicateRecipes: recipeNames,
          }
        );
      }
    }

    // Get ingredients AND original servings
    const ingredientsResult = await pool.query(
      `SELECT i.raw_text, i.quantity, i.unit, i.ingredient_name, i.recipe_id, r.servings as recipe_servings
       FROM ingredients i
       INNER JOIN recipes r ON i.recipe_id = r.id
       WHERE r.id = ANY($1) AND r.user_id = $2
       ORDER BY i.sort_order`,
      [justIds, userId]
    );

    if (ingredientsResult.rows.length === 0) {
      return errors.notFound(res, 'No ingredients found for selected recipes');
    }

    // Filter out excluded ingredients
    const filteredIngredients = ingredientsResult.rows.filter(
      (ing) => !excludedIngredientIds.includes(ing.id)
    );

    // Scale ingredients if needed
    const scaledIngredients = filteredIngredients.map((ingredient) => {
      const recipeInfo = recipeData.find((r) => r.recipeId === ingredient.recipe_id);

      if (!recipeInfo || !recipeInfo.scaledServings) {
        return ingredient;
      }

      const { parseServings } = require('../utils/recipeScaling');
      const originalServings = parseServings(ingredient.recipe_servings);

      if (!originalServings) {
        return ingredient;
      }

      const scaleFactor = recipeInfo.scaledServings / originalServings;

      return {
        ...ingredient,
        quantity: ingredient.quantity ? ingredient.quantity * scaleFactor : ingredient.quantity,
      };
    });

    // Get existing items from the shopping list
    const existingItemsResult = await pool.query(
      `SELECT * FROM shopping_list_items WHERE shopping_list_id = $1`,
      [listId]
    );

    const existingItems = existingItemsResult.rows;
    // Use aggregation engine without recipe separation for merging
    const newIngredients = consolidateIngredients(scaledIngredients, { keepRecipeSeparate: false });

    // Merge with existing items using canonical keys for matching
    const mergedItems = {};

    // Add existing items to merged - normalize their names for matching
    existingItems.forEach((item) => {
      const { canonicalKey } = normalizeIngredientName(item.ingredient_name);
      const key = `${canonicalKey}|${item.unit || 'none'}`;
      mergedItems[key] = {
        id: item.id,
        ingredient_name: item.ingredient_name,
        display_name: item.display_name || item.ingredient_name,
        canonical_key: canonicalKey,
        quantity: item.quantity,
        unit: item.unit,
        category: item.category,
        existing: true,
      };
    });

    // Add or merge new ingredients using canonical keys
    newIngredients.forEach((ing) => {
      const canonicalKey = ing.canonical_key;
      const key = `${canonicalKey}|${ing.unit || 'none'}`;

      if (mergedItems[key]) {
        // Check if units are compatible for summing
        if (areUnitsCompatible(mergedItems[key].unit, ing.unit)) {
          // Update existing item quantity using centralized coercion
          const existingQty = toNumber(mergedItems[key].quantity);
          const newQty = toNumber(ing.quantity);

          if (newQty !== null && existingQty !== null) {
            mergedItems[key].quantity = existingQty + newQty;
          } else if (newQty !== null) {
            mergedItems[key].quantity = newQty;
          }
          // Update notes if we have component breakdown
          if (ing.notes) {
            mergedItems[key].notes = ing.notes;
          }
          if (ing.components) {
            mergedItems[key].components = ing.components;
          }
        } else {
          // Units not compatible - add as separate item with different key
          const altKey = `${canonicalKey}|${ing.unit || 'none'}|new`;
          mergedItems[altKey] = {
            ingredient_name: ing.ingredient_name,
            display_name: ing.display_name,
            canonical_key: canonicalKey,
            quantity: ing.quantity,
            unit: ing.unit,
            category: ing.category || categorizeIngredient(canonicalKey),
            components: ing.components,
            notes: ing.notes,
            existing: false,
          };
        }
      } else {
        // Add new item
        mergedItems[key] = {
          ingredient_name: ing.ingredient_name,
          display_name: ing.display_name,
          canonical_key: canonicalKey,
          quantity: ing.quantity,
          unit: ing.unit,
          category: ing.category || categorizeIngredient(canonicalKey),
          components: ing.components,
          notes: ing.notes,
          existing: false,
        };
      }
    });

    // Update or insert items
    const updatePromises = Object.values(mergedItems).map(async (item) => {
      if (item.existing) {
        // Update existing item
        return pool.query(
          `UPDATE shopping_list_items
           SET quantity = $1
           WHERE id = $2
           RETURNING *`,
          [item.quantity, item.id]
        );
      } else {
        // Insert new item
        return pool.query(
          `INSERT INTO shopping_list_items
           (shopping_list_id, ingredient_name, quantity, unit, category, recipe_id, notes)
           VALUES ($1, $2, $3, $4, $5, $6, $7)
           RETURNING *`,
          [
            listId,
            item.ingredient_name,
            item.quantity,
            item.unit,
            item.category,
            item.recipe_id,
            item.notes || null,
          ]
        );
      }
    });

    await Promise.all(updatePromises);

    // Track which recipes were added to this shopping list
    const recipeAssociationPromises = recipeData.map((recipe) => {
      return pool.query(
        `INSERT INTO shopping_list_recipes
         (shopping_list_id, recipe_id, scaled_servings)
         VALUES ($1, $2, $3)
         ON CONFLICT (shopping_list_id, recipe_id) DO NOTHING`,
        [listId, recipe.recipeId, recipe.scaledServings]
      );
    });

    await Promise.all(recipeAssociationPromises);

    // Get updated shopping list
    const updatedItemsResult = await pool.query(
      `SELECT * FROM shopping_list_items
       WHERE shopping_list_id = $1
       ORDER BY sort_order, ingredient_name`,
      [listId]
    );

    logger.info('Recipes added to shopping list', {
      userId,
      listId,
      recipeCount: recipeIds.length,
    });

    res.status(200).json({
      shoppingList: listResult.rows[0],
      items: updatedItemsResult.rows,
      message: 'Recipes added to shopping list successfully',
    });
  } catch (error) {
    logger.error('Error adding recipes to shopping list', { error: error.message });
    return errors.internal(res, 'Failed to add recipes to shopping list');
  }
}

/**
 * Remove a recipe from a shopping list
 * Recomputes the shopping list by re-aggregating remaining recipes
 */
async function removeRecipeFromList(req, res) {
  const client = await pool.connect();

  try {
    const { id: shoppingListId, recipeId } = req.params;
    const userId = req.user.userId;

    await client.query('BEGIN');

    // Verify shopping list belongs to user
    const listCheck = await client.query(
      'SELECT id FROM shopping_lists WHERE id = $1 AND user_id = $2',
      [shoppingListId, userId]
    );

    if (listCheck.rows.length === 0) {
      await client.query('ROLLBACK');
      return errors.notFound(res, 'Shopping list not found');
    }

    // Get remaining recipes after removing this one
    const remainingRecipesResult = await client.query(
      `SELECT recipe_id, scaled_servings FROM shopping_list_recipes
       WHERE shopping_list_id = $1 AND recipe_id != $2`,
      [shoppingListId, recipeId]
    );

    const remainingRecipes = remainingRecipesResult.rows;

    // Delete all current items from the shopping list
    await client.query('DELETE FROM shopping_list_items WHERE shopping_list_id = $1', [
      shoppingListId,
    ]);

    // Remove the recipe from shopping_list_recipes join table
    await client.query(
      'DELETE FROM shopping_list_recipes WHERE shopping_list_id = $1 AND recipe_id = $2',
      [shoppingListId, recipeId]
    );

    // If there are remaining recipes, recompute the shopping list
    if (remainingRecipes.length > 0) {
      const recipeIds = remainingRecipes.map((r) => r.recipe_id);

      // Get ingredients from remaining recipes
      const ingredientsResult = await client.query(
        `SELECT i.raw_text, i.quantity, i.unit, i.ingredient_name, i.recipe_id, r.servings as recipe_servings
         FROM ingredients i
         INNER JOIN recipes r ON i.recipe_id = r.id
         WHERE r.id = ANY($1) AND r.user_id = $2
         ORDER BY i.sort_order`,
        [recipeIds, userId]
      );

      if (ingredientsResult.rows.length > 0) {
        // Scale ingredients if needed
        const { parseServings } = require('../utils/recipeScaling');
        const scaledIngredients = ingredientsResult.rows.map((ingredient) => {
          const recipeInfo = remainingRecipes.find((r) => r.recipe_id === ingredient.recipe_id);

          if (!recipeInfo || !recipeInfo.scaled_servings) {
            return ingredient;
          }

          const originalServings = parseServings(ingredient.recipe_servings);
          if (!originalServings) {
            return ingredient;
          }

          const scaleFactor = recipeInfo.scaled_servings / originalServings;
          return {
            ...ingredient,
            quantity: ingredient.quantity ? ingredient.quantity * scaleFactor : ingredient.quantity,
          };
        });

        // Re-aggregate across all remaining recipes
        const consolidatedIngredients = consolidateIngredients(scaledIngredients);

        // Insert the recomputed items
        for (let index = 0; index < consolidatedIngredients.length; index++) {
          const item = consolidatedIngredients[index];
          await client.query(
            `INSERT INTO shopping_list_items
             (shopping_list_id, ingredient_name, quantity, unit, category, sort_order, recipe_id, notes)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
            [
              shoppingListId,
              item.ingredient_name,
              item.quantity,
              item.unit,
              item.category,
              index,
              item.recipe_id,
              item.notes || null,
            ]
          );
        }
      }
    }

    await client.query('COMMIT');

    // Get the updated items to return
    const updatedItemsResult = await pool.query(
      `SELECT * FROM shopping_list_items
       WHERE shopping_list_id = $1
       ORDER BY sort_order, ingredient_name`,
      [shoppingListId]
    );

    // Get remaining associated recipes
    const recipesResult = await pool.query(
      `SELECT r.id, r.title, r.image_url, slr.scaled_servings, slr.added_at
       FROM shopping_list_recipes slr
       INNER JOIN recipes r ON slr.recipe_id = r.id
       WHERE slr.shopping_list_id = $1
       ORDER BY slr.added_at`,
      [shoppingListId]
    );

    logger.info(
      `Removed recipe ${recipeId} from shopping list ${shoppingListId}, recomputed with ${remainingRecipes.length} remaining recipes`
    );

    res.json({
      message: 'Recipe removed from shopping list',
      items: updatedItemsResult.rows,
      recipes: recipesResult.rows,
    });
  } catch (error) {
    await client.query('ROLLBACK');
    logger.error('Error removing recipe from shopping list:', error);
    return errors.internal(res, 'Failed to remove recipe from shopping list');
  } finally {
    client.release();
  }
}

/**
 * Recompute a shopping list from its associated recipes
 * Useful for refreshing a list after recipe changes or applying new aggregation rules
 */
async function recomputeShoppingList(req, res) {
  const client = await pool.connect();

  try {
    const { id: shoppingListId } = req.params;
    const userId = req.user.userId;

    await client.query('BEGIN');

    // Verify shopping list belongs to user
    const listCheck = await client.query(
      'SELECT * FROM shopping_lists WHERE id = $1 AND user_id = $2',
      [shoppingListId, userId]
    );

    if (listCheck.rows.length === 0) {
      await client.query('ROLLBACK');
      return errors.notFound(res, 'Shopping list not found');
    }

    // Get all associated recipes
    const recipesResult = await client.query(
      `SELECT recipe_id, scaled_servings FROM shopping_list_recipes
       WHERE shopping_list_id = $1`,
      [shoppingListId]
    );

    const recipes = recipesResult.rows;

    if (recipes.length === 0) {
      // No recipes - just clear items
      await client.query('DELETE FROM shopping_list_items WHERE shopping_list_id = $1', [
        shoppingListId,
      ]);

      await client.query('COMMIT');

      return res.json({
        message: 'Shopping list recomputed (no recipes)',
        items: [],
        recipes: [],
      });
    }

    const recipeIds = recipes.map((r) => r.recipe_id);

    // Get ingredients from all recipes
    const ingredientsResult = await client.query(
      `SELECT i.raw_text, i.quantity, i.unit, i.ingredient_name, i.recipe_id, r.servings as recipe_servings
       FROM ingredients i
       INNER JOIN recipes r ON i.recipe_id = r.id
       WHERE r.id = ANY($1) AND r.user_id = $2
       ORDER BY i.sort_order`,
      [recipeIds, userId]
    );

    // Delete all current items
    await client.query('DELETE FROM shopping_list_items WHERE shopping_list_id = $1', [
      shoppingListId,
    ]);

    if (ingredientsResult.rows.length > 0) {
      // Scale ingredients if needed
      const { parseServings } = require('../utils/recipeScaling');
      const scaledIngredients = ingredientsResult.rows.map((ingredient) => {
        const recipeInfo = recipes.find((r) => r.recipe_id === ingredient.recipe_id);

        if (!recipeInfo || !recipeInfo.scaled_servings) {
          return ingredient;
        }

        const originalServings = parseServings(ingredient.recipe_servings);
        if (!originalServings) {
          return ingredient;
        }

        const scaleFactor = recipeInfo.scaled_servings / originalServings;
        return {
          ...ingredient,
          quantity: ingredient.quantity ? ingredient.quantity * scaleFactor : ingredient.quantity,
        };
      });

      // Re-aggregate across all recipes
      const consolidatedIngredients = consolidateIngredients(scaledIngredients);

      // Insert the recomputed items
      for (let index = 0; index < consolidatedIngredients.length; index++) {
        const item = consolidatedIngredients[index];
        await client.query(
          `INSERT INTO shopping_list_items
           (shopping_list_id, ingredient_name, quantity, unit, category, sort_order, recipe_id, notes)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
          [
            shoppingListId,
            item.ingredient_name,
            item.quantity,
            item.unit,
            item.category,
            index,
            item.recipe_id,
            item.notes || null,
          ]
        );
      }
    }

    await client.query('COMMIT');

    // Get the updated items
    const updatedItemsResult = await pool.query(
      `SELECT * FROM shopping_list_items
       WHERE shopping_list_id = $1
       ORDER BY sort_order, ingredient_name`,
      [shoppingListId]
    );

    // Get associated recipes with details
    const recipeDetailsResult = await pool.query(
      `SELECT r.id, r.title, r.image_url, slr.scaled_servings, slr.added_at
       FROM shopping_list_recipes slr
       INNER JOIN recipes r ON slr.recipe_id = r.id
       WHERE slr.shopping_list_id = $1
       ORDER BY slr.added_at`,
      [shoppingListId]
    );

    logger.info(`Recomputed shopping list ${shoppingListId} with ${recipes.length} recipes`);

    res.json({
      message: `Shopping list recomputed with ${updatedItemsResult.rows.length} items`,
      shoppingList: listCheck.rows[0],
      items: updatedItemsResult.rows,
      recipes: recipeDetailsResult.rows,
    });
  } catch (error) {
    await client.query('ROLLBACK');
    logger.error('Error recomputing shopping list:', error);
    return errors.internal(res, 'Failed to recompute shopping list');
  } finally {
    client.release();
  }
}

module.exports = {
  createFromRecipes,
  getUserShoppingLists,
  getShoppingList,
  updateItem,
  deleteItem,
  deleteShoppingList,
  addRecipesToList,
  removeRecipeFromList,
  recomputeShoppingList,
};
