import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Menu } from '@headlessui/react';
import { Bars3Icon } from '@heroicons/react/24/outline';
import NavLinks from './nav/NavLinks';
import MobileDrawer from './nav/MobileDrawer';

export default function Layout({ children }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="min-h-screen flex flex-col">
      <header className="bg-white/80 backdrop-blur-sm border-b border-gray-200 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            {/* Logo */}
            <Link to="/" className="flex items-center flex-shrink-0">
              <span className="text-xl font-semibold text-gray-900">Recipe Manager</span>
            </Link>

            {/* Desktop Navigation */}
            <nav className="hidden md:flex items-center space-x-1">
              {user ? (
                <>
                  <NavLinks />

                  {/* User Menu */}
                  <Menu as="div" className="relative ml-3">
                    <Menu.Button className="flex items-center text-gray-700 hover:text-primary-600 p-1 rounded-full hover:bg-gray-100">
                      <div className="h-8 w-8 rounded-full bg-primary-100 flex items-center justify-center">
                        <span className="text-primary-600 font-medium text-sm">
                          {user.firstName?.[0] || user.email[0].toUpperCase()}
                        </span>
                      </div>
                    </Menu.Button>

                    <Menu.Items className="absolute right-0 mt-2 w-48 origin-top-right bg-white rounded-md shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none z-50">
                      <div className="py-1">
                        <Menu.Item>
                          {() => (
                            <div className="px-4 py-2 text-sm text-gray-700 border-b">
                              <div className="font-medium">
                                {user.firstName} {user.lastName}
                              </div>
                              <div className="text-gray-500 text-xs">{user.email}</div>
                            </div>
                          )}
                        </Menu.Item>
                        <Menu.Item>
                          {({ active }) => (
                            <button
                              onClick={handleLogout}
                              className={`${
                                active ? 'bg-gray-100' : ''
                              } block w-full text-left px-4 py-2 text-sm text-gray-700`}
                            >
                              Sign out
                            </button>
                          )}
                        </Menu.Item>
                      </div>
                    </Menu.Items>
                  </Menu>
                </>
              ) : (
                <>
                  <Link
                    to="/login"
                    className="text-gray-700 hover:text-primary-600 px-3 py-2 rounded-md text-sm font-medium"
                  >
                    Login
                  </Link>
                  <Link to="/register" className="btn btn-primary text-sm">
                    Sign Up
                  </Link>
                </>
              )}
            </nav>

            {/* Mobile menu button */}
            <button
              onClick={() => setMobileMenuOpen(true)}
              className="md:hidden p-2 -mr-2 text-gray-700 hover:text-primary-600 hover:bg-gray-100 rounded-md"
              aria-label="Open menu"
            >
              <Bars3Icon className="h-6 w-6" />
            </button>
          </div>
        </div>
      </header>

      {/* Mobile Navigation Drawer */}
      <MobileDrawer
        isOpen={mobileMenuOpen}
        onClose={() => setMobileMenuOpen(false)}
        user={user}
        onLogout={handleLogout}
      />

      <main className="flex-1">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-10">{children}</div>
      </main>

      <footer className="border-t border-gray-100 mt-auto">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <p className="text-center text-gray-400 text-xs">
            &copy; 2026 Recipe Manager
          </p>
        </div>
      </footer>
    </div>
  );
}
