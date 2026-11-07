import { Plus } from 'lucide-react';
import StatusBar from '../components/StatusBar';
import TopBar from '../components/TopBar';
import RadioCard from '../components/RadioCard';
import PrimaryButton from '../components/PrimaryButton';

// Screen 12 — Shipping Address: selectable cards with Default badge.
export default function AddressScreen({ back, addresses, addressId, setAddressId, addAddress }) {
  return (
    <div className="h-full flex flex-col bg-paper">
      <StatusBar />
      <TopBar title="Shipping Address" onBack={back} />
      <div className="flex-1 overflow-y-auto no-scrollbar px-5 pt-1 pb-6 space-y-3">
        {addresses.map((a) => (
          <RadioCard key={a.id} selected={addressId === a.id} onClick={() => setAddressId(a.id)}>
            <div className="flex items-center gap-2">
              <p className="text-[14px] font-semibold">{a.label}</p>
              {a.badge && (
                <span className="text-[10px] font-bold bg-gold/15 text-[#9A7504] rounded-full px-2 py-0.5">
                  {a.badge}
                </span>
              )}
            </div>
            <p className="text-[12px] text-mut leading-relaxed mt-1">
              {a.name} · {a.line}
              <br />
              {a.city} · {a.phone}
            </p>
          </RadioCard>
        ))}
        <button
          onClick={addAddress}
          className="w-full h-[52px] rounded-[16px] bg-[#EDEDF0] text-ink text-[15px] font-semibold flex items-center justify-center gap-2 active:scale-[0.98] transition"
        >
          <Plus size={18} /> Add New Address
        </button>
      </div>
      <div className="bg-white border-t border-[#ECECEE] px-5 pt-3.5 pb-8">
        <PrimaryButton onClick={back}>Apply</PrimaryButton>
      </div>
    </div>
  );
}
