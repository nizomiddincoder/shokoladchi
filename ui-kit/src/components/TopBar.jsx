import { ArrowLeft } from 'lucide-react';
import BrandMark from './BrandMark';

// Top bar: back button (or brand mark on home) left, title centered, actions right.
export default function TopBar({ title, sub, onBack, right, center = true }) {
  return (
    <div className="relative z-20 flex items-center justify-between px-4 py-2">
      {onBack ? (
        <button
          onClick={onBack}
          className="w-10 h-10 shrink-0 grid place-items-center rounded-full bg-white shadow-soft border border-black/5 active:scale-95 transition"
          aria-label="Back"
        >
          <ArrowLeft size={19} />
        </button>
      ) : (
        <div className="w-10 h-10 shrink-0 grid place-items-center rounded-[13px] bg-ink shadow-card">
          <BrandMark className="w-6 h-6" />
        </div>
      )}

      <div className={`absolute left-1/2 -translate-x-1/2 ${center ? 'text-center' : ''} w-[55%] pointer-events-none`}>
        <h1 className="text-[17px] font-semibold leading-tight truncate">{title}</h1>
        {sub && <p className="text-[11px] text-mut leading-tight">{sub}</p>}
      </div>

      <div className="flex items-center gap-2 min-w-[40px] justify-end shrink-0">{right}</div>
    </div>
  );
}
