/**
 * Pepperplate Export Parser
 *
 * Parses recipe text files exported from Pepperplate.com
 *
 * Format:
 * Title: <recipe title>
 * Description: <optional>
 * Source: <optional - source name>
 * Original URL: <optional - source URL>
 * Yield: <optional - servings>
 * Active: <optional - prep time>
 * Total: <optional - total time>
 * Image: <optional - image URL>
 * Ingredients:
 *   <tab-indented ingredients>
 * Instructions:
 *   <tab-indented instructions>
 * Notes: <optional notes>
 */

const { parseIngredientString } = require('./ingredientParser');

/**
 * Parse a single Pepperplate recipe text file
 * @param {string} content - Raw text content of the .txt file
 * @returns {object|null} Parsed recipe object or null if invalid
 */
function parsePepperplateRecipe(content) {
  if (!content || typeof content !== 'string') {
    return null;
  }

  const lines = content.split('\n');
  const recipe = {
    title: null,
    description: null,
    sourceUrl: null,
    imageUrl: null,
    servings: null,
    prepTime: null,
    cookTime: null,
    totalTime: null,
    ingredients: [],
    instructions: [],
    notes: null,
    extractionMethod: 'pepperplate-import',
  };

  let currentSection = 'header'; // 'header', 'ingredients', 'instructions', or 'notes'
  let source = null; // Pepperplate 'Source' field (e.g., "Food Network")

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmedLine = line.trim();

    // Check for section headers
    if (trimmedLine === 'Ingredients:') {
      currentSection = 'ingredients';
      continue;
    }

    if (trimmedLine === 'Instructions:') {
      currentSection = 'instructions';
      continue;
    }

    // Notes section - can appear after Instructions
    if (trimmedLine.startsWith('Notes:')) {
      currentSection = 'notes';
      // Notes might have inline content after "Notes:"
      const inlineNotes = extractValue(line, 'Notes:');
      if (inlineNotes) {
        recipe.notes = inlineNotes;
      }
      continue;
    }

    // Parse header fields
    if (currentSection === 'header') {
      if (line.startsWith('Title:')) {
        recipe.title = extractValue(line, 'Title:');
      } else if (line.startsWith('Description:')) {
        recipe.description = extractValue(line, 'Description:');
      } else if (line.startsWith('Source:')) {
        source = extractValue(line, 'Source:');
      } else if (line.startsWith('Original URL:')) {
        recipe.sourceUrl = extractValue(line, 'Original URL:');
      } else if (line.startsWith('Yield:')) {
        recipe.servings = extractValue(line, 'Yield:');
      } else if (line.startsWith('Active:')) {
        recipe.prepTime = extractValue(line, 'Active:');
      } else if (line.startsWith('Total:')) {
        recipe.totalTime = extractValue(line, 'Total:');
      } else if (line.startsWith('Image:')) {
        recipe.imageUrl = extractValue(line, 'Image:');
      }
      continue;
    }

    // Parse ingredients (tab-indented lines after Ingredients:)
    if (currentSection === 'ingredients') {
      // Ingredients are tab-indented
      if (line.startsWith('\t') || line.startsWith('  ')) {
        const ingredientText = trimmedLine;
        if (ingredientText) {
          const parsed = parseIngredientString(ingredientText, recipe.ingredients.length);
          recipe.ingredients.push(parsed);
        }
      }
      continue;
    }

    // Parse instructions (tab-indented lines after Instructions:)
    if (currentSection === 'instructions') {
      // Instructions are tab-indented
      if (line.startsWith('\t') || line.startsWith('  ')) {
        if (trimmedLine) {
          recipe.instructions.push(trimmedLine);
        }
      }
      continue;
    }

    // Parse notes (can be multi-line)
    if (currentSection === 'notes') {
      if (trimmedLine) {
        if (recipe.notes) {
          recipe.notes += '\n' + trimmedLine;
        } else {
          recipe.notes = trimmedLine;
        }
      }
      continue;
    }
  }

  // Build description from source and notes
  const descriptionParts = [];
  if (recipe.description) {
    descriptionParts.push(recipe.description);
  }
  if (source) {
    descriptionParts.push(`Source: ${source}`);
  }
  if (descriptionParts.length > 0) {
    recipe.description = descriptionParts.join('\n\n');
  }

  // Validate - must have at least a title
  if (!recipe.title) {
    return null;
  }

  return recipe;
}

/**
 * Extract value from a "Label: Value" line
 * @param {string} line - The full line
 * @param {string} prefix - The label prefix (e.g., "Title:")
 * @returns {string|null} The extracted value or null if empty
 */
function extractValue(line, prefix) {
  const value = line.substring(prefix.length).trim();
  return value || null;
}

/**
 * Normalize a recipe title for duplicate detection
 * @param {string} title - Recipe title
 * @returns {string} Normalized title (lowercase, trimmed)
 */
function normalizeTitle(title) {
  if (!title) {
    return '';
  }
  return title.toLowerCase().trim();
}

module.exports = {
  parsePepperplateRecipe,
  normalizeTitle,
};
