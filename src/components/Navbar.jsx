import { Link, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import { MapPin, Bookmark, Home, Search, Tag } from 'lucide-react';
import { useApp } from '../context/AppContext';

const NAV_ITEMS = [
  { to: '/', label: 'Home', icon: Home },
  { to: '/browse', label: 'Browse', icon: Search },
  { to: '/deals', label: 'Deals', icon: Tag },
  { to: '/favorites', label: 'Saved', icon: Bookmark },
];

export default function Navbar() {
  const location = useLocation();
  const { bookmarks } = useApp();

  return (
    <motion.nav
      initial={{ y: -80 }}
      animate={{ y: 0 }}
      transition={{ duration: 0.4, ease: 'easeOut' }}
      className="fixed top-0 left-0 right-0 z-50 glass-dark"
      role="navigation"
      aria-label="Main navigation"
    >
      <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
        {/* Logo */}
        <Link to="/" className="flex items-center gap-2 group" aria-label="LocalSpot home">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
            <MapPin size={18} className="text-white" aria-hidden="true" />
          </div>
          <span className="font-bold text-xl gradient-text hidden sm:block">LocalSpot</span>
        </Link>

        {/* Nav Links */}
        <div className="flex items-center gap-1" role="list">
          {NAV_ITEMS.map(({ to, label, icon: Icon }) => {
            const isActive = location.pathname === to || (to !== '/' && location.pathname.startsWith(to));
            return (
              <Link
                key={to}
                to={to}
                role="listitem"
                aria-current={isActive ? 'page' : undefined}
                className={`relative flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                  isActive
                    ? 'text-indigo-400'
                    : 'text-slate-400 hover:text-white hover:bg-white/5'
                }`}
              >
                <Icon size={16} aria-hidden="true" />
                <span className="hidden sm:block">{label}</span>
                {/* Bookmark badge */}
                {label === 'Saved' && bookmarks.size > 0 && (
                  <span
                    className="absolute -top-1 -right-1 w-4 h-4 bg-indigo-500 rounded-full text-xs text-white flex items-center justify-center font-bold"
                    aria-label={`${bookmarks.size} saved businesses`}
                  >
                    {bookmarks.size}
                  </span>
                )}
                {/* Active underline */}
                {isActive && (
                  <motion.div
                    layoutId="nav-active"
                    className="absolute bottom-0 left-0 right-0 h-0.5 bg-indigo-500 rounded-full"
                  />
                )}
              </Link>
            );
          })}
        </div>
      </div>
    </motion.nav>
  );
}
