import { Heart, Clock } from 'lucide-react';
import ProductImage from './ProductImage';
import Stars from './Stars';
import { money } from '../data';

// 2-column grid product card: image, heart, name, rating, delivery, price.
export default function ProductCard({ product, onOpen, liked, onLike }) {
  return (
    <div
      onClick={onOpen}
      className="bg-white rounded-[18px] p-2.5 shadow-soft cursor-pointer active:scale-[0.98] transition-transform"
    >
      <div className="relative">
        <ProductImage product={product} className="aspect-square rounded-[14px]" />
        <button
          onClick={(e) => {
            e.stopPropagation();
            onLike();
          }}
          aria-label="Toggle favorite"
          className="absolute top-2 right-2 w-8 h-8 rounded-full bg-white/95 grid place-items-center shadow-soft active:scale-90 transition"
        >
          <Heart size={15} className={liked ? 'fill-red-500 text-red-500' : 'text-ink'} />
        </button>
      </div>
      <div className="pt-2 px-0.5 pb-0.5">
        <h3 className="text-[13px] font-medium leading-tight truncate">{product.name}</h3>
        <div className="flex items-center gap-1 mt-1">
          <Stars value={product.rating} />
          <span className="text-[11px] text-mut">{product.rating}</span>
        </div>
        <div className="flex items-center gap-1 mt-0.5 text-[11px] text-mut">
          <Clock size={11} />
          {product.delivery}
        </div>
        <div className="flex items-baseline gap-1.5 mt-1.5">
          <span className="text-[15px] font-bold">{money(product.price)}</span>
          {product.oldPrice && (
            <span className="text-[11px] text-mut line-through">{money(product.oldPrice)}</span>
          )}
        </div>
      </div>
    </div>
  );
}
