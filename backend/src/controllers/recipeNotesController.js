const pool = require('../config/database');
const { errors } = require('../utils/errorResponse');

// Get note for a recipe (user's own note)
const getNoteForRecipe = async (req, res) => {
  try {
    const { recipeId } = req.params;
    const userId = req.user.userId;

    const result = await pool.query(
      'SELECT * FROM recipe_notes WHERE recipe_id = $1 AND user_id = $2',
      [recipeId, userId]
    );

    if (result.rows.length === 0) {
      return res.json({ note: null });
    }

    res.json({ note: result.rows[0] });
  } catch (error) {
    console.error('Error fetching recipe note:', error);
    return errors.internal(res, 'Failed to fetch note');
  }
};

// Create or update note for a recipe
const upsertNoteForRecipe = async (req, res) => {
  try {
    const { recipeId } = req.params;
    const { noteText } = req.body;
    const userId = req.user.userId;

    console.log('Upsert note request:', { recipeId, userId, noteTextLength: noteText?.length });

    if (!noteText || noteText.trim() === '') {
      console.log('Note text validation failed');
      return errors.badRequest(res, 'Note text is required');
    }

    // Verify recipe exists and belongs to user
    console.log('Checking if recipe exists for user...');
    const recipeCheck = await pool.query('SELECT id FROM recipes WHERE id = $1 AND user_id = $2', [
      recipeId,
      userId,
    ]);

    console.log('Recipe check result:', { found: recipeCheck.rows.length });

    if (recipeCheck.rows.length === 0) {
      console.log('Recipe not found or does not belong to user');
      return errors.notFound(res, 'Recipe not found');
    }

    // Upsert the note (insert or update if exists)
    console.log('Upserting note...');
    const result = await pool.query(
      `INSERT INTO recipe_notes (recipe_id, user_id, note_text)
       VALUES ($1, $2, $3)
       ON CONFLICT (recipe_id, user_id)
       DO UPDATE SET note_text = $3, updated_at = CURRENT_TIMESTAMP
       RETURNING *`,
      [recipeId, userId, noteText.trim()]
    );

    console.log('Note upserted successfully:', result.rows[0].id);
    res.json({ note: result.rows[0] });
  } catch (error) {
    console.error('Error saving recipe note:', error);
    console.error('Error details:', error.message, error.stack);
    return errors.internal(res, 'Failed to save note');
  }
};

// Delete note for a recipe
const deleteNoteForRecipe = async (req, res) => {
  try {
    const { recipeId } = req.params;
    const userId = req.user.userId;

    const result = await pool.query(
      'DELETE FROM recipe_notes WHERE recipe_id = $1 AND user_id = $2 RETURNING *',
      [recipeId, userId]
    );

    if (result.rows.length === 0) {
      return errors.notFound(res, 'Note not found');
    }

    res.json({ message: 'Note deleted successfully' });
  } catch (error) {
    console.error('Error deleting recipe note:', error);
    return errors.internal(res, 'Failed to delete note');
  }
};

module.exports = {
  getNoteForRecipe,
  upsertNoteForRecipe,
  deleteNoteForRecipe,
};
