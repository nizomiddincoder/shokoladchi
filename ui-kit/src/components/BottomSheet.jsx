// Dimmed-overlay bottom sheet with slide-up animation.
export default function BottomSheet({ open, onClose, children }) {
  return (
    <div className={`absolute inset-0 z-40 ${open ? '' : 'pointer-events-none'}`}>
      <div
        onClick={onClose}
        className={`absolute inset-0 bg-black/45 transition-opacity duration-300 ${open ? 'opacity-100' : 'opacity-0'}`}
      />
      <div
        className={`absolute inset-x-0 bottom-0 bg-white rounded-t-[24px] p-5 pb-9 shadow-card transition-transform duration-300 ease-out ${
          open ? 'translate-y-0' : 'translate-y-full'
        }`}
      >
        <div className="w-10 h-1 rounded-full bg-[#E4E4E7] mx-auto mb-4" />
        {children}
      </div>
    </div>
  );
}
