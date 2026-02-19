const AdmZip = require("adm-zip");
const pool = require("../config/database");
const logger = require("../config/logger");
const {
  parsePepperplateRecipe,
  normalizeTitle,
} = require("../utils/pepperplateParser");
const { ErrorCodes, sendError, errors } = require("../utils/errorResponse");
const { autoTagRecipe } = require("../utils/recipeAutoTagger");

/**
 * Truncate a string to a maximum length
 * @param {string} str - String to truncate
 * @param {number} maxLen - Maximum length
 * @returns {string|null} Truncated string or null if input is falsy
 */
function truncate(str, maxLen) {
  if (!str) return null;
  return str.length > maxLen ? str.substring(0, maxLen) : str;
}

/**
 * Import recipes from a Pepperplate export zip file
 * Uses individual transactions per recipe for resilience
 */
async function importFromPepperplate(req, res) {
  const userId = req.user.userId;

  if (!req.file) {
    return errors.badRequest(res, "No file uploaded");
  }

  const results = {
    total: 0,
    imported: 0,
    skipped: [],
    errors: [],
  };

  try {
    // Load zip file from buffer
    const zip = new AdmZip(req.file.buffer);
    const entries = zip.getEntries();

    // Filter to only .txt files
    const recipeFiles = entries.filter(
      (entry) => !entry.isDirectory && entry.entryName.endsWith(".txt"),
    );

    results.total = recipeFiles.length;

    logger.info("Starting Pepperplate import", {
      userId,
      totalFiles: results.total,
    });

    // Get existing recipe titles for duplicate detection
    const existingResult = await pool.query(
      `SELECT LOWER(TRIM(title)) as normalized_title FROM recipes WHERE user_id = $1`,
      [userId],
    );
    const existingTitles = new Set(
      existingResult.rows.map((r) => r.normalized_title),
    );

    // Process each recipe individually for resilience
    for (const entry of recipeFiles) {
      const filename = entry.entryName;

      try {
        // Extract and parse the recipe
        const content = entry.getData().toString("utf8");
        const recipe = parsePepperplateRecipe(content);

        if (!recipe || !recipe.title) {
          results.errors.push({
            filename,
            error: "Failed to parse recipe - no title found",
          });
          continue;
        }

        // Check for duplicate
        const normalizedTitle = normalizeTitle(recipe.title);
        if (existingTitles.has(normalizedTitle)) {
          results.skipped.push({
            filename,
            title: recipe.title,
            reason: "duplicate",
          });
          continue;
        }

        // Use a separate client for each recipe transaction
        const client = await pool.connect();
        try {
          await client.query("BEGIN");

          // Insert recipe (truncate VARCHAR fields to fit database constraints)
          const recipeResult = await client.query(
            `INSERT INTO recipes
              (user_id, title, description, source_url, image_url, servings, prep_time, cook_time, total_time, extraction_method)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
             RETURNING id`,
            [
              userId,
              truncate(recipe.title, 500),
              recipe.description || null,
              recipe.sourceUrl || null,
              recipe.imageUrl || null,
              truncate(recipe.servings, 50),
              truncate(recipe.prepTime, 50),
              truncate(recipe.cookTime, 50),
              truncate(recipe.totalTime, 50),
              recipe.extractionMethod,
            ],
          );

          const recipeId = recipeResult.rows[0].id;

          // Insert ingredients (skip empty ones)
          for (const ing of recipe.ingredients) {
            // Ensure we have a valid ingredient name
            let ingredientName =
              ing.ingredient?.trim() ||
              ing.rawText?.trim() ||
              "Unknown ingredient";

            if (!ingredientName || ingredientName === "") {
              continue; // Skip completely empty ingredients
            }

            // Truncate fields to fit database constraints
            ingredientName = truncate(ingredientName, 200);
            const unit = truncate(ing.unit, 50);
            const preparation = truncate(ing.preparation, 200);
            const ingredientGroup = truncate(ing.group, 100);

            await client.query(
              `INSERT INTO ingredients
                (recipe_id, sort_order, raw_text, quantity, unit, ingredient_name, preparation, ingredient_group)
               VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
              [
                recipeId,
                ing.sortOrder || 0,
                ing.rawText || ingredientName,
                ing.quantity || null,
                unit,
                ingredientName,
                preparation,
                ingredientGroup,
              ],
            );
          }

          // Auto-tag the recipe with cuisines, meal types, and dietary labels
          const tags = await autoTagRecipe(recipe, pool);

          for (const cuisineId of tags.cuisineIds) {
            await client.query(
              `INSERT INTO recipe_cuisines (recipe_id, cuisine_id) VALUES ($1, $2)
               ON CONFLICT DO NOTHING`,
              [recipeId, cuisineId],
            );
          }

          for (const mealTypeId of tags.mealTypeIds) {
            await client.query(
              `INSERT INTO recipe_meal_types (recipe_id, meal_type_id) VALUES ($1, $2)
               ON CONFLICT DO NOTHING`,
              [recipeId, mealTypeId],
            );
          }

          for (const dietaryLabelId of tags.dietaryLabelIds) {
            await client.query(
              `INSERT INTO recipe_dietary_labels (recipe_id, dietary_label_id) VALUES ($1, $2)
               ON CONFLICT DO NOTHING`,
              [recipeId, dietaryLabelId],
            );
          }

          // Insert instructions (skip empty ones)
          let stepNumber = 1;
          for (const instruction of recipe.instructions) {
            if (instruction && instruction.trim()) {
              await client.query(
                `INSERT INTO instructions (recipe_id, step_number, instruction_text)
                 VALUES ($1, $2, $3)`,
                [recipeId, stepNumber++, instruction.trim()],
              );
            }
          }

          // Insert notes into recipe_notes table (not description)
          if (recipe.notes) {
            await client.query(
              `INSERT INTO recipe_notes (recipe_id, user_id, note_text) VALUES ($1, $2, $3)`,
              [recipeId, userId, recipe.notes],
            );
          }

          await client.query("COMMIT");

          // Add to existing titles to prevent duplicates within the same import
          existingTitles.add(normalizedTitle);
          results.imported++;
        } catch (dbError) {
          await client.query("ROLLBACK");
          logger.warn("Failed to import recipe", {
            filename,
            title: recipe.title,
            error: dbError.message,
          });
          results.errors.push({
            filename,
            title: recipe.title,
            error: dbError.message,
          });
        } finally {
          client.release();
        }
      } catch (parseError) {
        logger.warn("Failed to parse recipe file", {
          filename,
          error: parseError.message,
        });
        results.errors.push({
          filename,
          error: "Parse error: " + parseError.message,
        });
      }
    }

    logger.info("Pepperplate import completed", {
      userId,
      imported: results.imported,
      skipped: results.skipped.length,
      errors: results.errors.length,
    });

    res.status(200).json({
      message: `Import completed: ${results.imported} recipes imported`,
      results,
    });
  } catch (error) {
    logger.error("Pepperplate import error", {
      error: error.message,
      stack: error.stack,
    });
    return sendError(
      res,
      500,
      ErrorCodes.IMPORT_FAILED,
      "Failed to import recipes: " + error.message,
    );
  }
}

module.exports = {
  importFromPepperplate,
};
