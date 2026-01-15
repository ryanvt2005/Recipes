const pool = require('../config/database');
const logger = require('../config/logger');
const { categorizeIngredient } = require('../utils/ingredientCategorizer');

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
 * Consolidate ingredients from multiple recipes
 * Combines ingredients with the same name and unit
 */
function consolidateIngredients(recipeIngredients) {
  const consolidated = {};

  recipeIngredients.forEach((ing) => {
    const parsed = parseIngredient(ing.raw_text, ing.ingredient_name);

    // Create a key based on ingredient name, unit, AND recipe_id to keep items from different recipes separate
    const key = `${parsed.name}|${parsed.unit || 'none'}|${ing.recipe_id || 'unknown'}`;

    if (consolidated[key]) {
      // Add quantities if both exist
      if (parsed.quantity !== null && consolidated[key].quantity !== null) {
        consolidated[key].quantity += parsed.quantity;
      } else if (parsed.quantity !== null) {
        consolidated[key].quantity = parsed.quantity;
      }
    } else {
      consolidated[key] = {
        ingredient_name: parsed.name,
        quantity: parsed.quantity,
        unit: parsed.unit,
        category: categorizeIngredient(parsed.name),
        recipe_id: ing.recipe_id, // Preserve recipe_id
      };
    }
  });

  return Object.values(consolidated);
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
      return res.status(400).json({ error: 'recipeIds array is required' });
    }

    if (!name || name.trim() === '') {
      return res.status(400).json({ error: 'Shopping list name is required' });
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
      return res.status(404).json({ error: 'No ingredients found for selected recipes' });
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
         (shopping_list_id, ingredient_name, quantity, unit, category, sort_order, recipe_id)
         VALUES ($1, $2, $3, $4, $5, $6, $7)
         RETURNING *`,
        [
          shoppingList.id,
          item.ingredient_name,
          item.quantity,
          item.unit,
          item.category,
          index,
          item.recipe_id,
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
    res.status(500).json({ error: 'Failed to create shopping list' });
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
    res.status(500).json({ error: 'Failed to fetch shopping lists' });
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
      return res.status(404).json({ error: 'Shopping list not found' });
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
    res.status(500).json({ error: 'Failed to fetch shopping list' });
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
      return res.status(404).json({ error: 'Shopping list item not found' });
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
    res.status(500).json({ error: 'Failed to update item' });
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
      return res.status(404).json({ error: 'Shopping list not found' });
    }

    logger.info('Shopping list deleted', { userId, listId: id });
    res.json({ message: 'Shopping list deleted successfully' });
  } catch (error) {
    logger.error('Error deleting shopping list', { error: error.message });
    res.status(500).json({ error: 'Failed to delete shopping list' });
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
      return res.status(400).json({ error: 'recipeIds array is required' });
    }

    // Verify shopping list exists and belongs to user
    const listResult = await pool.query(
      'SELECT id, name FROM shopping_lists WHERE id = $1 AND user_id = $2',
      [listId, userId]
    );

    if (listResult.rows.length === 0) {
      return res.status(404).json({ error: 'Shopping list not found' });
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
        return res.status(400).json({
          error: 'Recipe already in shopping list',
          message: `"${recipeNames[0]}" is already in this shopping list`,
          duplicateRecipes: recipeNames,
        });
      } else {
        return res.status(400).json({
          error: 'Recipes already in shopping list',
          message: `${duplicateRecipeIds.length} recipe(s) are already in this shopping list: ${recipeNames.join(', ')}`,
          duplicateRecipes: recipeNames,
        });
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
      return res.status(404).json({ error: 'No ingredients found for selected recipes' });
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
    const newIngredients = consolidateIngredients(scaledIngredients);

    // Merge with existing items
    const mergedItems = {};

    // Add existing items to merged
    existingItems.forEach((item) => {
      const key = `${item.ingredient_name}|${item.unit || 'none'}`;
      mergedItems[key] = {
        id: item.id,
        ingredient_name: item.ingredient_name,
        quantity: item.quantity,
        unit: item.unit,
        category: item.category,
        existing: true,
      };
    });

    // Add or merge new ingredients
    newIngredients.forEach((ing) => {
      const key = `${ing.ingredient_name}|${ing.unit || 'none'}`;

      if (mergedItems[key]) {
        // Update existing item quantity
        if (ing.quantity !== null && mergedItems[key].quantity !== null) {
          mergedItems[key].quantity += ing.quantity;
        } else if (ing.quantity !== null) {
          mergedItems[key].quantity = ing.quantity;
        }
      } else {
        // Add new item
        mergedItems[key] = {
          ingredient_name: ing.ingredient_name,
          quantity: ing.quantity,
          unit: ing.unit,
          category: ing.category || categorizeIngredient(ing.ingredient_name),
          recipe_id: ing.recipe_id, // Track which recipe this ingredient came from
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
           (shopping_list_id, ingredient_name, quantity, unit, category, recipe_id)
           VALUES ($1, $2, $3, $4, $5, $6)
           RETURNING *`,
          [listId, item.ingredient_name, item.quantity, item.unit, item.category, item.recipe_id]
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
    res.status(500).json({ error: 'Failed to add recipes to shopping list' });
  }
}

/**
 * Remove a recipe from a shopping list
 * Deletes all items associated with that recipe
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
      return res.status(404).json({ error: 'Shopping list not found' });
    }

    // Delete all items from this recipe
    await client.query(
      'DELETE FROM shopping_list_items WHERE shopping_list_id = $1 AND recipe_id = $2',
      [shoppingListId, recipeId]
    );

    // Remove from shopping_list_recipes join table
    await client.query(
      'DELETE FROM shopping_list_recipes WHERE shopping_list_id = $1 AND recipe_id = $2',
      [shoppingListId, recipeId]
    );

    await client.query('COMMIT');

    logger.info(`Removed recipe ${recipeId} from shopping list ${shoppingListId}`);
    res.json({ message: 'Recipe removed from shopping list' });
  } catch (error) {
    await client.query('ROLLBACK');
    logger.error('Error removing recipe from shopping list:', error);
    res.status(500).json({ error: 'Failed to remove recipe from shopping list' });
  } finally {
    client.release();
  }
}

module.exports = {
  createFromRecipes,
  getUserShoppingLists,
  getShoppingList,
  updateItem,
  deleteShoppingList,
  addRecipesToList,
  removeRecipeFromList,
};
