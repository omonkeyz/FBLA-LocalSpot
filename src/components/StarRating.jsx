import { useState } from 'react';
import { Star } from 'lucide-react';

/**
 * StarRating component — displays read-only or interactive star ratings.
 * Props:
 *  - rating: number (0–5)
 *  - max: number (default 5)
 *  - interactive: bool — allow clicking to set rating
 *  - onChange: fn(newRating) — called when interactive and star clicked
 *  - size: number — icon size in px (default 16)
 *  - showCount: number — optional review count to display
 */
export default function StarRating({
  rating = 0,
  max = 5,
  interactive = false,
  onChange,
  size = 16,
  showCount,
}) {
  const [hovered, setHovered] = useState(0);

  const displayRating = interactive && hovered ? hovered : rating;

  return (
    <div
      className="flex items-center gap-1"
      role={interactive ? 'group' : undefined}
      aria-label={interactive ? 'Rate this business' : `Rating: ${rating} out of 5`}
    >
      {Array.from({ length: max }, (_, i) => {
        const starValue = i + 1;
        const filled = displayRating >= starValue;
        const halfFilled = !filled && displayRating >= starValue - 0.5;

        return (
          <button
            key={i}
            type={interactive ? 'button' : undefined}
            role={interactive ? 'radio' : undefined}
            aria-checked={interactive ? rating === starValue : undefined}
            aria-label={interactive ? `${starValue} star${starValue > 1 ? 's' : ''}` : undefined}
            disabled={!interactive}
            onClick={() => interactive && onChange?.(starValue)}
            onMouseEnter={() => interactive && setHovered(starValue)}
            onMouseLeave={() => interactive && setHovered(0)}
            className={`transition-transform ${interactive ? 'cursor-pointer hover:scale-125 focus:outline-none focus:ring-2 focus:ring-indigo-400 rounded' : 'cursor-default'}`}
          >
            <Star
              size={size}
              className={`transition-colors ${
                filled
                  ? 'text-amber-400 fill-amber-400'
                  : halfFilled
                  ? 'text-amber-300 fill-amber-200'
                  : 'text-slate-600'
              }`}
              aria-hidden="true"
            />
          </button>
        );
      })}
      {typeof showCount === 'number' && (
        <span className="text-slate-400 text-sm ml-1" aria-label={`${showCount} reviews`}>
          ({showCount})
        </span>
      )}
      {!interactive && rating > 0 && (
        <span className="text-amber-400 text-sm font-semibold ml-0.5">{rating.toFixed(1)}</span>
      )}
    </div>
  );
}
