import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import Layout from '../components/Layout';
import Button from '../components/Button';

export default function HomePage() {
  const { isAuthenticated } = useAuth();

  return (
    <Layout>
      <div className="text-center py-12">
        <h1 className="text-5xl font-bold text-gray-900 mb-4">Welcome to Recipe Manager</h1>
        <p className="text-xl text-gray-600 mb-8 max-w-2xl mx-auto">
          Save recipes from any website, organize your collection, and never lose a recipe again.
          Powered by AI for smart recipe extraction.
        </p>

        {!isAuthenticated ? (
          <div className="flex gap-4 justify-center">
            <Link to="/register">
              <Button>Get Started</Button>
            </Link>
            <Link to="/login">
              <Button variant="outline">Sign In</Button>
            </Link>
          </div>
        ) : (
          <Link to="/recipes">
            <Button>View My Recipes</Button>
          </Link>
        )}

        <div className="mt-16 grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
          <div className="card text-center">
            <div className="text-4xl mb-4">🔗</div>
            <h3 className="text-xl font-semibold mb-2">Extract from URLs</h3>
            <p className="text-gray-600">
              Paste any recipe URL and our AI will automatically extract ingredients and
              instructions.
            </p>
          </div>

          <div className="card text-center">
            <div className="text-4xl mb-4">📚</div>
            <h3 className="text-xl font-semibold mb-2">Organize & Search</h3>
            <p className="text-gray-600">
              Keep all your recipes in one place. Search by ingredients, tags, or recipe names.
            </p>
          </div>

          <div className="card text-center">
            <div className="text-4xl mb-4">🤖</div>
            <h3 className="text-xl font-semibold mb-2">AI-Powered</h3>
            <p className="text-gray-600">
              Uses Claude AI to intelligently parse recipes from any website, even without
              structured data.
            </p>
          </div>
        </div>
      </div>
    </Layout>
  );
}
