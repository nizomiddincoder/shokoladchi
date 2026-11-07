import { Minus, Plus } from 'lucide-react';

// – 1 + quantity control.
export default function QuantityStepper({ value, onChange, small = false }) {
  return (
    <div
      className={`inline-flex items-center bg-white border border-[#E8E8EC] rounded-full ${
        small ? 'gap-1.5 px-1 py-0.5' : 'gap-2.5 px-1.5 py-1'
      }`}
    >
      <button
        onClick={() => onChange(Math.max(1, value - 1))}
        className={`grid place-items-center rounded-full text-ink active:scale-90 transition ${
          small ? 'w-6 h-6' : 'w-7 h-7'
        }`}
        aria-label="Decrease quantity"
      >
        <Minus size={small ? 12 : 14} />
      </button>
      <span className="text-[13px] font-semibold w-4 text-center">{value}</span>
      <button
        onClick={() => onChange(value + 1)}
        className={`grid place-items-center rounded-full bg-ink text-white active:scale-90 transition ${
          small ? 'w-6 h-6' : 'w-7 h-7'
        }`}
        aria-label="Increase quantity"
      >
        <Plus size={small ? 12 : 14} />
      </button>
    </div>
  );
}
