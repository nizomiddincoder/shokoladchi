// Circular top-bar action button with optional count badge.
export default function TopIcon({ children, onClick, badge = 0, label }) {
  return (
    <button
      onClick={onClick}
      aria-label={label}
      className="relative w-10 h-10 grid place-items-center rounded-full bg-white shadow-soft border border-black/5 active:scale-95 transition"
    >
      {children}
      {badge > 0 && (
        <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full bg-ink text-white text-[10px] font-bold grid place-items-center border-2 border-paper">
          {badge}
        </span>
      )}
    </button>
  );
}
