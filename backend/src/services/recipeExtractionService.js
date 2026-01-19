const Anthropic = require('@anthropic-ai/sdk');
const axios = require('axios');
const cheerio = require('cheerio');
const crypto = require('crypto');
const pool = require('../config/database');
const logger = require('../config/logger');
const { parseIngredientString: parseIngredient } = require('../utils/ingredientParser');

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

/**
 * Custom error class for recipe extraction
 */
class RecipeExtractionError extends Error {
  constructor(message, code, details = null) {
    super(message);
    this.code = code;
    this.details = details;
  }
}

/**
 * Normalize URL by removing tracking params and fragments
 */
function normalizeUrl(url) {
  try {
    const urlObj = new URL(url);
    // Remove common tracking parameters
    const trackingParams = ['utm_source', 'utm_medium', 'utm_campaign', 'fbclid', 'gclid'];
    trackingParams.forEach((param) => urlObj.searchParams.delete(param));
    // Remove fragment
    urlObj.hash = '';
    return urlObj.toString();
  } catch (error) {
    return url;
  }
}

/**
 * Generate hash for URL (for caching)
 */
function hashUrl(url) {
  return crypto.createHash('sha256').update(url).digest('hex');
}

/**
 * Check cache for previously extracted recipe
 */
async function checkCache(url) {
  const normalizedUrl = normalizeUrl(url);
  const urlHash = hashUrl(normalizedUrl);

  try {
    const result = await pool.query(
      `SELECT extracted_data, extraction_method
       FROM recipe_extraction_cache
       WHERE url_hash = $1 AND expires_at > NOW()`,
      [urlHash]
    );

    if (result.rows.length > 0) {
      logger.info('Cache hit for recipe extraction', { url: normalizedUrl });
      return {
        ...result.rows[0].extracted_data,
        extractionMethod: result.rows[0].extraction_method,
        cached: true,
      };
    }

    return null;
  } catch (error) {
    logger.warn('Cache check failed', { error: error.message });
    return null;
  }
}

/**
 * Save extraction to cache
 */
async function saveToCache(url, data, extractionMethod) {
  const normalizedUrl = normalizeUrl(url);
  const urlHash = hashUrl(normalizedUrl);

  try {
    await pool.query(
      `INSERT INTO recipe_extraction_cache (url_hash, url, extracted_data, extraction_method)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (url_hash) DO UPDATE
       SET extracted_data = $3, extraction_method = $4, created_at = NOW(),
           expires_at = NOW() + INTERVAL '30 days'`,
      [urlHash, normalizedUrl, JSON.stringify(data), extractionMethod]
    );

    logger.info('Recipe extraction saved to cache', { url: normalizedUrl });
  } catch (error) {
    logger.warn('Failed to save to cache', { error: error.message });
  }
}

/**
 * Fetch HTML from URL
 */
async function fetchHtml(url) {
  try {
    const urlObj = new URL(url);
    const origin = `${urlObj.protocol}//${urlObj.host}`;

    const response = await axios.get(url, {
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        Accept:
          'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9',
        'Accept-Encoding': 'gzip, deflate, br',
        Referer: origin + '/',
        'Cache-Control': 'no-cache',
        Pragma: 'no-cache',
        'Sec-Fetch-Dest': 'document',
        'Sec-Fetch-Mode': 'navigate',
        'Sec-Fetch-Site': 'same-origin',
        'Sec-Fetch-User': '?1',
        'Upgrade-Insecure-Requests': '1',
        DNT: '1',
      },
      timeout: 15000,
      maxRedirects: 5,
      validateStatus: (status) => status >= 200 && status < 400,
    });

    return response.data;
  } catch (error) {
    logger.error('Failed to fetch URL', {
      url,
      error: error.message,
      status: error.response?.status,
    });
    throw new RecipeExtractionError(
      'Could not fetch the webpage',
      'URL_FETCH_FAILED',
      error.message
    );
  }
}

/**
 * Extract image URL from schema.org image field
 */
function extractImageUrl(imageField) {
  if (!imageField) {
    return null;
  }

  if (typeof imageField === 'string') {
    return imageField;
  }

  if (Array.isArray(imageField)) {
    return imageField[0]?.url || imageField[0];
  }

  if (typeof imageField === 'object') {
    return imageField.url || null;
  }

  return null;
}

/**
 * Parse ISO 8601 duration to human-readable format
 */
function parseDuration(duration) {
  if (!duration || typeof duration !== 'string') {
    return null;
  }

  const match = duration.match(/PT(?:(\d+)H)?(?:(\d+)M)?/);
  if (!match) {
    return duration;
  }

  const hours = parseInt(match[1] || 0);
  const minutes = parseInt(match[2] || 0);

  if (hours && minutes) {
    return `${hours} hour${hours > 1 ? 's' : ''} ${minutes} minute${minutes > 1 ? 's' : ''}`;
  } else if (hours) {
    return `${hours} hour${hours > 1 ? 's' : ''}`;
  } else if (minutes) {
    return `${minutes} minute${minutes > 1 ? 's' : ''}`;
  }

  return duration;
}

