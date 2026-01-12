-- Migration: Add recipe_id to shopping_list_items
-- Description: Track which recipe each shopping list item came from to enable removing items by recipe

-- Add recipe_id column to shopping_list_items
ALTER TABLE shopping_list_items
ADD COLUMN IF NOT EXISTS recipe_id UUID REFERENCES recipes(id) ON DELETE SET NULL;

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_shopping_list_items_recipe_id ON shopping_list_items(recipe_id);

-- Note: Existing items will have NULL recipe_id
-- New items added through the API will have the recipe_id populated
