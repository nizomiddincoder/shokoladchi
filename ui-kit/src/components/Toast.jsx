// Short confirmation toast, anchored near the bottom of the phone frame.
export default function Toast({ msg }) {
  if (!msg) return null;
  return (
    <div className="absolute left-1/2 bottom-36 z-50 animate-toast">
      <div className="bg-ink text-white text-[13px] font-medium px-5 py-3 rounded-full shadow-card whitespace-nowrap">
        {msg}
      </div>
    </div>
  );
}
