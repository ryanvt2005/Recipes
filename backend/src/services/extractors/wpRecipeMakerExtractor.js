/**
 * WP Recipe Maker HTML Extractor
 *
 * Extracts recipe data from HTML pages using WP Recipe Maker plugin.
 * This plugin is widely used by recipe sites including Skinny Taste, Hey Grill Hey,
 * and many others. It outputs structured HTML with consistent CSS classes.
 *
 * This extractor serves as a fallback when Schema.org JSON-LD extraction fails
 * or returns incomplete data.
 *
 * WP Recipe Maker CSS class patterns:
 * - .wprm-recipe - Main recipe container
 * - .wprm-recipe-name - Recipe title
 * - .wprm-recipe-summary - Recipe description
 * - .wprm-recipe-image - Recipe image
 * - .wprm-recipe-details - Container for time/servings
 * - .wprm-recipe-servings - Servings count
 * - .wprm-recipe-prep-time-* / .wprm-recipe-cook-time-* / .wprm-recipe-total-time-*
 * - .wprm-recipe-ingredients - Ingredients container
 * - .wprm-recipe-ingredient - Individual ingredient
 * - .wprm-recipe-instructions - Instructions container
 * - .wprm-recipe-instruction - Individual instruction step
 */

const cheerio = require('cheerio');
const logger = require('../../config/logger');
const { parseIngredientString } = require('../../utils/ingredientParser');

/**
 * Check if the HTML contains WP Recipe Maker markup
 * @param {CheerioAPI} $ - Cheerio instance
 * @returns {boolean}
 */
function hasWPRMMarkup($) {
  return $('.wprm-recipe').length > 0 || $('[class*="wprm-recipe"]').length > 0;
}

/**
 * Extract recipe title
 * @param {CheerioAPI} $ - Cheerio instance
 * @returns {string|null}
 */
function extractTitle($) {
  // Try multiple selectors in order of preference
  const selectors = [
    '.wprm-recipe-name',
    '.wprm-recipe-header-name',
    'h2.wprm-recipe-name',
    '[class*="wprm-recipe-name"]',
  ];

  for (const selector of selectors) {
    const text = $(selector).first().text().trim();
    if (text) {
      return text;
    }
  }

  return null;
}

/**
 * Extract recipe description/summary
 * @param {CheerioAPI} $ - Cheerio instance
 * @returns {string|null}
 */
function extractDescription($) {
  const selectors = [
    '.wprm-recipe-summary',
    '.wprm-recipe-description',
    '[class*="wprm-recipe-summary"]',
  ];

  for (const selector of selectors) {
    const text = $(selector).first().text().trim();
    if (text) {
      return text;
    }
  }

  return null;
}

/**
 * Extract recipe author
 * @param {CheerioAPI} $ - Cheerio instance
 * @returns {string|null}
 */
function extractAuthor($) {
  const selectors = [
    '.wprm-recipe-author',
    '.wprm-recipe-author-name',
    '[class*="wprm-recipe-author"]',
    '.wprm-recipe-details .wprm-recipe-author-container',
  ];

  for (const selector of selectors) {
    const text = $(selector).first().text().trim();
    // Clean up "By " prefix if present
    if (text) {
      return text.replace(/^by\s+/i, '').trim();
    }
  }

  return null;
}

/**
 * Extract recipe image URL
 * @param {CheerioAPI} $ - Cheerio instance
 * @returns {string|null}
 */
function extractImage($) {
  const selectors = [
    '.wprm-recipe-image img',
    '.wprm-recipe-image source',
    '.wprm-recipe-header-image img',
    '[class*="wprm-recipe-image"] img',
  ];

  for (const selector of selectors) {
    const elem = $(selector).first();
    // Try various image attributes
    const src =
      elem.attr('src') ||
      elem.attr('data-src') ||
      elem.attr('data-lazy-src') ||
      elem.attr('srcset')?.split(',')[0]?.trim().split(' ')[0];

    if (src && !src.includes('data:image')) {
      return src;
    }
  }

  return null;
}

/**
 * Extract time value from WPRM time elements
 * @param {CheerioAPI} $ - Cheerio instance
 * @param {string} timeType - 'prep', 'cook', or 'total'
 * @returns {string|null}
 */
function extractTime($, timeType) {
  const container = $(
    `.wprm-recipe-${timeType}-time-container, .wprm-recipe-${timeType}_time-container`
  ).first();

  if (container.length === 0) {
    // Try alternative: look for time in details section
    const altContainer = $(`.wprm-recipe-details`).find(`[class*="${timeType}"]`).first();
    if (altContainer.length > 0) {
      return altContainer.text().trim() || null;
    }
    return null;
  }

  // Extract hours and minutes
  const hours = container.find('.wprm-recipe-time-hours, .wprm-recipe-hours').text().trim();
  const minutes = container.find('.wprm-recipe-time-minutes, .wprm-recipe-minutes').text().trim();

  const parts = [];
  if (hours && hours !== '0') {
    const hourNum = parseInt(hours);
    parts.push(`${hourNum} hour${hourNum !== 1 ? 's' : ''}`);
  }
  if (minutes && minutes !== '0') {
    const minNum = parseInt(minutes);
    parts.push(`${minNum} minute${minNum !== 1 ? 's' : ''}`);
  }

  return parts.length > 0 ? parts.join(' ') : null;
}

/**
 * Extract servings
 * @param {CheerioAPI} $ - Cheerio instance
 * @returns {string|null}
 */