/**
 * Parse schema.org ingredients (can be strings, objects, or HowToSection objects)
 */
function parseSchemaIngredients(ingredients) {
  if (!Array.isArray(ingredients)) {
    return [];
  }

  const parsed = [];
  let sortOrder = 0;
  let currentGroup = null;

  ingredients.forEach((ingredient) => {
    // Handle HowToSection for grouped ingredients
    if (typeof ingredient === 'object' && ingredient['@type'] === 'HowToSection') {
      currentGroup = ingredient.name || null;
      if (Array.isArray(ingredient.itemListElement)) {
        ingredient.itemListElement.forEach((item) => {
          const text = typeof item === 'string' ? item : item.text || item.name;
          if (text) {
            const parsedIng = parseIngredientString(text, sortOrder++);
            parsedIng.group = currentGroup;
            parsed.push(parsedIng);
          }
        });
      }
    }
    // Handle plain string
    else if (typeof ingredient === 'string') {
      const parsedIng = parseIngredientString(ingredient, sortOrder++);
      parsedIng.group = currentGroup;
      parsed.push(parsedIng);
    }
    // Handle object with text property
    else if (typeof ingredient === 'object' && ingredient.text) {
      const parsedIng = parseIngredientString(ingredient.text, sortOrder++);
      parsedIng.group = currentGroup;
      parsed.push(parsedIng);
    }
  });

  return parsed;
}

/**
 * Parse schema.org instructions (can be strings, HowToStep objects, or HowToSection objects)
 */
function parseSchemaInstructions(instructions) {
  if (!Array.isArray(instructions)) {
    if (typeof instructions === 'string') {
      return [instructions];
    }
    return [];
  }

  const parsed = [];

  instructions.forEach((instruction) => {
    // Handle plain string
    if (typeof instruction === 'string') {
      parsed.push(instruction);
    }
    // Handle HowToSection (contains multiple steps)
    else if (typeof instruction === 'object' && instruction['@type'] === 'HowToSection') {
      if (Array.isArray(instruction.itemListElement)) {
        instruction.itemListElement.forEach((step) => {
          const text = typeof step === 'string' ? step : step.text || step.description;
          if (text) {
            parsed.push(text);
          }
        });
      }
    }
    // Handle HowToStep or other objects
    else if (typeof instruction === 'object') {
      const text = instruction.text || instruction.description;
      if (text) {
        parsed.push(text);
      }
    }
  });

  return parsed;
}

/**
 * Parse ingredient string using the new robust parser
 * This wrapper maintains the same interface for backward compatibility
 */
function parseIngredientString(rawText, sortOrder = 0) {
  return parseIngredient(rawText, sortOrder);
}

/**
 * Extract recipe from schema.org JSON-LD
 */
function extractRecipeFromSchema(html) {
  const $ = cheerio.load(html);
  const scripts = $('script[type="application/ld+json"]');

  for (let i = 0; i < scripts.length; i++) {
    try {
      const jsonLd = JSON.parse($(scripts[i]).html());
      const recipes = Array.isArray(jsonLd) ? jsonLd : [jsonLd];

      const recipeData = recipes.find(
        (item) =>
          item['@type'] === 'Recipe' ||
          (Array.isArray(item['@type']) && item['@type'].includes('Recipe'))
      );

      if (!recipeData) {
        continue;
      }

      // Validate required fields
      if (!recipeData.name || !recipeData.recipeIngredient || !recipeData.recipeInstructions) {
        logger.warn('Incomplete schema.org recipe data');
        continue;
      }

      const recipe = {
        title: recipeData.name,
        description: recipeData.description || null,
        imageUrl: extractImageUrl(recipeData.image),
        servings: recipeData.recipeYield || null,
        prepTime: parseDuration(recipeData.prepTime),
        cookTime: parseDuration(recipeData.cookTime),
        totalTime: parseDuration(recipeData.totalTime),
        ingredients: parseSchemaIngredients(recipeData.recipeIngredient),
        instructions: parseSchemaInstructions(recipeData.recipeInstructions),
      };

      // Final validation
      if (recipe.ingredients.length > 0 && recipe.instructions.length > 0) {
        logger.info('Successfully extracted recipe from schema.org');
        return recipe;
      }
    } catch (error) {
      logger.warn('Failed to parse JSON-LD', { error: error.message });
      continue;
    }
  }

  return null;
}

/**
 * Clean HTML for LLM processing
 */
