import { Link, useLocation } from 'react-router-dom';

const navItems = [
  { to: '/recipes', label: 'My Recipes' },
  { to: '/recipes/new', label: 'Add Recipe' },
  { to: '/shopping-lists', label: 'Shopping Lists' },
];

export default function NavLinks({ onClick, className = '', vertical = false }) {
  const location = useLocation();

  const baseClasses = vertical
    ? 'block px-4 py-3 text-base font-medium rounded-md'
    : 'px-3 py-2 text-sm font-medium rounded-md';

  const getItemClasses = (to) => {
    const isActive = location.pathname === to || location.pathname.startsWith(`${to}/`);
    return `${baseClasses} ${
      isActive
        ? 'text-primary-600 bg-primary-50'
        : 'text-gray-700 hover:text-primary-600 hover:bg-gray-50'
    } ${className}`;
  };

  return (
    <>
      {navItems.map((item) => (
        <Link key={item.to} to={item.to} onClick={onClick} className={getItemClasses(item.to)}>
          {item.label}
        </Link>
      ))}
    </>
  );
}
