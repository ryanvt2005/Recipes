# Recipe Enhancements Implementation Plan

## Overview
This plan outlines the implementation of four major features to enhance recipe management:
1. **Recipe Scaling** - Adjust serving sizes and recalculate ingredient quantities
2. **Advanced Search & Filtering** - Find recipes by multiple criteria
3. **Recipe Categories/Folders** - Better organization beyond tags
4. **Shopping List Category Customization** - User-defined store layouts

---

## Current State Analysis

### Database Schema
- ✅ **recipes**: Has all basic fields (title, description, times, servings, etc.)
- ✅ **ingredients**: Stores quantity, unit, ingredient_name, preparation, ingredient_group
- ✅ **tags**: Tag system exists with recipe_tags junction table
- ✅ **shopping_list_items**: Has category field (just added)
- ❌ **No recipe categories/folders** structure beyond tags
- ❌ **No original_servings** field to track recipe scaling history
- ❌ **No user preferences** for shopping categories

### Current Features
- ✅ Basic recipe search (title + ingredients)
- ✅ Tag filtering (single tag at a time)
- ✅ Pagination and sorting
- ✅ Shopping list auto-categorization (8 fixed categories)
- ❌ No multi-filter support
- ❌ No time-based filtering
- ❌ No folder/category organization
- ❌ No recipe scaling

---

## Feature 1: Recipe Scaling

### Problem
Users need to adjust recipes for different serving sizes without manual calculation.

### Solution Design

#### Backend Changes

1. **Add Virtual "Scaled Servings" Field**
   - Don't modify the database - keep original recipe intact
   - Calculate scaled quantities on-the-fly when requested
   - Return both original and scaled versions

2. **New Endpoint: GET /recipes/:id/scaled**
   - Query params: `targetServings` (number)
   - Returns recipe with all ingredient quantities multiplied by scale factor
   - Scale factor = targetServings / originalServings

3. **Scaling Algorithm**
   ```javascript
   function scaleRecipe(recipe, targetServings) {
     const originalServings = parseServings(recipe.servings); // Extract number from "4 servings" or "4-6"
     if (!originalServings) return recipe; // Can't scale if no original servings

     const scaleFactor = targetServings / originalServings;

     return {
       ...recipe,
       servings: `${targetServings}`,
       scaledFrom: originalServings,
       scaleFactor: scaleFactor,
       ingredients: recipe.ingredients.map(ing => ({
         ...ing,
         quantity: ing.quantity ? ing.quantity * scaleFactor : null,
         originalQuantity: ing.quantity
       }))
     };
   }
   ```

4. **Servings Parsing Logic**
   - Handle formats: "4", "4 servings", "4-6 servings", "serves 4"
   - Extract first number as base serving size
   - Return null if can't parse

#### Frontend Changes

1. **Recipe Detail Page - Scaling UI**
   - Add "Adjust Servings" section near top
   - Stepper control: [-] [4] [+] servings
   - Update all ingredient quantities dynamically
   - Show both scaled and original: "2 cups (originally 1 cup)"
   - "Reset to Original" button

2. **State Management**
   - Track current scale factor in component state
   - Recalculate ingredient display when changed
   - Don't mutate recipe data

3. **Smart Quantity Display**
   - Convert decimals to fractions: 0.5 → "½", 0.33 → "⅓", 0.75 → "¾"
   - Round to reasonable precision: 2.66667 → "2⅔"
   - Handle edge cases: 0.125 cups → "1 tablespoon"

---

## Feature 2: Advanced Search & Filtering

### Problem
Users can't easily find recipes based on multiple criteria (tags, cook time, ingredients, etc.)

### Solution Design

#### Backend Changes

1. **Enhance GET /recipes Endpoint**
   - Add new query parameters:
     * `tags[]` - Array of tags (match ANY or ALL - controlled by `tagMode`)
     * `tagMode` - "any" (OR) or "all" (AND)
     * `maxPrepTime` - Integer (minutes)
     * `maxCookTime` - Integer (minutes)
     * `maxTotalTime` - Integer (minutes)
     * `hasIngredient` - Comma-separated list of ingredients (AND logic)
     * `excludeIngredient` - Comma-separated list to exclude
   - Maintain existing: `search`, `page`, `limit`, `sortBy`, `sortOrder`

