const pool = require("../config/database");
const logger = require("../config/logger");
const { autoTagRecipe } = require("../utils/recipeAutoTagger");
const { ErrorCodes, sendError } = require("../utils/errorResponse");

/**
 * Batch auto-tag recipes with cuisines, meal types, and dietary labels
 * POST /api/v1/recipes/batch-autotag
 */
async function batchAutoTag(req, res) {
  const userId = req.user.userId;
  const { force = false } = req.body || {};

  try {
    // Find recipes to tag
    let query;
    const params = [userId];

    if (force) {
      query = `SELECT r.id, r.title, r.description FROM recipes r WHERE r.user_id = $1`;
    } else {
      // Only recipes with no categories assigned
      query = `
        SELECT r.id, r.title, r.description FROM recipes r
        WHERE r.user_id = $1
        AND NOT EXISTS (SELECT 1 FROM recipe_cuisines WHERE recipe_id = r.id)
        AND NOT EXISTS (SELECT 1 FROM recipe_meal_types WHERE recipe_id = r.id)
        AND NOT EXISTS (SELECT 1 FROM recipe_dietary_labels WHERE recipe_id = r.id)
      `;
    }

    const recipesResult = await pool.query(query, params);
    const recipeRows = recipesResult.rows;

    logger.info("Starting batch auto-tag", {
      userId,
      totalRecipes: recipeRows.length,
      force,
    });

    let tagged = 0;
    const errors = [];

    for (const row of recipeRows) {
      const client = await pool.connect();
      try {
        // Fetch ingredients for this recipe
        const ingredientsResult = await client.query(
          `SELECT ingredient_name, raw_text FROM ingredients WHERE recipe_id = $1`,
          [row.id],
        );

        const recipe = {
          title: row.title,
          description: row.description,
          ingredients: ingredientsResult.rows.map((ing) => ({
            ingredient: ing.ingredient_name,
            rawText: ing.raw_text,
          })),
        };

        const tags = await autoTagRecipe(recipe, pool);

        // Skip if no tags detected
        if (
          tags.cuisineIds.length === 0 &&
          tags.mealTypeIds.length === 0 &&
          tags.dietaryLabelIds.length === 0
        ) {
          continue;
        }

        await client.query("BEGIN");

        // Clear existing tags if force mode
        if (force) {
          await client.query(
            "DELETE FROM recipe_cuisines WHERE recipe_id = $1",
            [row.id],
          );
          await client.query(
            "DELETE FROM recipe_meal_types WHERE recipe_id = $1",
            [row.id],
          );
          await client.query(
            "DELETE FROM recipe_dietary_labels WHERE recipe_id = $1",
            [row.id],
          );
        }

        for (const cuisineId of tags.cuisineIds) {
          await client.query(
            `INSERT INTO recipe_cuisines (recipe_id, cuisine_id) VALUES ($1, $2)
             ON CONFLICT DO NOTHING`,
            [row.id, cuisineId],
          );
        }

        for (const mealTypeId of tags.mealTypeIds) {
          await client.query(
            `INSERT INTO recipe_meal_types (recipe_id, meal_type_id) VALUES ($1, $2)
             ON CONFLICT DO NOTHING`,
            [row.id, mealTypeId],
          );
        }

        for (const dietaryLabelId of tags.dietaryLabelIds) {
          await client.query(
            `INSERT INTO recipe_dietary_labels (recipe_id, dietary_label_id) VALUES ($1, $2)
             ON CONFLICT DO NOTHING`,
            [row.id, dietaryLabelId],
          );
        }

        await client.query("COMMIT");
        tagged++;
      } catch (error) {
        await client.query("ROLLBACK");
        logger.warn("Failed to auto-tag recipe", {
          recipeId: row.id,
          title: row.title,
          error: error.message,
        });
        errors.push({
          recipeId: row.id,
          title: row.title,
          error: error.message,
        });
      } finally {
        client.release();
      }
    }

    logger.info("Batch auto-tag completed", {
      userId,
      tagged,
      total: recipeRows.length,
      errors: errors.length,
    });

    res.status(200).json({
      message: `Batch tagging completed: ${tagged} of ${recipeRows.length} recipes tagged`,
      tagged,
      total: recipeRows.length,
      errors,
    });
  } catch (error) {
    logger.error("Batch auto-tag error", {
      error: error.message,
      stack: error.stack,
    });
    return sendError(
      res,
      500,
      ErrorCodes.IMPORT_FAILED,
      "Failed to batch tag recipes: " + error.message,
    );
  }
}

module.exports = {
  batchAutoTag,
};
