import { motion, AnimatePresence } from 'framer-motion';
import { Link } from 'react-router-dom';
import { Bookmark, ArrowRight } from 'lucide-react';
import { useApp } from '../context/AppContext';
import BusinessCard from '../components/BusinessCard';

export default function Favorites() {
  const { bookmarkedBusinesses } = useApp();

  return (
    <main className="min-h-screen pt-24 pb-16 px-4 max-w-6xl mx-auto" id="main-content">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-8"
      >
        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 rounded-xl bg-indigo-600/20 flex items-center justify-center">
            <Bookmark size={20} className="text-indigo-400" aria-hidden="true" />
          </div>
          <h1 className="text-3xl font-black text-white">Saved Businesses</h1>
        </div>
        <p className="text-slate-400 text-sm">
          Your bookmarked businesses, saved for easy access.
        </p>
      </motion.div>

      <AnimatePresence mode="wait">
        {bookmarkedBusinesses.length > 0 ? (
          <motion.div
            key="list"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <p className="text-slate-400 text-sm mb-5" aria-live="polite">
              <span className="text-white font-semibold">{bookmarkedBusinesses.length}</span>{' '}
              saved {bookmarkedBusinesses.length === 1 ? 'business' : 'businesses'}
            </p>
            <div
              className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6"
              role="list"
              aria-label="Saved businesses"
            >
              {bookmarkedBusinesses.map((biz, i) => (
                <div key={biz.id} role="listitem">
                  <BusinessCard business={biz} index={i} />
                </div>
              ))}
            </div>
          </motion.div>
        ) : (
          <motion.div
            key="empty"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
            className="flex flex-col items-center justify-center py-28 text-center"
            role="status"
            aria-live="polite"
          >
            <div className="w-20 h-20 glass rounded-full flex items-center justify-center mb-5">
              <Bookmark size={32} className="text-slate-500" aria-hidden="true" />
            </div>
            <h2 className="text-xl font-bold text-slate-300 mb-2">No saved businesses yet</h2>
            <p className="text-slate-500 text-sm mb-6 max-w-xs">
              Browse local businesses and click the bookmark icon to save your favorites here.
            </p>
            <Link
              to="/browse"
              className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white px-5 py-2.5 rounded-xl text-sm font-semibold transition-all hover:scale-105"
              aria-label="Browse businesses to save"
            >
              Browse Businesses
              <ArrowRight size={14} aria-hidden="true" />
            </Link>
          </motion.div>
        )}
      </AnimatePresence>
    </main>
  );
}
