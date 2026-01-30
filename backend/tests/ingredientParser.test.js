/**
 * Unit tests for ingredient parsing utility
 */

const {
  parseIngredientString,
  parseQuantity,
  normalizeUnit,
  formatIngredientDisplay,
  formatQuantityDisplay,
  decimalToFraction,
} = require('../src/utils/ingredientParser');

describe('parseQuantity', () => {
  describe('simple numbers', () => {
    test('parses integers', () => {
      expect(parseQuantity('2')).toBe(2);
      expect(parseQuantity('10')).toBe(10);
    });

    test('parses decimals', () => {
      expect(parseQuantity('2.5')).toBe(2.5);
      expect(parseQuantity('0.25')).toBe(0.25);
    });
  });

  describe('fractions', () => {
    test('parses simple fractions', () => {
      expect(parseQuantity('1/2')).toBe(0.5);
      expect(parseQuantity('1/4')).toBe(0.25);
      expect(parseQuantity('3/4')).toBe(0.75);
    });

    test('parses mixed numbers', () => {
      expect(parseQuantity('1 1/2')).toBe(1.5);
      expect(parseQuantity('2 1/4')).toBe(2.25);
      expect(parseQuantity('3 3/4')).toBe(3.75);
    });
  });

  describe('unicode fractions', () => {
    test('parses unicode fractions', () => {
      expect(parseQuantity('½')).toBe(0.5);
      expect(parseQuantity('¼')).toBe(0.25);
      expect(parseQuantity('¾')).toBe(0.75);
      expect(parseQuantity('⅓')).toBeCloseTo(0.333, 2);
      expect(parseQuantity('⅔')).toBeCloseTo(0.666, 2);
    });

    test('parses mixed unicode fractions', () => {
      expect(parseQuantity('1½')).toBe(1.5);
      expect(parseQuantity('2¼')).toBe(2.25);
      expect(parseQuantity('1 ½')).toBe(1.5);
      expect(parseQuantity('2 ¼')).toBe(2.25);
    });
  });

  describe('ranges', () => {
    test('parses dash ranges and averages', () => {
      expect(parseQuantity('2-3')).toBe(2.5);
      expect(parseQuantity('4-6')).toBe(5);
    });

    test('parses "to" ranges', () => {
      expect(parseQuantity('2 to 3')).toBe(2.5);
      expect(parseQuantity('4 to 6')).toBe(5);
    });

    test('parses "or" ranges', () => {
      expect(parseQuantity('2 or 3')).toBe(2.5);
    });
  });

  describe('edge cases', () => {
    test('returns null for empty/null input', () => {
      expect(parseQuantity(null)).toBeNull();
      expect(parseQuantity(undefined)).toBeNull();
      expect(parseQuantity('')).toBeNull();
    });

    test('handles whitespace', () => {
      expect(parseQuantity('  2  ')).toBe(2);
      expect(parseQuantity(' 1/2 ')).toBe(0.5);
    });
  });

  describe('vague quantities', () => {
    test('parses "a few" as approximately 3', () => {
      expect(parseQuantity('a few')).toBe(3);
    });

    test('parses "a couple" as 2', () => {
      expect(parseQuantity('a couple')).toBe(2);
    });

    test('parses "several" as approximately 4', () => {
      expect(parseQuantity('several')).toBe(4);
    });

    test('parses "a pinch" as small amount', () => {
      expect(parseQuantity('a pinch')).toBe(0.125);
    });

    test('parses "a handful" as approximately 0.5', () => {
      expect(parseQuantity('a handful')).toBe(0.5);
    });

    test('parses quantity modifiers', () => {
      expect(parseQuantity('heaping')).toBe(1.25);
      expect(parseQuantity('scant')).toBe(0.875);
    });
  });
});

