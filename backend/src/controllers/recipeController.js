const pool = require('../config/database');
const { extractRecipe, RecipeExtractionError, normalizeUrl } = require('../services/recipeExtractionService');
const logger = require('../config/logger');
const { scaleRecipe } = require('../utils/recipeScaling');
const { ErrorCodes, sendError, errors } = require('../utils/errorResponse');

/**
 * Get ingredients for multiple recipes (for preview before adding to shopping list)
 */
async function getIngredientsForRecipes(req, res) {
  const userId = req.user.userId;
  const { recipeIds } = req.body;

  try {
    if (!recipeIds || !Array.isArray(recipeIds) || recipeIds.length === 0) {
      return errors.badRequest(res, 'recipeIds array is required');
    }

    const result = await pool.query(
      `SELECT i.id, i.raw_text, i.ingredient_name, i.recipe_id, r.title as recipe_title
       FROM ingredients i
       INNER JOIN recipes r ON i.recipe_id = r.id
       WHERE r.id = ANY($1) AND r.user_id = $2
       ORDER BY r.title, i.sort_order`,
      [recipeIds, userId]
    );

    res.json({ ingredients: result.rows });
  } catch (error) {
    logger.error('Error fetching ingredients for recipes', { error: error.message });
    return sendError(res, 500, ErrorCodes.FETCH_FAILED, 'Failed to fetch ingredients');
  }
}

/**
 * Extract recipe from URL
 */
async function extractRecipeFromUrl(req, res) {
  const { url } = req.body;
  const userId = req.user.userId;

  try {
    // Check for duplicate before extraction
    const normalizedUrl = normalizeUrl(url);
    const existing = await pool.query(
      `SELECT id, title, image_url, created_at
       FROM recipes
       WHERE user_id = $1 AND source_url = $2`,
      [userId, normalizedUrl]
    );

    if (existing.rows.length > 0) {
      return sendError(res, 409, ErrorCodes.DUPLICATE_RECIPE,
        'You already have this recipe saved', {
          existingRecipe: {
            id: existing.rows[0].id,
            title: existing.rows[0].title,
            imageUrl: existing.rows[0].image_url,
            createdAt: existing.rows[0].created_at
          }
        }
      );
    }

    const recipe = await extractRecipe(url);

    res.status(200).json({ recipe });
  } catch (error) {
    if (error instanceof RecipeExtractionError) {
      return res.status(422).json({
        error: error.code,
        message: error.message,
        details: error.details,
      });
    }

    logger.error('Recipe extraction error', { error: error.message });
    return sendError(
      res,
      500,
      ErrorCodes.EXTRACTION_ERROR,
      'An unexpected error occurred during extraction'
    );
  }
}

/**
 * Save a recipe
 */
