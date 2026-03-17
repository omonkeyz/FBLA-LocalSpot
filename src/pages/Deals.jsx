import { useState } from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { Tag, Calendar, Copy, Check, ArrowRight } from 'lucide-react';
import { useApp } from '../context/AppContext';

function DealItem({ deal, business, index }) {
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
    <motion.article
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, delay: index * 0.05 }}
      className="glass rounded-2xl p-5 card-hover border border-green-500/10 hover:border-green-500/30 transition-colors"
      aria-label={`Deal from ${business.name}: ${deal.title}`}
    >
      <div className="flex items-start gap-4">
        {/* Business image thumbnail */}
        <Link
          to={`/business/${business.id}`}
          aria-label={`View ${business.name}`}
          className="flex-shrink-0"
        >
          <img
            src={business.image}
            alt={`${business.name}`}
            className="w-16 h-16 rounded-xl object-cover hover:opacity-80 transition-opacity"
            loading="lazy"
          />
        </Link>

        <div className="flex-1 min-w-0">
          {/* Deal title */}
          <div className="flex items-center gap-1.5 mb-0.5">
            <Tag size={13} className="text-green-400 flex-shrink-0" aria-hidden="true" />
            <h3 className="font-bold text-green-400 text-sm truncate">{deal.title}</h3>
          </div>

          {/* Business name */}
          <Link
            to={`/business/${business.id}`}
            className="text-white font-semibold text-sm hover:text-indigo-400 transition-colors"
            aria-label={`View ${business.name} details`}
          >
            {business.name}
          </Link>

          {/* Description */}
          <p className="text-slate-400 text-sm mt-1">{deal.description}</p>

          {/* Expiry */}
          <div className="flex items-center gap-1 text-xs text-slate-500 mt-2">
            <Calendar size={11} aria-hidden="true" />
            <span>Expires {new Date(deal.expires).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
          </div>
        </div>

        {/* Right: code or arrow */}
        <div className="flex-shrink-0 flex flex-col items-end gap-2">
          {deal.code ? (
            <button
              onClick={copy}
              aria-label={copied ? 'Code copied to clipboard' : `Copy coupon code: ${deal.code}`}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold border transition-all ${
                copied
                  ? 'bg-green-600/20 border-green-500 text-green-400'
                  : 'bg-white/5 border-white/10 text-slate-300 hover:border-green-500/50 hover:text-green-400'
              }`}
            >
              {copied ? <Check size={12} aria-hidden="true" /> : <Copy size={12} aria-hidden="true" />}
              {copied ? 'Copied!' : deal.code}
            </button>
          ) : (
            <span className="text-xs text-slate-500 italic">No code needed</span>
          )}
          <Link
            to={`/business/${business.id}`}
            className="text-indigo-400 hover:text-indigo-300 transition-colors"
            aria-label={`View all deals at ${business.name}`}
          >
            <ArrowRight size={14} aria-hidden="true" />
          </Link>
        </div>
      </div>
    </motion.article>
  );
}

export default function Deals() {
  const { businesses } = useApp();

  // Flatten all deals with their businesses
  const allDeals = businesses.flatMap((b) =>
    b.deals.map((d) => ({ deal: d, business: b }))
  );

  // Check for expiry
  const now = new Date();
  const activeDeals = allDeals.filter(({ deal }) => new Date(deal.expires) >= now);

  return (
    <main className="min-h-screen pt-24 pb-16 px-4 max-w-3xl mx-auto" id="main-content">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-8"
      >
        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 rounded-xl bg-green-600/20 flex items-center justify-center">
            <Tag size={20} className="text-green-400" aria-hidden="true" />
          </div>
          <h1 className="text-3xl font-black text-white">Deals & Coupons</h1>
        </div>
        <p className="text-slate-400 text-sm">
          Exclusive offers from local businesses — copy a coupon code or just mention the deal!
        </p>
      </motion.div>

      {/* Stats row */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.1 }}
        className="glass rounded-2xl p-4 mb-6 flex items-center justify-center gap-6"
        aria-label="Deal statistics"
      >
        <div className="text-center">
          <p className="text-2xl font-bold text-green-400">{activeDeals.length}</p>
          <p className="text-slate-400 text-xs">Active Deals</p>
        </div>
        <div className="w-px h-8 bg-white/10" aria-hidden="true" />
        <div className="text-center">
          <p className="text-2xl font-bold text-white">{new Set(activeDeals.map((d) => d.business.id)).size}</p>
          <p className="text-slate-400 text-xs">Participating Businesses</p>
        </div>
        <div className="w-px h-8 bg-white/10" aria-hidden="true" />
        <div className="text-center">
          <p className="text-2xl font-bold text-indigo-400">
            {activeDeals.filter((d) => d.deal.code).length}
          </p>
          <p className="text-slate-400 text-xs">Copy-Code Deals</p>
        </div>
      </motion.div>

      {/* Deals list */}
      {activeDeals.length > 0 ? (
        <div className="space-y-4" role="list" aria-label="All active deals">
          {activeDeals.map(({ deal, business }, i) => (
            <div key={deal.id} role="listitem">
              <DealItem deal={deal} business={business} index={i} />
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-20 text-slate-500" role="status">
          <Tag size={40} className="mx-auto mb-4 opacity-30" aria-hidden="true" />
          <p>No active deals right now. Check back soon!</p>
        </div>
      )}
    </main>
  );
}
