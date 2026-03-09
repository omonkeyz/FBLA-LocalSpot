import { useParams, Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  ArrowLeft, MapPin, Phone, Clock, Bookmark, BookmarkCheck,
  Tag, BadgeCheck, Star, Calendar,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import StarRating from '../components/StarRating';
import ReviewForm from '../components/ReviewForm';
import { CATEGORIES } from '../data/businesses';

function DealCard({ deal, index }) {
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
      className="glass rounded-xl p-4 border border-green-500/20"
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
            <span>Expires {new Date(deal.expires).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
          </div>
        </div>
        {deal.code && (
          <button
            onClick={copy}
            aria-label={copied ? 'Code copied!' : `Copy coupon code ${deal.code}`}
            className={`flex-shrink-0 px-3 py-1.5 rounded-lg text-xs font-bold border transition-all ${
              copied
                ? 'bg-green-600/20 border-green-500 text-green-400'
                : 'bg-white/5 border-white/10 text-slate-300 hover:border-green-500/50 hover:text-green-400'
            }`}
          >
            {copied ? '✓ Copied!' : deal.code}
          </button>
        )}
      </div>
    </motion.div>
  );
}

// Need to import useState for DealCard
import { useState } from 'react';

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

  return (
    <main className="min-h-screen pt-24 pb-16 px-4 max-w-4xl mx-auto" id="main-content">
      {/* Back button */}
      <motion.button
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        onClick={() => navigate(-1)}
        className="flex items-center gap-1.5 text-slate-400 hover:text-white text-sm mb-6 transition-colors"
        aria-label="Go back to previous page"
      >
        <ArrowLeft size={16} aria-hidden="true" />
        Back
      </motion.button>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* ── Left: Main Info ── */}
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
            <div className="absolute bottom-4 left-4 right-4">
              <div className="flex items-end justify-between">
                <div>
                  <h1 className="text-2xl font-black text-white">
                    {business.name}
                    {business.verified && (
                      <BadgeCheck size={20} className="inline ml-2 text-indigo-400" aria-label="Verified business" />
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
                  {isBookmarked ? (
                    <BookmarkCheck size={20} className="text-indigo-400" aria-hidden="true" />
                  ) : (
                    <Bookmark size={20} className="text-white" aria-hidden="true" />
                  )}
                </button>
              </div>
            </div>
          </motion.div>

          {/* Stars + tags */}
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
                  className="text-xs bg-indigo-950/60 text-indigo-300 border border-indigo-800/40 px-2.5 py-1 rounded-full"
                >
                  {tag}
                </span>
              ))}
            </div>
          </motion.div>

          {/* Contact info */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.15 }}
            className="glass rounded-2xl p-5 space-y-3"
            aria-label="Business contact information"
          >
            <h2 className="font-bold text-white">Contact & Hours</h2>
            <div className="space-y-2 text-sm">
              <div className="flex items-center gap-2 text-slate-300">
                <MapPin size={15} className="text-indigo-400 flex-shrink-0" aria-hidden="true" />
                <span>{business.address}</span>
              </div>
              <div className="flex items-center gap-2 text-slate-300">
                <Phone size={15} className="text-indigo-400 flex-shrink-0" aria-hidden="true" />
                <a href={`tel:${business.phone}`} className="hover:text-indigo-400 transition-colors" aria-label={`Call ${business.name} at ${business.phone}`}>
                  {business.phone}
                </a>
              </div>
              <div className="flex items-center gap-2 text-slate-300">
                <Clock size={15} className="text-indigo-400 flex-shrink-0" aria-hidden="true" />
                <span>{business.hours}</span>
              </div>
            </div>
          </motion.div>

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
                  <DealCard key={deal.id} deal={deal} index={i} />
                ))}
              </div>
            </motion.section>
          )}

          {/* Reviews section */}
          <section aria-labelledby="reviews-heading">
            <h2 id="reviews-heading" className="font-bold text-white mb-3 flex items-center gap-2">
              <Star size={16} className="text-amber-400" aria-hidden="true" />
              Reviews ({reviews.length})
            </h2>

            {reviews.length === 0 ? (
              <div className="glass rounded-2xl p-6 text-center text-slate-500">
                <p>No reviews yet. Be the first to leave one!</p>
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

        {/* ── Right: Review Form ── */}
        <aside className="lg:col-span-1" aria-label="Submit a review">
          <div className="sticky top-24">
            <ReviewForm businessId={parseInt(id)} />
          </div>
        </aside>
      </div>
    </main>
  );
}
