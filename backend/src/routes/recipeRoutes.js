const express = require('express');
const {
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
} = require('../controllers/recipeController');
const {
  getNoteForRecipe,
  upsertNoteForRecipe,
  deleteNoteForRecipe,
} = require('../controllers/recipeNotesController');
const { batchAutoTag } = require('../controllers/batchTaggingController');
const { authenticateToken } = require('../middlewares/auth');
const {
  validate,
  extractRecipeSchema,
  saveRecipeSchema,
  updateRecipeSchema,
} = require('../utils/validation');
const rateLimit = require('express-rate-limit');

const router = express.Router();

// Rate limiter for extraction endpoint
const extractionLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // 10 requests per window
  message: {
    error: 'RATE_LIMIT_EXCEEDED',
    message: 'Too many extraction requests, please try again later',
  },
});

// POST /api/v1/recipes/extract - Extract recipe from URL
router.post(
  '/extract',
  authenticateToken,
  extractionLimiter,
  validate(extractRecipeSchema),
  extractRecipeFromUrl
);

// POST /api/v1/recipes/ingredients-preview - Get ingredients for multiple recipes
router.post('/ingredients-preview', authenticateToken, getIngredientsForRecipes);

// POST /api/v1/recipes - Save a recipe
router.post('/', authenticateToken, validate(saveRecipeSchema), saveRecipe);

// GET /api/v1/recipes - Get all recipes for user
router.get('/', authenticateToken, getRecipes);

// GET /api/v1/recipes/tags - Get all tags for user's recipes
router.get('/tags', authenticateToken, getUserTags);

// GET /api/v1/recipes/cuisines - Get all cuisines
router.get('/cuisines', authenticateToken, getCuisines);

// GET /api/v1/recipes/meal-types - Get all meal types
router.get('/meal-types', authenticateToken, getMealTypes);

// GET /api/v1/recipes/dietary-labels - Get all dietary labels
router.get('/dietary-labels', authenticateToken, getDietaryLabels);

// POST /api/v1/recipes/batch-autotag - Batch auto-tag uncategorized recipes
router.post('/batch-autotag', authenticateToken, batchAutoTag);

// GET /api/v1/recipes/:id - Get a single recipe
router.get('/:id', authenticateToken, getRecipe);

// GET /api/v1/recipes/:id/scaled - Get a scaled version of a recipe
router.get('/:id/scaled', authenticateToken, getScaledRecipe);

// PUT /api/v1/recipes/:id - Update a recipe
router.put('/:id', authenticateToken, validate(updateRecipeSchema), updateRecipe);

// DELETE /api/v1/recipes/:id - Delete a recipe
router.delete('/:id', authenticateToken, deleteRecipe);

// GET /api/v1/recipes/:recipeId/note - Get user's note for a recipe
router.get('/:recipeId/note', authenticateToken, getNoteForRecipe);

// PUT /api/v1/recipes/:recipeId/note - Create or update user's note for a recipe
router.put('/:recipeId/note', authenticateToken, upsertNoteForRecipe);

// DELETE /api/v1/recipes/:recipeId/note - Delete user's note for a recipe
router.delete('/:recipeId/note', authenticateToken, deleteNoteForRecipe);

module.exports = router;
