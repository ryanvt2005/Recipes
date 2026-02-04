-- Migration: Add recipe categories (cuisine, meal type, dietary labels)

-- Cuisine types table
CREATE TABLE IF NOT EXISTS cuisines (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(50) UNIQUE NOT NULL,
  sort_order INT DEFAULT 0
);

-- Meal types table
CREATE TABLE IF NOT EXISTS meal_types (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(50) UNIQUE NOT NULL,
  sort_order INT DEFAULT 0
);

-- Dietary labels table
CREATE TABLE IF NOT EXISTS dietary_labels (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(50) UNIQUE NOT NULL,
  sort_order INT DEFAULT 0
);

-- Junction tables
CREATE TABLE IF NOT EXISTS recipe_cuisines (
  recipe_id UUID REFERENCES recipes(id) ON DELETE CASCADE,
  cuisine_id UUID REFERENCES cuisines(id) ON DELETE CASCADE,
  PRIMARY KEY (recipe_id, cuisine_id)
);

CREATE TABLE IF NOT EXISTS recipe_meal_types (
  recipe_id UUID REFERENCES recipes(id) ON DELETE CASCADE,
  meal_type_id UUID REFERENCES meal_types(id) ON DELETE CASCADE,
  PRIMARY KEY (recipe_id, meal_type_id)
);

CREATE TABLE IF NOT EXISTS recipe_dietary_labels (
  recipe_id UUID REFERENCES recipes(id) ON DELETE CASCADE,
  dietary_label_id UUID REFERENCES dietary_labels(id) ON DELETE CASCADE,
  PRIMARY KEY (recipe_id, dietary_label_id)
);

-- Indexes for faster lookups
CREATE INDEX IF NOT EXISTS idx_cuisines_sort ON cuisines(sort_order, name);
CREATE INDEX IF NOT EXISTS idx_meal_types_sort ON meal_types(sort_order, name);
CREATE INDEX IF NOT EXISTS idx_dietary_labels_sort ON dietary_labels(sort_order, name);

-- Seed predefined cuisine values
INSERT INTO cuisines (name, sort_order) VALUES
  ('American', 1),
  ('Italian', 2),
  ('Mexican', 3),
  ('Chinese', 4),
  ('Japanese', 5),
  ('Indian', 6),
  ('Thai', 7),
  ('Mediterranean', 8),
  ('French', 9),
  ('Greek', 10),
  ('Korean', 11),
  ('Vietnamese', 12),
  ('Middle Eastern', 13),
  ('Spanish', 14),
  ('Other', 99)
ON CONFLICT (name) DO NOTHING;

-- Seed predefined meal type values
INSERT INTO meal_types (name, sort_order) VALUES
  ('Breakfast', 1),
  ('Lunch', 2),
  ('Dinner', 3),
  ('Dessert', 4),
  ('Snack', 5),
  ('Appetizer', 6),
  ('Side Dish', 7),
  ('Beverage', 8)
ON CONFLICT (name) DO NOTHING;

-- Seed predefined dietary label values
INSERT INTO dietary_labels (name, sort_order) VALUES
  ('Vegetarian', 1),
  ('Vegan', 2),
  ('Gluten-Free', 3),
  ('Dairy-Free', 4),
  ('Keto', 5),
  ('Low-Carb', 6),
  ('Paleo', 7),
  ('Nut-Free', 8),
  ('Low-Sodium', 9),
  ('High-Protein', 10)
ON CONFLICT (name) DO NOTHING;
