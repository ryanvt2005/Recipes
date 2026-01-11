import { useState, useEffect } from 'react';
import { recipes } from '../services/api';
import Button from './Button';
import { PencilIcon, TrashIcon } from '@heroicons/react/24/outline';

export default function RecipeNotes({ recipeId }) {
  const [note, setNote] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [noteText, setNoteText] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchNote();
  }, [recipeId]);

  const fetchNote = async () => {
    try {
      setLoading(true);
      const response = await recipes.getNote(recipeId);
      setNote(response.data.note);
      if (response.data.note) {
        setNoteText(response.data.note.note_text);
      }
    } catch (err) {
      console.error('Failed to fetch note:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!noteText.trim()) {
      setError('Note cannot be empty');
      return;
    }

    try {
      setSaving(true);
      setError('');
      const response = await recipes.upsertNote(recipeId, noteText.trim());
      setNote(response.data.note);
      setIsEditing(false);
    } catch (err) {
      setError('Failed to save note');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!window.confirm('Are you sure you want to delete this note?')) {
      return;
    }

    try {
      setSaving(true);
      setError('');
      await recipes.deleteNote(recipeId);
      setNote(null);
      setNoteText('');
      setIsEditing(false);
    } catch (err) {
      setError('Failed to delete note');
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = () => {
    setIsEditing(true);
    setError('');
  };

  const handleCancel = () => {
    setIsEditing(false);
    setNoteText(note ? note.note_text : '');
    setError('');
  };

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">My Notes</h2>
        <p className="text-gray-500">Loading...</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-semibold text-gray-900">My Notes</h2>
        {note && !isEditing && (
          <div className="flex gap-2">
            <button
              onClick={handleEdit}
              className="text-gray-600 hover:text-primary-600 transition-colors"
              title="Edit note"
            >
              <PencilIcon className="h-5 w-5" />
            </button>
            <button
              onClick={handleDelete}
              className="text-gray-600 hover:text-red-600 transition-colors"
              title="Delete note"
              disabled={saving}
            >
              <TrashIcon className="h-5 w-5" />
            </button>
          </div>
        )}
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded text-red-600 text-sm">
          {error}
        </div>
      )}

      {isEditing || !note ? (
        <div>
          <textarea
            value={noteText}
            onChange={(e) => setNoteText(e.target.value)}
            placeholder="Add your personal notes about this recipe... (e.g., 'doubled the garlic', 'kids loved it', 'reduce salt next time')"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent resize-none"
            rows={6}
          />
          <div className="flex gap-2 mt-3">
            <Button onClick={handleSave} loading={saving} size="sm">
              {note ? 'Update Note' : 'Save Note'}
            </Button>
            {(note || noteText) && (
              <Button onClick={handleCancel} variant="outline" size="sm" disabled={saving}>
                Cancel
              </Button>
            )}
          </div>
        </div>
      ) : (
        <div>
          <div className="prose max-w-none">
            <p className="text-gray-700 whitespace-pre-wrap">{note.note_text}</p>
          </div>
          {note.updated_at && (
            <p className="text-xs text-gray-500 mt-3">
              Last updated: {new Date(note.updated_at).toLocaleDateString()}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