2. **Dynamic Query Building**
   ```javascript
   let query = `SELECT DISTINCT r.* FROM recipes r WHERE r.user_id = $1`;
   const params = [userId];
   let paramCount = 1;

   // Search by title/description/ingredients
   if (search) {
     paramCount++;
     query += ` AND (r.title ILIKE $${paramCount} OR r.description ILIKE $${paramCount}
                OR EXISTS (SELECT 1 FROM ingredients i WHERE i.recipe_id = r.id AND i.ingredient_name ILIKE $${paramCount}))`;
     params.push(`%${search}%`);
   }

   // Filter by tags (ANY mode)
   if (tags && tags.length > 0 && tagMode === 'any') {
     paramCount++;
     query += ` AND EXISTS (
       SELECT 1 FROM recipe_tags rt JOIN tags t ON rt.tag_id = t.id
       WHERE rt.recipe_id = r.id AND t.name = ANY($${paramCount})
     )`;
     params.push(tags);
   }

   // Filter by tags (ALL mode)
   if (tags && tags.length > 0 && tagMode === 'all') {
     tags.forEach(tag => {
       paramCount++;
       query += ` AND EXISTS (
         SELECT 1 FROM recipe_tags rt JOIN tags t ON rt.tag_id = t.id
         WHERE rt.recipe_id = r.id AND t.name = $${paramCount}
       )`;
       params.push(tag);
     });
   }

   // Filter by time (need to parse "30 min" to 30)
   if (maxTotalTime) {
     query += ` AND parse_time_to_minutes(r.total_time) <= ${maxTotalTime}`;
   }

   // Has specific ingredients
   if (hasIngredient) {
     hasIngredient.split(',').forEach(ing => {
       paramCount++;
       query += ` AND EXISTS (
         SELECT 1 FROM ingredients i WHERE i.recipe_id = r.id AND i.ingredient_name ILIKE $${paramCount}
       )`;
       params.push(`%${ing.trim()}%`);
     });
   }

   // Exclude ingredients
   if (excludeIngredient) {
     excludeIngredient.split(',').forEach(ing => {
       paramCount++;
       query += ` AND NOT EXISTS (
         SELECT 1 FROM ingredients i WHERE i.recipe_id = r.id AND i.ingredient_name ILIKE $${paramCount}
       )`;
       params.push(`%${ing.trim()}%`);
     });
   }
   ```

3. **Time Parsing Helper**
   - Create SQL function or backend helper to parse time strings
   - "30 min" → 30, "1 hour 30 min" → 90, "1-2 hours" → 90 (take max)

#### Frontend Changes

1. **Advanced Filter Panel**
   - Toggle button: "Show Filters" / "Hide Filters"
   - Collapsible panel with filter options:
     * Tags (multi-select chips)
     * Tag match mode: "Match Any" vs "Match All" radio buttons
     * Time filters: sliders or number inputs
     * Include ingredients: tag input (add multiple)
     * Exclude ingredients: tag input
   - "Clear All Filters" button
   - Show active filter count: "4 filters active"

2. **Filter UI Components**
   ```jsx
   // Tag selector
   <TagSelector
     availableTags={allTags}
     selectedTags={filters.tags}
     onChange={(tags) => setFilters({...filters, tags})}
   />

   // Time filter
   <TimeRangeFilter
     label="Max Cook Time"
     max={filters.maxCookTime}
     onChange={(val) => setFilters({...filters, maxCookTime: val})}
   />

   // Ingredient filter
   <IngredientFilter
     mode="include"
     ingredients={filters.hasIngredient}
     onChange={(ings) => setFilters({...filters, hasIngredient: ings})}
   />
   ```

3. **URL Query String Sync**
   - Sync all filters to URL query params
   - Allow bookmark/share filtered views
   - Parse URL on load to restore filters

4. **Filter Chips Display**
   - Show active filters as removable chips above results
   - "Tag: Italian [x]", "Max Time: 30 min [x]", "Has: chicken [x]"
   - Click [x] to remove individual filter

---

## Feature 3: Recipe Categories & Folders

### Problem
Tags alone aren't enough - users need hierarchical organization (e.g., "Desserts > Cakes > Chocolate")

### Solution Design

#### Backend Changes

