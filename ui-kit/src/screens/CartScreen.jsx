import { useState } from 'react';
import { ShoppingBag, Trash2 } from 'lucide-react';
import StatusBar from '../components/StatusBar';
import TopBar from '../components/TopBar';
import ProductImage from '../components/ProductImage';
import QuantityStepper from '../components/QuantityStepper';
import PrimaryButton from '../components/PrimaryButton';
import BottomSheet from '../components/BottomSheet';
import { PRODUCTS, money } from '../data';

// Screens 9 & 10 — Cart + Remove-from-cart confirmation sheet.
export default function CartScreen({ back, push, cart, setQty, removeAt }) {
  const [pending, setPending] = useState(null); // index of item awaiting removal
  const pendingItem = pending !== null ? cart[pending] : null;

  const total = cart.reduce((s, x) => s + PRODUCTS.find((p) => p.id === x.pid).price * x.qty, 0);
  const count = cart.reduce((s, x) => s + x.qty, 0);

  return (
    <div className="h-full flex flex-col bg-paper">
      <StatusBar />
      <TopBar title="Cart" sub={count > 0 ? `${count} item${count > 1 ? 's' : ''}` : undefined} onBack={back} />

      {cart.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center px-10 text-center pb-20">
          <div className="w-28 h-28 rounded-full bg-white shadow-card grid place-items-center">
            <ShoppingBag size={44} className="text-[#C7C7CC]" strokeWidth={1.4} />
          </div>
          <h2 className="text-[18px] font-semibold mt-6">Your cart is empty</h2>
          <p className="text-[13px] text-mut mt-1.5 leading-relaxed">
            Sweet things are waiting for you — browse our offers and add something delicious.
          </p>
          <div className="w-full mt-6">
            <PrimaryButton onClick={() => push('offers')}>Browse offers</PrimaryButton>
          </div>
        </div>
      ) : (
        <>
          <div className="flex-1 overflow-y-auto no-scrollbar px-5 pt-2 pb-6 space-y-3.5">
            {cart.map((item, idx) => {
              const product = PRODUCTS.find((p) => p.id === item.pid);
              return (
                <div key={`${item.pid}-${item.size}-${item.pack}`} className="bg-white rounded-[16px] p-3 shadow-soft flex gap-3">
                  <ProductImage product={product} className="w-20 h-20 rounded-[14px]" mark="w-7 h-7" />
                  <div className="flex-1 min-w-0 flex flex-col">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="text-[13px] font-medium truncate">{product.name}</p>
                        <p className="text-[11px] text-mut mt-0.5">
                          {item.pack} · {item.size}
                        </p>
                      </div>
                      <button
                        onClick={() => setPending(idx)}
                        aria-label="Remove item"
                        className="w-8 h-8 grid place-items-center rounded-full text-mut active:scale-90 transition"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                    <div className="flex items-end justify-between mt-auto">
                      <span className="text-[14px] font-bold">{money(product.price * item.qty)}</span>
                      <QuantityStepper small value={item.qty} onChange={(q) => setQty(idx, q)} />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="bg-white border-t border-[#ECECEE] px-5 pt-3.5 pb-8">
            <div className="flex items-center justify-between mb-3">
              <span className="text-[14px] text-mut">Total</span>
              <span className="text-[18px] font-bold">{money(total)}</span>
            </div>
            <PrimaryButton onClick={() => push('checkout')}>Checkout</PrimaryButton>
          </div>
        </>
      )}

      {/* Remove confirmation */}
      <BottomSheet open={pending !== null} onClose={() => setPending(null)}>
        <h2 className="text-[18px] font-semibold text-center">Remove From Cart?</h2>
        {pendingItem && (
          <div className="flex items-center gap-3 bg-paper rounded-[16px] p-3 mt-4">
            <ProductImage product={PRODUCTS.find((p) => p.id === pendingItem.pid)} className="w-14 h-14 rounded-[12px]" mark="w-6 h-6" />
            <div className="flex-1 min-w-0">
              <p className="text-[13px] font-medium truncate">{PRODUCTS.find((p) => p.id === pendingItem.pid).name}</p>
              <p className="text-[11px] text-mut">
                {pendingItem.pack} · {pendingItem.size} · ×{pendingItem.qty}
              </p>
            </div>
            <span className="text-[14px] font-bold">
              {money(PRODUCTS.find((p) => p.id === pendingItem.pid).price * pendingItem.qty)}
            </span>
          </div>
        )}
        <div className="flex gap-3 mt-5">
          <button
            onClick={() => setPending(null)}
            className="flex-1 h-[52px] rounded-[16px] bg-[#EDEDF0] text-ink text-[15px] font-semibold active:scale-[0.98] transition"
          >
            Cancel
          </button>
          <button
            onClick={() => {
              removeAt(pending);
              setPending(null);
            }}
            className="flex-1 h-[52px] rounded-[16px] bg-ink text-white text-[15px] font-semibold active:scale-[0.98] transition"
          >
            Yes, Remove
          </button>
        </div>
      </BottomSheet>
    </div>
  );
}
