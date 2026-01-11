const pool = require('../config/database');

// Get note for a recipe (user's own note)
const getNoteForRecipe = async (req, res) => {
  try {
    const { recipeId } = req.params;
    const userId = req.user.id;

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
    res.status(500).json({ error: 'Failed to fetch note' });
  }
};

// Create or update note for a recipe
const upsertNoteForRecipe = async (req, res) => {
  try {
    const { recipeId } = req.params;
    const { noteText } = req.body;
    const userId = req.user.id;

    if (!noteText || noteText.trim() === '') {
      return res.status(400).json({ error: 'Note text is required' });
    }

    // Verify recipe exists and belongs to user
    const recipeCheck = await pool.query(
      'SELECT id FROM recipes WHERE id = $1 AND user_id = $2',
      [recipeId, userId]
    );

    if (recipeCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Recipe not found' });
    }

    // Upsert the note (insert or update if exists)
    const result = await pool.query(
      `INSERT INTO recipe_notes (recipe_id, user_id, note_text)
       VALUES ($1, $2, $3)
       ON CONFLICT (recipe_id, user_id)
       DO UPDATE SET note_text = $3, updated_at = CURRENT_TIMESTAMP
       RETURNING *`,
      [recipeId, userId, noteText.trim()]
    );

    res.json({ note: result.rows[0] });
  } catch (error) {
    console.error('Error saving recipe note:', error);
    res.status(500).json({ error: 'Failed to save note' });
  }
};

// Delete note for a recipe
const deleteNoteForRecipe = async (req, res) => {
  try {
    const { recipeId } = req.params;
    const userId = req.user.id;

    const result = await pool.query(
      'DELETE FROM recipe_notes WHERE recipe_id = $1 AND user_id = $2 RETURNING *',
      [recipeId, userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Note not found' });
    }

    res.json({ message: 'Note deleted successfully' });
  } catch (error) {
    console.error('Error deleting recipe note:', error);
    res.status(500).json({ error: 'Failed to delete note' });
  }
};

module.exports = {
  getNoteForRecipe,
  upsertNoteForRecipe,
  deleteNoteForRecipe,
};