function cleanHtmlForLLM(html) {
  const $ = cheerio.load(html);

  // Remove unnecessary elements
  $('script, style, nav, header, footer, iframe, .ad, .advertisement, .social-share').remove();

  // Try to find main content area
  const mainContent = $(
    'article, [role="main"], main, .recipe, .post-content, .entry-content'
  ).first();

  if (mainContent.length > 0) {
    return mainContent.text().trim().substring(0, 15000); // Limit to 15k chars
  }

  // Fallback to body
  return $('body').text().trim().substring(0, 15000);
}

/**
 * Extract recipe using Claude API
 */
async function extractRecipeWithLLM(html) {
  const cleanedHtml = cleanHtmlForLLM(html);

  if (!cleanedHtml || cleanedHtml.length < 100) {
    throw new RecipeExtractionError(
      'Insufficient content for extraction',
      'NO_RECIPE_FOUND',
      'The webpage does not contain enough content'
    );
  }

  const prompt = `You are a recipe extraction assistant. Extract the recipe information from the following webpage content and return it as a JSON object.

Required fields:
- title (string): The recipe name
- description (string, optional): Brief description of the dish
- servings (string, optional): Number of servings (e.g., "4 servings", "Makes 12 cookies")
- prepTime (string, optional): Preparation time
- cookTime (string, optional): Cooking time
- totalTime (string, optional): Total time
- ingredients (array of objects): Each object must have:
  - rawText (string): The complete ingredient line as written
  - quantity (number or null): Numeric quantity
  - unit (string or null): Unit of measurement
  - ingredient (string): The ingredient name
  - preparation (string or null): Preparation method (e.g., "chopped", "diced")
  - group (string or null): Group name if ingredients are grouped (e.g., "For the sauce")
- instructions (array of strings): Step-by-step instructions

Important:
- Parse ingredient quantities carefully (handle fractions like "1/2", ranges like "2-3")
- Preserve the order of ingredients and instructions
- If ingredients are grouped (e.g., "For the dough:", "For the filling:"), capture the group name
- Return ONLY the JSON object, no other text
- If this is not a recipe or you cannot find recipe information, return an empty object: {}

Webpage content:
${cleanedHtml}`;

  try {
    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 4000,
      messages: [
        {
          role: 'user',
          content: prompt,
        },
      ],
    });

    const jsonText = response.content[0].text.trim();

    // Try to extract JSON if it's wrapped in markdown code blocks
    let cleanedJson = jsonText;
    if (jsonText.includes('```')) {
      const match = jsonText.match(/```(?:json)?\s*(\{[\s\S]*\})\s*```/);
      if (match) {
        cleanedJson = match[1];
      }
    }

    const recipe = JSON.parse(cleanedJson);

    // Validate
    if (!recipe.title || !recipe.ingredients || !recipe.instructions) {
      throw new RecipeExtractionError(
        'Incomplete recipe extraction from LLM',
        'LLM_EXTRACTION_FAILED',
        'The LLM could not extract complete recipe information'
      );
    }

    if (recipe.ingredients.length === 0 || recipe.instructions.length === 0) {
      throw new RecipeExtractionError(
        'Recipe missing required fields',
        'LLM_EXTRACTION_FAILED',
        'No ingredients or instructions found'
      );
    }

    // Ensure ingredients have sortOrder
    recipe.ingredients = recipe.ingredients.map((ing, index) => ({
      ...ing,
      sortOrder: ing.sortOrder || index,
    }));

    logger.info('Successfully extracted recipe with LLM');
    return recipe;
  } catch (error) {
    if (error instanceof RecipeExtractionError) {
      throw error;
    }

    logger.error('LLM extraction failed', { error: error.message });
    throw new RecipeExtractionError(
      'Failed to extract recipe with AI',
      'LLM_EXTRACTION_FAILED',
      error.message
    );
  }
}

/**
 * Main extraction function
 */
async function extractRecipe(url) {
  // Check cache first
  const cached = await checkCache(url);
  if (cached) {
    return cached;
  }

  // Fetch HTML
  const html = await fetchHtml(url);

  // Try schema.org extraction first
  let recipe = extractRecipeFromSchema(html);
  let extractionMethod = 'schema';

  // If schema extraction failed or incomplete, fall back to LLM
  if (!recipe) {
    logger.info('Schema extraction failed, falling back to LLM');
    recipe = await extractRecipeWithLLM(html);
    extractionMethod = 'llm';
  }

  // Add source URL and extraction method
  recipe.sourceUrl = normalizeUrl(url);
  recipe.extractionMethod = extractionMethod;

  // Save to cache
  await saveToCache(url, recipe, extractionMethod);

  return recipe;
}

module.exports = {
  extractRecipe,
  RecipeExtractionError,
};
