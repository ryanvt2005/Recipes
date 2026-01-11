#!/bin/bash

# Test script for shopping list enhancements
API_URL="http://localhost:3000/api/v1"

echo "=== Testing Shopping List Enhancements ==="
echo ""

# Step 1: Register a test user
echo "1. Registering test user..."
TIMESTAMP=$(date +%s)
REGISTER_RESPONSE=$(curl -s -X POST "${API_URL}/auth/register" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test'${TIMESTAMP}'@example.com",
    "password": "TestPass123"
  }')

TOKEN=$(echo $REGISTER_RESPONSE | grep -o '"token":"[^"]*' | sed 's/"token":"//')

if [ -z "$TOKEN" ]; then
  echo "❌ Failed to register user"
  echo "Response: $REGISTER_RESPONSE"
  exit 1
fi

echo "✅ User registered successfully"
echo ""

# Step 2: Create a recipe to add to shopping list
echo "2. Creating a test recipe..."
RECIPE_RESPONSE=$(curl -s -X POST "${API_URL}/recipes" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer ${TOKEN}" \
  -d '{
    "title": "Test Recipe for Shopping List",
    "description": "A recipe to test categorization",
    "ingredients": [
      {"name": "chicken breast", "quantity": "2", "unit": "lbs"},
      {"name": "lettuce", "quantity": "1", "unit": "head"},
      {"name": "milk", "quantity": "1", "unit": "gallon"},
      {"name": "flour", "quantity": "2", "unit": "cups"}
    ],
    "instructions": ["Cook the chicken", "Make a salad"],
    "prepTime": 15,
    "cookTime": 30,
    "servings": 4
  }')

RECIPE_ID=$(echo $RECIPE_RESPONSE | grep -o '"id":[0-9]*' | head -1 | sed 's/"id"://')

if [ -z "$RECIPE_ID" ]; then
  echo "❌ Failed to create recipe"
  echo "Response: $RECIPE_RESPONSE"
  exit 1
fi

echo "✅ Recipe created with ID: $RECIPE_ID"
echo ""

# Step 3: Create shopping list from recipe
echo "3. Creating shopping list from recipe..."
SHOPPING_LIST_RESPONSE=$(curl -s -X POST "${API_URL}/shopping-lists/from-recipes" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer ${TOKEN}" \
  -d '{
    "recipeIds": ['$RECIPE_ID'],
    "name": "Test Shopping List"
  }')

SHOPPING_LIST_ID=$(echo $SHOPPING_LIST_RESPONSE | grep -o '"id":[0-9]*' | head -1 | sed 's/"id"://')

if [ -z "$SHOPPING_LIST_ID" ]; then
  echo "❌ Failed to create shopping list"
  echo "Response: $SHOPPING_LIST_RESPONSE"
  exit 1
fi

echo "✅ Shopping list created with ID: $SHOPPING_LIST_ID"
echo ""

# Step 4: Get shopping list to check categorization
echo "4. Fetching shopping list to check categorization..."
FETCH_RESPONSE=$(curl -s -X GET "${API_URL}/shopping-lists/${SHOPPING_LIST_ID}" \
  -H "Authorization: Bearer ${TOKEN}")

echo "Shopping list contents:"
echo "$FETCH_RESPONSE" | python3 -m json.tool 2>/dev/null || echo "$FETCH_RESPONSE"
echo ""

# Check if items have categories
if echo "$FETCH_RESPONSE" | grep -q '"category"'; then
  echo "✅ Items have category field"
else
  echo "❌ Items missing category field"
fi
echo ""

# Step 5: Test adding a custom item
echo "5. Testing add custom item..."
ADD_ITEM_RESPONSE=$(curl -s -X POST "${API_URL}/shopping-lists/${SHOPPING_LIST_ID}/items" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer ${TOKEN}" \
  -d '{
    "ingredientName": "bananas",
    "quantity": 6,
    "unit": "pieces"
  }')

ITEM_ID=$(echo $ADD_ITEM_RESPONSE | grep -o '"id":[0-9]*' | head -1 | sed 's/"id"://')

if [ -z "$ITEM_ID" ]; then
  echo "❌ Failed to add custom item"
  echo "Response: $ADD_ITEM_RESPONSE"
else
  echo "✅ Custom item added with ID: $ITEM_ID"
  echo "Item details:"
  echo "$ADD_ITEM_RESPONSE" | python3 -m json.tool 2>/dev/null || echo "$ADD_ITEM_RESPONSE"
fi
echo ""

# Step 6: Test updating an item
if [ -n "$ITEM_ID" ]; then
  echo "6. Testing update item..."
  UPDATE_RESPONSE=$(curl -s -X PATCH "${API_URL}/shopping-lists/items/${ITEM_ID}" \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer ${TOKEN}" \
    -d '{
      "ingredientName": "organic bananas",
      "quantity": 8,
      "unit": "pieces"
    }')

  if echo "$UPDATE_RESPONSE" | grep -q "organic bananas"; then
    echo "✅ Item updated successfully"
    echo "$UPDATE_RESPONSE" | python3 -m json.tool 2>/dev/null || echo "$UPDATE_RESPONSE"
  else
    echo "❌ Failed to update item"
    echo "Response: $UPDATE_RESPONSE"
  fi
  echo ""

  # Step 7: Test deleting an item
  echo "7. Testing delete item..."
  DELETE_RESPONSE=$(curl -s -X DELETE "${API_URL}/shopping-lists/items/${ITEM_ID}" \
    -H "Authorization: Bearer ${TOKEN}")

  if echo "$DELETE_RESPONSE" | grep -q "success\|deleted"; then
    echo "✅ Item deleted successfully"
  else
    echo "❌ Failed to delete item"
    echo "Response: $DELETE_RESPONSE"
  fi
fi

echo ""
echo "=== Test Summary ==="
echo "All shopping list enhancement features have been tested!"
echo "✓ Ingredient categorization"
echo "✓ Add custom items"
echo "✓ Update items"
echo "✓ Delete items"
