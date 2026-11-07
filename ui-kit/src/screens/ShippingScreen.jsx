import { Calendar } from 'lucide-react';
import StatusBar from '../components/StatusBar';
import TopBar from '../components/TopBar';
import RadioCard from '../components/RadioCard';
import PrimaryButton from '../components/PrimaryButton';
import { SHIPPING, money } from '../data';

// Screen 13 — Choose Shipping: radio cards with ETA and price.
// Apply returns to checkout, or continues to Add Promo when part of the main flow.
export default function ShippingScreen({ back, push, params, shippingId, setShippingId }) {
  return (
    <div className="h-full flex flex-col bg-paper">
      <StatusBar />
      <TopBar title="Choose Shipping" sub="Delivery method" onBack={back} />
      <div className="flex-1 overflow-y-auto no-scrollbar px-5 pt-1 pb-6 space-y-3">
        {SHIPPING.map((s) => (
          <RadioCard key={s.id} selected={shippingId === s.id} onClick={() => setShippingId(s.id)}>
            <div className="flex items-center justify-between gap-2">
              <p className="text-[14px] font-semibold">{s.name}</p>
              <span className="text-[15px] font-bold">{money(s.price)}</span>
            </div>
            <p className="text-[12px] text-mut mt-1 flex items-center gap-1.5">
              <Calendar size={12} /> Arrives by {s.eta}
            </p>
            <p className="text-[11px] text-mut mt-0.5">{s.note}</p>
          </RadioCard>
        ))}
      </div>
      <div className="bg-white border-t border-[#ECECEE] px-5 pt-3.5 pb-8">
        <PrimaryButton onClick={() => (params?.next === 'promo' ? push('promo', { next: 'payment' }) : back())}>
          Apply
        </PrimaryButton>
      </div>
    </div>
  );
}
