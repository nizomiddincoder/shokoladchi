// Selectable card with a radio indicator on the right.
export default function RadioCard({ selected, onClick, children, className = '' }) {
  return (
    <button
      onClick={onClick}
      className={`w-full text-left flex items-center gap-3 bg-white rounded-[16px] px-4 py-4 border shadow-soft transition-all active:scale-[0.99] ${
        selected ? 'border-ink ring-1 ring-ink' : 'border-[#ECECEE]'
      } ${className}`}
    >
      <div className="flex-1 min-w-0">{children}</div>
      <span
        className={`shrink-0 w-5 h-5 rounded-full border-2 grid place-items-center transition ${
          selected ? 'border-ink' : 'border-[#D6D6DB]'
        }`}
      >
        {selected && <span className="w-2.5 h-2.5 rounded-full bg-ink" />}
      </span>
    </button>
  );
}
