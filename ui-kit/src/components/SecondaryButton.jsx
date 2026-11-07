// Light-gray secondary button.
export default function SecondaryButton({ children, onClick, className = '' }) {
  return (
    <button
      onClick={onClick}
      className={`w-full h-[52px] rounded-[16px] bg-[#EDEDF0] text-ink text-[15px] font-semibold active:scale-[0.98] transition ${className}`}
    >
      {children}
    </button>
  );
}
