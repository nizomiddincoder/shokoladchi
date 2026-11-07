import { ChevronRight, MapPin, Pencil, Ticket, Truck } from 'lucide-react';
import StatusBar from '../components/StatusBar';
import TopBar from '../components/TopBar';
import ProductImage from '../components/ProductImage';
import PrimaryButton from '../components/PrimaryButton';
import { ADDRESSES, PRODUCTS, PROMOS, SHIPPING, money } from '../data';

// Screen 11 — Checkout: address, delivery, promo, order list, summary.
export default function CheckoutScreen({ back, push, cart, checkout, totals }) {
  const address = ADDRESSES.find((a) => a.id === checkout.addressId) || ADDRESSES[0];
  const shipping = SHIPPING.find((s) => s.id === checkout.shippingId);
  const promo = PROMOS.find((p) => p.id === checkout.promoId);

  return (
    <div className="h-full flex flex-col bg-paper">
      <StatusBar />
      <TopBar title="Checkout" onBack={back} />
      <div className="flex-1 overflow-y-auto no-scrollbar px-5 pt-1 pb-6 space-y-3.5">
        {/* Shipping address */}
        <div className="bg-white rounded-[16px] p-4 shadow-soft flex items-start gap-3">
          <div className="w-10 h-10 rounded-full bg-paper grid place-items-center shrink-0">
            <MapPin size={18} />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[14px] font-semibold">{address.name}</p>
            <p className="text-[12px] text-mut leading-relaxed mt-0.5">
              {address.line}, {address.city}
              <br />
              {address.phone}
            </p>
          </div>
          <button
            onClick={() => push('address')}
            aria-label="Edit address"
            className="w-9 h-9 grid place-items-center rounded-full bg-paper active:scale-90 transition"
          >
            <Pencil size={15} />
          </button>
        </div>

        {/* Delivery method */}
        <button
          onClick={() => push('shipping')}
          className="w-full bg-white rounded-[16px] p-4 shadow-soft flex items-center gap-3 active:scale-[0.99] transition text-left"
        >
          <div className="w-10 h-10 rounded-full bg-paper grid place-items-center shrink-0">
            <Truck size={18} />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[13px] font-semibold">{shipping.name} Delivery</p>
            <p className="text-[11px] text-mut mt-0.5">Arrives by {shipping.eta}</p>
          </div>
          <span className="text-[14px] font-bold">
            {totals.shipping === 0 ? 'Free' : money(totals.shipping)}
          </span>
          <ChevronRight size={16} className="text-mut" />
        </button>

        {/* Promo */}
        <button
          onClick={() => push('promo')}
          className="w-full bg-white rounded-[16px] p-4 shadow-soft flex items-center gap-3 active:scale-[0.99] transition text-left"
        >
          <div className="w-10 h-10 rounded-full bg-paper grid place-items-center shrink-0">
            <Ticket size={18} />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[13px] font-semibold">{promo.id === 0 ? 'Add promo code' : promo.title}</p>
            <p className="text-[11px] text-mut mt-0.5">
              {promo.id === 0 ? 'Save on this order' : 'Applied to this order'}
            </p>
          </div>
          <ChevronRight size={16} className="text-mut" />
        </button>

        {/* Order list */}
        <div className="pt-2">
          <p className="text-[15px] font-semibold mb-3">Order List</p>
          <div className="space-y-3">
            {cart.map((item) => {
              const product = PRODUCTS.find((p) => p.id === item.pid);
              return (
                <div key={`${item.pid}-${item.size}-${item.pack}`} className="flex items-center gap-3 bg-white rounded-[16px] p-3 shadow-soft">
                  <ProductImage product={product} className="w-12 h-12 rounded-[12px]" mark="w-5 h-5" />
                  <div className="flex-1 min-w-0">
                    <p className="text-[13px] font-medium truncate">{product.name}</p>
                    <p className="text-[11px] text-mut mt-0.5">
                      {item.pack} · {item.size}
                    </p>
                  </div>
                  <span className="text-[11px] font-bold bg-paper rounded-full px-2.5 py-1">×{item.qty}</span>
                  <span className="text-[13px] font-bold w-16 text-right">{money(product.price * item.qty)}</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Summary */}
        <div className="bg-white rounded-[16px] p-4 shadow-soft space-y-2 pt-4">
          <div className="flex justify-between text-[13px]">
            <span className="text-mut">Subtotal</span>
            <span className="font-semibold">{money(totals.subtotal)}</span>
          </div>
          <div className="flex justify-between text-[13px]">
            <span className="text-mut">Shipping</span>
            <span className="font-semibold">{totals.shipping === 0 ? 'Free' : money(totals.shipping)}</span>
          </div>
          {totals.discount > 0 && (
            <div className="flex justify-between text-[13px]">
              <span className="text-mut">Promo</span>
              <span className="font-semibold text-green-600">−{money(totals.discount)}</span>
            </div>
          )}
          <div className="border-t border-[#EFEFF1] pt-2.5 flex justify-between">
            <span className="text-[14px] font-semibold">Total</span>
            <span className="text-[16px] font-bold">{money(totals.total)}</span>
          </div>
        </div>
      </div>

      <div className="bg-white border-t border-[#ECECEE] px-5 pt-3.5 pb-8">
        <PrimaryButton onClick={() => push('shipping', { next: 'promo' })}>Continue to Payment</PrimaryButton>
      </div>
    </div>
  );
}