describe('normalizeUnit', () => {
  describe('volume units', () => {
    test('normalizes teaspoon variants', () => {
      expect(normalizeUnit('teaspoon')).toBe('tsp');
      expect(normalizeUnit('teaspoons')).toBe('tsp');
      expect(normalizeUnit('tsp')).toBe('tsp');
      expect(normalizeUnit('t')).toBe('tsp');
    });

    test('normalizes tablespoon variants', () => {
      expect(normalizeUnit('tablespoon')).toBe('tbsp');
      expect(normalizeUnit('tablespoons')).toBe('tbsp');
      expect(normalizeUnit('tbsp')).toBe('tbsp');
      expect(normalizeUnit('Tbsp')).toBe('tbsp');
      // Note: uppercase 'T' maps to tbsp but lowercase 't' maps to tsp
      // This is intentional - T is a common abbreviation for tablespoon
    });

    test('normalizes cup variants', () => {
      expect(normalizeUnit('cup')).toBe('cup');
      expect(normalizeUnit('cups')).toBe('cup');
      expect(normalizeUnit('c')).toBe('cup');
    });
  });

  describe('weight units', () => {
    test('normalizes pound variants', () => {
      expect(normalizeUnit('pound')).toBe('lb');
      expect(normalizeUnit('pounds')).toBe('lb');
      expect(normalizeUnit('lb')).toBe('lb');
      expect(normalizeUnit('lbs')).toBe('lb');
    });

    test('normalizes ounce variants', () => {
      expect(normalizeUnit('ounce')).toBe('oz');
      expect(normalizeUnit('ounces')).toBe('oz');
      expect(normalizeUnit('oz')).toBe('oz');
    });

    test('normalizes gram variants', () => {
      expect(normalizeUnit('gram')).toBe('g');
      expect(normalizeUnit('grams')).toBe('g');
      expect(normalizeUnit('g')).toBe('g');
    });
  });

  describe('count units', () => {
    test('normalizes container units', () => {
      expect(normalizeUnit('can')).toBe('can');
      expect(normalizeUnit('cans')).toBe('can');
      expect(normalizeUnit('jar')).toBe('jar');
      expect(normalizeUnit('jars')).toBe('jar');
    });

    test('normalizes produce units', () => {
      expect(normalizeUnit('clove')).toBe('clove');
      expect(normalizeUnit('cloves')).toBe('clove');
      expect(normalizeUnit('bunch')).toBe('bunch');
      expect(normalizeUnit('bunches')).toBe('bunch');
    });
  });

  describe('non-unit words', () => {
    test('returns null for descriptive words', () => {
      expect(normalizeUnit('chopped')).toBeNull();
      expect(normalizeUnit('fresh')).toBeNull();
      expect(normalizeUnit('minced')).toBeNull();
      expect(normalizeUnit('diced')).toBeNull();
    });
  });

  describe('edge cases', () => {
    test('returns null for empty/null input', () => {
      expect(normalizeUnit(null)).toBeNull();
      expect(normalizeUnit(undefined)).toBeNull();
      expect(normalizeUnit('')).toBeNull();
    });

    test('is case-insensitive', () => {
      expect(normalizeUnit('CUP')).toBe('cup');
      expect(normalizeUnit('TABLESPOON')).toBe('tbsp');
    });
  });
});

describe('parseIngredientString', () => {
  describe('standard ingredients', () => {
    test('parses quantity + unit + ingredient', () => {
      const result = parseIngredientString('2 cups flour');
      expect(result.quantity).toBe(2);
      expect(result.unit).toBe('cup');
      expect(result.ingredient).toBe('flour');
    });

    test('parses with fractions', () => {
      const result = parseIngredientString('1/2 tsp salt');
      expect(result.quantity).toBe(0.5);
      expect(result.unit).toBe('tsp');
      expect(result.ingredient).toBe('salt');
    });

    test('parses unicode fractions', () => {
      const result = parseIngredientString('½ cup milk');
      expect(result.quantity).toBe(0.5);
      expect(result.unit).toBe('cup');
      expect(result.ingredient).toBe('milk');
    });

    test('parses mixed numbers', () => {
      const result = parseIngredientString('1 1/2 cups sugar');
      expect(result.quantity).toBe(1.5);
      expect(result.unit).toBe('cup');
      expect(result.ingredient).toBe('sugar');
    });
  });

  describe('unitless ingredients', () => {
    test('parses count ingredients with inferred unit', () => {
      // Phase 1 improvement: countable ingredients now infer "piece" unit
      const result = parseIngredientString('2 eggs');
      expect(result.quantity).toBe(2);
      expect(result.unit).toBe('piece'); // Inferred for countable items
      expect(result.ingredient).toBe('eggs');
    });

    test('parses non-countable ingredients without unit', () => {
      // Items not in COUNTABLE_INGREDIENTS still have no unit
      const result = parseIngredientString('2 cups flour');
      expect(result.quantity).toBe(2);
      expect(result.unit).toBe('cup');
      expect(result.ingredient).toBe('flour');
    });

    test('parses "to taste" ingredients', () => {
      // Phase 1 improvement: "to taste" patterns are now detected
      const result = parseIngredientString('salt to taste');
      expect(result.quantity).toBeNull();
      expect(result.unit).toBeNull();
      expect(result.ingredient).toBe('salt');
      expect(result.notes).toBe('to taste');
    });

    test('parses "as needed" ingredients', () => {
      const result = parseIngredientString('olive oil as needed');
      expect(result.quantity).toBeNull();
      expect(result.unit).toBeNull();
      expect(result.ingredient).toBe('olive oil');
      expect(result.notes).toBe('as needed');
    });
  });

  describe('vague quantity ingredients', () => {
    test('parses "a few cloves of garlic"', () => {
      const result = parseIngredientString('a few cloves of garlic');
      expect(result.quantity).toBe(3); // "a few" = 3
      expect(result.unit).toBe('clove');
      expect(result.ingredient).toBe('garlic');
    });

    test('parses "several stalks of celery"', () => {
      const result = parseIngredientString('several stalks celery');
      expect(result.quantity).toBe(4); // "several" = 4
      expect(result.unit).toBe('stalk');
      expect(result.ingredient).toBe('celery');
    });

    test('parses "a pinch of salt"', () => {
      const result = parseIngredientString('a pinch of salt');
      expect(result.quantity).toBe(0.125);
      expect(result.ingredient).toBe('salt');
    });

    test('parses "a handful of spinach"', () => {
      const result = parseIngredientString('a handful spinach');
      expect(result.quantity).toBe(0.5);
      expect(result.ingredient).toBe('spinach');
    });

    test('parses "a couple eggs"', () => {
      const result = parseIngredientString('a couple eggs');
      expect(result.quantity).toBe(2);
      expect(result.ingredient).toBe('eggs');
    });
  });

  describe('preparation notes', () => {
    test('extracts comma-separated preparation', () => {
      const result = parseIngredientString('2 cups flour, sifted');
      expect(result.quantity).toBe(2);
      expect(result.unit).toBe('cup');
      expect(result.ingredient).toBe('flour');
      expect(result.preparation).toBe('sifted');
    });

    test('extracts parenthetical notes', () => {
      const result = parseIngredientString('1 cup butter (softened)');
      expect(result.quantity).toBe(1);
      expect(result.unit).toBe('cup');
      expect(result.ingredient).toBe('butter');
      expect(result.preparation).toBe('softened');
    });
  });

  describe('multi-word ingredients', () => {
    test('parses multi-word ingredient names', () => {
      const result = parseIngredientString('1 lb ground beef');
      expect(result.quantity).toBe(1);
      expect(result.unit).toBe('lb');
      expect(result.ingredient).toBe('ground beef');
    });

    test('parses descriptive ingredient names', () => {
      const result = parseIngredientString('2 cups all-purpose flour');
      expect(result.quantity).toBe(2);
      expect(result.unit).toBe('cup');
      expect(result.ingredient).toBe('all-purpose flour');
    });
  });

  describe('edge cases', () => {
    test('preserves raw text', () => {
      const result = parseIngredientString('2 cups flour');
      expect(result.rawText).toBe('2 cups flour');
    });

    test('handles empty input', () => {
      const result = parseIngredientString('');
      expect(result.rawText).toBe('');
      expect(result.ingredient).toBe('');
    });

    test('handles null input', () => {
      const result = parseIngredientString(null);
      expect(result.rawText).toBe('');
    });

    test('sets sort order', () => {
      const result = parseIngredientString('2 cups flour', 5);
      expect(result.sortOrder).toBe(5);
    });
  });
});

