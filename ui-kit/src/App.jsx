import { useState } from 'react';
import { Building2, Calculator, Smartphone } from 'lucide-react';
import { BrandMark, PhoneFrame, cn } from './ui';
import CustomerApp from './modules/customer';
import WarehouseApp from './modules/warehouse';
import PosApp from './modules/pos';

const TABS = [
  { id: 'customer', label: 'Xaridor', icon: Smartphone },
  { id: 'wh', label: 'Ombor', icon: Building2 },
  { id: 'pos', label: 'Kassa', icon: Calculator },
];

export default function App() {
  const [m, setM] = useState('customer');
  return (
    <div className="h-[100dvh] flex flex-col bg-bg font-sans overflow-hidden">
      <header className="h-14 shrink-0 bg-surface border-b border-line flex items-center gap-4 px-4">
        <div className="flex items-center gap-2.5">
          <BrandMark className="w-8 h-8" />
          <span className="text-[15px] font-bold hidden sm:block">Shokoladchi</span>
          <span className="text-[11px] text-muted hidden lg:block">· dizayn tizimi v2</span>
        </div>
        <div className="flex-1" />
        <nav aria-label="Modullar" className="flex gap-1 bg-bg rounded-full p-1">
          {TABS.map((tb) => (
            <button key={tb.id} onClick={() => setM(tb.id)} aria-current={m === tb.id ? 'page' : undefined}
              className={cn('inline-flex items-center gap-2 h-9 px-4 rounded-full text-[13px] font-semibold transition',
                m === tb.id ? 'bg-primary-600 text-white shadow-soft' : 'text-muted hover:text-body')}>
              <tb.icon size={15} /> <span className="hidden sm:inline">{tb.label}</span>
            </button>
          ))}
        </nav>
      </header>

      <main className={cn('flex-1 min-h-0', m === 'customer' ? 'overflow-y-auto grid place-items-start sm:place-items-center justify-center' : m === 'pos' ? 'overflow-auto p-4' : 'overflow-hidden')}>
        {m === 'customer' && <PhoneFrame><CustomerApp /></PhoneFrame>}
        {m === 'wh' && <WarehouseApp />}
        {m === 'pos' && <PosApp />}
      </main>
    </div>
  );
}