async function saveRecipe(req, res) {
  const userId = req.user.userId;
  const {
    title,
    description,
    sourceUrl,
    imageUrl,
    servings,
    prepTime,
    cookTime,
    totalTime,
    ingredients,
    instructions,
    tags,
    extractionMethod,
    cuisines,
    mealTypes,
    dietaryLabels,
  } = req.body;

  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    // Insert recipe
    const recipeResult = await client.query(
      `INSERT INTO recipes
        (user_id, title, description, source_url, image_url, servings, prep_time, cook_time, total_time, extraction_method)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
       RETURNING id, user_id, title, description, source_url, image_url, servings, prep_time, cook_time, total_time, extraction_method, created_at, updated_at`,
      [
        userId,
        title,
        description || null,
        sourceUrl || null,
        imageUrl || null,
        servings || null,
        prepTime || null,
        cookTime || null,
        totalTime || null,
        extractionMethod || 'manual',
      ]
    );

    const recipe = recipeResult.rows[0];

    // Insert ingredients
    for (let i = 0; i < ingredients.length; i++) {
      const ing = ingredients[i];
      await client.query(
        `INSERT INTO ingredients
          (recipe_id, sort_order, raw_text, quantity, unit, ingredient_name, preparation, ingredient_group)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
        [
          recipe.id,
          ing.sortOrder !== undefined ? ing.sortOrder : i,
          ing.rawText,
          ing.quantity || null,
          ing.unit || null,
          ing.ingredient,
          ing.preparation || null,
          ing.group || null,
        ]
      );
    }

    // Insert instructions
    for (let i = 0; i < instructions.length; i++) {
      await client.query(
        `INSERT INTO instructions (recipe_id, step_number, instruction_text)
         VALUES ($1, $2, $3)`,
        [recipe.id, i + 1, instructions[i]]
      );
    }

    // Insert tags
    if (tags && tags.length > 0) {
      for (const tagName of tags) {
        // Insert tag if it doesn't exist
        const tagResult = await client.query(
          `INSERT INTO tags (name) VALUES ($1)
           ON CONFLICT (name) DO UPDATE SET name = $1
           RETURNING id`,
          [tagName.toLowerCase()]
        );

        const tagId = tagResult.rows[0].id;

        // Link tag to recipe
        await client.query(
          `INSERT INTO recipe_tags (recipe_id, tag_id) VALUES ($1, $2)
           ON CONFLICT DO NOTHING`,
          [recipe.id, tagId]
        );
      }
    }

    // Insert cuisines
    if (cuisines && cuisines.length > 0) {
      for (const cuisineId of cuisines) {
        await client.query(
          `INSERT INTO recipe_cuisines (recipe_id, cuisine_id) VALUES ($1, $2)
           ON CONFLICT DO NOTHING`,
          [recipe.id, cuisineId]
        );
      }
    }

    // Insert meal types
    if (mealTypes && mealTypes.length > 0) {
      for (const mealTypeId of mealTypes) {
        await client.query(
          `INSERT INTO recipe_meal_types (recipe_id, meal_type_id) VALUES ($1, $2)
           ON CONFLICT DO NOTHING`,
          [recipe.id, mealTypeId]
        );
      }
    }

    // Insert dietary labels
    if (dietaryLabels && dietaryLabels.length > 0) {
      for (const dietaryLabelId of dietaryLabels) {
        await client.query(
          `INSERT INTO recipe_dietary_labels (recipe_id, dietary_label_id) VALUES ($1, $2)
           ON CONFLICT DO NOTHING`,
          [recipe.id, dietaryLabelId]
        );
      }
    }

    await client.query('COMMIT');

    // Fetch complete recipe with relationships
    const completeRecipe = await getRecipeById(recipe.id, userId);

    logger.info('Recipe saved', { recipeId: recipe.id, userId });

    res.status(201).json({ recipe: completeRecipe });
  } catch (error) {
    await client.query('ROLLBACK');
    logger.error('Save recipe error', { error: error.message });
    return sendError(res, 500, ErrorCodes.SAVE_FAILED, 'Failed to save recipe');
  } finally {
    client.release();
  }
}

/**
 * Get all recipes for authenticated user
 */
async function getRecipes(req, res) {
  const userId = req.user.userId;
  const {
    page = 1,
    limit = 20,
    search = '',
    tags = '',
    sortBy = 'createdAt',
    sortOrder = 'desc',
    maxCookTime = '',
    cuisines = '',
    mealTypes = '',
    dietaryLabels = '',
  } = req.query;

  const offset = (parseInt(page) - 1) * parseInt(limit);
  const validSortBy = ['createdAt', 'title', 'updatedAt', 'cookTime', 'totalTime'].includes(sortBy) ? sortBy : 'createdAt';
  const validSortOrder = sortOrder === 'asc' ? 'ASC' : 'DESC';

  try {
    let query = `
      SELECT DISTINCT r.id, r.title, r.description, r.image_url, r.servings, r.cook_time, r.total_time, r.created_at
      FROM recipes r
      WHERE r.user_id = $1
    `;
    const params = [userId];
    let paramCount = 1;

    // Add search filter
    if (search) {
      paramCount++;
      query += ` AND (r.title ILIKE $${paramCount} OR EXISTS (
        SELECT 1 FROM ingredients i WHERE i.recipe_id = r.id AND i.ingredient_name ILIKE $${paramCount}
      ))`;
      params.push(`%${search}%`);
    }

    // Add tags filter
    if (tags) {
      const tagArray = tags.split(',').map((t) => t.trim().toLowerCase());
      paramCount++;
      query += ` AND EXISTS (
        SELECT 1 FROM recipe_tags rt
        JOIN tags t ON rt.tag_id = t.id
        WHERE rt.recipe_id = r.id AND t.name = ANY($${paramCount})
      )`;
      params.push(tagArray);
    }

    // Add cook time filter (handles ISO 8601 PT format and "X minutes" format)
    if (maxCookTime) {
      const maxMinutes = parseInt(maxCookTime);
      if (!isNaN(maxMinutes) && maxMinutes > 0) {
        paramCount++;
        // Filter recipes where cook_time can be parsed and is <= maxMinutes
        // Handles: "30 minutes", "1 hour", "PT30M", "PT1H", "PT1H30M"
        query += ` AND (
          -- "X minutes" or "X minute" format
          (r.cook_time ~* '^[0-9]+ *min' AND
           CAST(REGEXP_REPLACE(r.cook_time, '[^0-9].*', '', 'g') AS INTEGER) <= $${paramCount})
          OR
          -- "X hours" or "X hour" format (convert to minutes, assume no additional minutes)
          (r.cook_time ~* '^[0-9]+ *hour' AND
           CAST(REGEXP_REPLACE(r.cook_time, '[^0-9].*', '', 'g') AS INTEGER) * 60 <= $${paramCount})
          OR
          -- ISO 8601 PT format with minutes only (e.g., PT30M)
          (r.cook_time ~* '^PT[0-9]+M$' AND
           CAST(REGEXP_REPLACE(r.cook_time, '[^0-9]', '', 'g') AS INTEGER) <= $${paramCount})
          OR
          -- ISO 8601 PT format with hours only (e.g., PT1H)
          (r.cook_time ~* '^PT[0-9]+H$' AND
           CAST(REGEXP_REPLACE(r.cook_time, '[^0-9]', '', 'g') AS INTEGER) * 60 <= $${paramCount})
        )`;
        params.push(maxMinutes);
      }
    }

    // Add cuisines filter
    if (cuisines) {
      const cuisineArray = cuisines.split(',').map((c) => c.trim());
      paramCount++;
      query += ` AND EXISTS (
        SELECT 1 FROM recipe_cuisines rc
        WHERE rc.recipe_id = r.id AND rc.cuisine_id = ANY($${paramCount})
      )`;
      params.push(cuisineArray);
    }

    // Add meal types filter
    if (mealTypes) {
      const mealTypeArray = mealTypes.split(',').map((m) => m.trim());
      paramCount++;
      query += ` AND EXISTS (
        SELECT 1 FROM recipe_meal_types rm
        WHERE rm.recipe_id = r.id AND rm.meal_type_id = ANY($${paramCount})
      )`;
      params.push(mealTypeArray);
    }

    // Add dietary labels filter
    if (dietaryLabels) {
      const dietaryLabelArray = dietaryLabels.split(',').map((d) => d.trim());
      paramCount++;
      query += ` AND EXISTS (
        SELECT 1 FROM recipe_dietary_labels rd
        WHERE rd.recipe_id = r.id AND rd.dietary_label_id = ANY($${paramCount})
      )`;
      params.push(dietaryLabelArray);
    }

    // Get total count
    const countResult = await pool.query(
      query.replace(
        'SELECT DISTINCT r.id, r.title, r.description, r.image_url, r.servings, r.cook_time, r.total_time, r.created_at',
        'SELECT COUNT(DISTINCT r.id)'
      ),
      params
    );
    const total = parseInt(countResult.rows[0].count);

    // Add sorting and pagination
    const sortColumn =
      validSortBy === 'createdAt'
        ? 'r.created_at'
        : validSortBy === 'updatedAt'
          ? 'r.updated_at'
          : validSortBy === 'cookTime'
            ? 'r.cook_time'
            : validSortBy === 'totalTime'
              ? 'r.total_time'
              : 'r.title';
    query += ` ORDER BY ${sortColumn} ${validSortOrder}`;
    query += ` LIMIT $${paramCount + 1} OFFSET $${paramCount + 2}`;
    params.push(parseInt(limit), offset);

    // Execute query
    const result = await pool.query(query, params);

    // Fetch tags for each recipe
    const recipes = await Promise.all(
      result.rows.map(async (recipe) => {
        const tagsResult = await pool.query(
          `SELECT t.name FROM tags t
         JOIN recipe_tags rt ON t.id = rt.tag_id
         WHERE rt.recipe_id = $1`,
          [recipe.id]
        );

        return {
          id: recipe.id,
          title: recipe.title,
          description: recipe.description,
          imageUrl: recipe.image_url,
          servings: recipe.servings,
          cookTime: recipe.cook_time,
          totalTime: recipe.total_time,
          tags: tagsResult.rows.map((t) => t.name),
          createdAt: recipe.created_at,
        };
      })
    );

    res.status(200).json({
      recipes,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        totalPages: Math.ceil(total / parseInt(limit)),
      },
    });
  } catch (error) {
    logger.error('Get recipes error', { error: error.message });
    return sendError(res, 500, ErrorCodes.FETCH_FAILED, 'Failed to fetch recipes');
  }
}

/**
 * Get a single recipe by ID
 */
async function getRecipe(req, res) {
  const userId = req.user.userId;
  const recipeId = req.params.id;

  try {
    const recipe = await getRecipeById(recipeId, userId);

    if (!recipe) {
      return errors.notFound(res, 'Recipe not found');
    }

    res.status(200).json({ recipe });
  } catch (error) {
    logger.error('Get recipe error', { error: error.message });
    return sendError(res, 500, ErrorCodes.FETCH_FAILED, 'Failed to fetch recipe');
  }
}

/**
 * Helper function to get recipe by ID with all relationships
 */
async function getRecipeById(recipeId, userId) {
  // Get recipe
  const recipeResult = await pool.query(`SELECT * FROM recipes WHERE id = $1 AND user_id = $2`, [
    recipeId,
    userId,
  ]);

  if (recipeResult.rows.length === 0) {
    return null;
  }

  const recipe = recipeResult.rows[0];

  // Get ingredients
  const ingredientsResult = await pool.query(
    `SELECT * FROM ingredients WHERE recipe_id = $1 ORDER BY sort_order`,
    [recipeId]
  );

  // Get instructions
  const instructionsResult = await pool.query(
    `SELECT * FROM instructions WHERE recipe_id = $1 ORDER BY step_number`,
    [recipeId]
  );

  // Get tags
  const tagsResult = await pool.query(
    `SELECT t.id, t.name FROM tags t
     JOIN recipe_tags rt ON t.id = rt.tag_id
     WHERE rt.recipe_id = $1`,
    [recipeId]
  );

  // Get cuisines
  const cuisinesResult = await pool.query(
    `SELECT c.id, c.name FROM cuisines c
     JOIN recipe_cuisines rc ON c.id = rc.cuisine_id
     WHERE rc.recipe_id = $1`,
    [recipeId]
  );

  // Get meal types
  const mealTypesResult = await pool.query(
    `SELECT m.id, m.name FROM meal_types m
     JOIN recipe_meal_types rm ON m.id = rm.meal_type_id
     WHERE rm.recipe_id = $1`,
    [recipeId]
  );

  // Get dietary labels
  const dietaryLabelsResult = await pool.query(
    `SELECT d.id, d.name FROM dietary_labels d
     JOIN recipe_dietary_labels rd ON d.id = rd.dietary_label_id
     WHERE rd.recipe_id = $1`,
    [recipeId]
  );

  return {
    id: recipe.id,
    userId: recipe.user_id,
    title: recipe.title,
    description: recipe.description,
    sourceUrl: recipe.source_url,
    imageUrl: recipe.image_url,
    servings: recipe.servings,
    prepTime: recipe.prep_time,
    cookTime: recipe.cook_time,
    totalTime: recipe.total_time,
    extractionMethod: recipe.extraction_method,
    createdAt: recipe.created_at,
    updatedAt: recipe.updated_at,
    ingredients: ingredientsResult.rows.map((i) => ({
      id: i.id,
      sortOrder: i.sort_order,
      rawText: i.raw_text,
      quantity: i.quantity,
      unit: i.unit,
      ingredientName: i.ingredient_name,
      preparation: i.preparation,
      ingredientGroup: i.ingredient_group,
    })),
    instructions: instructionsResult.rows.map((i) => ({
      id: i.id,
      stepNumber: i.step_number,
      instructionText: i.instruction_text,
    })),
    tags: tagsResult.rows,
    cuisines: cuisinesResult.rows,
    mealTypes: mealTypesResult.rows,
    dietaryLabels: dietaryLabelsResult.rows,
  };
}

/**
 * Update a recipe
 */
async function updateRecipe(req, res) {
  const userId = req.user.userId;
  const recipeId = req.params.id;
  const {
    title,
    description,
    sourceUrl,
    imageUrl,
    servings,
    prepTime,
    cookTime,
    totalTime,
    ingredients,
    instructions,
    tags,
    cuisines,
    mealTypes,
    dietaryLabels,
  } = req.body;

  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    // Check if recipe exists and belongs to user
    const existingRecipe = await client.query(
      'SELECT id FROM recipes WHERE id = $1 AND user_id = $2',
      [recipeId, userId]
    );

    if (existingRecipe.rows.length === 0) {
      await client.query('ROLLBACK');
      return errors.notFound(res, 'Recipe not found');
    }

    // Update recipe
    const updates = [];
    const values = [];
    let paramCount = 1;

    if (title !== undefined) {
      updates.push(`title = $${paramCount++}`);
      values.push(title);
    }
    if (description !== undefined) {
      updates.push(`description = $${paramCount++}`);
      values.push(description);
    }
    if (sourceUrl !== undefined) {
      updates.push(`source_url = $${paramCount++}`);
      values.push(sourceUrl);
    }
    if (imageUrl !== undefined) {
      updates.push(`image_url = $${paramCount++}`);
      values.push(imageUrl);
    }
    if (servings !== undefined) {
      updates.push(`servings = $${paramCount++}`);
      values.push(servings);
    }
    if (prepTime !== undefined) {
      updates.push(`prep_time = $${paramCount++}`);
      values.push(prepTime);
    }
    if (cookTime !== undefined) {
      updates.push(`cook_time = $${paramCount++}`);
      values.push(cookTime);
    }
    if (totalTime !== undefined) {
      updates.push(`total_time = $${paramCount++}`);
      values.push(totalTime);
    }

    if (updates.length > 0) {
      values.push(recipeId);
      await client.query(
        `UPDATE recipes SET ${updates.join(', ')} WHERE id = $${paramCount}`,
        values
      );
    }

    // Update ingredients if provided
    if (ingredients) {
      // Delete existing ingredients
      await client.query('DELETE FROM ingredients WHERE recipe_id = $1', [recipeId]);

      // Insert new ingredients
      for (let i = 0; i < ingredients.length; i++) {
        const ing = ingredients[i];
        await client.query(
          `INSERT INTO ingredients
            (recipe_id, sort_order, raw_text, quantity, unit, ingredient_name, preparation, ingredient_group)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
          [
            recipeId,
            ing.sortOrder !== undefined ? ing.sortOrder : i,
            ing.rawText,
            ing.quantity || null,
            ing.unit || null,
            ing.ingredient,
            ing.preparation || null,
            ing.group || null,
          ]
        );
      }
    }

    // Update instructions if provided
    if (instructions) {
      // Delete existing instructions
      await client.query('DELETE FROM instructions WHERE recipe_id = $1', [recipeId]);

      // Insert new instructions
      for (let i = 0; i < instructions.length; i++) {
        await client.query(
          `INSERT INTO instructions (recipe_id, step_number, instruction_text)
           VALUES ($1, $2, $3)`,
          [recipeId, i + 1, instructions[i]]
        );
      }
    }

    // Update tags if provided
    if (tags) {
      // Delete existing tag associations
      await client.query('DELETE FROM recipe_tags WHERE recipe_id = $1', [recipeId]);

      // Insert new tags
      for (const tagName of tags) {
        const tagResult = await client.query(
          `INSERT INTO tags (name) VALUES ($1)
           ON CONFLICT (name) DO UPDATE SET name = $1
           RETURNING id`,
          [tagName.toLowerCase()]
        );

        const tagId = tagResult.rows[0].id;

        await client.query(`INSERT INTO recipe_tags (recipe_id, tag_id) VALUES ($1, $2)`, [
          recipeId,
          tagId,
        ]);
      }
    }

    // Update cuisines if provided
    if (cuisines) {
      await client.query('DELETE FROM recipe_cuisines WHERE recipe_id = $1', [recipeId]);
      for (const cuisineId of cuisines) {
        await client.query(
          `INSERT INTO recipe_cuisines (recipe_id, cuisine_id) VALUES ($1, $2)`,
          [recipeId, cuisineId]
        );
      }
    }

    // Update meal types if provided
    if (mealTypes) {
      await client.query('DELETE FROM recipe_meal_types WHERE recipe_id = $1', [recipeId]);
      for (const mealTypeId of mealTypes) {
        await client.query(
          `INSERT INTO recipe_meal_types (recipe_id, meal_type_id) VALUES ($1, $2)`,
          [recipeId, mealTypeId]
        );
      }
    }

    // Update dietary labels if provided
    if (dietaryLabels) {
      await client.query('DELETE FROM recipe_dietary_labels WHERE recipe_id = $1', [recipeId]);
      for (const dietaryLabelId of dietaryLabels) {
        await client.query(
          `INSERT INTO recipe_dietary_labels (recipe_id, dietary_label_id) VALUES ($1, $2)`,
          [recipeId, dietaryLabelId]
        );
      }
    }

    await client.query('COMMIT');

    // Fetch updated recipe
    const updatedRecipe = await getRecipeById(recipeId, userId);

    logger.info('Recipe updated', { recipeId, userId });

    res.status(200).json({ recipe: updatedRecipe });
  } catch (error) {
    await client.query('ROLLBACK');
    logger.error('Update recipe error', { error: error.message });
    return sendError(res, 500, ErrorCodes.UPDATE_FAILED, 'Failed to update recipe');
  } finally {
    client.release();
  }
}

