const pool = require('../config/database');
const logger = require('../config/logger');

/**
 * Parse quantity from ingredient text
 * Handles fractions like "1/2", "1 1/2", decimals, and ranges
 */
function parseQuantity(quantityStr) {
  if (!quantityStr) return null;

  // Remove extra whitespace
  quantityStr = quantityStr.trim();

  // Handle fractions like "1/2" or "1 1/2"
  const fractionMatch = quantityStr.match(/^(\d+)?\s*(\d+)\/(\d+)$/);
  if (fractionMatch) {
    const whole = parseInt(fractionMatch[1]) || 0;
    const numerator = parseInt(fractionMatch[2]);
    const denominator = parseInt(fractionMatch[3]);
    return whole + (numerator / denominator);
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
  if (!unit) return null;

  const unitMap = {
    // Volume
    'cup': 'cup', 'cups': 'cup', 'c': 'cup',
    'tablespoon': 'tbsp', 'tablespoons': 'tbsp', 'tbsp': 'tbsp', 'T': 'tbsp',
    'teaspoon': 'tsp', 'teaspoons': 'tsp', 'tsp': 'tsp', 't': 'tsp',
    'fluid ounce': 'fl oz', 'fluid ounces': 'fl oz', 'fl oz': 'fl oz',
    'pint': 'pint', 'pints': 'pint', 'pt': 'pint',
    'quart': 'quart', 'quarts': 'quart', 'qt': 'quart',
    'gallon': 'gallon', 'gallons': 'gallon', 'gal': 'gallon',
    'milliliter': 'ml', 'milliliters': 'ml', 'ml': 'ml',
    'liter': 'l', 'liters': 'l', 'l': 'l',

    // Weight
    'pound': 'lb', 'pounds': 'lb', 'lb': 'lb', 'lbs': 'lb',
    'ounce': 'oz', 'ounces': 'oz', 'oz': 'oz',
    'gram': 'g', 'grams': 'g', 'g': 'g',
    'kilogram': 'kg', 'kilograms': 'kg', 'kg': 'kg',

    // Count
    'piece': 'piece', 'pieces': 'piece',
    'whole': 'whole',
    'can': 'can', 'cans': 'can',
    'package': 'package', 'packages': 'package', 'pkg': 'package',
    'jar': 'jar', 'jars': 'jar',
    'bottle': 'bottle', 'bottles': 'bottle',
    'box': 'box', 'boxes': 'box',
    'bunch': 'bunch', 'bunches': 'bunch',
    'clove': 'clove', 'cloves': 'clove',
    'slice': 'slice', 'slices': 'slice',
    'stalk': 'stalk', 'stalks': 'stalk',
    'stick': 'stick', 'sticks': 'stick'
  };

  const normalized = unit.toLowerCase().trim();
  return unitMap[normalized] || normalized;
}

/**
 * Parse ingredient text to extract quantity, unit, and name
 */
function parseIngredient(rawText) {
  const pattern = /^(\d+\/\d+|\d+\s+\d+\/\d+|\d+\.?\d*|\d+-\d+)?\s*([a-zA-Z]+)?\s+(.+)$/;
  const match = rawText.match(pattern);

  if (match) {
    return {
      quantity: parseQuantity(match[1]),
      unit: normalizeUnit(match[2]),
      name: match[3].trim().toLowerCase()
    };
  }

  // Fallback: just use the full text as ingredient name
  return {
    quantity: null,
    unit: null,
    name: rawText.trim().toLowerCase()
  };
}

/**
 * Consolidate ingredients from multiple recipes
 * Combines ingredients with the same name and unit
 */
function consolidateIngredients(recipeIngredients) {
  const consolidated = {};

  recipeIngredients.forEach(ing => {
    const parsed = parseIngredient(ing.rawText || ing.ingredient);

    // Create a key based on ingredient name and unit
    const key = `${parsed.name}|${parsed.unit || 'none'}`;

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
        category: null // TODO: Could add categorization logic
      };
    }
  });

  return Object.values(consolidated);
}

/**
 * Create a shopping list from selected recipes
 */
async function createFromRecipes(req, res) {
  const { recipeIds, name } = req.body;
  const userId = req.user.userId;

  try {
    // Validate input
    if (!recipeIds || !Array.isArray(recipeIds) || recipeIds.length === 0) {
      return res.status(400).json({ error: 'recipeIds array is required' });
    }

    if (!name || name.trim() === '') {
      return res.status(400).json({ error: 'Shopping list name is required' });
    }

    // Get all ingredients from selected recipes
    const ingredientsResult = await pool.query(
      `SELECT ri.raw_text, ri.quantity, ri.unit, ri.ingredient
       FROM recipe_ingredients ri
       INNER JOIN recipes r ON ri.recipe_id = r.id
       WHERE r.id = ANY($1) AND r.user_id = $2
       ORDER BY ri.sort_order`,
      [recipeIds, userId]
    );

    if (ingredientsResult.rows.length === 0) {
      return res.status(404).json({ error: 'No ingredients found for selected recipes' });
    }

    // Consolidate ingredients
    const consolidatedIngredients = consolidateIngredients(ingredientsResult.rows);

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
         (shopping_list_id, ingredient_name, quantity, unit, category, sort_order)
         VALUES ($1, $2, $3, $4, $5, $6)
         RETURNING *`,
        [
          shoppingList.id,
          item.ingredient_name,
          item.quantity,
          item.unit,
          item.category,
          index
        ]
      );
    });

    const itemResults = await Promise.all(itemPromises);
    const items = itemResults.map(r => r.rows[0]);

    logger.info('Shopping list created', {
      userId,
      listId: shoppingList.id,
      recipeCount: recipeIds.length,
      itemCount: items.length
    });

    res.status(201).json({
      shoppingList,
      items,
      message: `Shopping list created with ${items.length} consolidated items`
    });

  } catch (error) {
    logger.error('Error creating shopping list from recipes', {
      error: error.message,
      stack: error.stack,
      userId,
      recipeIds
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

    res.json({
      shoppingList: listResult.rows[0],
      items: itemsResult.rows
    });

  } catch (error) {
    logger.error('Error fetching shopping list', { error: error.message });
    res.status(500).json({ error: 'Failed to fetch shopping list' });
  }
}

/**
 * Update shopping list item (e.g., mark as checked)
 */
async function updateItem(req, res) {
  const { id } = req.params;
  const { isChecked, notes } = req.body;
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

    // Update item
    const result = await pool.query(
      `UPDATE shopping_list_items
       SET is_checked = COALESCE($1, is_checked),
           notes = COALESCE($2, notes)
       WHERE id = $3
       RETURNING *`,
      [isChecked, notes, id]
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

module.exports = {
  createFromRecipes,
  getUserShoppingLists,
  getShoppingList,
  updateItem,
  deleteShoppingList
};
