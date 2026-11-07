// ── 3-modul: POS / KASSA (planshet landscape 1024×768, touch-first) ────────
import { useEffect, useState } from 'react';
import { Banknote, CreditCard, Delete, Printer, QrCode, Search, Send, Trash2, WifiOff, X } from 'lucide-react';
import {
  Badge, Button, Card, Chip, EmptyState, Modal, PriceText, ProductImage, Skeleton,
  Toast, cn, useToast,
} from '../ui';
import { t } from '../i18n';
import { som, somN } from '../format';
import { CATEGORIES, PRODUCTS } from '../data';
import { dmy } from '../format';

const P = (id) => PRODUCTS.find((p) => p.id === id);

export default function PosApp() {
  const [q, setQ] = useState('');
  const [cat, setCat] = useState('Barchasi');
  const [cart, setCart] = useState([]);
  const [disc, setDisc] = useState(0);
  const [pad, setPad] = useState(null); // {mode:'qty'|'cash', pid}
  const [receipt, setReceipt] = useState(null); // {method, received}
  const [loading, setLoading] = useState(true);
  const { msg, show } = useToast();
  useEffect(() => { const t = setTimeout(() => setLoading(false), 600); return () => clearTimeout(t); }, []);

  const list = PRODUCTS.filter((p) => (cat === 'Barchasi' || p.cat === cat) && p.name.toLowerCase().includes(q.toLowerCase()));
  const subtotal = cart.reduce((s, x) => s + P(x.pid).price * x.qty, 0);
  const discount = Math.round(subtotal * disc);
  const total = subtotal - discount;

  const tap = (pid) => {
    const i = cart.findIndex((x) => x.pid === pid);
    if (i >= 0) setCart((c) => c.map((x, j) => (j === i ? { ...x, qty: x.qty + 1 } : x)));
    else setCart((c) => [...c, { pid, qty: 1 }]);
  };
  const pay = (method) => {
    if (cart.length === 0) return;
    if (method === 'cash') { setPad({ mode: 'cash', value: '' }); return; }
    finish(method);
  };
  const finish = (method, received) => {
    setReceipt({ method, received, items: cart, total, discount, date: new Date() });
    setCart([]); setDisc(0); setPad(null);
  };

  return (
    <div className="relative h-full flex flex-col bg-bg font-sans select-none">
      {/* Header */}
      <header className="h-16 shrink-0 bg-surface border-b border-line flex items-center gap-3 px-4">
        <span className="w-9 h-9 rounded-btn bg-primary-700 grid place-items-center text-white text-[12px] font-bold">SH</span>
        <div>
          <p className="text-[14px] font-bold leading-tight">Kassa #3 · Yunusobod</p>
          <p className="text-[11px] text-muted tnum">Smena 07.11.2026 · Kassir: Malika T.</p>
        </div>
        <div className="flex-1" />
        <span className="inline-flex items-center gap-1.5 h-10 px-3 rounded-full bg-softWarning text-warning text-[12px] font-bold" title="Internet yo'q — cheklar offlayn saqlanadi">
          <WifiOff size={14} /> Offlayn · sinxronlanadi
        </span>
        <span className="hidden md:inline-flex items-center gap-1.5 h-10 px-3 rounded-full bg-primary-100 text-primary-700 text-[12px] font-bold">
          Navbat: <span className="tnum">4</span>
        </span>
      </header>

      {/* Middle */}
      <div className="flex-1 min-h-0 flex">
        {/* Chap: mahsulotlar */}
        <div className="flex-1 min-w-0 p-4 flex flex-col gap-3">
          <div className="flex items-center gap-3">
            <div className="relative flex-1">
              <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted" />
              <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Mahsulot qidirish…"
                aria-label="Qidiruv"
                className="w-full h-12 rounded-btn border border-line bg-surface pl-10 pr-4 text-sm placeholder:text-muted outline-none focus:border-primary-400" />
            </div>
          </div>
          <div className="flex gap-2 overflow-x-auto no-scrollbar">
            {CATEGORIES.map((c) => <Chip key={c} active={cat === c} onClick={() => setCat(c)}>{c}</Chip>)}
          </div>
          {loading ? (
            <div className="grid grid-cols-3 xl:grid-cols-4 gap-3 content-start">
              {[0, 1, 2, 3, 4, 5, 6, 7].map((i) => <Card key={i} className="!p-3"><Skeleton className="h-16 rounded-btn mb-2" /><Skeleton className="h-4 w-3/4" /></Card>)}
            </div>
          ) : list.length === 0 ? (
            <EmptyState icon={Search} title="Topilmadi" text="Boshqa nom bilan qidirib ko'ring" />
          ) : (
            <div className="grid grid-cols-3 xl:grid-cols-4 gap-3 content-start overflow-y-auto no-scrollbar">
              {list.map((p) => (
                <button key={p.id} onClick={() => tap(p.id)} className="text-left bg-surface rounded-card p-3 shadow-soft active:scale-[.97] transition">
                  <ProductImage p={p} className="h-16 w-full rounded-btn mb-2" mark="w-8 h-8" />
                  <p className="text-[13px] font-medium leading-tight truncate">{p.name}</p>
                  <PriceText value={p.price} size="sm" className="block mt-1" />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* O'ng: joriy buyurtma */}
        <aside className="w-[340px] shrink-0 bg-surface border-l border-line flex flex-col">
          <div className="px-4 h-12 flex items-center justify-between border-b border-line">
            <p className="text-[14px] font-semibold">Joriy buyurtma</p>
            {cart.length > 0 && (
              <button onClick={() => setCart([])} className="text-[12px] font-semibold text-danger inline-flex items-center gap-1"><Trash2 size={13} /> Tozalash</button>
            )}
          </div>
          <div className="flex-1 overflow-y-auto no-scrollbar p-3 space-y-2.5">
            {cart.length === 0 ? (
              <EmptyState icon={Banknote} title="Savat bo'sh" text="Mahsulotni tanlang" />
            ) : (
              cart.map((x) => {
                const p = P(x.pid);
                return (
                  <div key={x.pid} className="flex items-center gap-2.5 bg-bg rounded-card p-2.5">
                    <ProductImage p={p} className="w-11 h-11 rounded-btn" mark="w-5 h-5" />
                    <div className="flex-1 min-w-0">
                      <p className="text-[13px] font-medium truncate">{p.name}</p>
                      <PriceText value={p.price * x.qty} size="sm" />
                    </div>
                    <div className="flex flex-col gap-1">
                      <button onClick={() => setCart((c) => c.map((y) => (y.pid === x.pid ? { ...y, qty: y.qty + 1 } : y)))} aria-label="Ko'paytirish"
                        className="w-8 h-7 rounded-btn bg-primary-600 text-white grid place-items-center font-bold">+</button>
                      <span className="tnum text-[12px] font-bold text-center">{x.qty}</span>
                      <button onClick={() => setCart((c) => (x.qty <= 1 ? c.filter((y) => y.pid !== x.pid) : c.map((y) => (y.pid === x.pid ? { ...y, qty: y.qty - 1 } : y))))} aria-label="Kamaytirish"
                        className="w-8 h-7 rounded-btn border border-line grid place-items-center font-bold">−</button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
          {/* Chegirma + natijalar */}
          <div className="border-t border-line p-4 space-y-2">
            <div className="flex gap-2">
              {[0, 0.05, 0.1].map((d) => (
                <Chip key={d} active={disc === d} onClick={() => setDisc(d)}>{d === 0 ? 'Chegirmasiz' : `−${d * 100}%`}</Chip>
              ))}
            </div>
            <Row label={t('sum.subtotal')} value={som(subtotal)} />
            {discount > 0 && <Row label={t('sum.discount')} value={`−${som(discount)}`} tone="danger" />}
            <div className="flex items-center justify-between pt-1">
              <span className="text-[14px] font-bold">{t('sum.total')}</span>
              <PriceText value={total} size="xl" />
            </div>
          </div>
        </aside>
      </div>

      {/* Past: yirik to'lov tugmalari (≥56px) */}
      <div className="h-[92px] shrink-0 bg-surface border-t border-line p-3 flex gap-3">
        <Button size="lg" className="flex-1 !h-14 text-[15px]" icon={Banknote} disabled={!cart.length} onClick={() => pay('cash')}>Naqd</Button>
        <Button size="lg" variant="secondary" className="flex-1 !h-14 text-[15px]" icon={CreditCard} disabled={!cart.length} onClick={() => pay('card')}>Karta</Button>
        <Button size="lg" variant="outline" className="flex-1 !h-14 text-[15px]" icon={QrCode} disabled={!cart.length} onClick={() => pay('qr')}>Click / Payme QR</Button>
      </div>

      {/* Raqamli klaviatura modali */}
      {pad?.mode === 'cash' && (
        <PadModal total={total} onClose={() => setPad(null)} onOk={(rec) => finish('cash', rec)} />
      )}

      {/* Chek ko'rinishi */}
      {receipt && <ReceiptModal r={receipt} onClose={() => setReceipt(null)} show={show} />}
      <Toast msg={msg} />
    </div>
  );
}

const Row = ({ label, value, tone }) => (
  <div className="flex items-center justify-between text-[13px]">
    <span className="text-muted">{label}</span>
    <span className={cn('tnum font-semibold', tone === 'danger' && 'text-danger')}>{value}</span>
  </div>
);

/* ── Klaviatura: naqd pul / qaytim ── */
function PadModal({ total, onClose, onOk }) {
  const [v, setV] = useState('');
  const n = +v || 0;
  const change = n - total;
  const keys = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '000', '0', 'back'];
  const press = (k) => {
    if (k === 'back') setV((x) => x.slice(0, -1));
    else setV((x) => (x + k).replace(/^0+(?=\d)/, ''));
  };
  return (
    <Modal open onClose={onClose} title="Naqd to'lov">
      <div className="bg-bg rounded-card p-4 mb-4 text-center">
        <p className="text-[12px] text-muted">To'lov summasi</p>
        <PriceText value={total} size="xl" className="block" />
        <div className="mt-3 pt-3 border-t border-line">
          <p className="text-[12px] text-muted">Qabul qilindi: <b className="text-body tnum">{somN(n)}</b></p>
          <p className={cn('text-[15px] font-bold tnum mt-1', change < 0 ? 'text-danger' : 'text-success')}>
            Qaytim: {som(Math.max(0, change))}
          </p>
          {change < 0 && <p className="text-[11px] text-danger mt-1">Yetarli emas — yana {som(-change)} kerak</p>}
        </div>
      </div>
      <div className="grid grid-cols-3 gap-2.5">
        {keys.map((k) => (
          <button key={k} onClick={() => press(k)} aria-label={k === 'back' ? "O'chirish" : k}
            className={cn('h-14 rounded-btn text-[18px] font-semibold shadow-soft active:scale-95 transition',
              k === 'back' ? 'bg-bg grid place-items-center' : 'bg-surface border border-line')}>
            {k === 'back' ? <Delete size={20} className="mx-auto" /> : k}
          </button>
        ))}
      </div>
      <div className="flex gap-3 mt-4">
        <Button variant="outline" className="flex-1" onClick={onClose}>Bekor</Button>
        <Button className="flex-[2]" disabled={n < total} onClick={() => onOk(n)}>Tasdiqlash · {som(Math.max(0, change))} qaytim</Button>
      </div>
    </Modal>
  );
}

/* ── Chek ── */
function ReceiptModal({ r, onClose, show }) {
  const METHOD = { cash: 'Naqd', card: 'Karta (terminal)', qr: 'Click / Payme QR' };
  return (
    <Modal open onClose={onClose} title={t('pos.receipt')}>
      <div className="bg-bg rounded-card p-4 font-sans">
        <div className="text-center">
          <p className="text-[14px] font-bold">SHOKOLADCHI</p>
          <p className="text-[11px] text-muted tnum">Kassa #3 · {dmy(r.date)} · {r.date.toTimeString().slice(0, 5)}</p>
          <p className="text-[11px] text-muted tnum">Chek № {Math.floor(Math.random() * 9000 + 1000)}</p>
        </div>
        <div className="border-t border-dashed border-line my-3" />
        {r.items.map((x) => (
          <div key={x.pid} className="flex justify-between text-[12px] py-0.5">
            <span className="text-muted">{P(x.pid).name} × {x.qty}</span>
            <span className="tnum font-medium">{somN(P(x.pid).price * x.qty)}</span>
          </div>
        ))}
        <div className="border-t border-dashed border-line my-3" />
        <Row label={t('sum.subtotal')} value={som(r.total + r.discount)} />
        {r.discount > 0 && <Row label={t('sum.discount')} value={`−${som(r.discount)}`} tone="danger" />}
        <div className="flex justify-between mt-2">
          <span className="text-[14px] font-bold">{t('sum.total')}</span>
          <PriceText value={r.total} size="lg" />
        </div>
        <p className="text-[11px] text-muted mt-2">{METHOD[r.method]}{r.received != null && ` · qabul qilindi ${somN(r.received)}`}</p>
      </div>
      {r.method === 'qr' && (
        <div className="mt-4 flex flex-col items-center">
          <div className="w-32 h-32 rounded-card border-2 border-dashed border-primary-400 grid place-items-center text-primary-400">
            <QrCode size={64} />
          </div>
          <p className="text-[12px] text-muted mt-2">Mijoz skanerlaydi</p>
        </div>
      )}
      <div className="flex gap-3 mt-5">
        <Button variant="outline" className="flex-1" icon={Printer} onClick={() => show('Chek chop etildi')}>Chop etish</Button>
        <Button className="flex-1" icon={Send} onClick={() => { show('Chek yuborildi'); onClose(); }}>Yuborish</Button>
      </div>
    </Modal>
  );
}
