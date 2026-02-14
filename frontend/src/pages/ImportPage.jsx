import { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { recipes } from '../services/api';
import Layout from '../components/Layout';
import Button from '../components/Button';
import LoadingSpinner from '../components/LoadingSpinner';

export default function ImportPage() {
  const [file, setFile] = useState(null);
  const [importing, setImporting] = useState(false);
  const [error, setError] = useState('');
  const [results, setResults] = useState(null);
  const [autoTagging, setAutoTagging] = useState(false);
  const [autoTagResults, setAutoTagResults] = useState(null);
  const [autoTagError, setAutoTagError] = useState('');
  const fileInputRef = useRef(null);
  const navigate = useNavigate();

  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    if (selectedFile) {
      if (!selectedFile.name.endsWith('.zip')) {
        setError('Please select a .zip file');
        setFile(null);
        return;
      }
      setFile(selectedFile);
      setError('');
      setResults(null);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile) {
      if (!droppedFile.name.endsWith('.zip')) {
        setError('Please select a .zip file');
        setFile(null);
        return;
      }
      setFile(droppedFile);
      setError('');
      setResults(null);
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleImport = async () => {
    if (!file) {
      setError('Please select a file first');
      return;
    }

    setImporting(true);
    setError('');
    setResults(null);

    try {
      const response = await recipes.importFromPepperplate(file);
      setResults(response.data.results);
    } catch (err) {
      console.error('Import error:', err);
      setError(err.response?.data?.message || 'Failed to import recipes');
    } finally {
      setImporting(false);
    }
  };

  const handleAutoTag = async (force = false) => {
    setAutoTagging(true);
    setAutoTagError('');
    setAutoTagResults(null);

    try {
      const response = await recipes.batchAutoTag({ force });
      setAutoTagResults(response.data);
    } catch (err) {
      console.error('Auto-tag error:', err);
      setAutoTagError(err.response?.data?.message || 'Failed to auto-tag recipes');
    } finally {
      setAutoTagging(false);
    }
  };

  const handleReset = () => {
    setFile(null);
    setResults(null);
    setError('');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <Layout>
      <div className="max-w-2xl mx-auto">
        <h1 className="text-2xl font-bold text-gray-900 mb-6">Import Recipes</h1>

        {/* Pepperplate Import Section */}
        <div className="bg-white rounded-xl shadow-soft border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-2">
            Import from Pepperplate
          </h2>
          <p className="text-sm text-gray-600 mb-4">
            Export your recipes from Pepperplate.com (Profile → Export Recipe Data), then upload the .zip file here.
          </p>

          {!results ? (
            <>
              {/* File Drop Zone */}
              <div
                onDrop={handleDrop}
                onDragOver={handleDragOver}
                onClick={() => fileInputRef.current?.click()}
                className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-colors ${
                  file
                    ? 'border-green-400 bg-green-50'
                    : 'border-gray-300 hover:border-gray-400 bg-gray-50'
                }`}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".zip"
                  onChange={handleFileChange}
                  className="hidden"
                />
                {file ? (
                  <div className="text-green-700">
                    <svg
                      className="mx-auto h-12 w-12 mb-2"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                      />
                    </svg>
                    <p className="font-medium">{file.name}</p>
                    <p className="text-sm text-green-600">
                      {(file.size / 1024 / 1024).toFixed(2)} MB
                    </p>
                  </div>
                ) : (
                  <div className="text-gray-500">
                    <svg
                      className="mx-auto h-12 w-12 mb-2"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
                      />
                    </svg>
                    <p className="font-medium">
                      Drop your Pepperplate export here
                    </p>
                    <p className="text-sm">or click to browse</p>
                  </div>
                )}
              </div>

              {/* Error Message */}
              {error && (
                <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
                  {error}
                </div>
              )}

              {/* Import Button */}
              <div className="mt-6 flex gap-3">
                <Button
                  onClick={handleImport}
                  disabled={!file || importing}
                  className="flex-1"
                >
                  {importing ? (
                    <span className="flex items-center justify-center gap-2">
                      <LoadingSpinner size="sm" />
                      Importing...
                    </span>
                  ) : (
                    'Import Recipes'
                  )}
                </Button>
                {file && !importing && (
                  <Button variant="secondary" onClick={handleReset}>
                    Clear
                  </Button>
                )}
              </div>
            </>
          ) : (
            /* Results Section */
            <div>
              {/* Summary */}
              <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-4">
                <h3 className="font-semibold text-green-800 mb-2">
                  Import Complete
                </h3>
                <div className="grid grid-cols-3 gap-4 text-center">
                  <div>
                    <p className="text-2xl font-bold text-green-700">
                      {results.imported}
                    </p>
                    <p className="text-sm text-green-600">Imported</p>
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-yellow-600">
                      {results.skipped?.length || 0}
                    </p>
                    <p className="text-sm text-yellow-600">Skipped</p>
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-red-600">
                      {results.errors?.length || 0}
                    </p>
                    <p className="text-sm text-red-600">Errors</p>
                  </div>
                </div>
              </div>

              {/* Skipped Recipes */}
              {results.skipped?.length > 0 && (
                <div className="mb-4">
                  <h4 className="font-medium text-gray-700 mb-2">
                    Skipped (duplicates)
                  </h4>
                  <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 max-h-40 overflow-y-auto">
                    <ul className="text-sm text-yellow-800 space-y-1">
                      {results.skipped.map((item, idx) => (
                        <li key={idx}>{item.title}</li>
                      ))}
                    </ul>
                  </div>
                </div>
              )}

              {/* Errors */}
              {results.errors?.length > 0 && (
                <div className="mb-4">
                  <h4 className="font-medium text-gray-700 mb-2">Errors</h4>
                  <div className="bg-red-50 border border-red-200 rounded-lg p-3 max-h-40 overflow-y-auto">
                    <ul className="text-sm text-red-800 space-y-1">
                      {results.errors.map((item, idx) => (
                        <li key={idx}>
                          {item.filename}: {item.error}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              )}

              {/* Actions */}
              <div className="flex gap-3">
                <Button onClick={() => navigate('/recipes')} className="flex-1">
                  View Recipes
                </Button>
                <Button variant="secondary" onClick={handleReset}>
                  Import More
                </Button>
              </div>
            </div>
          )}
        </div>
        {/* Auto-Tag Section */}
        <div className="bg-white rounded-xl shadow-soft border border-gray-200 p-6 mt-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-2">
            Auto-Tag Recipes
          </h2>
          <p className="text-sm text-gray-600 mb-4">
            Automatically assign cuisines, meal types, and dietary labels to your recipes based on their titles and ingredients.
          </p>

          {autoTagResults ? (
            <div>
              <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-4">
                <h3 className="font-semibold text-green-800 mb-2">
                  Auto-Tagging Complete
                </h3>
                <div className="grid grid-cols-2 gap-4 text-center">
                  <div>
                    <p className="text-2xl font-bold text-green-700">
                      {autoTagResults.tagged}
                    </p>
                    <p className="text-sm text-green-600">Recipes Tagged</p>
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-gray-500">
                      {autoTagResults.total}
                    </p>
                    <p className="text-sm text-gray-500">Total Processed</p>
                  </div>
                </div>
              </div>

              {autoTagResults.errors?.length > 0 && (
                <div className="mb-4">
                  <h4 className="font-medium text-gray-700 mb-2">Errors</h4>
                  <div className="bg-red-50 border border-red-200 rounded-lg p-3 max-h-40 overflow-y-auto">
                    <ul className="text-sm text-red-800 space-y-1">
                      {autoTagResults.errors.map((item, idx) => (
                        <li key={idx}>
                          {item.title}: {item.error}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              )}

              <Button
                variant="secondary"
                onClick={() => setAutoTagResults(null)}
                className="w-full"
              >
                Done
              </Button>
            </div>
          ) : (
            <div>
              {autoTagError && (
                <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
                  {autoTagError}
                </div>
              )}

              <div className="flex gap-3">
                <Button
                  onClick={() => handleAutoTag(false)}
                  disabled={autoTagging}
                  className="flex-1"
                >
                  {autoTagging ? (
                    <span className="flex items-center justify-center gap-2">
                      <LoadingSpinner size="sm" />
                      Tagging...
                    </span>
                  ) : (
                    'Tag Uncategorized Recipes'
                  )}
                </Button>
                <Button
                  variant="secondary"
                  onClick={() => handleAutoTag(true)}
                  disabled={autoTagging}
                >
                  Re-tag All
                </Button>
              </div>
              <p className="text-xs text-gray-500 mt-2">
                &quot;Tag Uncategorized&quot; only processes recipes with no categories assigned. &quot;Re-tag All&quot; overwrites existing categories.
              </p>
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
}
