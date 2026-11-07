// ── 2-modul: OMBOR (desktop-first, 1280px+, planshetgacha moslashadi) ──────
import { useEffect, useState } from 'react';
import {
  AlertTriangle, ArrowLeftRight, BarChart3, Boxes, ClipboardList, Minus, PackagePlus,
  Plus, RefreshCw, Search, Truck,
} from 'lucide-react';
import {
  Badge, Button, Card, Chip, EmptyState, ErrorState, Input, Modal, SectionTitle,
  Skeleton, StatCard, Stepper, Table, Td, Toast, cn, useToast,
} from '../ui';
import { t } from '../i18n';
import { som } from '../format';
import { BRANCHES, COUNTS, EXPIRING, MOVES, STOCK, SUPPLIERS, TRANSFERS, statusOf } from '../data';

const MENU = [
  { id: 'dash', icon: BarChart3, label: 'Boshqaruv paneli' },
  { id: 'inv', icon: Boxes, label: 'Inventarizatsiya' },
  { id: 'in', icon: PackagePlus, label: 'Kirim' },
  { id: 'out', icon: Minus, label: 'Chiqim' },
  { id: 'count', icon: ClipboardList, label: 'Sanash' },
  { id: 'sup', icon: Truck, label: 'Yetkazib beruvchilar' },
  { id: 'tr', icon: ArrowLeftRight, label: "Ko'chirishlar" },
];

export default function WarehouseApp() {
  const [scr, setScr] = useState('dash');
  const [stock, setStock] = useState(STOCK);
  const { msg, show } = useToast();
  const [form, setForm] = useState(null); // {mode:'in'|'out', row}

  const applyStock = (mode, row, qty) => {
    setStock((s) => s.map((r) => (r.sku === row.sku ? { ...r, qty: Math.max(0, r.qty + (mode === 'in' ? qty : -qty)) } : r)));
    show(mode === 'in' ? `Kirim qayd etildi: +${qty}` : `Chiqim qayd etildi: −${qty}`);
  };

  return (
    <div className="h-full flex bg-bg font-sans">
      {/* Sidebar — aktiv element pastki-nav shaklidagi "pill" */}
      <aside className="w-[68px] lg:w-60 shrink-0 bg-surface border-r border-line flex flex-col">
        <div className="h-14 flex items-center gap-2.5 px-4 border-b border-line">
          <span className="w-8 h-8 rounded-btn bg-primary-700 grid place-items-center text-white font-bold text-[13px]">SH</span>
          <span className="hidden lg:block text-[14px] font-bold">Shokoladchi</span>
        </div>
        <nav className="flex-1 p-2 space-y-1" aria-label="Ombor navigatsiyasi">
          {MENU.map((m) => {
            const active = scr === m.id;
            return (
              <button key={m.id} onClick={() => setScr(m.id)} aria-current={active ? 'page' : undefined}
                className={cn('w-full flex items-center gap-3 h-11 px-3 rounded-btn text-[13px] font-medium transition',
                  active ? 'bg-primary-600 text-white shadow-soft' : 'text-body hover:bg-primary-100')}>
                <m.icon size={18} className="shrink-0" />
                <span className="hidden lg:block">{m.label}</span>
              </button>
            );
          })}
        </nav>
        <div className="p-3 border-t border-line hidden lg:block">
          <p className="text-[11px] text-muted">17 filial · 1 ombor</p>
        </div>
      </aside>

      {/* Kontent */}
      <main className="flex-1 min-w-0 overflow-y-auto">
        <header className="h-14 bg-surface border-b border-line flex items-center gap-3 px-5 sticky top-0 z-10">
          <h1 className="text-[15px] font-semibold">{MENU.find((m) => m.id === scr).label}</h1>
          <span className="text-[12px] text-muted hidden md:block">· Asosiy ombor, Toshkent-1</span>
          <div className="flex-1" />
          <Button size="sm" variant="outline" icon={RefreshCw} onClick={() => show('Ma\'lumot yangilandi')}>Yangilash</Button>
          <span className="w-9 h-9 rounded-full bg-primary-100 grid place-items-center text-primary-700 text-[12px] font-bold">SA</span>
        </header>

        <div className="p-5 max-w-[1200px]">
          {scr === 'dash' && <Dash show={show} go={setScr} stock={stock} openForm={setForm} />}
          {scr === 'inv' && <Inventory stock={stock} openForm={setForm} openDetail={setForm} />}
          {scr === 'in' && <StockForm mode="in" stock={stock} onSubmit={(row, qty) => applyStock('in', row, qty)} />}
          {scr === 'out' && <StockForm mode="out" stock={stock} onSubmit={(row, qty) => applyStock('out', row, qty)} />}
          {scr === 'count' && <CountList show={show} />}
          {scr === 'sup' && <Suppliers show={show} />}
          {scr === 'tr' && <Transfers show={show} />}
        </div>
      </main>

      {/* Kirim/chiqim/Tafsilot modali */}
      {form?.mode && (
        <StockModal form={form} onClose={() => setForm(null)} onSubmit={(qty) => { applyStock(form.mode, form.row, qty); setForm(null); }} />
      )}
      {!form?.mode && form && <DetailModal row={form.row} onClose={() => setForm(null)} onOpen={(mode) => setForm({ mode, row: form.row })} />}
      <div className="fixed bottom-5 left-1/2 -translate-x-1/2 z-[70]">
        <Toast msg={msg} />
      </div>
    </div>
  );
}

