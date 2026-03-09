import { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { motion, AnimatePresence } from 'framer-motion';
import { Link } from 'react-router-dom';
import { X, Tag, MapPin, Clock, BadgeCheck } from 'lucide-react';
import StarRating from './StarRating';
import { CATEGORIES, CATEGORY_COLORS } from '../data/businesses';

// ── Emoji circle marker factory ───────────────────────────────────────────────
function makeMarker(emoji, color, isSelected) {
  const size = isSelected ? 48 : 38;
  const bg   = isSelected ? color + 'cc' : color + '22';
  const glow = isSelected
    ? `0 0 0 3px ${color}66, 0 4px 20px ${color}88`
    : `0 2px 12px ${color}55`;
  return L.divIcon({
    html: `<div style="
      width:${size}px;height:${size}px;
      background:${bg};
      border:2.5px solid ${color};
      border-radius:50%;
      display:flex;align-items:center;justify-content:center;
      font-size:${isSelected ? 22 : 18}px;
      box-shadow:${glow};
      transition:all .2s ease;
      backdrop-filter:blur(8px);
      cursor:pointer;
    ">${emoji}</div>`,
    className: '',
    iconSize:   [size, size],
    iconAnchor: [size / 2, size / 2],
  });
}

// ── Business side-panel card ──────────────────────────────────────────────────
function BusinessPanel({ business, onClose }) {
  const category = CATEGORIES.find((c) => c.id === business.category);
  const color    = CATEGORY_COLORS[business.category] || '#6366f1';
  const hasDeals = business.deals?.length > 0;

  return (
    <motion.aside
      key={business.id}
      initial={{ opacity: 0, x: 32, scale: 0.96 }}
      animate={{ opacity: 1, x: 0, scale: 1 }}
      exit={{ opacity: 0, x: 32, scale: 0.96 }}
      transition={{ type: 'spring', stiffness: 320, damping: 28 }}
      className="absolute top-4 right-4 w-80 rounded-2xl overflow-hidden z-[1000]"
      style={{
        background: 'rgba(10,10,20,0.88)',
        backdropFilter: 'blur(20px)',
        border: `1px solid ${color}44`,
        boxShadow: `0 24px 48px rgba(0,0,0,0.6), 0 0 0 1px ${color}22, inset 0 1px 0 rgba(255,255,255,0.06)`,
      }}
      aria-label={`Details for ${business.name}`}
    >
      <div className="relative h-44">
        <img src={business.image} alt={business.name} className="w-full h-full object-cover" />
        <div
          className="absolute inset-0"
          style={{ background: 'linear-gradient(to top, rgba(10,10,20,0.95) 0%, rgba(10,10,20,0.2) 60%, transparent 100%)' }}
          aria-hidden="true"
        />
        <button
          onClick={onClose}
          aria-label="Close business panel"
          className="absolute top-3 right-3 w-7 h-7 rounded-full flex items-center justify-center text-white"
          style={{ background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(6px)' }}
        >
          <X size={14} aria-hidden="true" />
        </button>
        <span
          className="absolute top-3 left-3 flex items-center gap-1 text-xs font-semibold px-2 py-1 rounded-full"
          style={{ background: color + '33', border: `1px solid ${color}66`, color }}
        >
          {category?.icon} {category?.label}
        </span>
        <div className="absolute bottom-3 left-4 right-4">
          <h2 className="font-black text-white text-lg leading-tight">
            {business.name}
            {business.verified && (
              <BadgeCheck size={16} className="inline ml-1.5 text-indigo-400" aria-label="Verified" />
            )}
          </h2>
        </div>
      </div>
      <div className="p-4 space-y-3">
        <StarRating rating={business.rating} showCount={business.reviewCount} size={14} />
        <p className="text-slate-400 text-xs leading-relaxed line-clamp-3">{business.description}</p>
        <div className="flex items-center gap-1.5 text-xs text-slate-500">
          <MapPin size={11} aria-hidden="true" /><span>{business.address}</span>
        </div>
        <div className="flex items-center gap-1.5 text-xs text-slate-500">
          <Clock size={11} aria-hidden="true" /><span>{business.hours}</span>
        </div>
        {hasDeals && (
          <div
            className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg"
            style={{ background: '#22c55e18', color: '#22c55e', border: '1px solid #22c55e33' }}
          >
            <Tag size={11} aria-hidden="true" />
            {business.deals.length} active deal{business.deals.length > 1 ? 's' : ''} available
          </div>
        )}
        <Link
          to={`/business/${business.id}`}
          className="block text-center py-2.5 rounded-xl text-sm font-bold text-white transition-all hover:brightness-110 hover:scale-[1.02] active:scale-[0.98]"
          style={{ background: `linear-gradient(135deg, ${color}, ${color}bb)` }}
          aria-label={`View full details for ${business.name}`}
        >
          View Full Details →
        </Link>
      </div>
    </motion.aside>
  );
}

// ── Main MapView — pure Leaflet, StrictMode-safe ──────────────────────────────
export default function MapView({ businesses }) {
  const containerRef  = useRef(null);
  const mapRef        = useRef(null);
  // Map<bizId, { marker, biz, cat, color }> for O(1) icon updates
  const markerMapRef  = useRef(new Map());
  const [selected, setSelected] = useState(null);

  // ── Init map + place all markers once ──────────────────────────────────────
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const map = L.map(containerRef.current, {
      center: [37.209, -93.2923],
      zoom: 14,
      zoomControl: false,
      attributionControl: false,
    });
    mapRef.current = map;

    L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
      maxZoom: 19,
    }).addTo(map);

    // Place a marker for every business
    businesses.forEach((biz) => {
      if (!biz.coords || biz.coords.length < 2) return;
      const cat   = CATEGORIES.find((c) => c.id === biz.category);
      const color = CATEGORY_COLORS[biz.category] || '#6366f1';

      const marker = L.marker(biz.coords, {
        icon: makeMarker(cat?.icon || '📍', color, false),
      }).addTo(map);

      marker.on('click', () => {
        setSelected((prev) => (prev?.id === biz.id ? null : biz));
        map.flyTo(biz.coords, 16, { duration: 1.2, easeLinearity: 0.3 });
      });

      markerMapRef.current.set(biz.id, { marker, biz, cat, color });
    });

    return () => {
      map.remove();
      mapRef.current = null;
      markerMapRef.current.clear();
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Update marker icons when selection changes (setIcon — no remove/re-add) ─
  useEffect(() => {
    markerMapRef.current.forEach(({ marker, cat, color }, bizId) => {
      const isSelected = selected?.id === bizId;
      marker.setIcon(makeMarker(cat?.icon || '📍', color, isSelected));
    });
  }, [selected]);

  return (
    <div
      className="relative w-full rounded-2xl overflow-hidden"
      style={{ height: 'calc(100vh - 200px)', minHeight: '500px' }}
    >
      <div ref={containerRef} style={{ width: '100%', height: '100%' }} />

      <div
        className="absolute bottom-2 left-2 text-slate-600 text-xs z-[1000]"
        aria-label="Map attribution"
      >
        © OpenStreetMap · CartoDB
      </div>

      <AnimatePresence>
        {selected && (
          <BusinessPanel
            key={selected.id}
            business={selected}
            onClose={() => setSelected(null)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