/**
 * Get a scaled version of a recipe
 */
async function getScaledRecipe(req, res) {
  const userId = req.user.userId;
  const recipeId = req.params.id;
  const targetServings = parseInt(req.query.servings, 10);

  try {
    // Validate target servings
    if (!targetServings || targetServings <= 0) {
      return sendError(
        res,
        400,
        ErrorCodes.INVALID_SERVINGS,
        'Target servings must be a positive number'
      );
    }

    // Get the original recipe
    const recipe = await getRecipeById(recipeId, userId);

    if (!recipe) {
      return errors.notFound(res, 'Recipe not found');
    }

    // Scale the recipe
    const scaledRecipe = scaleRecipe(recipe, targetServings);

    res.status(200).json({ recipe: scaledRecipe });
  } catch (error) {
    logger.error('Scale recipe error', { error: error.message });
    return sendError(res, 500, ErrorCodes.SCALE_FAILED, 'Failed to scale recipe');
  }
}

/**
 * Delete a recipe
 */
async function deleteRecipe(req, res) {
  const userId = req.user.userId;
  const recipeId = req.params.id;

  try {
    const result = await pool.query(
      'DELETE FROM recipes WHERE id = $1 AND user_id = $2 RETURNING id',
      [recipeId, userId]
    );

    if (result.rows.length === 0) {
      return errors.notFound(res, 'Recipe not found');
    }

    logger.info('Recipe deleted', { recipeId, userId });

    res.status(204).send();
  } catch (error) {
    logger.error('Delete recipe error', { error: error.message });
    return sendError(res, 500, ErrorCodes.DELETE_FAILED, 'Failed to delete recipe');
  }
}

