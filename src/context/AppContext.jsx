import { createContext, useContext, useState, useEffect } from 'react';
import { INITIAL_BUSINESSES } from '../data/businesses';

const AppContext = createContext(null);

export function AppProvider({ children }) {
  // Business data — allow adding new businesses
  const [businesses, setBusinesses] = useState(() => {
    const stored = localStorage.getItem('businesses');
    return stored ? JSON.parse(stored) : INITIAL_BUSINESSES;
  });

  // Reviews stored as { [businessId]: [{ id, author, rating, text, date }] }
  const [reviews, setReviews] = useState(() => {
    const stored = localStorage.getItem('reviews');
    return stored ? JSON.parse(stored) : {};
  });

  // Bookmarks — set of business IDs
  const [bookmarks, setBookmarks] = useState(() => {
    const stored = localStorage.getItem('bookmarks');
    return stored ? new Set(JSON.parse(stored)) : new Set();
  });

  // Search query
  const [searchQuery, setSearchQuery] = useState('');

  // Active category filter
  const [activeCategory, setActiveCategory] = useState('all');

  // Sort mode
  const [sortBy, setSortBy] = useState('rating'); // 'rating' | 'reviews' | 'name'

  // Persist to localStorage
  useEffect(() => {
    localStorage.setItem('businesses', JSON.stringify(businesses));
  }, [businesses]);

  useEffect(() => {
    localStorage.setItem('reviews', JSON.stringify(reviews));
  }, [reviews]);

  useEffect(() => {
    localStorage.setItem('bookmarks', JSON.stringify([...bookmarks]));
  }, [bookmarks]);

  // Toggle bookmark
  const toggleBookmark = (id) => {
    setBookmarks((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  // Add a review — idempotent: deduplicates by review ID to handle React StrictMode double-invoke
  const addReview = (businessId, review) => {
    setReviews((prev) => {
      const existing = prev[businessId] || [];
      // Guard: don't add duplicate review (StrictMode runs updaters twice in dev)
      if (existing.some((r) => r.id === review.id)) return prev;
      const newReviews = [review, ...existing];
      // Compute weighted average against the original base data so stat is idempotent
      const base = INITIAL_BUSINESSES.find((b) => b.id === businessId);
      const baseCount = base?.reviewCount ?? 0;
      const baseRating = base?.rating ?? 0;
      const userSum = newReviews.reduce((sum, r) => sum + r.rating, 0);
      const totalCount = baseCount + newReviews.length;
      const weightedAvg = (baseRating * baseCount + userSum) / totalCount;
      setBusinesses((prevBiz) =>
        prevBiz.map((b) =>
          b.id === businessId
            ? { ...b, rating: Math.round(weightedAvg * 10) / 10, reviewCount: totalCount }
            : b
        )
      );
      return { ...prev, [businessId]: newReviews };
    });
  };

  // Get reviews for a business
  const getReviews = (businessId) => reviews[businessId] || [];

  // Get a single business by ID
  const getBusiness = (id) => businesses.find((b) => b.id === parseInt(id));

  // Filtered + sorted businesses
  const filteredBusinesses = businesses
    .filter((b) => {
      const matchCat = activeCategory === 'all' || b.category === activeCategory;
      const matchSearch =
        !searchQuery ||
        b.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        b.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
        b.tags.some((t) => t.toLowerCase().includes(searchQuery.toLowerCase()));
      return matchCat && matchSearch;
    })
    .sort((a, b) => {
      if (sortBy === 'rating') return b.rating - a.rating;
      if (sortBy === 'reviews') return b.reviewCount - a.reviewCount;
      if (sortBy === 'name') return a.name.localeCompare(b.name);
      return 0;
    });

  // Bookmarked businesses
  const bookmarkedBusinesses = businesses.filter((b) => bookmarks.has(b.id));

  return (
    <AppContext.Provider
      value={{
        businesses,
        filteredBusinesses,
        bookmarkedBusinesses,
        bookmarks,
        toggleBookmark,
        reviews,
        addReview,
        getReviews,
        getBusiness,
        searchQuery,
        setSearchQuery,
        activeCategory,
        setActiveCategory,
        sortBy,
        setSortBy,
      }}
    >
      {children}
    </AppContext.Provider>
  );
}

export const useApp = () => {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used within AppProvider');
  return ctx;
};
