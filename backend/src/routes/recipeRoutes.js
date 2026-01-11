const express = require('express');
const {
  extractRecipeFromUrl,
  saveRecipe,
  getRecipes,
  getRecipe,
  getScaledRecipe,
  updateRecipe,
  deleteRecipe,
} = require('../controllers/recipeController');
const {
  getNoteForRecipe,
  upsertNoteForRecipe,
  deleteNoteForRecipe,
} = require('../controllers/recipeNotesController');
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

// POST /api/v1/recipes - Save a recipe
router.post('/', authenticateToken, validate(saveRecipeSchema), saveRecipe);

// GET /api/v1/recipes - Get all recipes for user
router.get('/', authenticateToken, getRecipes);

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
