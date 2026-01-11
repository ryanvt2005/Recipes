#!/bin/bash

# Simple API test script for Recipe Management Application
# Requires: curl, jq (optional for pretty JSON)

API_URL="http://localhost:3000/api/v1"
TOKEN=""

echo "🧪 Testing Recipe Management API"
echo "================================="

# Test 1: Health Check
echo -e "\n1. Health Check..."
curl -s "$API_URL/../health" | jq '.' 2>/dev/null || curl -s "$API_URL/../health"

# Test 2: Register User
echo -e "\n\n2. Registering new user..."
REGISTER_RESPONSE=$(curl -s -X POST "$API_URL/auth/register" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "TestPass123!",
    "firstName": "Test",
    "lastName": "User"
  }')

echo "$REGISTER_RESPONSE" | jq '.' 2>/dev/null || echo "$REGISTER_RESPONSE"

# Extract token
TOKEN=$(echo "$REGISTER_RESPONSE" | grep -o '"token":"[^"]*"' | cut -d'"' -f4)

if [ -z "$TOKEN" ]; then
  echo -e "\n❌ Registration failed. Trying to login instead..."

  # Test 3: Login (if registration failed)
  LOGIN_RESPONSE=$(curl -s -X POST "$API_URL/auth/login" \
    -H "Content-Type: application/json" \
    -d '{
      "email": "test@example.com",
      "password": "TestPass123!"
    }')

  echo "$LOGIN_RESPONSE" | jq '.' 2>/dev/null || echo "$LOGIN_RESPONSE"
  TOKEN=$(echo "$LOGIN_RESPONSE" | grep -o '"token":"[^"]*"' | cut -d'"' -f4)
fi

if [ -z "$TOKEN" ]; then
  echo -e "\n❌ Could not authenticate. Stopping tests."
  exit 1
fi

echo -e "\n✓ Token obtained: ${TOKEN:0:20}..."

# Test 4: Create Recipe
echo -e "\n\n3. Creating a test recipe..."
CREATE_RECIPE_RESPONSE=$(curl -s -X POST "$API_URL/recipes" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "title": "Test Chocolate Chip Cookies",
    "description": "A simple test recipe",
    "servings": "24 cookies",
    "prepTime": "15 minutes",
    "cookTime": "12 minutes",
    "totalTime": "27 minutes",
    "ingredients": [
      {
        "rawText": "2 cups all-purpose flour",
        "quantity": 2,
        "unit": "cups",
        "ingredient": "all-purpose flour"
      },
      {
        "rawText": "1 cup butter, softened",
        "quantity": 1,
        "unit": "cup",
        "ingredient": "butter",
        "preparation": "softened"
      },
      {
        "rawText": "2 cups chocolate chips",
        "quantity": 2,
        "unit": "cups",
        "ingredient": "chocolate chips"
      }
    ],
    "instructions": [
      "Preheat oven to 375°F (190°C).",
      "Mix flour in a bowl.",
      "Cream butter and sugar.",
      "Add chocolate chips.",
      "Bake for 12 minutes."
    ],
    "tags": ["dessert", "cookies", "test"],
    "extractionMethod": "manual"
  }')

echo "$CREATE_RECIPE_RESPONSE" | jq '.' 2>/dev/null || echo "$CREATE_RECIPE_RESPONSE"

RECIPE_ID=$(echo "$CREATE_RECIPE_RESPONSE" | grep -o '"id":"[^"]*"' | head -1 | cut -d'"' -f4)

if [ -z "$RECIPE_ID" ]; then
  echo -e "\n❌ Could not create recipe"
else
  echo -e "\n✓ Recipe created with ID: $RECIPE_ID"
fi

# Test 5: Get All Recipes
echo -e "\n\n4. Fetching all recipes..."
curl -s -X GET "$API_URL/recipes?limit=5" \
  -H "Authorization: Bearer $TOKEN" | jq '.' 2>/dev/null || \
  curl -s -X GET "$API_URL/recipes?limit=5" -H "Authorization: Bearer $TOKEN"

# Test 6: Get Single Recipe (if we have an ID)
if [ -n "$RECIPE_ID" ]; then
  echo -e "\n\n5. Fetching single recipe..."
  curl -s -X GET "$API_URL/recipes/$RECIPE_ID" \
    -H "Authorization: Bearer $TOKEN" | jq '.' 2>/dev/null || \
    curl -s -X GET "$API_URL/recipes/$RECIPE_ID" -H "Authorization: Bearer $TOKEN"
fi

# Test 7: Search Recipes
echo -e "\n\n6. Searching recipes for 'chocolate'..."
curl -s -X GET "$API_URL/recipes?search=chocolate" \
  -H "Authorization: Bearer $TOKEN" | jq '.' 2>/dev/null || \
  curl -s -X GET "$API_URL/recipes?search=chocolate" -H "Authorization: Bearer $TOKEN"

echo -e "\n\n✅ API tests completed!"
echo "================================="