1. **New Database Tables**
   ```sql
   -- Recipe Folders/Categories
   CREATE TABLE recipe_categories (
     id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
     user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
     name VARCHAR(100) NOT NULL,
     parent_category_id UUID REFERENCES recipe_categories(id) ON DELETE CASCADE,
     icon VARCHAR(50), -- optional emoji or icon name
     sort_order INTEGER DEFAULT 0,
     created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
     updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
   );

   CREATE INDEX idx_recipe_categories_user ON recipe_categories(user_id);
   CREATE INDEX idx_recipe_categories_parent ON recipe_categories(parent_category_id);

   -- Recipe to Category junction (many-to-many)
   CREATE TABLE recipe_category_assignments (
     recipe_id UUID REFERENCES recipes(id) ON DELETE CASCADE,
     category_id UUID REFERENCES recipe_categories(id) ON DELETE CASCADE,
     PRIMARY KEY (recipe_id, category_id)
   );
   ```

2. **Default Categories**
   - Create default categories on user signup:
     * 🍽️ All Recipes (virtual - all uncategorized)
     * ⭐ Favorites
     * 📋 To Try
     * 🍰 Desserts
     * 🍝 Main Dishes
     * 🥗 Salads & Sides
     * 🍲 Soups & Stews
     * 🥪 Breakfast & Brunch

3. **New Endpoints**
   - `GET /recipe-categories` - List all user's categories (tree structure)
   - `POST /recipe-categories` - Create new category
   - `PUT /recipe-categories/:id` - Rename/move category
   - `DELETE /recipe-categories/:id` - Delete category (move recipes to "Uncategorized")
   - `POST /recipes/:id/categories` - Assign recipe to category
   - `DELETE /recipes/:id/categories/:categoryId` - Remove from category

4. **Update GET /recipes**
   - Add `category` query param to filter by category ID
   - Include category info in recipe list response

#### Frontend Changes

1. **Sidebar Navigation**
   - Add collapsible sidebar to RecipesPage
   - Tree view of categories
   - Click category to filter recipes
   - Drag & drop recipes between categories
   - Right-click context menu: Rename, Delete, Add Subcategory

2. **Category Management Modal**
   - "Manage Categories" button in header
   - Modal with:
     * List of all categories (draggable for reordering)
     * Add new category button
     * Edit/delete icons per category
     * Emoji/icon picker

3. **Recipe Card Updates**
   - Show category badges on recipe cards
   - Quick category selector dropdown on hover
   - Multi-select + "Move to Category" bulk action

4. **Breadcrumb Navigation**
   - Show category path: "Main Dishes > Italian > Pasta"
   - Click any level to navigate up

---

## Feature 4: Shopping List Category Customization

### Problem
Fixed grocery categories don't match every user's store layout. Users shop at different stores with different layouts.

### Solution Design

#### Backend Changes

1. **New Database Tables**
   ```sql
   -- User's custom shopping categories
   CREATE TABLE shopping_categories (
     id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
     user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
     name VARCHAR(100) NOT NULL,
     sort_order INTEGER NOT NULL,
     color VARCHAR(20), -- optional color hex code
     icon VARCHAR(50), -- optional emoji
     created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
     UNIQUE(user_id, name)
   );

   CREATE INDEX idx_shopping_categories_user ON shopping_categories(user_id);

   -- User's custom ingredient-to-category mappings
   CREATE TABLE ingredient_category_mappings (
     id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
     user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
     ingredient_pattern VARCHAR(200) NOT NULL, -- e.g., "milk", "cheese", "%chicken%"
     category_id UUID NOT NULL REFERENCES shopping_categories(id) ON DELETE CASCADE,
     created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
     UNIQUE(user_id, ingredient_pattern)
   );

   CREATE INDEX idx_ingredient_mappings_user ON ingredient_category_mappings(user_id);
   ```

2. **Default Categories on Signup**
   - Create default 8 categories from current system
   - User can customize from there

3. **Enhanced categorizeIngredient() Function**
   - First check user's custom mappings (exact match, then LIKE patterns)
   - Fall back to default categorization logic
   - Return category_id instead of category name

4. **New Endpoints**
   - `GET /shopping-categories` - List user's categories in sort order
   - `POST /shopping-categories` - Create new category
   - `PUT /shopping-categories/:id` - Update name/order/color
   - `DELETE /shopping-categories/:id` - Delete (reassign items to "Other")
   - `PUT /shopping-categories/reorder` - Bulk update sort_order
   - `GET /ingredient-mappings` - List user's custom mappings
   - `POST /ingredient-mappings` - Add custom mapping
   - `DELETE /ingredient-mappings/:id` - Remove mapping

5. **Update Shopping List Endpoints**
   - Join with shopping_categories to get full category details
   - Use user's category order for grouping

#### Frontend Changes

