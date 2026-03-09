import { useState, lazy, Suspense } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  ArrowLeft, MapPin, Phone, Clock, Bookmark, BookmarkCheck,
  Tag, BadgeCheck, Star, Calendar, Loader2,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import StarRating from '../components/StarRating';
import ReviewForm from '../components/ReviewForm';
import { CATEGORIES, CATEGORY_COLORS } from '../data/businesses';

// Lazy-load heavy 3D + map components
const BusinessPin3D = lazy(() => import('../components/BusinessPin3D'));
const MiniMap = lazy(() => import('../components/MiniMap'));

// ── Deal card with copy-to-clipboard ─────────────────────────────────────────
function DealCard({ deal, accentColor, index }) {
  const [copied, setCopied] = useState(false);

  const copy = () => {
    if (deal.code) {
      navigator.clipboard.writeText(deal.code).then(() => {
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      });
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.1 }}
      className="rounded-xl p-4"
      style={{
        background: '#22c55e10',
        border: '1px solid #22c55e33',
      }}
      aria-label={`Deal: ${deal.title}`}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1">
          <h4 className="font-semibold text-green-400 text-sm flex items-center gap-1.5">
            <Tag size={14} aria-hidden="true" />
            {deal.title}
          </h4>
          <p className="text-slate-300 text-sm mt-1">{deal.description}</p>
          <div className="flex items-center gap-1.5 mt-2 text-xs text-slate-500">
            <Calendar size={11} aria-hidden="true" />
            <span>
              Expires{' '}
              {new Date(deal.expires).toLocaleDateString('en-US', {
                month: 'short', day: 'numeric', year: 'numeric',
              })}
            </span>
          </div>
        </div>
        {deal.code && (
          <button
            onClick={copy}
            aria-label={copied ? 'Code copied!' : `Copy coupon code ${deal.code}`}
            className="flex-shrink-0 px-3 py-1.5 rounded-lg text-xs font-bold border transition-all"
            style={
              copied
                ? { background: '#22c55e22', borderColor: '#22c55e', color: '#22c55e' }
                : { background: 'rgba(255,255,255,0.05)', borderColor: 'rgba(255,255,255,0.1)', color: '#cbd5e1' }
            }
          >
            {copied ? '✓ Copied!' : deal.code}
          </button>
        )}
      </div>
    </motion.div>
  );
}

// ── Review card ───────────────────────────────────────────────────────────────
function ReviewCard({ review, index }) {
  return (
    <motion.article
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.07 }}
      className="glass rounded-xl p-4"
      aria-label={`Review by ${review.author}`}
    >
      <div className="flex items-start justify-between mb-2">
        <div>
          <p className="font-semibold text-white text-sm">{review.author}</p>
          <p className="text-slate-500 text-xs">{review.date}</p>
        </div>
        <StarRating rating={review.rating} size={13} />
      </div>
      <p className="text-slate-300 text-sm leading-relaxed">{review.text}</p>
    </motion.article>
  );
}

