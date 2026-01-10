#!/bin/bash

# Simple test for shopping list features
API_URL="http://localhost:3000/api/v1"

echo "=== Testing Shopping List Enhancements ==="
echo ""

# Register and login
echo "1. Creating test user..."
TIMESTAMP=$(date +%s)
curl -s -X POST "${API_URL}/auth/register" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test'${TIMESTAMP}'@example.com",
    "password": "TestPass123"
  }' > /tmp/register.json

TOKEN=$(cat /tmp/register.json | grep -o '"token":"[^"]*' | sed 's/"token":"//')

if [ -z "$TOKEN" ]; then
  echo "❌ Failed to register"
  cat /tmp/register.json
  exit 1
fi

echo "✅ User registered"
echo ""

# Create a simple recipe using the correct schema
echo "2. Creating test recipe..."
curl -s -X POST "${API_URL}/recipes" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer ${TOKEN}" \
  -d '{
    "title": "Test Recipe",
    "description": "Testing categorization",
    "ingredients": [
      {"rawText": "2 lbs chicken breast", "quantity": 2, "unit": "lbs", "ingredient": "chicken breast"},
      {"rawText": "1 head lettuce", "quantity": 1, "unit": "head", "ingredient": "lettuce"},
      {"rawText": "1 gallon milk", "quantity": 1, "unit": "gallon", "ingredient": "milk"},
      {"rawText": "2 cups flour", "quantity": 2, "unit": "cups", "ingredient": "flour"}
    ],
    "instructions": ["Cook the chicken", "Make a salad"],
    "prepTime": "15 min",
    "cookTime": "30 min",
    "servings": "4"
  }' > /tmp/recipe.json

RECIPE_ID=$(cat /tmp/recipe.json | grep -o '"id":"[^"]*' | head -1 | sed 's/"id":"//')

if [ -z "$RECIPE_ID" ]; then
  echo "❌ Failed to create recipe"
  cat /tmp/recipe.json
  exit 1
fi

echo "✅ Recipe created: $RECIPE_ID"
echo ""

# Create shopping list
echo "3. Creating shopping list..."
curl -s -X POST "${API_URL}/shopping-lists/from-recipes" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer ${TOKEN}" \
  -d '{
    "recipeIds": ["'$RECIPE_ID'"],
    "name": "Test Shopping List"
  }' > /tmp/shopping_list.json

LIST_ID=$(cat /tmp/shopping_list.json | grep -o '"id":"[^"]*' | head -1 | sed 's/"id":"//' | sed 's/"$//')

if [ -z "$LIST_ID" ]; then
  echo "❌ Failed to create shopping list"
  cat /tmp/shopping_list.json
  exit 1
fi

echo "✅ Shopping list created: $LIST_ID"
echo ""

# Get shopping list with items
echo "4. Fetching shopping list to verify categorization..."
curl -s -X GET "${API_URL}/shopping-lists/${LIST_ID}" \
  -H "Authorization: Bearer ${TOKEN}" > /tmp/list_items.json

echo ""
echo "Items with categories:"
cat /tmp/list_items.json | python3 -c "
import json, sys
data = json.load(sys.stdin)
for item in data.get('items', []):
    print(f\"  - {item['ingredient_name']}: category={item.get('category', 'N/A')}\")
" 2>/dev/null || cat /tmp/list_items.json

if grep -q '"category"' /tmp/list_items.json; then
  echo ""
  echo "✅ Items have categories"
else
  echo ""
  echo "❌ Items missing categories"
fi
echo ""

# Test adding a custom item
echo "5. Adding custom item (bananas)..."
curl -s -X POST "${API_URL}/shopping-lists/${LIST_ID}/items" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer ${TOKEN}" \
  -d '{
    "ingredientName": "bananas",
    "quantity": 6,
    "unit": "pieces"
  }' > /tmp/add_item.json

ITEM_ID=$(cat /tmp/add_item.json | grep -o '"id":"[^"]*' | head -1 | sed 's/"id":"//' | sed 's/"$//')

if [ -n "$ITEM_ID" ]; then
  echo "✅ Custom item added: $ITEM_ID"
  CATEGORY=$(cat /tmp/add_item.json | grep -o '"category":"[^"]*' | sed 's/"category":"//')
  echo "   Auto-categorized as: $CATEGORY"
else
  echo "❌ Failed to add item"
  cat /tmp/add_item.json
fi
echo ""

# Test updating item
if [ -n "$ITEM_ID" ]; then
  echo "6. Updating item (organic bananas)..."
  curl -s -X PATCH "${API_URL}/shopping-lists/items/${ITEM_ID}" \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer ${TOKEN}" \
    -d '{
      "ingredientName": "organic bananas",
      "quantity": 8
    }' > /tmp/update_item.json

  if grep -q "organic bananas" /tmp/update_item.json; then
    echo "✅ Item updated successfully"
  else
    echo "❌ Failed to update"
    cat /tmp/update_item.json
  fi
  echo ""

  # Test deleting item
  echo "7. Deleting item..."
  curl -s -X DELETE "${API_URL}/shopping-lists/items/${ITEM_ID}" \
    -H "Authorization: Bearer ${TOKEN}" > /tmp/delete_item.json

  if grep -q "success\|deleted" /tmp/delete_item.json || [ "$(cat /tmp/delete_item.json)" = "" ]; then
    echo "✅ Item deleted successfully"
  else
    echo "❌ Failed to delete"
    cat /tmp/delete_item.json
  fi
fi

echo ""
echo "=== All Tests Complete! ==="
