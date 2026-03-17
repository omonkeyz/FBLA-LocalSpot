import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowRight, MapPin, Star, Tag, TrendingUp } from 'lucide-react';
import { useApp } from '../context/AppContext';
import BusinessCard from '../components/BusinessCard';
import SearchBar from '../components/SearchBar';

// Animated floating orbs for background decoration
function FloatingOrb({ className, delay = 0 }) {
  return (
    <motion.div
      className={`absolute rounded-full blur-3xl opacity-20 pointer-events-none ${className}`}
      animate={{ y: [0, -20, 0], scale: [1, 1.05, 1] }}
      transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut', delay }}
      aria-hidden="true"
    />
  );
}

// Stat counter card
function StatCard({ icon: Icon, value, label }) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      whileInView={{ opacity: 1, scale: 1 }}
      viewport={{ once: true }}
      className="glass rounded-2xl p-5 text-center"
    >
      <div className="w-10 h-10 mx-auto mb-3 rounded-xl bg-indigo-600/20 flex items-center justify-center">
        <Icon size={20} className="text-indigo-400" aria-hidden="true" />
      </div>
      <p className="text-3xl font-bold text-white">{value}</p>
      <p className="text-slate-400 text-sm mt-1">{label}</p>
    </motion.div>
  );
}

export default function Home() {
  const { businesses, setSearchQuery, setActiveCategory } = useApp();
  const featured = businesses.filter((b) => b.featured).slice(0, 3);

  return (
    <main className="min-h-screen" id="main-content">
      {/* ── Hero Section ── */}
      <section
        className="relative min-h-screen flex flex-col items-center justify-center px-4 pt-24 pb-16 overflow-hidden"
        aria-labelledby="hero-heading"
      >
        {/* Background orbs */}
        <FloatingOrb className="w-96 h-96 bg-indigo-600 -top-20 -left-20" delay={0} />
        <FloatingOrb className="w-80 h-80 bg-purple-600 top-1/4 right-0" delay={2} />
        <FloatingOrb className="w-64 h-64 bg-cyan-500 bottom-0 left-1/3" delay={4} />

        {/* Pill badge */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="flex items-center gap-2 glass px-4 py-2 rounded-full text-sm text-indigo-300 mb-6"
          role="banner"
          aria-label="App tagline"
        >
          <MapPin size={14} aria-hidden="true" />
          <span>Discover businesses in your community</span>
        </motion.div>

        {/* Heading */}
        <motion.h1
          id="hero-heading"
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.1 }}
          className="text-5xl sm:text-7xl font-black text-center mb-4 leading-tight"
        >
          Find & Support{' '}
          <span className="gradient-text">Local Businesses</span>
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="text-slate-400 text-lg text-center max-w-xl mb-8"
        >
          LocalSpot connects you with the best small businesses in your community. Discover, review, and support the shops that make your city unique.
        </motion.p>

        {/* Search bar */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.3 }}
          className="w-full max-w-xl mb-6"
        >
          <SearchBar placeholder="Search local gems..." />
        </motion.div>

        {/* CTA buttons */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.4 }}
          className="flex gap-3 flex-wrap justify-center"
        >
          <Link
            to="/browse"
            className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white px-6 py-3 rounded-xl font-semibold transition-all hover:scale-105 hover:shadow-lg hover:shadow-indigo-500/30"
            onClick={() => { setSearchQuery(''); setActiveCategory('all'); }}
            aria-label="Browse all local businesses"
          >
            Browse All
            <ArrowRight size={16} aria-hidden="true" />
          </Link>
          <Link
            to="/deals"
            className="flex items-center gap-2 glass hover:bg-white/10 text-white px-6 py-3 rounded-xl font-semibold transition-all hover:scale-105"
            aria-label="View current deals and coupons"
          >
            <Tag size={16} aria-hidden="true" />
            View Deals
          </Link>
        </motion.div>
      </section>

      {/* ── Stats Section ── */}
      <section className="max-w-4xl mx-auto px-4 pb-16 grid grid-cols-2 sm:grid-cols-4 gap-4" aria-label="App statistics">
        <StatCard icon={MapPin} value={`${businesses.length}+`} label="Local Businesses" />
        <StatCard icon={Star} value="4.7" label="Avg. Rating" />
        <StatCard icon={Tag} value={`${businesses.reduce((n, b) => n + b.deals.length, 0)}+`} label="Active Deals" />
        <StatCard icon={TrendingUp} value="100%" label="Community Powered" />
      </section>

      {/* ── Featured Businesses ── */}
      <section className="max-w-6xl mx-auto px-4 pb-20" aria-labelledby="featured-heading">
        <div className="flex items-center justify-between mb-6">
          <h2 id="featured-heading" className="text-2xl font-bold text-white">
            ⭐ Featured Businesses
          </h2>
          <Link
            to="/browse"
            className="text-indigo-400 hover:text-indigo-300 text-sm flex items-center gap-1 transition-colors"
            aria-label="See all businesses"
          >
            See all <ArrowRight size={14} aria-hidden="true" />
          </Link>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6" role="list" aria-label="Featured businesses">
          {featured.map((biz, i) => (
            <div key={biz.id} role="listitem">
              <BusinessCard business={biz} index={i} />
            </div>
          ))}
        </div>
      </section>

      {/* ── How It Works ── */}
      <section className="max-w-4xl mx-auto px-4 pb-24 text-center" aria-labelledby="how-heading">
        <motion.h2
          id="how-heading"
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          className="text-2xl font-bold text-white mb-10"
        >
          How LocalSpot Works
        </motion.h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
          {[
            { step: '1', icon: '🔍', title: 'Discover', desc: 'Search and filter local businesses by category, rating, or name.' },
            { step: '2', icon: '⭐', title: 'Review', desc: 'Leave honest reviews and ratings to help others and support quality businesses.' },
            { step: '3', icon: '💚', title: 'Support', desc: 'Bookmark your favorites, grab deals, and keep your community thriving.' },
          ].map(({ step, icon, title, desc }, i) => (
            <motion.div
              key={step}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.15 }}
              className="glass rounded-2xl p-6"
            >
              <div className="text-4xl mb-3" aria-hidden="true">{icon}</div>
              <h3 className="font-bold text-white text-lg mb-2">{title}</h3>
              <p className="text-slate-400 text-sm">{desc}</p>
            </motion.div>
          ))}
        </div>
      </section>
    </main>
  );
}