// ── Lazy fallback ─────────────────────────────────────────────────────────────
function SpinnerBox({ height = 180 }) {
  return (
    <div
      className="flex items-center justify-center glass rounded-2xl"
      style={{ height }}
    >
      <Loader2 size={20} className="animate-spin text-slate-500" aria-hidden="true" />
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function BusinessDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { getBusiness, getReviews, bookmarks, toggleBookmark } = useApp();

  const business = getBusiness(id);
  const reviews = getReviews(parseInt(id));
  const isBookmarked = bookmarks.has(parseInt(id));

  if (!business) {
    return (
      <main className="min-h-screen pt-24 pb-16 px-4 max-w-3xl mx-auto text-center" id="main-content">
        <h1 className="text-2xl font-bold text-white mb-4">Business Not Found</h1>
        <Link to="/browse" className="text-indigo-400 hover:text-indigo-300">← Back to Browse</Link>
      </main>
    );
  }

  const category = CATEGORIES.find((c) => c.id === business.category);
  const accentColor = CATEGORY_COLORS[business.category] || '#6366f1';

  return (
    <main className="min-h-screen pt-24 pb-16 px-4 max-w-4xl mx-auto" id="main-content">
      {/* Back */}
      <motion.button
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        onClick={() => navigate(-1)}
        className="flex items-center gap-1.5 text-slate-400 hover:text-white text-sm mb-6 transition-colors"
        aria-label="Go back"
      >
        <ArrowLeft size={16} aria-hidden="true" />
        Back
      </motion.button>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* ── LEFT: main info ── */}
        <div className="lg:col-span-2 space-y-6">
          {/* Hero image */}
          <motion.div
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            className="relative h-64 rounded-2xl overflow-hidden"
          >
            <img
              src={business.image}
              alt={`${business.name} storefront`}
              className="w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent" aria-hidden="true" />
            <div className="absolute bottom-4 left-4 right-4 flex items-end justify-between">
              <div>
                <h1 className="text-2xl font-black text-white">
                  {business.name}
                  {business.verified && (
                    <BadgeCheck size={20} className="inline ml-2 text-indigo-400" aria-label="Verified" />
                  )}
                </h1>
                <p className="text-slate-300 text-sm">{category?.icon} {category?.label}</p>
              </div>
              <button
                onClick={() => toggleBookmark(business.id)}
                aria-label={isBookmarked ? 'Remove from favorites' : 'Save to favorites'}
                aria-pressed={isBookmarked}
                className="p-2.5 glass rounded-xl hover:bg-white/20 transition-colors"
              >
                {isBookmarked
                  ? <BookmarkCheck size={20} className="text-indigo-400" aria-hidden="true" />
                  : <Bookmark size={20} className="text-white" aria-hidden="true" />}
              </button>
            </div>
          </motion.div>

          {/* Rating + description + tags */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.1 }}
            className="glass rounded-2xl p-5 space-y-3"
          >
            <StarRating rating={business.rating} showCount={business.reviewCount} size={20} />
            <p className="text-slate-300">{business.description}</p>
            <div className="flex flex-wrap gap-2" role="list" aria-label="Business tags">
              {business.tags.map((tag) => (
                <span
                  key={tag}
                  role="listitem"
                  className="text-xs px-2.5 py-1 rounded-full border"
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
          </motion.div>

          {/* Contact & hours */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.15 }}
            className="glass rounded-2xl p-5 space-y-3"
            aria-label="Contact information"
          >
            <h2 className="font-bold text-white">Contact & Hours</h2>
            <div className="space-y-2 text-sm">
              <div className="flex items-center gap-2 text-slate-300">
                <MapPin size={15} className="flex-shrink-0" style={{ color: accentColor }} aria-hidden="true" />
                <span>{business.address}</span>
              </div>
              <div className="flex items-center gap-2 text-slate-300">
                <Phone size={15} className="flex-shrink-0" style={{ color: accentColor }} aria-hidden="true" />
                <a href={`tel:${business.phone}`} className="hover:text-indigo-400 transition-colors">
                  {business.phone}
                </a>
              </div>
              <div className="flex items-center gap-2 text-slate-300">
                <Clock size={15} className="flex-shrink-0" style={{ color: accentColor }} aria-hidden="true" />
                <span>{business.hours}</span>
              </div>
            </div>
          </motion.div>

          {/* 3D Location Pin + Mini Map */}
          <motion.section
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.18 }}
            className="glass rounded-2xl overflow-hidden"
            aria-labelledby="location-heading"
          >
            <div className="p-4 pb-0">
              <h2 id="location-heading" className="font-bold text-white flex items-center gap-2">
                <MapPin size={16} style={{ color: accentColor }} aria-hidden="true" />
                Location
              </h2>
            </div>

            {/* 3D pin + mini map side by side on wider screens */}
            <div className="flex flex-col sm:flex-row">
              {/* Three.js 3D pin */}
              <div className="sm:w-44 flex-shrink-0 flex items-center justify-center p-2">
                <Suspense fallback={<SpinnerBox height={200} />}>
                  <BusinessPin3D color={accentColor} emoji={category?.icon || '📍'} />
                </Suspense>
              </div>

              {/* Mini Leaflet map */}
              <div className="flex-1" style={{ minHeight: '220px' }}>
                <Suspense fallback={<SpinnerBox height={220} />}>
                  <MiniMap
                    coords={business.coords}
                    name={business.name}
                    color={accentColor}
                    emoji={category?.icon || '📍'}
                  />
                </Suspense>
              </div>
            </div>
          </motion.section>

          {/* Deals */}
          {business.deals.length > 0 && (
            <motion.section
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.2 }}
              aria-labelledby="deals-heading"
            >
              <h2 id="deals-heading" className="font-bold text-white mb-3 flex items-center gap-2">
                <Tag size={16} className="text-green-400" aria-hidden="true" />
                Current Deals & Coupons
              </h2>
              <div className="space-y-3">
                {business.deals.map((deal, i) => (
                  <DealCard key={deal.id} deal={deal} accentColor={accentColor} index={i} />
                ))}
              </div>
            </motion.section>
          )}

          {/* Reviews */}
          <section aria-labelledby="reviews-heading">
            <h2 id="reviews-heading" className="font-bold text-white mb-3 flex items-center gap-2">
              <Star size={16} className="text-amber-400" aria-hidden="true" />
              Reviews ({reviews.length})
            </h2>
            {reviews.length === 0 ? (
              <div className="glass rounded-2xl p-6 text-center text-slate-500">
                No reviews yet — be the first!
              </div>
            ) : (
              <div className="space-y-3" role="list" aria-label="Customer reviews">
                {reviews.map((r, i) => (
                  <div key={r.id} role="listitem">
                    <ReviewCard review={r} index={i} />
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>

        {/* ── RIGHT: review form ── */}
        <aside className="lg:col-span-1" aria-label="Submit a review">
          <div className="sticky top-24">
            <ReviewForm businessId={parseInt(id)} />
          </div>
        </aside>
      </div>
    </main>
  );
}
