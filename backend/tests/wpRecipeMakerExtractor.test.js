/**
 * Tests for WP Recipe Maker HTML Extractor
 */

const cheerio = require('cheerio');
const {
  extractFromWPRM,
  hasWPRMMarkup,
  extractTitle,
  extractDescription,
  extractAuthor,
  extractImage,
  extractTime,
  extractServings,
  extractIngredients,
  extractInstructions,
} = require('../src/services/extractors/wpRecipeMakerExtractor');

// Sample WP Recipe Maker HTML structure
const sampleWPRMHtml = `
<!DOCTYPE html>
<html>
<head><title>Test Recipe</title></head>
<body>
  <div class="wprm-recipe">
    <h2 class="wprm-recipe-name">Chocolate Chip Cookies</h2>
    <div class="wprm-recipe-summary">The best homemade chocolate chip cookies ever!</div>
    <div class="wprm-recipe-author">By Jane Doe</div>
    <div class="wprm-recipe-image">
      <img src="https://example.com/cookies.jpg" alt="Cookies">
    </div>
    <div class="wprm-recipe-details">
      <div class="wprm-recipe-prep-time-container">
        <span class="wprm-recipe-time-minutes">15</span>
      </div>
      <div class="wprm-recipe-cook-time-container">
        <span class="wprm-recipe-time-minutes">12</span>
      </div>
      <div class="wprm-recipe-total-time-container">
        <span class="wprm-recipe-time-minutes">27</span>
      </div>
      <div class="wprm-recipe-servings">
        <span class="wprm-recipe-servings-amount">24</span>
      </div>
    </div>
    <div class="wprm-recipe-ingredients">
      <div class="wprm-recipe-ingredient">
        <span class="wprm-recipe-ingredient-amount">2</span>
        <span class="wprm-recipe-ingredient-unit">cups</span>
        <span class="wprm-recipe-ingredient-name">all-purpose flour</span>
      </div>
      <div class="wprm-recipe-ingredient">
        <span class="wprm-recipe-ingredient-amount">1</span>
        <span class="wprm-recipe-ingredient-unit">cup</span>
        <span class="wprm-recipe-ingredient-name">butter</span>
        <span class="wprm-recipe-ingredient-notes">softened</span>
      </div>
      <div class="wprm-recipe-ingredient">
        <span class="wprm-recipe-ingredient-amount">2</span>
        <span class="wprm-recipe-ingredient-unit">cups</span>
        <span class="wprm-recipe-ingredient-name">chocolate chips</span>
      </div>
    </div>
    <div class="wprm-recipe-instructions">
      <div class="wprm-recipe-instruction">
        <span class="wprm-recipe-instruction-text">Preheat oven to 375°F.</span>
      </div>
      <div class="wprm-recipe-instruction">
        <span class="wprm-recipe-instruction-text">Mix flour and butter together.</span>
      </div>
      <div class="wprm-recipe-instruction">
        <span class="wprm-recipe-instruction-text">Add chocolate chips and mix well.</span>
      </div>
      <div class="wprm-recipe-instruction">
        <span class="wprm-recipe-instruction-text">Bake for 12 minutes until golden.</span>
      </div>
    </div>
  </div>
</body>
</html>
`;

// HTML with grouped ingredients
const groupedIngredientsHtml = `
<div class="wprm-recipe">
  <h2 class="wprm-recipe-name">Layer Cake</h2>
  <div class="wprm-recipe-ingredients">
    <div class="wprm-recipe-ingredient-group">
      <div class="wprm-recipe-group-name">For the cake</div>
      <div class="wprm-recipe-ingredient">
        <span class="wprm-recipe-ingredient-amount">2</span>
        <span class="wprm-recipe-ingredient-unit">cups</span>
        <span class="wprm-recipe-ingredient-name">flour</span>
      </div>
      <div class="wprm-recipe-ingredient">
        <span class="wprm-recipe-ingredient-amount">3</span>
        <span class="wprm-recipe-ingredient-name">eggs</span>
      </div>
    </div>
    <div class="wprm-recipe-ingredient-group">
      <div class="wprm-recipe-group-name">For the frosting</div>
      <div class="wprm-recipe-ingredient">
        <span class="wprm-recipe-ingredient-amount">1</span>
        <span class="wprm-recipe-ingredient-unit">cup</span>
        <span class="wprm-recipe-ingredient-name">butter</span>
      </div>
      <div class="wprm-recipe-ingredient">
        <span class="wprm-recipe-ingredient-amount">2</span>
        <span class="wprm-recipe-ingredient-unit">cups</span>
        <span class="wprm-recipe-ingredient-name">powdered sugar</span>
      </div>
    </div>
  </div>
  <div class="wprm-recipe-instructions">
    <div class="wprm-recipe-instruction">
      <span class="wprm-recipe-instruction-text">Make the cake.</span>
    </div>
    <div class="wprm-recipe-instruction">
      <span class="wprm-recipe-instruction-text">Make the frosting.</span>
    </div>
  </div>
</div>
`;

