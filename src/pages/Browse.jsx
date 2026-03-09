import { motion, AnimatePresence } from 'framer-motion';
import { useApp } from '../context/AppContext';
import BusinessCard from '../components/BusinessCard';
import SearchBar from '../components/SearchBar';
import CategoryFilter from '../components/CategoryFilter';
import SortBar from '../components/SortBar';
import { SearchX } from 'lucide-react';

export default function Browse() {
  const { filteredBusinesses } = useApp();

  return (
    <main className="min-h-screen pt-24 pb-16 px-4 max-w-6xl mx-auto" id="main-content">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="mb-6"
      >
        <h1 className="text-3xl font-black text-white mb-1">Browse Businesses</h1>
        <p className="text-slate-400 text-sm">Find and support local businesses in your community</p>
      </motion.div>

      {/* Search */}
      <div className="mb-4">
        <SearchBar />
      </div>

      {/* Category filter */}
      <div className="mb-4">
        <CategoryFilter />
      </div>

      {/* Sort bar */}
      <div className="mb-6">
        <SortBar resultCount={filteredBusinesses.length} />
      </div>

      {/* Results grid */}
      <AnimatePresence mode="wait">
        {filteredBusinesses.length > 0 ? (
          <motion.div
            key="results"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6"
            role="list"
            aria-label="Business listings"
          >
            {filteredBusinesses.map((biz, i) => (
              <div key={biz.id} role="listitem">
                <BusinessCard business={biz} index={i} />
              </div>
            ))}
          </motion.div>
        ) : (
          <motion.div
            key="empty"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
            className="text-center py-24"
            role="status"
            aria-live="polite"
          >
            <SearchX size={48} className="text-slate-600 mx-auto mb-4" aria-hidden="true" />
            <h2 className="text-xl font-bold text-slate-300 mb-2">No businesses found</h2>
            <p className="text-slate-500 text-sm">Try adjusting your search or category filter.</p>
          </motion.div>
        )}
      </AnimatePresence>
    </main>
  );
}