/* ── Dashboard ── */
function Dash({ go, stock, openForm }) {
  const [state, setState] = useState('loading'); // loading | error | ok
  useEffect(() => { const t = setTimeout(() => setState('error'), 700); return () => clearTimeout(t); }, []);
  const low = stock.filter((r) => r.qty > 0 && r.qty < r.min).length;
  const out = stock.filter((r) => r.qty === 0).length;

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard icon={Boxes} tone="brand" value={stock.reduce((s, r) => s + r.qty, 0)} label="Umumiy mahsulotlar (dona)" sub="+12% oyiga" />
        <StatCard icon={AlertTriangle} tone="warning" value={low} label="Kam qolgan pozitsiyalar" />
        <StatCard icon={PackagePlus} tone="brand" value={12} label="Kirim kutilmoqda (zakaz)" />
        <StatCard icon={AlertTriangle} tone="danger" value={out + EXPIRING.length} label="Tugagan / muddati yaqin" />
      </div>

      <div className="grid lg:grid-cols-3 gap-4">
        {/* So'nggi harakatlar — loading/error/ok holatlari bilan */}
        <Card className="lg:col-span-2">
          <SectionTitle right={<Button size="sm" variant="ghost" onClick={() => go('inv')}>{t('cta.more')}</Button>}>So'nggi harakatlar</SectionTitle>
          {state === 'loading' && (
            <div className="space-y-3">{[0, 1, 2].map((i) => <Skeleton key={i} className="h-9" />)}</div>
          )}
          {state === 'error' && <ErrorState onRetry={() => setState('ok')} />}
          {state === 'ok' && (
            <Table head={['Mahsulot', 'Tip', 'Miqdor', 'Sana', 'Javobgar']}>
              {MOVES.map((m) => (
                <tr key={m.id}>
                  <Td className="font-medium">{m.item}</Td>
                  <Td><Badge tone={m.type === 'in' ? 'success' : 'warning'}>{m.type === 'in' ? 'Kirim' : 'Chiqim'}</Badge></Td>
                  <Td className={m.type === 'in' ? 'text-success' : 'text-danger'}>{m.type === 'in' ? '+' : '−'}{m.qty}</Td>
                  <Td className="text-muted">{m.date}</Td>
                  <Td className="text-muted">{m.user}</Td>
                </tr>
              ))}
            </Table>
          )}
        </Card>

        <Card>
          <SectionTitle>Muddati yaqin</SectionTitle>
          <div className="space-y-3">
            {EXPIRING.map((e) => (
              <div key={e.batch} className="flex items-center gap-3">
                <span className="w-9 h-9 rounded-btn bg-softDanger grid place-items-center text-danger"><AlertTriangle size={16} /></span>
                <span className="flex-1 min-w-0">
                  <span className="block text-[13px] font-medium truncate">{e.name}</span>
                  <span className="block text-[11px] text-muted tnum">{e.batch} · {e.date} · {e.qty} dona</span>
                </span>
              </div>
            ))}
          </div>
          <Button variant="secondary" size="sm" className="w-full mt-4" onClick={() => go('count')}>Sanashni boshlash</Button>
        </Card>
      </div>

      {/* Tezkor kirim/chiqim */}
      <Card>
        <SectionTitle>Tezkor amallar</SectionTitle>
        <div className="flex flex-wrap gap-3">
          {stock.slice(0, 4).map((r) => (
            <div key={r.sku} className="flex items-center gap-2 border border-line rounded-btn pl-3 pr-1.5 py-1.5">
              <span className="text-[13px] font-medium max-w-[140px] truncate">{r.name}</span>
              <Button size="sm" icon={Plus} onClick={() => openForm({ mode: 'in', row: r })}>Kirim</Button>
              <Button size="sm" variant="outline" icon={Minus} onClick={() => openForm({ mode: 'out', row: r })}>Chiqim</Button>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}

/* ── Inventarizatsiya jadvali ── */
function Inventory({ stock, openForm, openDetail }) {
  const [q, setQ] = useState('');
  const [cat, setCat] = useState('Barchasi');
  const [loading, setLoading] = useState(true);
  useEffect(() => { const t = setTimeout(() => setLoading(false), 700); return () => clearTimeout(t); }, []);

  const cats = ['Barchasi', ...new Set(stock.map((r) => r.cat))];
  const list = stock.filter((r) => (cat === 'Barchasi' || r.cat === cat) && (r.name.toLowerCase().includes(q.toLowerCase()) || r.sku.includes(q.toUpperCase())));

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <Input icon={Search} placeholder="SKU yoki nomi bo'yicha qidirish" value={q} onChange={(e) => setQ(e.target.value)} className="w-full sm:w-72" aria-label="Qidiruv" />
        <div className="flex gap-2 overflow-x-auto no-scrollbar">
          {cats.map((c) => <Chip key={c} active={cat === c} onClick={() => setCat(c)}>{c}</Chip>)}
        </div>
      </div>

      <Card pad={false} className="p-3">
        {loading ? (
          <div className="space-y-3 p-2">{[0, 1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-9" />)}</div>
        ) : list.length === 0 ? (
          <EmptyState icon={Boxes} title="Mahsulot topilmadi" text="Filtrlarni o'zgartirib ko'ring" />
        ) : (
          <Table head={['SKU', 'Nomi', 'Kategoriya', 'Miqdor', 'Min. daraja', 'Status', 'Joy', 'Amallar']}>
            {list.map((r) => {
              const st = statusOf(r);
              return (
                <tr key={r.sku} className="cursor-pointer hover:bg-bg transition" onClick={() => openDetail({ row: r })}>
                  <Td className="text-muted">{r.sku}</Td>
                  <Td className="font-medium">{r.name}</Td>
                  <Td className="text-muted">{r.cat}</Td>
                  <Td className={cn('font-bold', r.qty === 0 && 'text-danger')}>{r.qty}</Td>
                  <Td className="text-muted">{r.min}</Td>
                  <Td><Badge tone={st.k}>{st.l}</Badge></Td>
                  <Td className="text-muted">{r.loc}</Td>
                  <Td onClick={(e) => e.stopPropagation()}>
                    <span className="flex gap-1.5">
                      <Button size="sm" icon={Plus} onClick={() => openForm({ mode: 'in', row: r })}>Kirim</Button>
                      <Button size="sm" variant="outline" icon={Minus} disabled={r.qty === 0} onClick={() => openForm({ mode: 'out', row: r })}>Chiqim</Button>
                    </span>
                  </Td>
                </tr>
              );
            })}
          </Table>
        )}
      </Card>
    </div>
  );
}

/* ── Kirim / Chiqim shakllari ── */
function StockForm({ mode, stock, onSubmit }) {
  const [sku, setSku] = useState(stock[0].sku);
  const [qty, setQty] = useState(1);
  const [err, setErr] = useState('');
  const row = stock.find((r) => r.sku === sku);
  const isIn = mode === 'in';

  const submit = () => {
    if (!isIn && qty > row.qty) { setErr(`Omborda faqat ${row.qty} dona bor`); return; }
    onSubmit(row, qty);
    setQty(1); setErr('');
  };

  return (
    <Card className="max-w-xl">
      <SectionTitle>{isIn ? 'Yangi kirim' : 'Yangi chiqim'}</SectionTitle>
      <div className="space-y-4">
        <label className="block">
          <span className="block text-[12px] font-medium text-muted mb-1.5">Mahsulot</span>
          <select value={sku} onChange={(e) => { setSku(e.target.value); setErr(''); }}
            className="w-full h-11 rounded-btn border border-line bg-surface px-3 text-sm">
            {stock.map((r) => <option key={r.sku} value={r.sku}>{r.sku} · {r.name} ({r.qty} dona)</option>)}
          </select>
        </label>
        <label className="block">
          <span className="block text-[12px] font-medium text-muted mb-1.5">Miqdor (dona)</span>
          <Input type="number" min="1" value={qty} onChange={(e) => { setQty(Math.max(1, +e.target.value || 1)); setErr(''); }} error={err} />
        </label>
        <div className="flex items-center justify-between">
          <span className="text-[13px] text-muted">Joriy zaxira: <b className="text-body tnum">{row.qty}</b> dona</span>
          <Stepper value={qty} onChange={(q) => { setQty(q); setErr(''); }} />
        </div>
        <label className="block">
          <span className="block text-[12px] font-medium text-muted mb-1.5">{isIn ? 'Yetkazib beruvchi' : 'Filial / maqsad'}</span>
          <select className="w-full h-11 rounded-btn border border-line bg-surface px-3 text-sm">
            {isIn ? SUPPLIERS.map((s) => <option key={s.id}>{s.name}</option>) : BRANCHES.slice(1, 6).map((b) => <option key={b}>{b}</option>)}
          </select>
        </label>
        <Input label="Izoh" placeholder={isIn ? 'HN raqami, partiya…' : 'Buyurtma raqami…'} />
        <div className="flex gap-3">
          <Button variant="outline" className="flex-1">Bekor qilish</Button>
          <Button className="flex-[2]" icon={isIn ? Plus : Minus} onClick={submit}>{isIn ? 'Kirimni tasdiqlash' : 'Chiqimni tasdiqlash'}</Button>
        </div>
      </div>
    </Card>
  );
}

/* ── Kirim/chiqim modali (jadvaldan) ── */
function StockModal({ form, onClose, onSubmit }) {
  const [qty, setQty] = useState(1);
  const isIn = form.mode === 'in';
  const max = isIn ? 9999 : form.row.qty;
  return (
    <Modal global open onClose={onClose} title={isIn ? `Kirim: ${form.row.name}` : `Chiqim: ${form.row.name}`}>
      <div className="flex items-center justify-between bg-bg rounded-card p-3 mb-4">
        <span className="text-[13px] text-muted">Joriy zaxira</span>
        <span className="tnum text-[16px] font-bold">{form.row.qty} dona</span>
      </div>
      <div className="flex items-center justify-between mb-5">
        <span className="text-[13px] font-medium">Miqdor</span>
        <Stepper value={qty} onChange={(v) => setQty(Math.min(v, max))} min={1} />
      </div>
      <div className="flex gap-3">
        <Button variant="outline" className="flex-1" onClick={onClose}>Bekor</Button>
        <Button className="flex-[2]" icon={isIn ? Plus : Minus} onClick={() => onSubmit(qty)} disabled={!isIn && qty > form.row.qty}>Tasdiqlash</Button>
      </div>
    </Modal>
  );
}

/* ── Mahsulot tafsiloti modali ── */
function DetailModal({ row, onClose, onOpen }) {
  const st = statusOf(row);
  return (
    <Modal global open onClose={onClose} title={row.name}>
      <div className="grid grid-cols-2 gap-3 mb-4">
        {[['SKU', row.sku], ['Kategoriya', row.cat], ['Miqdor', `${row.qty} dona`], ['Min. daraja', `${row.min} dona`], ['Joylashuv', row.loc], ['Narx', som(row.qty * 42000)]].map(([k, v]) => (
          <div key={k} className="bg-bg rounded-card p-3">
            <p className="text-[11px] text-muted">{k}</p>
            <p className="text-[14px] font-semibold tnum mt-0.5">{v}</p>
          </div>
        ))}
      </div>
      <div className="mb-4"><Badge tone={st.k}>{st.l}</Badge></div>
      <div className="flex gap-3">
        <Button variant="outline" className="flex-1" onClick={onClose}>Yopish</Button>
        <Button className="flex-1" icon={Plus} onClick={() => onOpen('in')}>Kirim</Button>
        <Button variant="secondary" className="flex-1" icon={Minus} onClick={() => onOpen('out')}>Chiqim</Button>
      </div>
    </Modal>
  );
}

/* ── Sanash ── */
function CountList({ show }) {
  return (
    <div className="grid md:grid-cols-3 gap-4">
      {COUNTS.map((c) => {
        const done = c.counted === c.expected;
        return (
          <Card key={c.zone}>
            <div className="flex items-start justify-between">
              <p className="text-[14px] font-semibold">{c.zone}</p>
              <Badge tone={done ? 'success' : c.counted > 0 ? 'warning' : 'neutral'}>{c.status}</Badge>
            </div>
            <div className="mt-3 h-2 rounded-full bg-bg overflow-hidden">
              <div className={cn('h-full rounded-full', done ? 'bg-success' : 'bg-primary-600')} style={{ width: `${(c.counted / c.expected) * 100}%` }} />
            </div>
            <p className="text-[12px] text-muted mt-2 tnum">{c.counted} / {c.expected} dona sanaldi</p>
            <Button size="sm" variant={done ? 'outline' : 'primary'} className="w-full mt-3" onClick={() => show(done ? 'Sanash yakunlangan' : 'Sanash davom etmoqda')}>
              {done ? 'Hisobot' : 'Davom etish'}
            </Button>
          </Card>
        );
      })}
    </div>
  );
}

/* ── Yetkazib beruvchilar ── */
function Suppliers({ show }) {
  return (
    <div className="grid md:grid-cols-2 xl:grid-cols-4 gap-4">
      {SUPPLIERS.map((s) => (
        <Card key={s.id}>
          <div className="flex items-center gap-3">
            <span className="w-11 h-11 rounded-full bg-primary-100 grid place-items-center text-primary-700 font-bold">{s.name[0]}</span>
            <div className="min-w-0">
              <p className="text-[14px] font-semibold truncate">{s.name}</p>
              <p className="text-[12px] text-muted tnum">{s.phone}</p>
            </div>
          </div>
          <div className="flex items-center justify-between mt-3 text-[12px] text-muted">
            <span>{s.city}</span><span className="tnum">{s.items} ta pozitsiya</span>
          </div>
          <Button size="sm" className="w-full mt-3" onClick={() => show(`${s.name} ga zakaz yuborildi`)}>Zakaz berish</Button>
        </Card>
      ))}
    </div>
  );
}

/* ── Ko'chirishlar (filiallararo) ── */
function Transfers({ show }) {
  const [loading, setLoading] = useState(true);
  useEffect(() => { const t = setTimeout(() => setLoading(false), 600); return () => clearTimeout(t); }, []);
  const tone = { "Yo'lda": 'warning', 'Qabul qilindi': 'success', 'Bekor qilindi': 'danger' };
  return (
    <div className="space-y-4">
      <div className="flex justify-end"><Button icon={ArrowLeftRight} onClick={() => show("Yangi ko'chirish shakli ochildi")}>Yangi ko'chirish</Button></div>
      <Card pad={false} className="p-3">
        {loading ? (
          <div className="space-y-3 p-2">{[0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-9" />)}</div>
        ) : (
          <Table head={['ID', 'Qayerdan', 'Qayerga', 'Mahsulot', 'Miqdor', 'Sana', 'Status']}>
            {TRANSFERS.map((tr) => (
              <tr key={tr.id}>
                <Td className="text-muted">{tr.id}</Td>
                <Td className="font-medium">{tr.from}</Td>
                <Td>{tr.to}</Td>
                <Td className="text-muted">{tr.item}</Td>
                <Td className="font-bold">{tr.qty}</Td>
                <Td className="text-muted">{tr.date}</Td>
                <Td><Badge tone={tone[tr.status]}>{tr.status}</Badge></Td>
              </tr>
            ))}
          </Table>
        )}
      </Card>
    </div>
  );
}