// Non-WPRM HTML
const nonWPRMHtml = `
<!DOCTYPE html>
<html>
<head><title>Regular Page</title></head>
<body>
  <h1>Just a regular blog post</h1>
  <p>No recipe here!</p>
</body>
</html>
`;

// HTML with hours and minutes
const timeWithHoursHtml = `
<div class="wprm-recipe">
  <h2 class="wprm-recipe-name">Slow Cooked Roast</h2>
  <div class="wprm-recipe-prep-time-container">
    <span class="wprm-recipe-time-hours">1</span>
    <span class="wprm-recipe-time-minutes">30</span>
  </div>
  <div class="wprm-recipe-cook-time-container">
    <span class="wprm-recipe-time-hours">4</span>
    <span class="wprm-recipe-time-minutes">0</span>
  </div>
  <div class="wprm-recipe-ingredients">
    <div class="wprm-recipe-ingredient">1 roast</div>
  </div>
  <div class="wprm-recipe-instructions">
    <div class="wprm-recipe-instruction">Cook it low and slow.</div>
  </div>
</div>
`;

describe('WP Recipe Maker Extractor', () => {
  describe('hasWPRMMarkup', () => {
    test('detects WPRM markup', () => {
      const $ = cheerio.load(sampleWPRMHtml);
      expect(hasWPRMMarkup($)).toBe(true);
    });

    test('returns false for non-WPRM HTML', () => {
      const $ = cheerio.load(nonWPRMHtml);
      expect(hasWPRMMarkup($)).toBe(false);
    });
  });

  describe('extractTitle', () => {
    test('extracts recipe title', () => {
      const $ = cheerio.load(sampleWPRMHtml);
      expect(extractTitle($)).toBe('Chocolate Chip Cookies');
    });

    test('returns null when no title found', () => {
      const $ = cheerio.load('<div class="wprm-recipe"></div>');
      expect(extractTitle($)).toBe(null);
    });
  });

  describe('extractDescription', () => {
    test('extracts recipe description', () => {
      const $ = cheerio.load(sampleWPRMHtml);
      expect(extractDescription($)).toBe('The best homemade chocolate chip cookies ever!');
    });

    test('returns null when no description found', () => {
      const $ = cheerio.load('<div class="wprm-recipe"></div>');
      expect(extractDescription($)).toBe(null);
    });
  });

  describe('extractAuthor', () => {
    test('extracts author name', () => {
      const $ = cheerio.load(sampleWPRMHtml);
      expect(extractAuthor($)).toBe('Jane Doe');
    });

    test('removes "By " prefix', () => {
      const $ = cheerio.load('<div class="wprm-recipe-author">By John Smith</div>');
      expect(extractAuthor($)).toBe('John Smith');
    });

    test('returns null when no author found', () => {
      const $ = cheerio.load('<div class="wprm-recipe"></div>');
      expect(extractAuthor($)).toBe(null);
    });
  });

  describe('extractImage', () => {
    test('extracts image URL from src', () => {
      const $ = cheerio.load(sampleWPRMHtml);
      expect(extractImage($)).toBe('https://example.com/cookies.jpg');
    });

    test('extracts from data-lazy-src', () => {
      const html = '<div class="wprm-recipe-image"><img data-lazy-src="https://example.com/lazy.jpg"></div>';
      const $ = cheerio.load(html);
      expect(extractImage($)).toBe('https://example.com/lazy.jpg');
    });

    test('returns null when no image found', () => {
      const $ = cheerio.load('<div class="wprm-recipe"></div>');
      expect(extractImage($)).toBe(null);
    });
  });

  describe('extractTime', () => {
    test('extracts minutes only', () => {
      const $ = cheerio.load(sampleWPRMHtml);
      expect(extractTime($, 'prep')).toBe('15 minutes');
      expect(extractTime($, 'cook')).toBe('12 minutes');
      expect(extractTime($, 'total')).toBe('27 minutes');
    });

    test('extracts hours and minutes', () => {
      const $ = cheerio.load(timeWithHoursHtml);
      expect(extractTime($, 'prep')).toBe('1 hour 30 minutes');
      expect(extractTime($, 'cook')).toBe('4 hours');
    });

    test('returns null when time not found', () => {
      const $ = cheerio.load('<div class="wprm-recipe"></div>');
      expect(extractTime($, 'prep')).toBe(null);
    });
  });

  describe('extractServings', () => {
    test('extracts servings count', () => {
      const $ = cheerio.load(sampleWPRMHtml);
      expect(extractServings($)).toBe('24');
    });

    test('returns null when servings not found', () => {
      const $ = cheerio.load('<div class="wprm-recipe"></div>');
      expect(extractServings($)).toBe(null);
    });
  });

  describe('extractIngredients', () => {
    test('extracts ingredients with structured data', () => {
      const $ = cheerio.load(sampleWPRMHtml);
      const ingredients = extractIngredients($);

      expect(ingredients).toHaveLength(3);
      expect(ingredients[0].rawText).toBe('2 cups all-purpose flour');
      expect(ingredients[1].rawText).toBe('1 cup butter, softened');
      expect(ingredients[2].rawText).toBe('2 cups chocolate chips');
    });

    test('assigns sortOrder to ingredients', () => {
      const $ = cheerio.load(sampleWPRMHtml);
      const ingredients = extractIngredients($);

      expect(ingredients[0].sortOrder).toBe(0);
      expect(ingredients[1].sortOrder).toBe(1);
      expect(ingredients[2].sortOrder).toBe(2);
    });

    test('handles grouped ingredients', () => {
      const $ = cheerio.load(groupedIngredientsHtml);
      const ingredients = extractIngredients($);

      expect(ingredients).toHaveLength(4);
      expect(ingredients[0].group).toBe('For the cake');
      expect(ingredients[1].group).toBe('For the cake');
      expect(ingredients[2].group).toBe('For the frosting');
      expect(ingredients[3].group).toBe('For the frosting');
    });

    test('returns empty array when no ingredients found', () => {
      const $ = cheerio.load('<div class="wprm-recipe"></div>');
      expect(extractIngredients($)).toEqual([]);
    });
  });

  describe('extractInstructions', () => {
    test('extracts instructions', () => {
      const $ = cheerio.load(sampleWPRMHtml);
      const instructions = extractInstructions($);

      expect(instructions).toHaveLength(4);
      expect(instructions[0]).toBe('Preheat oven to 375°F.');
      expect(instructions[1]).toBe('Mix flour and butter together.');
      expect(instructions[2]).toBe('Add chocolate chips and mix well.');
      expect(instructions[3]).toBe('Bake for 12 minutes until golden.');
    });

    test('returns empty array when no instructions found', () => {
      const $ = cheerio.load('<div class="wprm-recipe"></div>');
      expect(extractInstructions($)).toEqual([]);
    });
  });

  describe('extractFromWPRM', () => {
    test('extracts complete recipe', () => {
      const recipe = extractFromWPRM(sampleWPRMHtml);

      expect(recipe).not.toBe(null);
      expect(recipe.title).toBe('Chocolate Chip Cookies');
      expect(recipe.description).toBe('The best homemade chocolate chip cookies ever!');
      expect(recipe.author).toBe('Jane Doe');
      expect(recipe.imageUrl).toBe('https://example.com/cookies.jpg');
      expect(recipe.servings).toBe('24');
      expect(recipe.prepTime).toBe('15 minutes');
      expect(recipe.cookTime).toBe('12 minutes');
      expect(recipe.totalTime).toBe('27 minutes');
      expect(recipe.ingredients).toHaveLength(3);
      expect(recipe.instructions).toHaveLength(4);
    });

    test('returns null for non-WPRM HTML', () => {
      const recipe = extractFromWPRM(nonWPRMHtml);
      expect(recipe).toBe(null);
    });

    test('returns null when title is missing', () => {
      const html = '<div class="wprm-recipe"><div class="wprm-recipe-ingredients">flour</div></div>';
      const recipe = extractFromWPRM(html);
      expect(recipe).toBe(null);
    });

    test('handles recipe with grouped ingredients', () => {
      const recipe = extractFromWPRM(groupedIngredientsHtml);

      expect(recipe).not.toBe(null);
      expect(recipe.title).toBe('Layer Cake');
      expect(recipe.ingredients).toHaveLength(4);
      expect(recipe.ingredients[0].group).toBe('For the cake');
      expect(recipe.ingredients[2].group).toBe('For the frosting');
    });
  });
});
