import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle, User } from 'lucide-react';
import StarRating from './StarRating';
import BotVerification from './BotVerification';
import { useApp } from '../context/AppContext';

export default function ReviewForm({ businessId }) {
  const { addReview } = useApp();

  const [step, setStep] = useState('form'); // 'form' | 'verify' | 'done'
  const [formData, setFormData] = useState({ name: '', rating: 0, text: '' });
  const [errors, setErrors] = useState({});

  const validate = () => {
    const e = {};
    if (!formData.name.trim()) e.name = 'Name is required.';
    if (formData.rating === 0) e.rating = 'Please select a rating.';
    if (formData.text.trim().length < 10) e.text = 'Review must be at least 10 characters.';
    return e;
  };

  const handleContinue = (e) => {
    e.preventDefault();
    const e2 = validate();
    if (Object.keys(e2).length > 0) {
      setErrors(e2);
      return;
    }
    setErrors({});
    setStep('verify');
  };

  const handleVerified = () => {
    addReview(businessId, {
      id: Date.now(),
      author: formData.name.trim(),
      rating: formData.rating,
      text: formData.text.trim(),
      date: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
    });
    setStep('done');
  };

  if (step === 'done') {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="glass rounded-2xl p-6 text-center"
        role="status"
        aria-live="polite"
      >
        <CheckCircle size={40} className="text-green-400 mx-auto mb-3" aria-hidden="true" />
        <h3 className="font-bold text-white text-lg mb-1">Review Submitted!</h3>
        <p className="text-slate-400 text-sm">Thank you for helping the community, {formData.name}!</p>
      </motion.div>
    );
  }

  if (step === 'verify') {
    return <BotVerification onVerified={handleVerified} />;
  }

  return (
    <motion.form
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      onSubmit={handleContinue}
      noValidate
      className="glass rounded-2xl p-6 space-y-4"
      aria-label="Leave a review form"
    >
      <h3 className="font-bold text-white text-lg">Write a Review</h3>

      {/* Name field */}
      <div>
        <label htmlFor="review-name" className="block text-sm text-slate-300 mb-1.5 font-medium">
          Your Name <span className="text-red-400" aria-hidden="true">*</span>
        </label>
        <div className="relative">
          <User size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" aria-hidden="true" />
          <input
            id="review-name"
            type="text"
            value={formData.name}
            onChange={(e) => setFormData((p) => ({ ...p, name: e.target.value }))}
            placeholder="Jane Smith"
            maxLength={60}
            required
            aria-required="true"
            aria-invalid={!!errors.name}
            aria-describedby={errors.name ? 'name-error' : undefined}
            className={`w-full pl-9 pr-4 py-2.5 rounded-xl bg-white/5 border text-white placeholder-slate-500 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 transition-all ${
              errors.name ? 'border-red-500 focus:border-red-500' : 'border-white/10 focus:border-indigo-500'
            }`}
          />
        </div>
        <AnimatePresence>
          {errors.name && (
            <motion.p
              id="name-error"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="text-red-400 text-xs mt-1"
              role="alert"
            >
              {errors.name}
            </motion.p>
          )}
        </AnimatePresence>
      </div>

      {/* Star rating */}
      <div>
        <label className="block text-sm text-slate-300 mb-1.5 font-medium" id="rating-label">
          Rating <span className="text-red-400" aria-hidden="true">*</span>
        </label>
        <div aria-labelledby="rating-label">
          <StarRating
            rating={formData.rating}
            interactive
            onChange={(r) => setFormData((p) => ({ ...p, rating: r }))}
            size={28}
          />
        </div>
        <AnimatePresence>
          {errors.rating && (
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="text-red-400 text-xs mt-1"
              role="alert"
            >
              {errors.rating}
            </motion.p>
          )}
        </AnimatePresence>
      </div>

      {/* Review text */}
      <div>
        <label htmlFor="review-text" className="block text-sm text-slate-300 mb-1.5 font-medium">
          Your Review <span className="text-red-400" aria-hidden="true">*</span>
        </label>
        <textarea
          id="review-text"
          value={formData.text}
          onChange={(e) => setFormData((p) => ({ ...p, text: e.target.value }))}
          placeholder="Share your experience with this business..."
          rows={4}
          maxLength={500}
          required
          aria-required="true"
          aria-invalid={!!errors.text}
          aria-describedby={errors.text ? 'text-error' : 'char-count'}
          className={`w-full px-4 py-2.5 rounded-xl bg-white/5 border text-white placeholder-slate-500 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 transition-all resize-none ${
            errors.text ? 'border-red-500 focus:border-red-500' : 'border-white/10 focus:border-indigo-500'
          }`}
        />
        <div className="flex justify-between items-center mt-1">
          <AnimatePresence>
            {errors.text && (
              <motion.p
                id="text-error"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="text-red-400 text-xs"
                role="alert"
              >
                {errors.text}
              </motion.p>
            )}
          </AnimatePresence>
          <p id="char-count" className="text-slate-500 text-xs ml-auto" aria-live="polite">
            {formData.text.length}/500
          </p>
        </div>
      </div>

      <button
        type="submit"
        className="w-full bg-indigo-600 hover:bg-indigo-500 text-white py-2.5 rounded-xl text-sm font-semibold transition-all hover:shadow-lg hover:shadow-indigo-500/20"
      >
        Continue to Verification →
      </button>
    </motion.form>
  );
}
