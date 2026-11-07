import { useEffect, useState } from 'react';
import { Star } from 'lucide-react';
import BottomSheet from './BottomSheet';
import Chip from './Chip';
import RangeSlider from './RangeSlider';
import { CATEGORIES, money } from '../data';

export const DEFAULT_FILTERS = { category: 'All', price: [0, 60], sort: 'Popular', rating: 0 };

const SORTS = ['Popular', 'Most Recent', 'Price High', 'Price Low'];
const RATINGS = [0, 1, 2, 3, 4, 5];

// Filter bottom sheet: category chips, price range, sort chips, rating chips, Reset/Apply.
export default function FilterSheet({ open, onClose, value, onApply }) {
  const [draft, setDraft] = useState(DEFAULT_FILTERS);
  useEffect(() => {
    if (open) setDraft(value);
  }, [open, value]);

  return (
    <BottomSheet open={open} onClose={onClose}>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-[18px] font-semibold">Filter</h2>
        <span className="text-[12px] text-mut">Refine your search</span>
      </div>

      <div className="space-y-4 max-h-[60vh] overflow-y-auto no-scrollbar pr-0.5">
        <div>
          <p className="text-[13px] font-semibold mb-2">Category</p>
          <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1 -mx-1 px-1">
            {CATEGORIES.map((c) => (
              <Chip key={c} selected={draft.category === c} onClick={() => setDraft({ ...draft, category: c })}>
                {c}
              </Chip>
            ))}
          </div>
        </div>

        <div>
          <div className="flex items-center justify-between mb-1">
            <p className="text-[13px] font-semibold">Price range</p>
            <p className="text-[12px] font-semibold">
              {money(draft.price[0])} <span className="text-mut font-normal">—</span> {money(draft.price[1])}
            </p>
          </div>
          <RangeSlider min={0} max={60} value={draft.price} onChange={(price) => setDraft({ ...draft, price })} />
          <div className="flex justify-between text-[11px] text-mut">
            <span>Min</span>
            <span>Max</span>
          </div>
        </div>

        <div>
          <p className="text-[13px] font-semibold mb-2">Sort by</p>
          <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1 -mx-1 px-1">
            {SORTS.map((s) => (
              <Chip key={s} selected={draft.sort === s} onClick={() => setDraft({ ...draft, sort: s })}>
                {s}
              </Chip>
            ))}
          </div>
        </div>

        <div>
          <p className="text-[13px] font-semibold mb-2">Rating</p>
          <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1 -mx-1 px-1">
            {RATINGS.map((r) => (
              <Chip key={r} selected={draft.rating === r} onClick={() => setDraft({ ...draft, rating: r })}>
                {r === 0 ? (
                  'All'
                ) : (
                  <>
                    <Star size={11} className="text-gold" fill="currentColor" strokeWidth={0} />
                    {r}
                  </>
                )}
              </Chip>
            ))}
          </div>
        </div>
      </div>

      <div className="flex gap-3 mt-5">
        <button
          onClick={() => setDraft(DEFAULT_FILTERS)}
          className="flex-1 h-[52px] rounded-[16px] bg-[#EDEDF0] text-ink text-[15px] font-semibold active:scale-[0.98] transition"
        >
          Reset
        </button>
        <button
          onClick={() => {
            onApply(draft);
            onClose();
          }}
          className="flex-[2] h-[52px] rounded-[16px] bg-ink text-white text-[15px] font-semibold active:scale-[0.98] transition"
        >
          Apply
        </button>
      </div>
    </BottomSheet>
  );
}
