import { motion } from 'framer-motion';
import { useApp } from '../context/AppContext';
import { CATEGORIES } from '../data/businesses';

export default function CategoryFilter() {
  const { activeCategory, setActiveCategory } = useApp();

  return (
    <div
      className="flex gap-2 overflow-x-auto pb-1 no-scrollbar"
      role="group"
      aria-label="Filter businesses by category"
    >
      {CATEGORIES.map((cat) => {
        const isActive = activeCategory === cat.id;
        return (
          <motion.button
            key={cat.id}
            onClick={() => setActiveCategory(cat.id)}
            whileTap={{ scale: 0.95 }}
            aria-pressed={isActive}
            aria-label={`Filter by ${cat.label}`}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-all duration-200 border ${
              isActive
                ? 'bg-indigo-600 border-indigo-500 text-white shadow-lg shadow-indigo-500/20'
                : 'bg-white/5 border-white/10 text-slate-400 hover:border-indigo-500/50 hover:text-white'
            }`}
          >
            <span aria-hidden="true">{cat.icon}</span>
            {cat.label}
          </motion.button>
        );
      })}
    </div>
  );
}
