-- Migration: Add recipe notes table
-- Description: Allows users to add personal notes and comments to their recipes

CREATE TABLE IF NOT EXISTS recipe_notes (
  id SERIAL PRIMARY KEY,
  recipe_id UUID NOT NULL REFERENCES recipes(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  note_text TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT recipe_notes_recipe_user_unique UNIQUE (recipe_id, user_id)
);

-- Index for faster lookups
CREATE INDEX IF NOT EXISTS idx_recipe_notes_recipe_id ON recipe_notes(recipe_id);
CREATE INDEX IF NOT EXISTS idx_recipe_notes_user_id ON recipe_notes(user_id);

-- Add updated_at trigger
CREATE OR REPLACE FUNCTION update_recipe_notes_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER recipe_notes_updated_at
  BEFORE UPDATE ON recipe_notes
  FOR EACH ROW
  EXECUTE FUNCTION update_recipe_notes_updated_at();
