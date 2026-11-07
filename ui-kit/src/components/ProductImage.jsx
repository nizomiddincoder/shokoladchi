import BrandMark from './BrandMark';

// Premium placeholder "photo": brand favicon mark on a warm gradient tile.
export default function ProductImage({ product, className = 'aspect-square rounded-[16px]', mark = 'w-1/3 h-1/3' }) {
  return (
    <div
      className={`relative overflow-hidden shrink-0 ${className}`}
      style={{ background: `linear-gradient(140deg, ${product.c1} 0%, ${product.c2} 100%)` }}
    >
      <div
        className="absolute inset-0"
        style={{ background: 'radial-gradient(120% 90% at 25% 18%, rgba(255,255,255,0.30), transparent 55%)' }}
      />
      <div className="absolute -right-4 -bottom-6 opacity-[0.16]">
        <BrandMark className="w-24 h-24" />
      </div>
      <div className="absolute inset-0 grid place-items-center">
        <BrandMark className={mark} />
      </div>
    </div>
  );
}
