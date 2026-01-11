-- Ingredient Category Overrides table
-- Stores user corrections to ingredient categorization
-- The system learns from these corrections for all users

CREATE TABLE IF NOT EXISTS ingredient_category_overrides (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ingredient_name VARCHAR(200) NOT NULL,
  category VARCHAR(50) NOT NULL,
  override_count INTEGER DEFAULT 1,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(ingredient_name)
);

CREATE INDEX IF NOT EXISTS idx_ingredient_category_overrides_name ON ingredient_category_overrides(ingredient_name);

-- Trigger to update updated_at timestamp
CREATE TRIGGER update_ingredient_category_overrides_updated_at
  BEFORE UPDATE ON ingredient_category_overrides
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
