/**
 * Tests for recipeExtractionService utility functions
 */

const {
  parseServings,
  parseDuration,
  extractImageUrl,
  extractAuthorName,
  resolveIdReference,
  isRecipeType,
  calculateExtractionQuality,
  parseSchemaIngredients,
  parseSchemaInstructions,
  normalizeUrl,
} = require('../src/services/recipeExtractionService');

describe('recipeExtractionService', () => {
  describe('parseServings', () => {
    test('handles null and undefined', () => {
      expect(parseServings(null)).toBe(null);
      expect(parseServings(undefined)).toBe(null);
    });

    test('handles plain numbers', () => {
      expect(parseServings(4)).toBe('4');
      expect(parseServings('4')).toBe('4');
      expect(parseServings('12')).toBe('12');
    });

    test('extracts number from text', () => {
      expect(parseServings('4 servings')).toBe('4');
      expect(parseServings('Makes 12 cookies')).toBe('12');
      expect(parseServings('Serves 6 people')).toBe('6');
    });

    test('handles ranges with dash', () => {
      expect(parseServings('4-6 servings')).toBe('4-6');
      expect(parseServings('4 - 6')).toBe('4-6');
      expect(parseServings('4–6 servings')).toBe('4-6'); // en-dash
    });

    test('handles ranges with "to"', () => {
      expect(parseServings('6 to 8')).toBe('6-8');
      expect(parseServings('6 to 8 servings')).toBe('6-8');
    });

    test('handles arrays - picks numeric entry', () => {
      expect(parseServings(['4', '4 servings'])).toBe('4');
      expect(parseServings(['10', '10 servings'])).toBe('10');
    });

    test('handles arrays - falls back to first entry', () => {
      expect(parseServings(['4 servings', 'Serves 4'])).toBe('4');
    });

    test('returns unparseable text as-is', () => {
      expect(parseServings('a dozen')).toBe('a dozen');
      expect(parseServings('several')).toBe('several');
    });
  });

  describe('parseDuration', () => {
    test('handles null and invalid input', () => {
      expect(parseDuration(null)).toBe(null);
      expect(parseDuration(undefined)).toBe(null);
      expect(parseDuration(123)).toBe(null);
    });

    test('parses ISO 8601 durations', () => {
      expect(parseDuration('PT30M')).toBe('30 minutes');
      expect(parseDuration('PT1H')).toBe('1 hour');
      expect(parseDuration('PT2H')).toBe('2 hours');
      expect(parseDuration('PT1H30M')).toBe('1 hour 30 minutes');
      expect(parseDuration('PT2H15M')).toBe('2 hours 15 minutes');
    });

    test('handles single minute', () => {
      expect(parseDuration('PT1M')).toBe('1 minute');
    });

    test('returns unparseable strings as-is', () => {
      expect(parseDuration('30 minutes')).toBe('30 minutes');
      expect(parseDuration('about an hour')).toBe('about an hour');
    });
  });

  describe('extractImageUrl', () => {
    test('handles null and undefined', () => {
      expect(extractImageUrl(null)).toBe(null);
      expect(extractImageUrl(undefined)).toBe(null);
    });

    test('handles string URL', () => {
      expect(extractImageUrl('https://example.com/image.jpg')).toBe('https://example.com/image.jpg');
    });

    test('handles array of URLs', () => {
      expect(extractImageUrl(['https://example.com/1.jpg', 'https://example.com/2.jpg'])).toBe(
        'https://example.com/1.jpg'
      );
    });

    test('handles array of objects with url property', () => {
      expect(extractImageUrl([{ url: 'https://example.com/1.jpg' }])).toBe(
        'https://example.com/1.jpg'
      );
    });

    test('handles object with url property', () => {
      expect(extractImageUrl({ url: 'https://example.com/image.jpg' })).toBe(
        'https://example.com/image.jpg'
      );
    });

    test('handles object without url property', () => {
      expect(extractImageUrl({ src: 'https://example.com/image.jpg' })).toBe(null);
    });
  });

  describe('isRecipeType', () => {
    test('returns false for null/undefined', () => {
      expect(isRecipeType(null)).toBe(false);
      expect(isRecipeType(undefined)).toBe(false);
    });

    test('returns false for non-objects', () => {
      expect(isRecipeType('Recipe')).toBe(false);
      expect(isRecipeType(123)).toBe(false);
    });

    test('detects direct Recipe type', () => {
      expect(isRecipeType({ '@type': 'Recipe' })).toBe(true);
    });

    test('detects Recipe in array type', () => {
      expect(isRecipeType({ '@type': ['Recipe', 'Thing'] })).toBe(true);
      expect(isRecipeType({ '@type': ['Thing', 'Recipe'] })).toBe(true);
    });

    test('returns false for non-Recipe types', () => {
      expect(isRecipeType({ '@type': 'Article' })).toBe(false);
      expect(isRecipeType({ '@type': ['Article', 'Thing'] })).toBe(false);
    });
  });

  describe('resolveIdReference', () => {
    const graph = [
      { '@id': 'https://example.com/#person', '@type': 'Person', name: 'John Doe' },
      { '@id': 'https://example.com/#org', '@type': 'Organization', name: 'Acme Inc' },
    ];

    test('returns null for invalid inputs', () => {
      expect(resolveIdReference(null, graph)).toBe(null);
      expect(resolveIdReference('test', null)).toBe(null);
      expect(resolveIdReference('test', 'not-array')).toBe(null);
    });

    test('resolves string @id reference', () => {
      const result = resolveIdReference('https://example.com/#person', graph);
      expect(result).toEqual({ '@id': 'https://example.com/#person', '@type': 'Person', name: 'John Doe' });
    });

    test('resolves object with @id property', () => {
      const result = resolveIdReference({ '@id': 'https://example.com/#org' }, graph);
      expect(result).toEqual({ '@id': 'https://example.com/#org', '@type': 'Organization', name: 'Acme Inc' });
    });

    test('returns original ref if @id not found in graph', () => {
      const ref = { '@id': 'https://example.com/#unknown' };
      expect(resolveIdReference(ref, graph)).toBe(ref);
    });

    test('returns ref as-is if no @id property', () => {
      const ref = { name: 'Direct Object' };
      expect(resolveIdReference(ref, graph)).toBe(ref);
    });
  });

  describe('extractAuthorName', () => {
    const graph = [
      { '@id': 'https://example.com/#person', '@type': 'Person', name: 'Gina Homolka' },
    ];

    test('returns null for null/undefined', () => {
      expect(extractAuthorName(null, graph)).toBe(null);
      expect(extractAuthorName(undefined, graph)).toBe(null);
    });

    test('handles direct string author', () => {
      expect(extractAuthorName('John Doe', graph)).toBe('John Doe');
    });

    test('handles object with name property', () => {
      expect(extractAuthorName({ name: 'Jane Doe' }, graph)).toBe('Jane Doe');
    });

    test('handles array of authors - takes first', () => {
      expect(extractAuthorName(['John', 'Jane'], graph)).toBe('John');
      expect(extractAuthorName([{ name: 'John' }, { name: 'Jane' }], graph)).toBe('John');
    });

    test('resolves @id reference', () => {
      expect(extractAuthorName({ '@id': 'https://example.com/#person' }, graph)).toBe('Gina Homolka');
    });

    test('resolves @id in array', () => {
      expect(extractAuthorName([{ '@id': 'https://example.com/#person' }], graph)).toBe('Gina Homolka');
    });

    test('returns null for unresolvable @id', () => {
      expect(extractAuthorName({ '@id': 'https://unknown.com/#person' }, graph)).toBe(null);
    });
  });

  describe('calculateExtractionQuality', () => {
    test('returns 100 for complete recipe', () => {
      const recipe = {
        title: 'Test Recipe',
        description: 'A test recipe',
        author: 'Chef',
        imageUrl: 'https://example.com/img.jpg',
        servings: '4',
        prepTime: '10 minutes',
        cookTime: '20 minutes',
        totalTime: '30 minutes',
        ingredients: [{ rawText: '1 cup flour' }],
        instructions: ['Step 1'],
      };
      const result = calculateExtractionQuality(recipe);
      expect(result.score).toBe(100);
      expect(result.missing).toEqual([]);
    });

    test('calculates score for partial recipe', () => {
      const recipe = {
        title: 'Test Recipe',
        ingredients: [{ rawText: '1 cup flour' }],
        instructions: ['Step 1'],
      };
      const result = calculateExtractionQuality(recipe);
      // title (20) + ingredients (25) + instructions (25) = 70
      expect(result.score).toBe(70);
      expect(result.missing).toContain('description');
      expect(result.missing).toContain('author');
      expect(result.missing).toContain('image');
      expect(result.missing).toContain('servings');
      expect(result.missing).toContain('prep time');
      expect(result.missing).toContain('cook time');
      expect(result.missing).toContain('total time');
    });

    test('handles empty arrays as missing', () => {
      const recipe = {
        title: 'Test Recipe',
        ingredients: [],
        instructions: [],
      };
      const result = calculateExtractionQuality(recipe);
      expect(result.missing).toContain('ingredients');
      expect(result.missing).toContain('instructions');
    });

    test('handles null/undefined values as missing', () => {
      const recipe = {
        title: 'Test Recipe',
        description: null,
        author: undefined,
        ingredients: [{ rawText: 'flour' }],
        instructions: ['cook it'],
      };
      const result = calculateExtractionQuality(recipe);
      expect(result.missing).toContain('description');
      expect(result.missing).toContain('author');
    });
  });

  describe('parseSchemaIngredients', () => {
    test('handles null/non-array input', () => {
      expect(parseSchemaIngredients(null)).toEqual([]);
      expect(parseSchemaIngredients('not an array')).toEqual([]);
      expect(parseSchemaIngredients(undefined)).toEqual([]);
    });

    test('parses string ingredients', () => {
      const ingredients = ['1 cup flour', '2 eggs', '1/2 cup sugar'];
      const result = parseSchemaIngredients(ingredients);
      expect(result).toHaveLength(3);
      expect(result[0].rawText).toBe('1 cup flour');
      expect(result[1].rawText).toBe('2 eggs');
      expect(result[2].rawText).toBe('1/2 cup sugar');
    });

    test('parses object ingredients with text property', () => {
      const ingredients = [{ text: '1 cup flour' }, { text: '2 eggs' }];
      const result = parseSchemaIngredients(ingredients);
      expect(result).toHaveLength(2);
      expect(result[0].rawText).toBe('1 cup flour');
    });

    test('handles HowToSection for grouped ingredients', () => {
      const ingredients = [
        '1 cup flour',
        {
          '@type': 'HowToSection',
          name: 'For the sauce',
          itemListElement: ['1 can tomatoes', '2 cloves garlic'],
        },
      ];
      const result = parseSchemaIngredients(ingredients);
      expect(result).toHaveLength(3);
      expect(result[0].group).toBe(null);
      expect(result[1].group).toBe('For the sauce');
      expect(result[1].rawText).toBe('1 can tomatoes');
      expect(result[2].group).toBe('For the sauce');
    });

    test('assigns sortOrder to ingredients', () => {
      const ingredients = ['flour', 'sugar', 'eggs'];
      const result = parseSchemaIngredients(ingredients);
      expect(result[0].sortOrder).toBe(0);
      expect(result[1].sortOrder).toBe(1);
      expect(result[2].sortOrder).toBe(2);
    });
  });

  describe('parseSchemaInstructions', () => {
    test('handles null/non-array input', () => {
      expect(parseSchemaInstructions(null)).toEqual([]);
      expect(parseSchemaInstructions(undefined)).toEqual([]);
    });

    test('handles string input', () => {
      expect(parseSchemaInstructions('Mix ingredients well')).toEqual(['Mix ingredients well']);
    });

    test('parses string instructions', () => {
      const instructions = ['Step 1', 'Step 2', 'Step 3'];
      const result = parseSchemaInstructions(instructions);
      expect(result).toEqual(['Step 1', 'Step 2', 'Step 3']);
    });

    test('parses HowToStep objects', () => {
      const instructions = [
        { '@type': 'HowToStep', text: 'Mix flour and sugar' },
        { '@type': 'HowToStep', text: 'Add eggs' },
      ];
      const result = parseSchemaInstructions(instructions);
      expect(result).toEqual(['Mix flour and sugar', 'Add eggs']);
    });

    test('handles HowToStep with description instead of text', () => {
      const instructions = [
        { '@type': 'HowToStep', description: 'Mix ingredients' },
      ];
      const result = parseSchemaInstructions(instructions);
      expect(result).toEqual(['Mix ingredients']);
    });

    test('handles HowToSection with nested steps', () => {
      const instructions = [
        {
          '@type': 'HowToSection',
          name: 'Prepare dough',
          itemListElement: [
            { '@type': 'HowToStep', text: 'Mix flour' },
            { '@type': 'HowToStep', text: 'Add water' },
          ],
        },
        { '@type': 'HowToStep', text: 'Bake' },
      ];
      const result = parseSchemaInstructions(instructions);
      expect(result).toEqual(['Mix flour', 'Add water', 'Bake']);
    });
  });

  describe('normalizeUrl', () => {
    test('removes tracking parameters', () => {
      expect(normalizeUrl('https://example.com/recipe?utm_source=google')).toBe(
        'https://example.com/recipe'
      );
      expect(normalizeUrl('https://example.com/recipe?utm_medium=email&id=123')).toBe(
        'https://example.com/recipe?id=123'
      );
    });

    test('removes multiple tracking parameters', () => {
      const url = 'https://example.com/recipe?utm_source=google&utm_medium=email&utm_campaign=test';
      expect(normalizeUrl(url)).toBe('https://example.com/recipe');
    });

    test('removes hash fragment', () => {
      expect(normalizeUrl('https://example.com/recipe#comments')).toBe(
        'https://example.com/recipe'
      );
    });

    test('preserves non-tracking parameters', () => {
      expect(normalizeUrl('https://example.com/recipe?id=123&page=2')).toBe(
        'https://example.com/recipe?id=123&page=2'
      );
    });

    test('handles invalid URLs gracefully', () => {
      expect(normalizeUrl('not-a-url')).toBe('not-a-url');
    });
  });
});
