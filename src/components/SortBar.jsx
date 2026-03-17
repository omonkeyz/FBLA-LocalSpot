import { ArrowUpDown } from 'lucide-react';
import { useApp } from '../context/AppContext';

const SORT_OPTIONS = [
  { value: 'rating', label: 'Top Rated' },
  { value: 'reviews', label: 'Most Reviewed' },
  { value: 'name', label: 'A–Z' },
];

export default function SortBar({ resultCount }) {
  const { sortBy, setSortBy } = useApp();

  return (
    <div className="flex items-center justify-between gap-3 flex-wrap">
      <p className="text-slate-400 text-sm" aria-live="polite" aria-atomic="true">
        <span className="text-white font-semibold">{resultCount}</span>{' '}
        {resultCount === 1 ? 'business' : 'businesses'} found
      </p>

      <div className="flex items-center gap-2" role="group" aria-label="Sort businesses">
        <ArrowUpDown size={14} className="text-slate-500" aria-hidden="true" />
        <label htmlFor="sort-select" className="text-slate-400 text-sm sr-only">
          Sort by
        </label>
        <select
          id="sort-select"
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value)}
          className="bg-white/5 border border-white/10 text-white text-sm rounded-lg px-3 py-1.5 focus:outline-none focus:border-indigo-500 cursor-pointer"
          aria-label="Sort businesses by"
        >
          {SORT_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value} className="bg-slate-900">
              {opt.label}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}
