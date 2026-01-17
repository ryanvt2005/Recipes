# Shopping List Aggregation Engine v2

This document describes the ingredient aggregation engine used by the shopping list feature. The engine provides deterministic, rule-based normalization and aggregation of ingredients from multiple recipes.

## Overview

When creating a shopping list from multiple recipes, the aggregation engine:
1. Normalizes ingredient names to canonical forms
2. Groups identical ingredients across recipes
3. Sums quantities when units are compatible
4. Provides special handling for bell pepper variants with color breakdown
5. Tracks source lines for transparency

## Input Format

The engine accepts ingredient lines in this format:

```javascript
{
  recipeId: string,           // Which recipe this came from
  originalText: string,       // Raw ingredient line (e.g., "2 cups flour")
  name?: string,              // Ingredient name (if already parsed)
  ingredientName?: string,    // Alternative field name
  quantity?: number | null,   // Numeric quantity
  unit?: string | null,       // Unit (e.g., "cup", "tbsp")
}
```

## Output Format

The engine returns aggregated items:

```javascript
{
  displayName: string,          // e.g., "Bell peppers", "Onions"
  canonicalKey: string,         // Stable normalized key for grouping
  totalQuantity: number | null, // Summed quantity (null if can't sum)
  unit: string | null,          // Normalized unit
  components?: Array<{          // For bell peppers: color breakdown
    label: string,              // e.g., "red", "green", "yellow"
    quantity: number | null,
    unit: string | null,
  }>,
  sourceLines: Array<{          // All original ingredient lines
    recipeId: string,
    originalText: string,
    parsed: { quantity, unit, name }
  }>,
  notes?: string,               // Human-friendly notes (e.g., breakdown)
}
```

## Normalization Rules

### A. Basic String Normalization

- Collapse multiple spaces to single space
- Strip trailing punctuation
- Lowercase for comparison
- Preserve proper capitalization in `displayName`

### B. Compound Ingredient Normalization

The word "and" is replaced with "&" for common compound ingredients:

| Input | Canonical Form |
|-------|---------------|
| `salt and pepper` | `salt & pepper` |
| `Salt And Pepper` | `salt & pepper` |
| `salt & pepper` | `salt & pepper` |
| `oil and vinegar` | `oil & vinegar` |
| `mac and cheese` | `macaroni & cheese` |
| `bread and butter` | `bread & butter` |

Generic two-word conjunctions (e.g., "sugar and cinnamon") also normalize to ampersand form.

### C. Singularization

Common plural forms are singularized for matching:

| Plural | Singular |
|--------|----------|
| `onions` | `onion` |
| `tomatoes` | `tomato` |
| `berries` | `berry` |
| `dishes` | `dish` |
| `potatoes` | `potato` |
| `leaves` | `leaf` |

### D. Bell Pepper Aggregation

All bell pepper variants map to canonical key `bell pepper`:

**Detected variants:**
- `bell pepper`, `bell peppers`
- `red bell pepper`, `green bell pepper`, `yellow bell pepper`, `orange bell pepper`
- `red pepper`, `green pepper`, `yellow pepper` (without "bell")

**NOT detected as bell peppers:**
- `pepper` (could be black pepper)
- `black pepper`
- `cayenne pepper`
- `jalapeño pepper`

**Output:**
```javascript
{
  displayName: "Bell peppers",
  canonicalKey: "bell pepper",
  totalQuantity: 4,
  unit: null,
  components: [
    { label: "red", quantity: 1, unit: null },
    { label: "green", quantity: 3, unit: null }
  ],
  notes: "Breakdown: 1 red, 3 green"
}
```

## Unit Compatibility

### Compatible Unit Groups

Units within the same group can be summed together:

| Group | Units |
|-------|-------|
| `volume-small` | tsp, tbsp |
| `volume-large` | cup, fl oz, pint, quart, gallon |
| `volume-metric` | ml, l |
| `weight-metric` | g, kg |
| `weight-imperial` | oz, lb |
| `count-*` | Each count unit is its own group (can, jar, bunch, etc.) |

### Incompatible Units

When units are incompatible (e.g., `cup` and `lb`):
- `totalQuantity` is set to `null`
- A `notes` field provides the breakdown: `"Mixed: 2 cup + 500 g"`

### Unit Normalization

Units are normalized to standard abbreviations:

| Input | Normalized |
|-------|------------|
| `tablespoon`, `tablespoons`, `T`, `Tbsp` | `tbsp` |
| `teaspoon`, `teaspoons`, `t` | `tsp` |
| `cup`, `cups`, `c` | `cup` |
| `pound`, `pounds`, `lbs` | `lb` |
| `ounce`, `ounces` | `oz` |

## Safe Non-Merge Rules

The engine is designed to never incorrectly merge unrelated items:

1. **"pepper" vs "bell pepper"**: Plain "pepper" is NOT merged with bell peppers
2. **"black pepper" vs "bell pepper"**: Spices are kept separate from vegetables
3. **Different count units**: `2 cans` and `1 jar` are NOT summed
4. **Volume vs weight**: `2 cups flour` and `500g flour` are NOT summed

## API Integration

### Creating a Shopping List

```javascript
// POST /api/v1/shopping-lists/from-recipes
{
  recipeIds: ["recipe-1", "recipe-2"],
  name: "Weekly Groceries",
  excludedIngredientIds: []  // Optional
}
```

The aggregation engine processes ingredients with `keepRecipeSeparate: true`, maintaining recipe provenance for each item.

### Adding Recipes to Existing List

```javascript
// POST /api/v1/shopping-lists/:id/add-recipes
{
  recipeIds: ["recipe-3"]
}
```

When adding recipes to an existing list, the engine:
1. Aggregates new ingredients across recipes (`keepRecipeSeparate: false`)
2. Uses canonical keys to match with existing items
3. Sums quantities for matching items with compatible units
4. Adds new items for non-matches

## Testing

The aggregation engine has comprehensive test coverage with 61+ test cases:

- Basic quantity summing
- Salt & pepper normalization
- Bell pepper variant aggregation with color breakdown
- Unit compatibility checking
- Quantity parsing fallback
- Source line tracking
- Edge cases (empty input, single item, field name variations)
- Real-world multi-recipe scenarios

Run tests:
```bash
cd backend && npx jest tests/ingredientAggregator.test.js --verbose
```

## Files

- **Engine**: `backend/src/utils/ingredientAggregator.js`
- **Tests**: `backend/tests/ingredientAggregator.test.js`
- **Integration**: `backend/src/controllers/shoppingListController.js`
