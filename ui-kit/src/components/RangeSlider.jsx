// Dual-thumb price range slider (min / max labels rendered by the parent).
export default function RangeSlider({ min, max, value, onChange }) {
  const [lo, hi] = value;
  const pct = (v) => ((v - min) / (max - min)) * 100;
  return (
    <div className="relative h-6 flex items-center">
      <div className="absolute inset-x-0 h-1 bg-[#E9E9EC] rounded-full" />
      <div
        className="absolute h-1 bg-ink rounded-full"
        style={{ left: `${pct(lo)}%`, right: `${100 - pct(hi)}%` }}
      />
      <input
        type="range"
        min={min}
        max={max}
        value={lo}
        onChange={(e) => onChange([Math.min(+e.target.value, hi - 1), hi])}
        className="range-thumb"
        style={{ zIndex: lo > (min + max) / 2 ? 3 : 1 }}
        aria-label="Minimum price"
      />
      <input
        type="range"
        min={min}
        max={max}
        value={hi}
        onChange={(e) => onChange([lo, Math.max(+e.target.value, lo + 1)])}
        className="range-thumb"
        style={{ zIndex: lo > (min + max) / 2 ? 1 : 2 }}
        aria-label="Maximum price"
      />
    </div>
  );
}
