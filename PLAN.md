# Pepperplate Import Feature - Implementation Plan

## Overview
Add the ability to import recipes from a Pepperplate.com export file (.zip containing .txt files).

## Pepperplate Export Format Analysis

Each `.txt` file follows this structure:
```
Title: <recipe title>
Description: <optional>
Source: <optional - source name>
Original URL: <optional - source URL>
Yield: <optional - servings>
Active: <optional - prep time>
Total: <optional - total time>
Image: <optional - image URL, field may be absent entirely>
Ingredients:
	<tab-indented ingredient lines>

Instructions:
	<tab-indented instruction lines>
```

Key observations:
- Empty fields have the label but no value (e.g., "Description: ")
- `Image:` field is optional and may not be present at all
- `Active` maps to `prepTime`, `Total` maps to `totalTime`
- No explicit `cookTime` field
- Some recipes have empty `Instructions:` section
- Ingredients may lack quantities (e.g., "Blue Cheese Crumbles")

## Implementation Steps

### 1. Backend: Pepperplate Parser Utility
**File:** `backend/src/utils/pepperplateParser.js`

Create a parser that:
- Accepts raw text content of a single `.txt` file
- Parses the header fields (Title, Description, Source, etc.)
- Parses the Ingredients section (tab-indented lines after "Ingredients:")
- Parses the Instructions section (tab-indented lines after "Instructions:")
- Returns a recipe object matching the `saveRecipe` schema

Field mapping:
| Pepperplate | App Field |
|-------------|-----------|
| Title | title |
| Description | description |
| Original URL | sourceUrl |
| Source | (stored in description or discarded) |
| Yield | servings |
| Active | prepTime |
| Total | totalTime |
| Image | imageUrl |
| Ingredients | ingredients (parsed via ingredientParser) |
| Instructions | instructions |

### 2. Backend: Import Controller
**File:** `backend/src/controllers/importController.js`

Functions:
- `importFromPepperplate(req, res)` - Handles multipart/form-data file upload
  - Accept `.zip` file
  - Extract and parse each `.txt` file
  - Use existing `ingredientParser.parseIngredientString()` for ingredient parsing
  - Return summary: { total, imported, skipped, errors }

Import behavior:
- Skip recipes that already exist (by title match for same user)
- Set `extractionMethod` to `'pepperplate-import'`
- Process in batches to avoid memory issues (1,085 recipes)

### 3. Backend: Import Routes
**File:** `backend/src/routes/importRoutes.js`

Routes:
- `POST /api/import/pepperplate` - Upload and import Pepperplate zip

### 4. Backend: Validation Schema
**File:** `backend/src/utils/validation.js`

Add validation for import endpoint (file type, size limits).

### 5. Frontend: Import Page/Modal
**File:** `frontend/src/pages/ImportPage.jsx` (or modal component)

UI elements:
- File upload dropzone for .zip file
- Import button
- Progress indicator (processing X of Y recipes)
- Results summary (imported, skipped duplicates, errors)
- Link to view imported recipes

### 6. Frontend: Navigation
**File:** `frontend/src/components/Navbar.jsx` (or similar)

Add "Import" link/button to navigation.

### 7. Frontend: API Method
**File:** `frontend/src/api/recipes.js`

Add `importFromPepperplate(file)` method using FormData.

## Technical Considerations

### Memory Management
- Stream/chunk processing for large zip files
- Use `adm-zip` for zip extraction (simpler API than yauzl)
- Process recipes in batches of 50-100

### Duplicate Detection
- Check by normalized title (lowercase, trim) + user_id
- Option: check by sourceUrl if present
- Return list of skipped duplicates in response

### Error Handling
- Continue importing even if individual recipes fail
- Collect errors with recipe filename for user feedback
- Validate required fields (title at minimum)

## File Changes Summary

| File | Action |
|------|--------|
| `backend/src/utils/pepperplateParser.js` | Create |
| `backend/src/controllers/importController.js` | Create |
| `backend/src/routes/importRoutes.js` | Create |
| `backend/src/routes/index.js` | Modify (add import routes) |
| `backend/src/utils/validation.js` | Modify (add import schema) |
| `frontend/src/pages/ImportPage.jsx` | Create |
| `frontend/src/api/recipes.js` | Modify (add import method) |
| `frontend/src/App.jsx` | Modify (add route) |
| Navigation component | Modify (add link) |

## Dependencies
- `adm-zip` - Zip file extraction (backend) - needs to be installed
- `multer` - File upload handling (check if already installed)

## Testing
- Unit tests for pepperplateParser with sample files
- Integration test for full import flow
- Test with the provided 1,085 recipe export
