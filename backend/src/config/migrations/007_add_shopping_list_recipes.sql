-- Shopping List Recipes junction table
-- Tracks which recipes were included in each shopping list

CREATE TABLE IF NOT EXISTS shopping_list_recipes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shopping_list_id UUID NOT NULL REFERENCES shopping_lists(id) ON DELETE CASCADE,
  recipe_id UUID NOT NULL REFERENCES recipes(id) ON DELETE CASCADE,
  scaled_servings INTEGER,
  added_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(shopping_list_id, recipe_id)
);

CREATE INDEX IF NOT EXISTS idx_shopping_list_recipes_list ON shopping_list_recipes(shopping_list_id);
CREATE INDEX IF NOT EXISTS idx_shopping_list_recipes_recipe ON shopping_list_recipes(recipe_id);
