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
    const status = error.response?.status;
    logger.error('Failed to fetch URL', {
      url,
      error: error.message,
      status,
    });

    // Provide specific, user-friendly error messages based on failure type
    if (status === 403) {
      throw new RecipeExtractionError(
        'This website blocks automated access. Try copying the recipe manually.',
        'URL_BLOCKED',
        `HTTP 403 Forbidden - The site has anti-scraping protection`
      );
    }

    if (status === 404) {
      throw new RecipeExtractionError(
        'Recipe page not found. Please check the URL and try again.',
        'URL_NOT_FOUND',
        `HTTP 404 - The page may have been moved or deleted`
      );
    }

    if (status === 429) {
      throw new RecipeExtractionError(
        'Too many requests to this website. Please wait a moment and try again.',
        'URL_RATE_LIMITED',
        `HTTP 429 - Rate limited by the recipe website`
      );
    }

    if (status >= 500) {
      throw new RecipeExtractionError(
        'The recipe website is temporarily unavailable. Please try again later.',
        'URL_SERVER_ERROR',
        `HTTP ${status} - The recipe website returned a server error`
      );
    }

    if (error.code === 'ECONNABORTED' || error.message.includes('timeout')) {
      throw new RecipeExtractionError(
        'The request timed out. The website may be slow or unavailable.',
        'URL_TIMEOUT',
        'Request exceeded the 15-second timeout'
      );
    }

    if (error.code === 'ENOTFOUND' || error.code === 'ERR_BAD_REQUEST') {
      throw new RecipeExtractionError(
        'Invalid URL. Please check the web address and try again.',
        'URL_INVALID',
        error.message
      );
    }

    throw new RecipeExtractionError(
      'Could not fetch the webpage. Please check the URL and try again.',
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
 * Parse recipeYield into a clean servings string
 * Handles arrays, numbers, and various string formats
 *
 * Examples:
 *   ["4", "4 servings"] → "4"
 *   "4 servings" → "4"
 *   "Makes 12 cookies" → "12"
 *   4 → "4"
 *   "4-6 servings" → "4-6"
 *   "6 to 8" → "6-8"
 */
function parseServings(recipeYield) {
  if (recipeYield === null || recipeYield === undefined) return null;

  let raw;

  // Handle arrays - pick the shortest numeric entry (usually just the number)
  if (Array.isArray(recipeYield)) {
    // Find the first entry that is just a number
    const numericEntry = recipeYield.find((entry) => /^\d+$/.test(String(entry).trim()));
    if (numericEntry) return String(numericEntry);

    // Otherwise use the first entry
    raw = String(recipeYield[0]);
  } else {
    raw = String(recipeYield);
  }

  raw = raw.trim();

  // Already a clean number
  if (/^\d+$/.test(raw)) return raw;

  // Range: "4-6 servings" or "4 - 6"
  const rangeMatch = raw.match(/(\d+)\s*[-–]\s*(\d+)/);
  if (rangeMatch) return `${rangeMatch[1]}-${rangeMatch[2]}`;

  // Range with "to": "6 to 8 servings"
  const toRangeMatch = raw.match(/(\d+)\s+to\s+(\d+)/i);
  if (toRangeMatch) return `${toRangeMatch[1]}-${toRangeMatch[2]}`;

  // Extract first number from string like "4 servings", "Makes 12 cookies"
  const numberMatch = raw.match(/(\d+)/);
  if (numberMatch) return numberMatch[1];

  // Return as-is if we can't parse (e.g., "a dozen")
  return raw;
}

/**
 * Check if an item is a Recipe type
 */
function isRecipeType(item) {
  if (!item || typeof item !== 'object') return false;
  const type = item['@type'];
  if (type === 'Recipe') return true;
  if (Array.isArray(type) && type.includes('Recipe')) return true;
  return false;
}

/**
 * Resolve an @id reference within a @graph array
 */
function resolveIdReference(ref, graph) {
  if (!ref || !graph || !Array.isArray(graph)) return null;

  // If it's a string @id reference
  const id = typeof ref === 'string' ? ref : ref['@id'];
  if (!id) return ref; // Return as-is if no @id

  // Find the referenced object in the graph
  const resolved = graph.find((item) => item['@id'] === id);
  return resolved || ref;
}

/**
 * Extract author name from schema.org author field
 * Handles direct values, objects, arrays, and @id references
 */
function extractAuthorName(authorField, graph) {
  if (!authorField) return null;

  // Direct string
  if (typeof authorField === 'string') return authorField;

  // Array of authors - take first one
  if (Array.isArray(authorField)) {
    const first = authorField[0];
    if (typeof first === 'string') return first;
    // Resolve if it's a reference
    const resolved = resolveIdReference(first, graph);
    return resolved?.name || null;
  }

  // Object with @id reference - resolve it
  if (authorField['@id']) {
    const resolved = resolveIdReference(authorField, graph);
    return resolved?.name || null;
  }

  // Direct object with name
  return authorField.name || null;
}

/**
 * Calculate extraction quality score based on which fields are present
 * Returns an object with score (0-100) and list of missing fields
 */
function calculateExtractionQuality(recipe) {
  const fields = [
    { key: 'title', weight: 20, label: 'title' },
    { key: 'ingredients', weight: 25, label: 'ingredients', isArray: true },
    { key: 'instructions', weight: 25, label: 'instructions', isArray: true },
    { key: 'description', weight: 5, label: 'description' },
    { key: 'author', weight: 5, label: 'author' },
    { key: 'imageUrl', weight: 5, label: 'image' },
    { key: 'servings', weight: 5, label: 'servings' },
    { key: 'prepTime', weight: 3, label: 'prep time' },
    { key: 'cookTime', weight: 3, label: 'cook time' },
    { key: 'totalTime', weight: 4, label: 'total time' },
  ];

  let score = 0;
  const missing = [];

  for (const field of fields) {
    const value = recipe[field.key];
    const hasValue = field.isArray
      ? Array.isArray(value) && value.length > 0
      : value !== null && value !== undefined && value !== '';

    if (hasValue) {
      score += field.weight;
    } else {
      missing.push(field.label);
    }
  }

  return { score, missing };
}

/**
 * Extract recipe from schema.org JSON-LD
 * Supports both direct Recipe objects and @graph structures
 * Uses partial extraction - returns what's available even if some fields are missing
 */
function extractRecipeFromSchema(html) {
  const $ = cheerio.load(html);
  const scripts = $('script[type="application/ld+json"]');

  for (let i = 0; i < scripts.length; i++) {
    try {
      const jsonLd = JSON.parse($(scripts[i]).html());

      let candidates = [];
      let graph = null;

      // Handle @graph structure (used by many sites including WP Recipe Maker)
      if (jsonLd['@graph'] && Array.isArray(jsonLd['@graph'])) {
        graph = jsonLd['@graph'];
        candidates = graph;
      }
      // Handle array of objects
      else if (Array.isArray(jsonLd)) {
        candidates = jsonLd;
      }
      // Handle single object
      else {
        candidates = [jsonLd];
      }

      // Find the Recipe object
      const recipeData = candidates.find(isRecipeType);

      if (!recipeData) {
        continue;
      }

      // Title is the only truly required field
      if (!recipeData.name) {
        logger.warn('Schema.org recipe missing title, skipping');
        continue;
      }

      // Extract author with @id resolution
      const author = extractAuthorName(recipeData.author, graph);

      const recipe = {
        title: recipeData.name,
        description: recipeData.description || null,
        author: author,
        imageUrl: extractImageUrl(recipeData.image),
        servings: parseServings(recipeData.recipeYield),
        prepTime: parseDuration(recipeData.prepTime),
        cookTime: parseDuration(recipeData.cookTime),
        totalTime: parseDuration(recipeData.totalTime),
        ingredients: parseSchemaIngredients(recipeData.recipeIngredient),
        instructions: parseSchemaInstructions(recipeData.recipeInstructions),
      };

      // Calculate quality score
      const quality = calculateExtractionQuality(recipe);
      recipe.extractionQuality = quality;

      // Log with quality info
      if (quality.missing.length > 0) {
        logger.warn('Partial recipe extraction from schema.org', {
          title: recipe.title,
          score: quality.score,
          missing: quality.missing,
        });
      } else {
        logger.info('Complete recipe extraction from schema.org', {
          title: recipe.title,
          score: quality.score,
        });
      }

      return recipe;
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

    // Validate - title is required, ingredients and instructions are strongly preferred
    if (!recipe.title) {
      throw new RecipeExtractionError(
        'Could not extract recipe title from this page.',
        'LLM_EXTRACTION_FAILED',
        'The LLM could not extract a recipe title'
      );
    }

    if (
      (!recipe.ingredients || recipe.ingredients.length === 0) &&
      (!recipe.instructions || recipe.instructions.length === 0)
    ) {
      throw new RecipeExtractionError(
        'No recipe content found on this page. The URL may not contain a recipe.',
        'LLM_EXTRACTION_FAILED',
        'No ingredients or instructions found'
      );
    }

    // Ensure ingredients have sortOrder
    recipe.ingredients = (recipe.ingredients || []).map((ing, index) => ({
      ...ing,
      sortOrder: ing.sortOrder || index,
    }));

    recipe.instructions = recipe.instructions || [];

    // Calculate quality score
    const quality = calculateExtractionQuality(recipe);
    recipe.extractionQuality = quality;

    logger.info('Successfully extracted recipe with LLM', {
      title: recipe.title,
      score: quality.score,
      missing: quality.missing,
    });
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

  if (recipe) {
    const quality = recipe.extractionQuality;

    // If schema extraction is missing core content (ingredients or instructions),
    // fall back to LLM for a complete extraction
    if (quality && quality.missing.includes('ingredients') && quality.missing.includes('instructions')) {
      logger.info('Schema extraction missing core fields, falling back to LLM', {
        score: quality.score,
        missing: quality.missing,
      });
      recipe = null; // Force LLM fallback
    }
  }

  // If schema extraction failed or was too incomplete, fall back to LLM
  if (!recipe) {
    logger.info('Schema extraction failed or incomplete, falling back to LLM');
    recipe = await extractRecipeWithLLM(html);
    extractionMethod = 'llm';

    // Normalize servings from LLM output
    if (recipe.servings) {
      recipe.servings = parseServings(recipe.servings);
    }
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
