import { useState, lazy, Suspense, Component } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { LayoutGrid, Map, SearchX, Loader2, AlertTriangle } from 'lucide-react';
import { useApp } from '../context/AppContext';
import BusinessCard from '../components/BusinessCard';
import SearchBar from '../components/SearchBar';
import CategoryFilter from '../components/CategoryFilter';
import SortBar from '../components/SortBar';

// Lazy-load the heavy map + Leaflet bundle so it doesn't block initial render
const MapView = lazy(() => import('../components/MapView'));

// ── Error boundary so a map crash can't take down the whole page ──────────────
class MapErrorBoundary extends Component {
  constructor(props) { super(props); this.state = { hasError: false }; }
  static getDerivedStateFromError() { return { hasError: true }; }
  render() {
    if (this.state.hasError) {
      return (
        <div className="flex flex-col items-center justify-center glass rounded-2xl py-16 gap-3 text-slate-400"
          style={{ minHeight: 400 }}>
          <AlertTriangle size={32} className="text-amber-400" aria-hidden="true" />
          <p className="font-semibold text-white">Map failed to load</p>
          <p className="text-sm">Try switching back to Grid view.</p>
        </div>
      );
    }
    return this.props.children;
  }
}

function ViewToggle({ view, setView }) {
  return (
    <div className="flex glass rounded-xl p-0.5" role="group" aria-label="Switch view">
      {[
        { id: 'grid', icon: LayoutGrid, label: 'Grid' },
        { id: 'map', icon: Map, label: 'Map' },
      ].map(({ id, icon: Icon, label }) => (
        <button
          key={id}
          onClick={() => setView(id)}
          aria-pressed={view === id}
          aria-label={`${label} view`}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
            view === id ? 'bg-indigo-600 text-white shadow' : 'text-slate-400 hover:text-white'
          }`}
        >
          <Icon size={15} aria-hidden="true" />
          <span className="hidden sm:block">{label}</span>
        </button>
      ))}
    </div>
  );
}

export default function Browse() {
  const { filteredBusinesses } = useApp();
  const [view, setView] = useState('grid');

  return (
    <main className="min-h-screen pt-24 pb-16 px-4 max-w-6xl mx-auto" id="main-content">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="flex items-end justify-between mb-6 gap-4 flex-wrap"
      >
        <div>
          <h1 className="text-3xl font-black text-white mb-1">Browse Businesses</h1>
          <p className="text-slate-400 text-sm">Find and support local businesses in your community</p>
        </div>
        <ViewToggle view={view} setView={setView} />
      </motion.div>

      {/* Filters — always visible */}
      <div className="mb-4"><SearchBar /></div>
      <div className="mb-4"><CategoryFilter /></div>

      <AnimatePresence mode="wait">
        {/* MAP VIEW */}
        {view === 'map' && (
          <motion.div
            key="map"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            transition={{ duration: 0.3 }}
          >
            <p className="text-slate-400 text-sm mb-3" aria-live="polite">
              <span className="text-white font-semibold">{filteredBusinesses.length}</span>{' '}
              {filteredBusinesses.length === 1 ? 'business' : 'businesses'} on map
              <span className="ml-2 text-slate-600">— click a pin to explore</span>
            </p>
            <MapErrorBoundary>
              <Suspense
                fallback={
                  <div
                    className="flex items-center justify-center glass rounded-2xl"
                    style={{ height: 'calc(100vh - 240px)' }}
                  >
                    <div className="flex items-center gap-2 text-slate-400">
                      <Loader2 size={20} className="animate-spin" aria-hidden="true" />
                      Loading map…
                    </div>
                  </div>
                }
              >
                <MapView businesses={filteredBusinesses} />
              </Suspense>
            </MapErrorBoundary>
          </motion.div>
        )}

        {/* GRID VIEW */}
        {view === 'grid' && (
          <motion.div
            key="grid"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            transition={{ duration: 0.3 }}
          >
            <div className="mb-6"><SortBar resultCount={filteredBusinesses.length} /></div>

            {filteredBusinesses.length > 0 ? (
              <div
                className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6"
                role="list"
                aria-label="Business listings"
              >
                {filteredBusinesses.map((biz, i) => (
                  <div key={biz.id} role="listitem">
                    <BusinessCard business={biz} index={i} />
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-24" role="status" aria-live="polite">
                <SearchX size={48} className="text-slate-600 mx-auto mb-4" aria-hidden="true" />
                <h2 className="text-xl font-bold text-slate-300 mb-2">No businesses found</h2>
                <p className="text-slate-500 text-sm">Try adjusting your search or category filter.</p>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </main>
  );
}
