import { lazy, Suspense, Component } from 'react';
import { motion } from 'framer-motion';
import { Loader2, AlertTriangle } from 'lucide-react';
import { useApp } from '../context/AppContext';
import SearchBar from '../components/SearchBar';
import CategoryFilter from '../components/CategoryFilter';

const GlobeView = lazy(() => import('../components/GlobeView'));

class GlobeErrorBoundary extends Component {
  constructor(props) { super(props); this.state = { hasError: false }; }
  static getDerivedStateFromError() { return { hasError: true }; }
  render() {
    if (this.state.hasError) {
      return (
        <div
          className="flex flex-col items-center justify-center glass rounded-2xl py-16 gap-3 text-slate-400"
          style={{ minHeight: 400 }}
        >
          <AlertTriangle size={32} className="text-amber-400" aria-hidden="true" />
          <p className="font-semibold text-white">Globe failed to load</p>
          <p className="text-sm">Try refreshing the page.</p>
        </div>
      );
    }
    return this.props.children;
  }
}

export default function Browse() {
  const { filteredBusinesses } = useApp();

  return (
    <main className="min-h-screen pt-24 pb-16 px-4 max-w-6xl mx-auto" id="main-content">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="mb-6"
      >
        <h1 className="text-3xl font-black text-white mb-1">Browse Businesses</h1>
        <p className="text-slate-400 text-sm">Search any city or click the globe to explore local businesses</p>
      </motion.div>

      <div className="mb-4"><SearchBar /></div>
      <div className="mb-4"><CategoryFilter /></div>

      <GlobeErrorBoundary>
        <Suspense
          fallback={
            <div
              className="flex items-center justify-center glass rounded-2xl"
              style={{ height: 'calc(100vh - 240px)' }}
            >
              <div className="flex items-center gap-2 text-slate-400">
                <Loader2 size={20} className="animate-spin" aria-hidden="true" />
                Loading globe…
              </div>
            </div>
          }
        >
          <GlobeView businesses={filteredBusinesses} />
        </Suspense>
      </GlobeErrorBoundary>
    </main>
  );
}