1. **Shopping List Settings Page**
   - New page: `/shopping-lists/settings`
   - Two sections:
     * **Category Management**
       - List of categories with drag handles (reorder)
       - Add new category button
       - Edit (name, color, icon) and delete per category
       - Live preview of shopping list order
     * **Ingredient Mappings**
       - Search/filter existing mappings
       - Add new mapping: "milk" → "Dairy"
       - Bulk import from common groceries

2. **In-Line Category Editing**
   - On shopping list, click category name to rename
   - Drag items between categories
   - "Save my preferences" to remember custom mappings

3. **Store Presets**
   - Templates for common stores:
     * Generic Grocery Store (default 8 categories)
     * Costco/Warehouse layout
     * Farmers Market layout
     * Asian Grocery layout
   - "Load Preset" button to quick-start customization

4. **Shopping List UI Updates**
   - Use user's category order and colors
   - Display custom icons if set
   - "Teaching mode": Suggest category for uncategorized items

---

## Implementation Order & Timeline

### Phase 1: Recipe Scaling (Estimated: 1-2 days)
**Why first**: Self-contained, no schema changes, high user value

1. Backend scaling endpoint & algorithm (4 hours)
2. Frontend scaling UI component (3 hours)
3. Fraction formatting utility (2 hours)
4. Testing & refinement (2 hours)

### Phase 2: Advanced Search & Filtering (Estimated: 2-3 days)
**Why second**: Builds on existing search, no schema changes initially

1. Backend enhanced query builder (4 hours)
2. Time parsing utility (2 hours)
3. Frontend filter panel UI (6 hours)
4. URL sync & filter chips (3 hours)
5. Testing with various filter combinations (2 hours)

### Phase 3: Recipe Categories & Folders (Estimated: 3-4 days)
**Why third**: Requires schema changes, more complex

1. Database migration for categories tables (2 hours)
2. Backend category CRUD endpoints (6 hours)
3. Default categories on signup (2 hours)
4. Frontend sidebar navigation (6 hours)
5. Category management UI (4 hours)
6. Drag & drop functionality (4 hours)
7. Testing & polish (3 hours)

### Phase 4: Shopping List Customization (Estimated: 2-3 days)
**Why last**: Depends on understanding from category work

1. Database migration for shopping categories (2 hours)
2. Backend custom category endpoints (4 hours)
3. Enhanced categorization logic (3 hours)
4. Frontend settings page (5 hours)
5. Store presets & templates (3 hours)
6. Testing & refinement (2 hours)

**Total Estimated Time**: 8-12 days of development

---

## Technical Considerations

### Performance
- Add database indexes for new filter queries
- Consider caching category trees (rarely change)
- Paginate category management for users with 100+ categories

### Data Migration
- Existing recipes: all go to "Uncategorized" initially
- Existing shopping lists: use default 8 categories
- Provide migration tool to bulk categorize recipes by tags

### Edge Cases
- Recipe scaling with missing servings field → Show warning, disable scaling
- Recipe scaling with "serves 4-6" → Use first number (4)
- Category deletion → Move recipes to parent or "Uncategorized"
- Shopping category deletion → Reassign items to "Other"
- Circular category references → Prevent in backend validation

### User Experience
- Progressive disclosure: Don't overwhelm new users with all features
- Tooltips and onboarding hints
- "Smart" defaults based on user behavior
- Undo/redo for category operations

---

## Open Questions for User

1. **Recipe Scaling**:
   - Should we allow saving a scaled version as a new recipe?
   - Should we track "I made this at 2x scale" in recipe history?

2. **Search & Filtering**:
   - What's most important to filter by? (Prioritize UI space)
   - Should we add "Recently Viewed" or "Frequently Made" filters?

3. **Categories**:
   - Max nesting depth for categories? (Suggest 3 levels max)
   - Should categories be shareable between users (family account)?
   - Should one recipe be in multiple categories? (Currently yes)

4. **Shopping List Customization**:
   - Should category order/preferences sync across devices automatically?
   - Should we add aisle numbers to categories?
   - Should we support multiple store profiles per user?

---

## Success Metrics

- Recipe scaling: 50%+ of recipe views use scaling feature
- Search: Average filter count > 1.5 (users combining filters)
- Categories: 70%+ of recipes assigned to non-default category within 30 days
- Shopping lists: 40%+ of users customize category order

---

## Next Steps

1. Review this plan with user
2. Get answers to open questions
3. Create feature branch: `feature/recipe-enhancements`
4. Start with Phase 1 (Recipe Scaling)
5. Deploy & gather feedback before moving to next phase
