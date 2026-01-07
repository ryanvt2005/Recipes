const pool = require('../config/database');
const { extractRecipe, RecipeExtractionError } = require('../services/recipeExtractionService');
const logger = require('../config/logger');

/**
 * Extract recipe from URL
 */
async function extractRecipeFromUrl(req, res) {
  const { url } = req.body;

  try {
    const recipe = await extractRecipe(url);

    res.status(200).json({ recipe });
  } catch (error) {
    if (error instanceof RecipeExtractionError) {
      return res.status(422).json({
        error: error.code,
        message: error.message,
        details: error.details
      });
    }

    logger.error('Recipe extraction error', { error: error.message });
    res.status(500).json({
      error: 'EXTRACTION_ERROR',
      message: 'An unexpected error occurred during extraction'
    });
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
    extractionMethod
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
        extractionMethod || 'manual'
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
          ing.group || null
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

    await client.query('COMMIT');

    // Fetch complete recipe with relationships
    const completeRecipe = await getRecipeById(recipe.id, userId);

    logger.info('Recipe saved', { recipeId: recipe.id, userId });

    res.status(201).json({ recipe: completeRecipe });
  } catch (error) {
    await client.query('ROLLBACK');
    logger.error('Save recipe error', { error: error.message });
    res.status(500).json({
      error: 'SAVE_FAILED',
      message: 'Failed to save recipe'
    });
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
    sortOrder = 'desc'
  } = req.query;

  const offset = (parseInt(page) - 1) * parseInt(limit);
  const validSortBy = ['createdAt', 'title', 'updatedAt'].includes(sortBy) ? sortBy : 'createdAt';
  const validSortOrder = sortOrder === 'asc' ? 'ASC' : 'DESC';

  try {
    let query = `
      SELECT DISTINCT r.id, r.title, r.description, r.image_url, r.servings, r.total_time, r.created_at
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
      const tagArray = tags.split(',').map(t => t.trim().toLowerCase());
      paramCount++;
      query += ` AND EXISTS (
        SELECT 1 FROM recipe_tags rt
        JOIN tags t ON rt.tag_id = t.id
        WHERE rt.recipe_id = r.id AND t.name = ANY($${paramCount})
      )`;
      params.push(tagArray);
    }

    // Get total count
    const countResult = await pool.query(
      query.replace('SELECT DISTINCT r.id, r.title, r.description, r.image_url, r.servings, r.total_time, r.created_at', 'SELECT COUNT(DISTINCT r.id)'),
      params
    );
    const total = parseInt(countResult.rows[0].count);

    // Add sorting and pagination
    const sortColumn = validSortBy === 'createdAt' ? 'r.created_at' :
                       validSortBy === 'updatedAt' ? 'r.updated_at' :
                       'r.title';
    query += ` ORDER BY ${sortColumn} ${validSortOrder}`;
    query += ` LIMIT $${paramCount + 1} OFFSET $${paramCount + 2}`;
    params.push(parseInt(limit), offset);

    // Execute query
    const result = await pool.query(query, params);

    // Fetch tags for each recipe
    const recipes = await Promise.all(result.rows.map(async (recipe) => {
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
        totalTime: recipe.total_time,
        tags: tagsResult.rows.map(t => t.name),
        createdAt: recipe.created_at
      };
    }));

    res.status(200).json({
      recipes,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        totalPages: Math.ceil(total / parseInt(limit))
      }
    });
  } catch (error) {
    logger.error('Get recipes error', { error: error.message });
    res.status(500).json({
      error: 'FETCH_FAILED',
      message: 'Failed to fetch recipes'
    });
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
      return res.status(404).json({
        error: 'NOT_FOUND',
        message: 'Recipe not found'
      });
    }

    res.status(200).json({ recipe });
  } catch (error) {
    logger.error('Get recipe error', { error: error.message });
    res.status(500).json({
      error: 'FETCH_FAILED',
      message: 'Failed to fetch recipe'
    });
  }
}

/**
 * Helper function to get recipe by ID with all relationships
 */
async function getRecipeById(recipeId, userId) {
  // Get recipe
  const recipeResult = await pool.query(
    `SELECT * FROM recipes WHERE id = $1 AND user_id = $2`,
    [recipeId, userId]
  );

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
    ingredients: ingredientsResult.rows.map(i => ({
      id: i.id,
      sortOrder: i.sort_order,
      rawText: i.raw_text,
      quantity: i.quantity,
      unit: i.unit,
      ingredientName: i.ingredient_name,
      preparation: i.preparation,
      ingredientGroup: i.ingredient_group
    })),
    instructions: instructionsResult.rows.map(i => ({
      id: i.id,
      stepNumber: i.step_number,
      instructionText: i.instruction_text
    })),
    tags: tagsResult.rows
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
    tags
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
      return res.status(404).json({
        error: 'NOT_FOUND',
        message: 'Recipe not found'
      });
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
            ing.group || null
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

        await client.query(
          `INSERT INTO recipe_tags (recipe_id, tag_id) VALUES ($1, $2)`,
          [recipeId, tagId]
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
    res.status(500).json({
      error: 'UPDATE_FAILED',
      message: 'Failed to update recipe'
    });
  } finally {
    client.release();
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
      return res.status(404).json({
        error: 'NOT_FOUND',
        message: 'Recipe not found'
      });
    }

    logger.info('Recipe deleted', { recipeId, userId });

    res.status(204).send();
  } catch (error) {
    logger.error('Delete recipe error', { error: error.message });
    res.status(500).json({
      error: 'DELETE_FAILED',
      message: 'Failed to delete recipe'
    });
  }
}

module.exports = {
  extractRecipeFromUrl,
  saveRecipe,
  getRecipes,
  getRecipe,
  updateRecipe,
  deleteRecipe
};
