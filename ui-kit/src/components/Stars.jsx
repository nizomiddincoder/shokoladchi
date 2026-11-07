import { Star } from 'lucide-react';

// Gold star rating row.
export default function Stars({ value, size = 12 }) {
  return (
    <div className="flex items-center gap-[2px]" aria-label={`${value} out of 5 stars`}>
      {[1, 2, 3, 4, 5].map((i) => (
        <Star
          key={i}
          size={size}
          className={i <= Math.round(value) ? 'text-gold' : 'text-[#D9D9DE]'}
          fill={i <= Math.round(value) ? 'currentColor' : 'none'}
          strokeWidth={1.5}
        />
      ))}
    </div>
  );
}
