const Joi = require('joi');

// User registration schema
const registerSchema = Joi.object({
  email: Joi.string().email().required(),
  password: Joi.string()
    .min(8)
    .required()
    .pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .message(
      'Password must contain at least one uppercase letter, one lowercase letter, and one number'
    ),
  firstName: Joi.string().max(100).optional(),
  lastName: Joi.string().max(100).optional(),
});

// User login schema
const loginSchema = Joi.object({
  email: Joi.string().email().required(),
  password: Joi.string().required(),
});

// Recipe extraction schema
const extractRecipeSchema = Joi.object({
  url: Joi.string().uri().required(),
});

// Recipe ingredient schema
const ingredientSchema = Joi.object({
  rawText: Joi.string().required(),
  quantity: Joi.number().optional().allow(null),
  unit: Joi.string().max(50).optional().allow(null),
  ingredient: Joi.string().max(200).required(),
  preparation: Joi.string().max(200).optional().allow(null),
  group: Joi.string().max(100).optional().allow(null),
  sortOrder: Joi.number().optional(), // Allow sortOrder from extraction
  notes: Joi.string().optional().allow(null), // Allow notes field
}).unknown(true); // Allow additional fields from extraction

// Recipe instruction schema (just a string)
const instructionSchema = Joi.string().required();

// Recipe save schema
const saveRecipeSchema = Joi.object({
  title: Joi.string().max(500).required(),
  description: Joi.string().max(2000).optional().allow(null, ''),
  sourceUrl: Joi.string().uri().optional().allow(null, ''),
  imageUrl: Joi.string().uri().optional().allow(null, ''),
  servings: Joi.string().max(50).optional().allow(null, ''),
  prepTime: Joi.string().max(50).optional().allow(null, ''),
  cookTime: Joi.string().max(50).optional().allow(null, ''),
  totalTime: Joi.string().max(50).optional().allow(null, ''),
  ingredients: Joi.array().items(ingredientSchema).min(1).required(),
  instructions: Joi.array().items(instructionSchema).min(1).required(),
  tags: Joi.array().items(Joi.string().max(50)).optional(),
  cuisines: Joi.array().items(Joi.string().uuid()).optional(),
  mealTypes: Joi.array().items(Joi.string().uuid()).optional(),
  dietaryLabels: Joi.array().items(Joi.string().uuid()).optional(),
  extractionMethod: Joi.string().valid('schema', 'llm', 'manual').optional(),
  author: Joi.string().max(200).optional().allow(null, ''), // Allow author from extraction
  extractionQuality: Joi.object().optional(), // Allow extraction quality metadata
}).unknown(true); // Allow additional fields from extraction

// Recipe update schema (same as save but with optional fields)
const updateRecipeSchema = Joi.object({
  title: Joi.string().max(500).optional(),
  description: Joi.string().max(2000).optional().allow(null, ''),
  sourceUrl: Joi.string().uri().optional().allow(null, ''),
  imageUrl: Joi.string().uri().optional().allow(null, ''),
  servings: Joi.string().max(50).optional().allow(null, ''),
  prepTime: Joi.string().max(50).optional().allow(null, ''),
  cookTime: Joi.string().max(50).optional().allow(null, ''),
  totalTime: Joi.string().max(50).optional().allow(null, ''),
  ingredients: Joi.array().items(ingredientSchema).min(1).optional(),
  instructions: Joi.array().items(instructionSchema).min(1).optional(),
  tags: Joi.array().items(Joi.string().max(50)).optional(),
  cuisines: Joi.array().items(Joi.string().uuid()).optional(),
  mealTypes: Joi.array().items(Joi.string().uuid()).optional(),
  dietaryLabels: Joi.array().items(Joi.string().uuid()).optional(),
});

// Meal plan schema
const mealPlanSchema = Joi.object({
  name: Joi.string().max(200).required(),
  startDate: Joi.date().required(),
  endDate: Joi.date().required().greater(Joi.ref('startDate')),
});

// Add recipe to meal plan schema
const addRecipeToMealPlanSchema = Joi.object({
  recipeId: Joi.string().uuid().required(),
  mealDate: Joi.date().required(),
  mealType: Joi.string().valid('breakfast', 'lunch', 'dinner', 'snack').required(),
  servingsPlanned: Joi.number().integer().min(1).default(1),
  notes: Joi.string().optional().allow(null, ''),
});

// Shopping list schema
const createShoppingListSchema = Joi.object({
  name: Joi.string().max(200).required(),
});

// Update shopping list item schema
const updateShoppingListItemSchema = Joi.object({
  isChecked: Joi.boolean().optional(),
  quantity: Joi.number().optional().allow(null),
  unit: Joi.string().max(50).optional().allow(null),
  category: Joi.string().max(50).optional().allow(null),
  notes: Joi.string().optional().allow(null, ''),
});

/**
 * Middleware to validate request body against a schema
 */
function validate(schema) {
  return (req, res, next) => {
    const { error } = schema.validate(req.body, { abortEarly: false });

    if (error) {
      const errors = error.details.map((detail) => ({
        field: detail.path.join('.'),
        message: detail.message,
      }));

      // Log validation errors for debugging
      console.error('Validation failed:', JSON.stringify(errors, null, 2));

      return res.status(400).json({
        error: 'Validation failed',
        details: errors,
      });
    }

    next();
  };
}

module.exports = {
  registerSchema,
  loginSchema,
  extractRecipeSchema,
  saveRecipeSchema,
  updateRecipeSchema,
  mealPlanSchema,
  addRecipeToMealPlanSchema,
  createShoppingListSchema,
  updateShoppingListItemSchema,
  validate,
};
