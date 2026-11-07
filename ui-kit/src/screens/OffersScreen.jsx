import { ChevronRight, Heart, ShoppingBag } from 'lucide-react';
import StatusBar from '../components/StatusBar';
import TopBar from '../components/TopBar';
import TopIcon from '../components/TopIcon';
import ProductImage from '../components/ProductImage';
import { OFFERS, PRODUCTS } from '../data';

// Screen 1 — Special Offers: vertical promo cards with big percentages.
export default function OffersScreen({ push, cartCount }) {
  return (
    <div className="h-full flex flex-col bg-paper">
      <StatusBar />
      <TopBar
        title="Special Offers"
        sub="Curated for you"
        center={false}
        right={
          <>
            <TopIcon label="Favorites" onClick={() => push('popular')}>
              <Heart size={20} />
            </TopIcon>
            <TopIcon label="Cart" badge={cartCount} onClick={() => push('cart')}>
              <ShoppingBag size={20} />
            </TopIcon>
          </>
        }
      />
      <div className="flex-1 overflow-y-auto no-scrollbar px-5 pb-12 pt-2 space-y-4">
        {OFFERS.map((o) => {
          const product = PRODUCTS.find((p) => p.id === o.pid);
          return (
            <button
              key={o.id}
              onClick={() => push('popular')}
              className="w-full text-left bg-white rounded-[20px] shadow-soft p-4 flex items-center gap-4 active:scale-[0.99] transition-transform"
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-baseline gap-1.5">
                  <span className="text-[40px] font-extrabold leading-none tracking-tight">{o.pct}%</span>
                  <span className="text-[13px] font-semibold text-mut">off</span>
                </div>
                <p className="text-[15px] font-semibold mt-2">{o.label}</p>
                <p className="text-[12px] text-mut">{o.sub}</p>
                <span className="inline-flex items-center gap-0.5 mt-3 text-[12px] font-semibold">
                  Shop now <ChevronRight size={14} />
                </span>
              </div>
              <ProductImage product={product} className="w-32 h-32 rounded-[16px]" />
            </button>
          );
        })}
      </div>
    </div>
  );
}
