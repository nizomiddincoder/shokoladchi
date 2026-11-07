import { useRef, useState } from 'react';
import { ChevronRight, Heart, Share2 } from 'lucide-react';
import StatusBar from '../components/StatusBar';
import TopBar from '../components/TopBar';
import TopIcon from '../components/TopIcon';
import Stars from '../components/Stars';
import BrandMark from '../components/BrandMark';
import QuantityStepper from '../components/QuantityStepper';
import PrimaryButton from '../components/PrimaryButton';
import { PACKS, PRODUCTS, SIZES, money } from '../data';

const ANGLES = ['140deg', '50deg', '235deg'];

// Screen 7 — Product detail: carousel, rating, description, size, packaging, qty, add to cart.
export default function DetailScreen({ back, push, params, likes, toggleLike, addToCart, showToast }) {
  const product = PRODUCTS.find((p) => p.id === params?.pid) || PRODUCTS[0];

  const [slide, setSlide] = useState(0);
  const [size, setSize] = useState(SIZES[1]);
  const [pack, setPack] = useState(PACKS[0]);
  const [qty, setQty] = useState(1);
  const [more, setMore] = useState(false);
  const railRef = useRef(null);

  const onScroll = () => {
    const el = railRef.current;
    if (el) setSlide(Math.round(el.scrollLeft / el.clientWidth));
  };

  return (
    <div className="h-full flex flex-col bg-paper">
      <StatusBar />
      <TopBar
        title="Product Details"
        onBack={back}
        right={
          <>
            <TopIcon label="Share" onClick={() => showToast('Share link copied')}>
              <Share2 size={18} />
            </TopIcon>
            <TopIcon label="Favorite" onClick={() => toggleLike(product.id)}>
              <Heart size={18} className={likes[product.id] ? 'fill-red-500 text-red-500' : ''} />
            </TopIcon>
          </>
        }
      />

      <div className="flex-1 overflow-y-auto no-scrollbar pb-6">
        {/* Carousel */}
        <div className="px-5">
          <div
            ref={railRef}
            onScroll={onScroll}
            className="flex overflow-x-auto snap-x snap-mandatory no-scrollbar rounded-[20px]"
          >
            {ANGLES.map((a, i) => (
              <div key={i} className="w-full shrink-0 snap-center">
                <div
                  className="h-[300px] rounded-[20px] overflow-hidden relative"
                  style={{ background: `linear-gradient(${a}, ${product.c1} 0%, ${product.c2} 100%)` }}
                >
                  <div
                    className="absolute inset-0"
                    style={{ background: 'radial-gradient(120% 90% at 25% 18%, rgba(255,255,255,0.30), transparent 55%)' }}
                  />
                  <div className="absolute inset-0 grid place-items-center">
                    <BrandMark className="w-28 h-28" />
                  </div>
                </div>
              </div>
            ))}
          </div>
          <div className="flex justify-center gap-1.5 mt-3">
            {ANGLES.map((_, i) => (
              <span
                key={i}
                className={`h-1.5 rounded-full transition-all duration-200 ${i === slide ? 'w-5 bg-ink' : 'w-1.5 bg-[#D6D6DB]'}`}
              />
            ))}
          </div>
        </div>

        {/* Name + rating */}
        <div className="px-5 mt-4">
          <h1 className="text-[20px] font-semibold leading-tight">{product.name}</h1>
          <button
            onClick={() => push('reviews', { pid: product.id })}
            className="flex items-center gap-1.5 mt-1.5 active:opacity-70"
          >
            <Stars value={product.rating} size={13} />
            <span className="text-[12px] font-semibold">{product.rating}</span>
            <span className="text-[12px] text-mut">({product.reviews.toLocaleString()} reviews)</span>
            <ChevronRight size={13} className="text-mut" />
          </button>

          <p
            className={`text-[13px] text-mut leading-relaxed mt-3 ${more ? '' : 'line-clamp-2'}`}
          >
            {product.desc}
          </p>
          <button onClick={() => setMore(!more)} className="text-[13px] font-semibold mt-0.5">
            {more ? 'Read less' : 'Read more'}
          </button>
        </div>

        {/* Size */}
        <div className="px-5 mt-5">
          <p className="text-[14px] font-semibold mb-2.5">Size (net weight)</p>
          <div className="flex gap-2.5">
            {SIZES.map((s) => (
              <button
                key={s}
                onClick={() => setSize(s)}
                className={`min-w-[58px] h-11 px-3 rounded-full text-[13px] font-medium transition-all active:scale-95 ${
                  size === s ? 'bg-ink text-white shadow-card' : 'bg-white border border-[#E4E4E7]'
                }`}
              >
                {s}
              </button>
            ))}
          </div>
        </div>

        {/* Packaging color */}
        <div className="px-5 mt-5">
          <p className="text-[14px] font-semibold mb-2.5">
            Packaging <span className="text-mut font-normal text-[12px]">· {pack.name}</span>
          </p>
          <div className="flex gap-3.5">
            {PACKS.map((c) => (
              <button
                key={c.name}
                onClick={() => setPack(c)}
                aria-label={c.name}
                className={`w-9 h-9 rounded-full transition-all ${
                  pack.name === c.name ? 'ring-2 ring-offset-2 ring-ink ring-offset-paper' : ''
                }`}
                style={{ background: c.hex, boxShadow: 'inset 0 0 0 1px rgba(0,0,0,0.08)' }}
              />
            ))}
          </div>
        </div>

        {/* Quantity */}
        <div className="px-5 mt-5 flex items-center justify-between">
          <p className="text-[14px] font-semibold">Quantity</p>
          <QuantityStepper value={qty} onChange={setQty} />
        </div>
      </div>

      {/* Bottom bar */}
      <div className="bg-white border-t border-[#ECECEE] px-5 pt-3 pb-8 flex items-center gap-4">
        <div className="shrink-0">
          <p className="text-[11px] text-mut">Total price</p>
          <p className="text-[18px] font-bold leading-tight">{money(product.price * qty)}</p>
        </div>
        <PrimaryButton
          className="flex-1"
          onClick={() => {
            addToCart(product, qty, size, pack);
            showToast('Added to cart');
            push('cart');
          }}
        >
          Add to Cart
        </PrimaryButton>
      </div>
    </div>
  );
}
