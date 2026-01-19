import { Dialog, DialogPanel, DialogTitle } from '@headlessui/react';
import { XMarkIcon } from '@heroicons/react/24/outline';
import { Link } from 'react-router-dom';
import NavLinks from './NavLinks';

export default function MobileDrawer({ isOpen, onClose, user, onLogout }) {
  return (
    <Dialog open={isOpen} onClose={onClose} className="relative z-50">
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black/30" aria-hidden="true" />

      {/* Drawer panel */}
      <div className="fixed inset-0 flex justify-end">
        <DialogPanel className="w-full max-w-xs bg-white shadow-xl flex flex-col">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-4 border-b border-gray-200">
            <DialogTitle className="text-lg font-semibold text-gray-900">Menu</DialogTitle>
            <button
              onClick={onClose}
              className="p-2 -mr-2 text-gray-500 hover:text-gray-700 rounded-md hover:bg-gray-100"
              aria-label="Close menu"
            >
              <XMarkIcon className="h-6 w-6" />
            </button>
          </div>

          {/* Navigation links */}
          <nav className="flex-1 px-2 py-4 space-y-1 overflow-y-auto">
            {user ? (
              <NavLinks onClick={onClose} vertical />
            ) : (
              <>
                <Link
                  to="/login"
                  onClick={onClose}
                  className="block px-4 py-3 text-base font-medium text-gray-700 hover:text-primary-600 hover:bg-gray-50 rounded-md"
                >
                  Login
                </Link>
                <Link
                  to="/register"
                  onClick={onClose}
                  className="block px-4 py-3 text-base font-medium text-white bg-primary-600 hover:bg-primary-700 rounded-md text-center"
                >
                  Sign Up
                </Link>
              </>
            )}
          </nav>

          {/* User info and logout (only when logged in) */}
          {user && (
            <div className="border-t border-gray-200 px-4 py-4">
              <div className="flex items-center mb-4">
                <div className="h-10 w-10 rounded-full bg-primary-100 flex items-center justify-center flex-shrink-0">
                  <span className="text-primary-600 font-medium">
                    {user.firstName?.[0] || user.email[0].toUpperCase()}
                  </span>
                </div>
                <div className="ml-3 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">
                    {user.firstName} {user.lastName}
                  </p>
                  <p className="text-xs text-gray-500 truncate">{user.email}</p>
                </div>
              </div>
              <button
                onClick={() => {
                  onLogout();
                  onClose();
                }}
                className="w-full px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-md"
              >
                Sign out
              </button>
            </div>
          )}
        </DialogPanel>
      </div>
    </Dialog>
  );
}
