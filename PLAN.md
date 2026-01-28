# Plan: Improve Ingredient Parsing for Cleaner Shopping Lists

## Problem Statement
Ingredient parsing from recipes can produce errors or unclear items in shopping lists. This plan addresses the key parsing issues.

## Current State
The codebase has a solid foundation:
- `ingredientParser.js` - parses quantities, units, names
- `ingredientAggregator.js` - normalizes and combines ingredients
- 470+ ingredient family mappings
- 100+ modifier stripping patterns

## Identified Issues

### High Priority
1. **"To taste" ingredients** - Items like "salt to taste" lose context
2. **Mixed number spacing** - "1 ½" vs "1½" handled inconsistently
3. **Quantity-less items** - "butter" without quantity/unit shows poorly
4. **Database string coercion** - Quantities from Postgres sometimes come as strings

### Medium Priority
5. **Aggressive modifier stripping** - May remove important descriptors
6. **Incompatible unit display** - "2 cups + 4 oz" shows as note, loses quantities
7. **Missing unit inference** - "2 eggs" needs "piece" unit inferred

### Lower Priority
8. **Compound measurements** - "1 lb 4 oz" not fully supported
9. **Vague quantities** - "a few", "some", "several" not handled
10. **Typo tolerance** - No fuzzy matching for misspellings

## Implementation Plan

### Phase 1: Quick Wins (Low Risk)
Files: `backend/src/utils/ingredientParser.js`

- [ ] Add "to taste" detection → preserve in rawText, set quantity=null
- [ ] Normalize Unicode fraction spacing before parsing
- [ ] Add unit inference for common countables (eggs, cloves, stalks)
- [ ] Centralize string→number coercion in one utility function

### Phase 2: Display Improvements
Files: `frontend/src/core/ingredients.js`, `ShoppingItemsList.jsx`

- [ ] Improve display of quantity-less items (show "as needed" or similar)
- [ ] Better formatting for incompatible unit combinations
- [ ] Show preparation notes more prominently

### Phase 3: Smarter Aggregation
Files: `backend/src/utils/ingredientAggregator.js`

- [ ] Tiered modifier stripping (prep methods vs quality descriptors)
- [ ] Extend INGREDIENT_FAMILY_MAP with more variants
- [ ] Better handling of unspecified variants (bell pepper without color)

### Phase 4: Advanced (Future)
- [ ] Fuzzy matching for typos
- [ ] ML-assisted unit inference
- [ ] User correction learning

## Files to Modify

| File | Changes |
|------|---------|
| `backend/src/utils/ingredientParser.js` | Add "to taste" handling, Unicode normalization |
| `backend/src/utils/ingredientAggregator.js` | Tiered modifiers, family map expansion |
| `backend/src/controllers/shoppingListController.js` | Centralize quantity coercion |
| `frontend/src/core/ingredients.js` | Display formatting improvements |
| `frontend/src/components/shopping/ShoppingItemsList.jsx` | Better quantity-less display |

## Testing Approach
- Add unit tests for each edge case
- Test with real recipe imports
- Verify shopping list display improvements

## Estimated Scope
- Phase 1: ~20 lines of code changes
- Phase 2: ~15 lines of code changes
- Phase 3: ~30 lines of code changes
