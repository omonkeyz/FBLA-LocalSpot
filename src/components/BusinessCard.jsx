import { useRef } from 'react';
import { Link } from 'react-router-dom';
import { motion, useMotionValue, useTransform, useSpring } from 'framer-motion';
import { Bookmark, BookmarkCheck, MapPin, Tag, BadgeCheck } from 'lucide-react';
import { useApp } from '../context/AppContext';
import StarRating from './StarRating';
import { CATEGORIES, CATEGORY_COLORS } from '../data/businesses';

export default function BusinessCard({ business, index = 0 }) {
  const { bookmarks, toggleBookmark } = useApp();
  const isBookmarked = bookmarks.has(business.id);
  const category = CATEGORIES.find((c) => c.id === business.category);
  const accentColor = CATEGORY_COLORS[business.category] || '#6366f1';
  const hasDeals = business.deals && business.deals.length > 0;

  // ── 3D tilt via Framer Motion values ──────────────────────────────────────
  const mx = useMotionValue(0);
  const my = useMotionValue(0);
  const rotateX = useSpring(useTransform(my, [-0.5, 0.5], [7, -7]), { stiffness: 300, damping: 30 });
  const rotateY = useSpring(useTransform(mx, [-0.5, 0.5], [-7, 7]), { stiffness: 300, damping: 30 });
  const glowOpacity = useSpring(useTransform(mx, [-0.5, 0.5], [0, 0]), { stiffness: 200, damping: 25 });

  const handleMouseMove = (e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    mx.set((e.clientX - rect.left) / rect.width - 0.5);
    my.set((e.clientY - rect.top) / rect.height - 0.5);
    glowOpacity.set(1);
  };

  const handleMouseLeave = () => {
    mx.set(0);
    my.set(0);
    glowOpacity.set(0);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, delay: index * 0.06, ease: 'easeOut' }}
      style={{ perspective: 1000 }}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
    >
      <motion.article
        style={{
          rotateX,
          rotateY,
          transformStyle: 'preserve-3d',
          borderColor: accentColor + '22',
        }}
        className="group glass rounded-2xl overflow-hidden cursor-pointer relative border"
        aria-label={`${business.name} business card`}
      >
        {/* Colour-shift glow on hover */}
        <motion.div
          className="absolute inset-0 rounded-2xl pointer-events-none z-10"
          style={{
            background: `radial-gradient(ellipse at 50% 0%, ${accentColor}18 0%, transparent 65%)`,
            opacity: glowOpacity,
          }}
          aria-hidden="true"
        />

        {/* Image */}
        <Link to={`/business/${business.id}`} aria-label={`View details for ${business.name}`}>
          <div className="relative h-44 overflow-hidden">
            <img
              src={business.image}
              alt={`${business.name} storefront`}
              className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
              loading="lazy"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" aria-hidden="true" />

            {business.featured && (
              <span
                className="absolute top-2 left-2 text-white text-xs font-bold px-2 py-0.5 rounded-full"
                style={{ background: accentColor + 'cc' }}
              >
                ⭐ Featured
              </span>
            )}

            {hasDeals && (
              <span className="absolute top-2 right-10 bg-green-600 text-white text-xs font-bold px-2 py-0.5 rounded-full flex items-center gap-1">
                <Tag size={10} aria-hidden="true" /> Deal
              </span>
            )}
          </div>
        </Link>

        {/* Content */}
        <div className="p-4">
          <div className="flex items-start justify-between gap-2">
            <Link to={`/business/${business.id}`} className="flex-1 min-w-0">
              <h2 className="font-bold text-lg text-white truncate group-hover:text-indigo-400 transition-colors">
                {business.name}
                {business.verified && (
                  <BadgeCheck size={16} className="inline ml-1.5 text-indigo-400" aria-label="Verified" />
                )}
              </h2>
            </Link>
            <button
              onClick={(e) => { e.preventDefault(); toggleBookmark(business.id); }}
              aria-label={isBookmarked ? `Remove ${business.name} from favorites` : `Save ${business.name} to favorites`}
              aria-pressed={isBookmarked}
              className="flex-shrink-0 p-1.5 rounded-lg hover:bg-white/10 transition-colors"
            >
              {isBookmarked
                ? <BookmarkCheck size={18} className="text-indigo-400" aria-hidden="true" />
                : <Bookmark size={18} className="text-slate-400 hover:text-indigo-400" aria-hidden="true" />}
            </button>
          </div>

          <div className="flex items-center gap-1.5 mt-1 mb-2">
            <span className="text-xs text-slate-400" aria-label={`Category: ${category?.label}`}>
              {category?.icon} {category?.label}
            </span>
            <span className="text-slate-600" aria-hidden="true">•</span>
            <div className="flex items-center gap-1 text-xs text-slate-400">
              <MapPin size={11} aria-hidden="true" />
              <span className="truncate">{business.address.split(',')[0]}</span>
            </div>
          </div>

          <StarRating rating={business.rating} showCount={business.reviewCount} size={14} />

          <p className="text-slate-400 text-sm mt-2 line-clamp-2">{business.description}</p>

          <div className="flex flex-wrap gap-1 mt-3" role="list" aria-label="Business tags">
            {business.tags.slice(0, 3).map((tag) => (
              <span
                key={tag}
                role="listitem"
                className="text-xs px-2 py-0.5 rounded-full border"
                style={{
                  background: accentColor + '18',
                  color: accentColor,
                  borderColor: accentColor + '44',
                }}
              >
                {tag}
              </span>
            ))}
          </div>
        </div>
      </motion.article>
    </motion.div>
  );
}