function extractServings($) {
  const selectors = [
    '.wprm-recipe-servings',
    '.wprm-recipe-servings-with-unit',
    '[class*="wprm-recipe-servings"]',
  ];

  for (const selector of selectors) {
    const container = $(selector).first();
    // Get the servings number
    const servingsNum = container
      .find('.wprm-recipe-servings-amount, .wprm-recipe-servings-number')
      .text()
      .trim();
    if (servingsNum) {
      return servingsNum;
    }
    // Fallback to full text
    const text = container.text().trim();
    if (text) {
      const match = text.match(/(\d+)/);
      if (match) {
        return match[1];
      }
    }
  }

  return null;
}

/**
 * Extract ingredients
 * @param {CheerioAPI} $ - Cheerio instance
 * @returns {Array}
 */
function extractIngredients($) {
  const ingredients = [];
  let sortOrder = 0;
  let currentGroup = null;

  // Find ingredient groups (sections)
  const groups = $('.wprm-recipe-ingredient-group');

  if (groups.length > 0) {
    // Process grouped ingredients
    groups.each((_, groupElem) => {
      const $group = $(groupElem);
      const groupName = $group.find('.wprm-recipe-group-name').text().trim() || null;
      currentGroup = groupName;

      $group.find('.wprm-recipe-ingredient').each((_, ingredientElem) => {
        const ingredient = parseIngredientElement($, ingredientElem, sortOrder++, currentGroup);
        if (ingredient) {
          ingredients.push(ingredient);
        }
      });
    });
  } else {
    // No groups, just individual ingredients
    $('.wprm-recipe-ingredient').each((_, ingredientElem) => {
      const ingredient = parseIngredientElement($, ingredientElem, sortOrder++, null);
      if (ingredient) {
        ingredients.push(ingredient);
      }
    });
  }

  return ingredients;
}

/**
 * Parse a single ingredient element
 * @param {CheerioAPI} $ - Cheerio instance
 * @param {Element} elem - Ingredient element
 * @param {number} sortOrder - Sort order
 * @param {string|null} group - Group name
 * @returns {Object|null}
 */
function parseIngredientElement($, elem, sortOrder, group) {
  const $elem = $(elem);

  // Try to get structured data first
  const amount = $elem.find('.wprm-recipe-ingredient-amount').text().trim();
  const unit = $elem.find('.wprm-recipe-ingredient-unit').text().trim();
  const name = $elem.find('.wprm-recipe-ingredient-name').text().trim();
  const notes = $elem.find('.wprm-recipe-ingredient-notes').text().trim();

  // Build raw text
  let rawText = '';
  if (amount) {
    rawText += amount + ' ';
  }
  if (unit) {
    rawText += unit + ' ';
  }
  if (name) {
    rawText += name;
  }
  if (notes) {
    rawText += ', ' + notes;
  }
  rawText = rawText.trim();

  // Fallback to full text if structured parsing failed
  if (!rawText) {
    rawText = $elem.text().trim();
  }

  if (!rawText) {
    return null;
  }

  // Use the ingredient parser for consistent parsing
  const parsed = parseIngredientString(rawText, sortOrder);
  parsed.group = group;

  return parsed;
}

/**
 * Extract instructions
 * @param {CheerioAPI} $ - Cheerio instance
 * @returns {Array<string>}
 */
function extractInstructions($) {
  const instructions = [];

  // Find instruction groups (sections)
  const groups = $('.wprm-recipe-instruction-group');

  if (groups.length > 0) {
    groups.each((_, groupElem) => {
      const $group = $(groupElem);

      $group.find('.wprm-recipe-instruction').each((_, instructionElem) => {
        const text = extractInstructionText($, instructionElem);
        if (text) {
          instructions.push(text);
        }
      });
    });
  } else {
    // No groups, just individual instructions
    $('.wprm-recipe-instruction').each((_, instructionElem) => {
      const text = extractInstructionText($, instructionElem);
      if (text) {
        instructions.push(text);
      }
    });
  }

  return instructions;
}

/**
 * Extract text from instruction element
 * @param {CheerioAPI} $ - Cheerio instance
 * @param {Element} elem - Instruction element
 * @returns {string|null}
 */
function extractInstructionText($, elem) {
  const $elem = $(elem);

  // Try to get the instruction text (avoid extracting just the step number)
  const textElem = $elem.find('.wprm-recipe-instruction-text');
  if (textElem.length > 0) {
    return textElem.text().trim();
  }

  // Fallback: get full text but remove leading numbers
  let text = $elem.text().trim();
  // Remove leading step numbers like "1." or "1)"
  text = text.replace(/^\d+[.)]\s*/, '');

  return text || null;
}

/**
 * Main extraction function
 * @param {string} html - HTML content
 * @returns {Object|null} Extracted recipe or null if no WPRM markup found
 */
function extractFromWPRM(html) {
  const $ = cheerio.load(html);

  // Check if this page has WPRM markup
  if (!hasWPRMMarkup($)) {
    logger.debug('No WP Recipe Maker markup found');
    return null;
  }

  const title = extractTitle($);

  // Title is required
  if (!title) {
    logger.warn('WP Recipe Maker markup found but no title extracted');
    return null;
  }

  const recipe = {
    title,
    description: extractDescription($),
    author: extractAuthor($),
    imageUrl: extractImage($),
    servings: extractServings($),
    prepTime: extractTime($, 'prep'),
    cookTime: extractTime($, 'cook'),
    totalTime: extractTime($, 'total'),
    ingredients: extractIngredients($),
    instructions: extractInstructions($),
  };

  logger.info('Extracted recipe from WP Recipe Maker HTML', {
    title: recipe.title,
    ingredientCount: recipe.ingredients.length,
    instructionCount: recipe.instructions.length,
  });

  return recipe;
}

module.exports = {
  extractFromWPRM,
  hasWPRMMarkup,
  // Export for testing
  extractTitle,
  extractDescription,
  extractAuthor,
  extractImage,
  extractTime,
  extractServings,
  extractIngredients,
  extractInstructions,
};
