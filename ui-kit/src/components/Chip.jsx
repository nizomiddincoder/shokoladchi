// Filter chip: selected = black fill / white text, unselected = white / gray border.
export default function Chip({ selected, onClick, children, className = '' }) {
  return (
    <button
      onClick={onClick}
      className={`shrink-0 inline-flex items-center justify-center gap-1 px-4 h-9 rounded-full text-[13px] font-medium transition-all duration-150 active:scale-95 ${
        selected ? 'bg-ink text-white shadow-card' : 'bg-white text-ink border border-[#E4E4E7]'
      } ${className}`}
    >
      {children}
    </button>
  );
}
