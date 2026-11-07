// iOS-style status bar shown on every screen.
function SignalIcon() {
  return (
    <svg width="17" height="12" viewBox="0 0 17 12" fill="currentColor" aria-hidden>
      <rect x="0" y="7" width="3" height="5" rx="1" />
      <rect x="4.5" y="5" width="3" height="7" rx="1" />
      <rect x="9" y="2.5" width="3" height="9.5" rx="1" />
      <rect x="13.5" y="0" width="3" height="12" rx="1" />
    </svg>
  );
}

function BatteryIcon() {
  return (
    <svg width="25" height="12" viewBox="0 0 25 12" fill="none" aria-hidden>
      <rect x="0.5" y="0.5" width="21" height="11" rx="3.5" stroke="currentColor" opacity="0.4" />
      <rect x="2" y="2" width="18" height="8" rx="2" fill="currentColor" />
      <path d="M23.5 4v4c1-.3 1.5-1 1.5-2s-.5-1.7-1.5-2z" fill="currentColor" opacity="0.4" />
    </svg>
  );
}

export default function StatusBar() {
  return (
    <div className="relative z-20 flex items-center justify-between px-7 pt-3.5 pb-1 text-ink">
      <span className="text-[14px] font-semibold tracking-wide">9:41</span>
      <div className="flex items-center gap-1.5">
        <SignalIcon />
        <svg width="16" height="12" viewBox="0 0 16 12" fill="currentColor" aria-hidden>
          <path d="M8 9.6a1.7 1.7 0 1 0 0 3.4 1.7 1.7 0 0 0 0-3.4z" transform="translate(0,-1.4)" />
          <path d="M8 5.4c1.6 0 3 .6 4.1 1.6l-1.4 1.5A3.9 3.9 0 0 0 8 7.4c-1 0-2 .4-2.7 1.1L3.9 7A5.9 5.9 0 0 1 8 5.4z" transform="translate(0,-1.4)" />
          <path d="M8 1.4c2.7 0 5.1 1 6.9 2.7l-1.4 1.4A7.9 7.9 0 0 0 8 3.4c-2.1 0-4.1.8-5.5 2.1L1.1 4.1A9.9 9.9 0 0 1 8 1.4z" transform="translate(0,-1.4)" />
        </svg>
        <BatteryIcon />
      </div>
    </div>
  );
}
