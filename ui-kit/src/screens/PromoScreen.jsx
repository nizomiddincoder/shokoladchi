import { BadgeDollarSign, Ban, BadgePercent, Ticket, Truck } from 'lucide-react';
import StatusBar from '../components/StatusBar';
import TopBar from '../components/TopBar';
import RadioCard from '../components/RadioCard';
import PrimaryButton from '../components/PrimaryButton';
import { PROMOS } from '../data';

const ICONS = {
  ban: Ban,
  percent: BadgePercent,
  truck: Truck,
  dollar: BadgeDollarSign,
};

// Screen 14 — Add Promo: promo cards with radio selectors.
// Apply returns to checkout, or continues to Payment when part of the main flow.
export default function PromoScreen({ back, push, params, promoId, setPromoId }) {
  return (
    <div className="h-full flex flex-col bg-paper">
      <StatusBar />
      <TopBar title="Add Promo" sub="Save on this order" onBack={back} />
      <div className="flex-1 overflow-y-auto no-scrollbar px-5 pt-1 pb-6 space-y-3">
        {PROMOS.map((p) => {
          const Icon = ICONS[p.icon] || Ticket;
          return (
            <RadioCard key={p.id} selected={promoId === p.id} onClick={() => setPromoId(p.id)}>
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-[14px] bg-[#F6F1E7] grid place-items-center shrink-0">
                  <Icon size={20} className="text-[#9A7504]" />
                </div>
                <div className="min-w-0">
                  <p className="text-[14px] font-semibold">{p.title}</p>
                  <p className="text-[12px] text-mut mt-0.5">{p.desc}</p>
                </div>
              </div>
            </RadioCard>
          );
        })}
      </div>
      <div className="bg-white border-t border-[#ECECEE] px-5 pt-3.5 pb-8">
        <PrimaryButton onClick={() => (params?.next === 'payment' ? push('payment') : back())}>
          Apply
        </PrimaryButton>
      </div>
    </div>
  );
}
