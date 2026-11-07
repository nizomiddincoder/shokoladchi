// 390x844 iPhone frame on desktop; full-screen app on real mobile devices.
export default function PhoneFrame({ children }) {
  return (
    <div
      className="relative w-full h-[100dvh] sm:w-[390px] sm:h-[844px] sm:max-h-[92vh] sm:rounded-[54px]
                 sm:border-[12px] sm:border-black overflow-hidden bg-paper
                 sm:shadow-[0_40px_120px_rgba(0,0,0,0.6)]"
    >
      {/* Dynamic island */}
      <div className="hidden sm:block absolute top-[10px] left-1/2 -translate-x-1/2 w-[120px] h-[30px] bg-black rounded-full z-40 pointer-events-none" />
      <div className="h-full">{children}</div>
      {/* Home indicator */}
      <div className="hidden sm:block absolute bottom-2 left-1/2 -translate-x-1/2 w-[130px] h-[5px] bg-black/80 rounded-full z-40 pointer-events-none" />
    </div>
  );
}
