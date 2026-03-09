import { motion } from 'framer-motion';
import { Search, X } from 'lucide-react';
import { useApp } from '../context/AppContext';

export default function SearchBar({ placeholder = 'Search businesses, categories, tags...' }) {
  const { searchQuery, setSearchQuery } = useApp();

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="relative w-full max-w-xl"
      role="search"
    >
      <label htmlFor="business-search" className="sr-only">
        Search local businesses
      </label>
      <Search
        size={18}
        className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
        aria-hidden="true"
      />
      <input
        id="business-search"
        type="search"
        value={searchQuery}
        onChange={(e) => setSearchQuery(e.target.value)}
        placeholder={placeholder}
        autoComplete="off"
        aria-label="Search local businesses"
        className="w-full pl-11 pr-10 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-slate-500 text-sm focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 transition-all"
      />
      {searchQuery && (
        <button
          onClick={() => setSearchQuery('')}
          aria-label="Clear search"
          className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white transition-colors"
        >
          <X size={16} aria-hidden="true" />
        </button>
      )}
    </motion.div>
  );
}