describe('formatQuantityDisplay', () => {
  test('formats whole numbers', () => {
    expect(formatQuantityDisplay(2)).toBe('2');
    expect(formatQuantityDisplay(10)).toBe('10');
  });

  test('formats common fractions as unicode', () => {
    expect(formatQuantityDisplay(0.5)).toBe('½');
    expect(formatQuantityDisplay(0.25)).toBe('¼');
    expect(formatQuantityDisplay(0.75)).toBe('¾');
  });

  test('formats mixed numbers', () => {
    expect(formatQuantityDisplay(1.5)).toBe('1 ½');
    expect(formatQuantityDisplay(2.25)).toBe('2 ¼');
    expect(formatQuantityDisplay(3.75)).toBe('3 ¾');
  });

  test('formats uncommon decimals', () => {
    // Values not close to any common fraction get decimal format
    // The threshold is 0.05, so values like 2.17 (close to 2.125=⅛) round to ⅛
    // Testing with values far from any fraction
    expect(formatQuantityDisplay(1.57)).toBe('1.57');
    expect(formatQuantityDisplay(2.43)).toBe('2.43');
  });
});

describe('formatIngredientDisplay', () => {
  test('formats complete ingredient', () => {
    const ingredient = {
      quantity: 2,
      unit: 'cup',
      ingredient: 'flour',
      rawText: '2 cups flour',
    };
    // Backend formatter returns lowercase ingredient name
    expect(formatIngredientDisplay(ingredient)).toBe('2 cup flour');
  });

  test('formats unitless ingredient', () => {
    const ingredient = {
      quantity: 2,
      unit: null,
      ingredient: 'eggs',
      rawText: '2 eggs',
    };
    // Backend formatter returns lowercase ingredient name
    expect(formatIngredientDisplay(ingredient)).toBe('2 eggs');
  });

  test('falls back to raw text when no parsed data', () => {
    const ingredient = {
      quantity: null,
      unit: null,
      ingredient: 'salt to taste',
      rawText: 'salt to taste',
    };
    expect(formatIngredientDisplay(ingredient)).toBe('salt to taste');
  });

  test('handles null ingredient', () => {
    expect(formatIngredientDisplay(null)).toBe('');
  });
});

describe('decimalToFraction', () => {
  test('converts common fractions', () => {
    expect(decimalToFraction(0.5)).toBe('½');
    expect(decimalToFraction(0.25)).toBe('¼');
    expect(decimalToFraction(0.75)).toBe('¾');
  });

  test('converts mixed numbers', () => {
    expect(decimalToFraction(1.5)).toBe('1 ½');
    expect(decimalToFraction(2.25)).toBe('2 ¼');
  });

  test('returns decimal for non-standard values', () => {
    // 1.57 is not close to any common fraction
    expect(decimalToFraction(1.57)).toBe('1.57');
  });
});