/**
 * Get all tags used by the user's recipes
 */
async function getUserTags(req, res) {
  const userId = req.user.userId;

  try {
    const result = await pool.query(
      `SELECT DISTINCT t.id, t.name, COUNT(rt.recipe_id)::int as recipe_count
       FROM tags t
       INNER JOIN recipe_tags rt ON t.id = rt.tag_id
       INNER JOIN recipes r ON rt.recipe_id = r.id
       WHERE r.user_id = $1
       GROUP BY t.id, t.name
       ORDER BY t.name`,
      [userId]
    );

    res.status(200).json({ tags: result.rows });
  } catch (error) {
    logger.error('Get user tags error', { error: error.message });
    return sendError(res, 500, ErrorCodes.FETCH_FAILED, 'Failed to fetch tags');
  }
}

/**
 * Get all cuisines
 */
async function getCuisines(req, res) {
  try {
    const result = await pool.query(
      `SELECT id, name FROM cuisines ORDER BY sort_order, name`
    );
    res.status(200).json({ cuisines: result.rows });
  } catch (error) {
    logger.error('Get cuisines error', { error: error.message });
    return sendError(res, 500, ErrorCodes.FETCH_FAILED, 'Failed to fetch cuisines');
  }
}

/**
 * Get all meal types
 */
async function getMealTypes(req, res) {
  try {
    const result = await pool.query(
      `SELECT id, name FROM meal_types ORDER BY sort_order, name`
    );
    res.status(200).json({ mealTypes: result.rows });
  } catch (error) {
    logger.error('Get meal types error', { error: error.message });
    return sendError(res, 500, ErrorCodes.FETCH_FAILED, 'Failed to fetch meal types');
  }
}

/**
 * Get all dietary labels
 */
async function getDietaryLabels(req, res) {
  try {
    const result = await pool.query(
      `SELECT id, name FROM dietary_labels ORDER BY sort_order, name`
    );
    res.status(200).json({ dietaryLabels: result.rows });
  } catch (error) {
    logger.error('Get dietary labels error', { error: error.message });
    return sendError(res, 500, ErrorCodes.FETCH_FAILED, 'Failed to fetch dietary labels');
  }
}

module.exports = {
  extractRecipeFromUrl,
  saveRecipe,
  getRecipes,
  getRecipe,
  getScaledRecipe,
  updateRecipe,
  deleteRecipe,
  getIngredientsForRecipes,
  getUserTags,
  getCuisines,
  getMealTypes,
  getDietaryLabels,
};
