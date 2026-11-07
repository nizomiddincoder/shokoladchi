// The Shokoladchi favicon mark, inlined as a React component so it can be
// used as the brand logo and as premium product placeholder imagery.
export default function BrandMark({ className = 'w-6 h-6' }) {
  return (
    <svg viewBox="0 0 64 64" className={className} role="img" aria-label="Shokoladchi">
      <rect width="64" height="64" rx="16" fill="#111111" />
      <g transform="rotate(-8 32 34)">
        <rect x="19" y="13" width="26" height="38" rx="6" fill="#8B5E3C" />
        <rect x="22.5" y="16.5" width="9" height="12" rx="2.5" fill="#A9744F" />
        <rect x="32.5" y="16.5" width="9" height="12" rx="2.5" fill="#A9744F" />
        <rect x="22.5" y="30.5" width="9" height="12" rx="2.5" fill="#A9744F" />
        <rect x="32.5" y="30.5" width="9" height="12" rx="2.5" fill="#A9744F" />
        <rect x="19" y="13" width="26" height="6" rx="6" fill="#ffffff" opacity="0.12" />
      </g>
    </svg>
  );
}
