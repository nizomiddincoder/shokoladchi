import { Apple, Chrome, CreditCard, Globe, Wallet } from 'lucide-react';
import StatusBar from '../components/StatusBar';
import TopBar from '../components/TopBar';
import RadioCard from '../components/RadioCard';
import PrimaryButton from '../components/PrimaryButton';
import { PAYMENTS, money } from '../data';

const ICONS = {
  wallet: Wallet,
  globe: Globe,
  chrome: Chrome,
  apple: Apple,
  card: CreditCard,
};

// Screen 15 — Payment Methods: radio list + Confirm Payment.
export default function PaymentScreen({ back, paymentId, setPaymentId, totals, onConfirm }) {
  return (
    <div className="h-full flex flex-col bg-paper">
      <StatusBar />
      <TopBar title="Payment Methods" onBack={back} />
      <div className="flex-1 overflow-y-auto no-scrollbar px-5 pt-1 pb-6 space-y-3">
        {PAYMENTS.map((p) => {
          const Icon = ICONS[p.icon] || CreditCard;
          return (
            <RadioCard key={p.id} selected={paymentId === p.id} onClick={() => setPaymentId(p.id)}>
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-[14px] bg-paper grid place-items-center shrink-0">
                  <Icon size={20} />
                </div>
                <div className="min-w-0">
                  <p className="text-[14px] font-semibold">{p.name}</p>
                  <p className="text-[12px] text-mut mt-0.5 truncate">{p.detail}</p>
                </div>
              </div>
            </RadioCard>
          );
        })}
      </div>
      <div className="bg-white border-t border-[#ECECEE] px-5 pt-3.5 pb-8">
        <div className="flex items-center justify-between mb-3">
          <span className="text-[14px] text-mut">Total</span>
          <span className="text-[18px] font-bold">{money(totals.total)}</span>
        </div>
        <PrimaryButton onClick={onConfirm}>Confirm Payment</PrimaryButton>
      </div>
    </div>
  );
}
