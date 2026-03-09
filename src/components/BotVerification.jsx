import { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ShieldCheck, RefreshCw, AlertCircle } from 'lucide-react';

/**
 * BotVerification — simple math CAPTCHA to prevent bot activity.
 * Calls onVerified() when the user answers correctly.
 */
export default function BotVerification({ onVerified }) {
  const generateChallenge = useCallback(() => {
    const a = Math.floor(Math.random() * 10) + 1;
    const b = Math.floor(Math.random() * 10) + 1;
    const ops = [
      { op: '+', answer: a + b, label: `${a} + ${b}` },
      { op: '-', answer: a + b - b, label: `${a + b} - ${b}` },
      { op: '×', answer: a * b, label: `${a} × ${b}` },
    ];
    // Pick random op
    const chosen = ops[Math.floor(Math.random() * ops.length)];
    return { question: `What is ${chosen.label}?`, answer: chosen.answer };
  }, []);

  const [challenge, setChallenge] = useState(generateChallenge);
  const [input, setInput] = useState('');
  const [error, setError] = useState('');
  const [attempts, setAttempts] = useState(0);

  const refresh = () => {
    setChallenge(generateChallenge());
    setInput('');
    setError('');
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const userAnswer = parseInt(input, 10);
    if (isNaN(userAnswer)) {
      setError('Please enter a number.');
      return;
    }
    if (userAnswer === challenge.answer) {
      setError('');
      onVerified();
    } else {
      setAttempts((n) => n + 1);
      setError(`Incorrect answer. Please try again.${attempts >= 1 ? ' Hint: check your math!' : ''}`);
      setInput('');
      // Refresh challenge after 2 wrong attempts
      if (attempts >= 1) refresh();
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="glass rounded-2xl p-6 border border-indigo-500/20"
      role="region"
      aria-labelledby="captcha-heading"
    >
      <div className="flex items-center gap-2 mb-4">
        <div className="w-8 h-8 rounded-lg bg-indigo-600/20 flex items-center justify-center">
          <ShieldCheck size={16} className="text-indigo-400" aria-hidden="true" />
        </div>
        <h3 id="captcha-heading" className="font-semibold text-white text-sm">
          Verify you're human
        </h3>
      </div>

      <p className="text-slate-400 text-sm mb-4">
        Please solve this quick math problem before submitting your review.
      </p>

      <form onSubmit={handleSubmit} noValidate>
        <div className="glass rounded-xl p-4 mb-4 text-center">
          <p className="text-indigo-300 font-bold text-xl" aria-live="polite">
            {challenge.question}
          </p>
        </div>

        <div className="flex gap-2 mb-3">
          <div className="flex-1">
            <label htmlFor="captcha-input" className="sr-only">
              Your answer to the verification question
            </label>
            <input
              id="captcha-input"
              type="number"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Your answer"
              required
              autoComplete="off"
              aria-describedby={error ? 'captcha-error' : undefined}
              aria-invalid={!!error}
              className="w-full px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white placeholder-slate-500 text-sm focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 transition-all"
            />
          </div>
          <button
            type="button"
            onClick={refresh}
            aria-label="Get a new verification question"
            className="p-2.5 glass rounded-xl hover:bg-white/10 transition-colors text-slate-400 hover:text-white"
          >
            <RefreshCw size={16} aria-hidden="true" />
          </button>
        </div>

        <AnimatePresence>
          {error && (
            <motion.p
              id="captcha-error"
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="text-red-400 text-xs flex items-center gap-1.5 mb-3"
              role="alert"
              aria-live="assertive"
            >
              <AlertCircle size={12} aria-hidden="true" />
              {error}
            </motion.p>
          )}
        </AnimatePresence>

        <button
          type="submit"
          className="w-full bg-indigo-600 hover:bg-indigo-500 text-white py-2.5 rounded-xl text-sm font-semibold transition-all hover:shadow-lg hover:shadow-indigo-500/20"
          aria-label="Submit verification answer"
        >
          Verify & Submit Review
        </button>
      </form>
    </motion.div>
  );
}
