// ── 1-modul: XARIDOR ilovasi (mobil, 390px) ────────────────────────────────
import { useEffect, useMemo, useState } from 'react';
import {
  ChevronRight, ClipboardList, CreditCard, Heart, Home, LogOut, MapPin, Phone,
  Search, Settings, ShoppingBag, Store, Trash2, User, Wallet,
} from 'lucide-react';
import {
  Badge, Button, Card, Checkbox, Chip, EmptyState, Input, PhoneFrame, PriceText,
  ProductImage, RadioCard, Rating, SectionTitle, Skeleton, StatusBar, Stepper, Toast, cn, useToast,
} from '../ui';
import { t } from '../i18n';
import { som } from '../format';
import { ADDONS, CATEGORIES, DELIVERY, FREE_OVER, ORDERS, PRODUCTS, PROMOS, SIZES, STEPS, STEP_OF, unitPrice } from '../data';

const NAV = [
  { id: 'home', icon: Home, label: t('nav.home') },
  { id: 'fav', icon: Heart, label: t('nav.fav') },
  { id: 'cart', icon: ShoppingBag, label: t('nav.cart') },
  { id: 'orders', icon: ClipboardList, label: t('nav.orders') },
  { id: 'profile', icon: User, label: t('nav.profile') },
];
const P = (id) => PRODUCTS.find((p) => p.id === id);
const cartKey = (i) => `${i.pid}|${i.size}|${i.addons.slice().sort().join(',')}`;

export default function CustomerApp() {
  const [scr, setScr] = useState('home');
  const [sel, setSel] = useState(null);
  const [cart, setCart] = useState([]);
  const [likes, setLikes] = useState({ 1: true, 6: true });
  const [promo, setPromo] = useState(null); // {code, rate}
  const [orders, setOrders] = useState(ORDERS);
  const [lastOrder, setLastOrder] = useState(null);
  const { msg, show } = useToast();

  const go = (s) => setScr(s);
  const openDetail = (pid) => { setSel(pid); go('detail'); };

  const add = (pid, qty = 1, size = '100 g', addons = []) => {
    const item = { pid, qty, size, addons };
    setCart((c) => {
      const i = c.findIndex((x) => cartKey(x) === cartKey(item));
      if (i >= 0) { const n = [...c]; n[i] = { ...n[i], qty: n[i].qty + qty }; return n; }
      return [...c, item];
    });
  };

  const subtotal = cart.reduce((s, x) => s + unitPrice(P(x.pid), x.size, x.addons) * x.qty, 0);
  const discount = promo ? Math.round(subtotal * promo.rate) : 0;
  const delivery = subtotal >= FREE_OVER || subtotal === 0 ? 0 : DELIVERY;
  const total = subtotal - discount + delivery;

  const confirmOrder = (address) => {
    const o = { id: `SK-${1042 + orders.length}`, date: '07.11.2026', items: cart.map(({ pid, qty }) => ({ pid, qty })), status: 'Tayyorlanmoqda' };
    setOrders((x) => [o, ...x]);
    setLastOrder({ ...o, total, address });
    setCart([]); setPromo(null);
    show('Buyurtma qabul qilindi');
    go('status');
  };

  const cartCount = cart.reduce((s, x) => s + x.qty, 0);
  const showNav = ['home', 'fav', 'cart', 'orders', 'profile'].includes(scr);

  return (
    <div className="relative h-full flex flex-col bg-bg font-sans">
      <StatusBar />
      <div className="flex-1 min-h-0 overflow-y-auto no-scrollbar">
        {scr === 'home' && <HomeScreen onOpen={openDetail} likes={likes} toggleLike={(id) => setLikes((l) => ({ ...l, [id]: !l[id] }))} onAdd={(pid) => { add(pid); show("Savatga qo'shildi"); }} go={go} />}
        {scr === 'detail' && sel && <DetailScreen pid={sel} back={() => go('home')} onAdd={(qty, size, addons) => { add(sel, qty, size, addons); show("Savatga qo'shildi"); go('cart'); }} />}
        {scr === 'cart' && <CartScreen cart={cart} setCart={setCart} promo={promo} setPromo={setPromo} subtotal={subtotal} discount={discount} delivery={delivery} total={total} go={go} show={show} />}
        {scr === 'checkout' && cart.length > 0 && <CheckoutScreen total={total} subtotal={subtotal} discount={discount} delivery={delivery} back={() => go('cart')} onConfirm={confirmOrder} />}
        {scr === 'status' && <StatusScreen order={lastOrder || orders[0]} go={go} />}
        {scr === 'fav' && <FavScreen likes={likes} onOpen={openDetail} go={go} />}
        {scr === 'orders' && <OrdersScreen orders={orders} go={go} onOpenStatus={() => go('status')} />}
        {scr === 'profile' && <ProfileScreen show={show} />}
      </div>
      {showNav && (
        <nav aria-label="Asosiy navigatsiya" className="shrink-0 bg-surface border-t border-line px-2 pt-2 pb-5 flex justify-between">
          {NAV.map((n) => {
            const active = scr === n.id;
            return (
              <button key={n.id} onClick={() => go(n.id)} aria-current={active ? 'page' : undefined} className="flex-1 flex flex-col items-center gap-1">
                <span className={cn('relative h-8 min-w-[56px] px-3 rounded-full grid place-items-center transition', active && 'bg-primary-100')}>
                  <n.icon size={19} className={active ? 'text-primary-700' : 'text-muted'} />
                  {n.id === 'cart' && cartCount > 0 && (
                    <span className="absolute -top-1 -right-0.5 min-w-[17px] h-[17px] px-1 rounded-full bg-primary-600 text-white text-[10px] font-bold grid place-items-center tnum">{cartCount}</span>
                  )}
                </span>
                <span className={cn('text-[10px] font-medium', active ? 'text-primary-700' : 'text-muted')}>{n.label}</span>
              </button>
            );
          })}
        </nav>
      )}
      <Toast msg={msg} />
    </div>
  );
}

/* ── Bosh sahifa ── */
function HomeScreen({ onOpen, likes, toggleLike, onAdd, go }) {
  const [q, setQ] = useState('');
  const [cat, setCat] = useState('Barchasi');
  const [loading, setLoading] = useState(true);
  useEffect(() => { const t = setTimeout(() => setLoading(false), 700); return () => clearTimeout(t); }, []);

  const list = PRODUCTS.filter((p) => (cat === 'Barchasi' || p.cat === cat) && p.name.toLowerCase().includes(q.toLowerCase()));

  return (
    <div className="pb-4">
      <header className="px-5 pt-2 pb-3 flex items-center gap-3">
        <div className="w-10 h-10 rounded-card bg-primary-700 grid place-items-center text-[15px] font-bold text-white">AK</div>
        <div className="flex-1 min-w-0">
          <p className="text-[15px] font-semibold leading-tight">Salom, Aziza</p>
          <p className="text-[12px] text-muted flex items-center gap-1"><MapPin size={11} /> Toshkent, Yunusobod</p>
        </div>
        <Button size="sm" variant="ghost" icon={Store} onClick={go && (() => go('orders'))}>Filiallar</Button>
      </header>

      <div className="px-5">
        <Input icon={Search} placeholder={t('home.search')} value={q} onChange={(e) => setQ(e.target.value)} aria-label="Qidiruv" />
      </div>

      <div className="flex gap-2 px-5 py-3 overflow-x-auto no-scrollbar">
        {CATEGORIES.map((c) => <Chip key={c} active={cat === c} onClick={() => setCat(c)}>{c}</Chip>)}
      </div>

      {/* Promo banner */}
      <div className="mx-5 mb-5 rounded-card p-4 flex items-center gap-4 text-white shadow-pop" style={{ background: 'linear-gradient(120deg, var(--c-primary-700), var(--c-primary-600))' }}>
        <div className="flex-1">
          <p className="text-[11px] font-semibold text-white/80">{t('home.promoSub')}</p>
          <p className="text-[20px] font-extrabold leading-tight mt-0.5">{t('home.promo')} <span className="tnum">−30%</span></p>
          <span className="inline-block mt-2 text-[11px] font-bold bg-white text-primary-700 rounded-full px-3 py-1">08.11 gacha</span>
        </div>
        <ProductImage p={P(1)} className="w-24 h-24 rounded-card" />
      </div>

      <div className="px-5">
        <SectionTitle right={<button className="text-[12px] font-semibold text-primary-700">Barchasi</button>}>{t('home.best')}</SectionTitle>
        {loading ? (
          <div className="grid grid-cols-2 gap-3.5">
            {[0, 1, 2, 3].map((i) => (
              <Card key={i} className="!p-2.5">
                <Skeleton className="aspect-square rounded-card mb-2" />
                <Skeleton className="h-3.5 w-3/4 mb-2" />
                <Skeleton className="h-4 w-1/2" />
              </Card>
            ))}
          </div>
        ) : list.length === 0 ? (
          <EmptyState icon={Search} title="Topilmadi" text="Boshqa so'z bilan qidirib ko'ring" />
        ) : (
          <div className="grid grid-cols-2 gap-3.5">
            {list.map((p) => (
              <Card key={p.id} className="!p-2.5 cursor-pointer" pad={false}>
                <div onClick={() => onOpen(p.id)}>
                  <div className="relative">
                    <ProductImage p={p} className="aspect-square rounded-[12px]" />
                    <button onClick={(e) => { e.stopPropagation(); toggleLike(p.id); }} aria-label="Sevimlilarga"
                      className="absolute top-2 right-2 w-8 h-8 rounded-full bg-surface shadow-soft grid place-items-center">
                      <Heart size={14} className={likes[p.id] ? 'text-danger fill-danger' : 'text-muted'} />
                    </button>
                  </div>
                  <p className="text-[13px] font-medium leading-tight truncate mt-2 px-0.5">{p.name}</p>
                  <div className="px-0.5 mt-1"><Rating value={p.rating} /></div>
                </div>
                <div className="flex items-center justify-between mt-1.5 px-0.5 pb-0.5">
                  <PriceText value={p.price} old={p.old} size="sm" />
                  <button onClick={() => onAdd(p.id)} aria-label={`${p.name} savatga`}
                    className="w-9 h-9 rounded-full bg-primary-600 text-white grid place-items-center active:scale-90 transition font-bold text-lg leading-none">+</button>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

/* ── Mahsulot tafsiloti ── */
function DetailScreen({ pid, back, onAdd }) {
  const p = P(pid);
  const [size, setSize] = useState('100 g');
  const [addons, setAddons] = useState([]);
  const [qty, setQty] = useState(1);
  const unit = unitPrice(p, size, addons);

  return (
    <div className="pb-2">
      <div className="px-4 py-2 flex items-center justify-between">
        <button onClick={back} aria-label="Orqaga" className="w-10 h-10 rounded-full bg-surface border border-line grid place-items-center">←</button>
        <span className="text-[15px] font-semibold">Tafsilot</span>
        <span className="w-10" />
      </div>
      <div className="px-5">
        <ProductImage p={p} className="h-[260px] w-full" mark="w-24 h-24" />
        <h1 className="text-[19px] font-semibold mt-4 leading-tight">{p.name}</h1>
        <div className="flex items-center justify-between mt-1.5">
          <Rating value={p.rating} count={p.reviews} size={13} />
          <span className="text-[12px] text-muted tnum">{p.mins} min</span>
        </div>
        <p className="text-[13px] text-muted leading-relaxed mt-2.5">{p.desc}</p>

        <div className="mt-5" role="radiogroup" aria-label={t('det.size')}>
          <SectionTitle>{t('det.size')}</SectionTitle>
          <div className="space-y-2.5">
            {SIZES.map((s) => (
              <RadioCard key={s.k} name="size" checked={size === s.k} onChange={() => setSize(s.k)}
                title={s.k} sub={`${p.name} · ${s.k}`}
                right={<PriceText value={Math.round((p.price * s.f) / 1000) * 1000} size="sm" />} />
            ))}
          </div>
        </div>

        <div className="mt-5">
          <SectionTitle>{t('det.addons')}</SectionTitle>
          <Card className="divide-y divide-line">
            {ADDONS.map((a) => (
              <Checkbox key={a.k} label={a.k} right={`+${som(a.p)}`}
                checked={addons.includes(a.k)}
                onChange={(v) => setAddons((x) => (v ? [...x, a.k] : x.filter((k) => k !== a.k)))} />
            ))}
          </Card>
        </div>

        <div className="mt-5 flex items-center justify-between">
          <SectionTitle className="mb-0">{t('det.qty')}</SectionTitle>
          <Stepper value={qty} onChange={setQty} />
        </div>
      </div>

      {/* Sticky CTA */}
      <div className="sticky bottom-0 mt-6 bg-surface border-t border-line px-5 py-3.5 flex items-center gap-4">
        <div className="shrink-0">
          <p className="text-[11px] text-muted">{t('sum.total')}</p>
          <PriceText value={unit * qty} size="lg" />
        </div>
        <Button size="lg" className="flex-1" onClick={() => onAdd(qty, size, addons)}>
          {t('cta.addToCart')} · {som(unit * qty)}
        </Button>
      </div>
    </div>
  );
}

/* ── Savat ── */
function CartScreen({ cart, setCart, promo, setPromo, subtotal, discount, delivery, total, go, show }) {
  const [code, setCode] = useState('');
  const [err, setErr] = useState('');
  const applyPromo = () => {
    const c = code.trim().toUpperCase();
    if (PROMOS[c]) { setPromo({ code: c, rate: PROMOS[c] }); setErr(''); show('Promokod qo\'llandi'); }
    else { setErr('Promokod topilmadi'); }
  };
  const setQty = (i, qty) => setCart((c) => c.map((x, j) => (j === i ? { ...x, qty } : x)));
  const remove = (i) => setCart((c) => c.filter((_, j) => j !== i));

  if (cart.length === 0)
    return <EmptyState icon={ShoppingBag} title={t('cart.empty')} text={t('cart.emptyText')}
      action={<Button onClick={() => go('home')}>Menyuga o'tish</Button>} />;

  return (
    <div className="px-5 pt-2 pb-6">
      <h1 className="text-[18px] font-semibold mb-3">{t('cart.title')} <span className="text-muted text-[14px] tnum">({cart.length})</span></h1>
      <div className="space-y-3">
        {cart.map((x, i) => {
          const p = P(x.pid);
          return (
            <Card key={cartKey(x)} className="flex gap-3">
              <ProductImage p={p} className="w-20 h-20 rounded-[12px]" mark="w-7 h-7" />
              <div className="flex-1 min-w-0 flex flex-col">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-[13px] font-semibold truncate">{p.name}</p>
                    <p className="text-[11px] text-muted mt-0.5">{x.size}{x.addons.length > 0 && ` · ${x.addons.join(', ')}`}</p>
                  </div>
                  <button onClick={() => remove(i)} aria-label="O'chirish" className="w-8 h-8 grid place-items-center text-muted"><Trash2 size={16} /></button>
                </div>
                <div className="flex items-end justify-between mt-auto">
                  <PriceText value={unitPrice(p, x.size, x.addons) * x.qty} size="sm" />
                  <Stepper small value={x.qty} onChange={(q) => setQty(i, q)} />
                </div>
              </div>
            </Card>
          );
        })}
      </div>

      <Card className="mt-4">
        <p className="text-[12px] font-medium text-muted mb-1.5">{t('cart.promo')}</p>
        <Input placeholder="SHIRIN10" value={code} onChange={(e) => setCode(e.target.value)} error={err}
          right={<Button size="sm" onClick={applyPromo}>{t('cta.apply')}</Button>} />
        {promo && <p className="text-[12px] font-semibold text-success mt-1.5">{promo.code} · −{promo.rate * 100}%</p>}
      </Card>

      <Card className="mt-4 space-y-2">
        <Row label={t('sum.subtotal')} value={som(subtotal)} />
        {discount > 0 && <Row label={t('sum.discount')} value={`−${som(discount)}`} tone="success" />}
        <Row label={t('sum.delivery')} value={delivery === 0 ? t('sum.free') : som(delivery)} />
        <div className="border-t border-line pt-2.5 flex items-center justify-between">
          <span className="text-[14px] font-semibold">{t('sum.total')}</span>
          <PriceText value={total} size="lg" />
        </div>
      </Card>

      <div className="mt-4"><Button size="lg" onClick={() => go('checkout')}>{t('cta.order')}</Button></div>
      {subtotal < FREE_OVER && (
        <p className="text-[11px] text-muted text-center mt-2.5 tnum">{som(FREE_OVER)} dan yuqoriga yetkazib berish bepul</p>
      )}
    </div>
  );
}
const Row = ({ label, value, tone }) => (
  <div className="flex items-center justify-between text-[13px]">
    <span className="text-muted">{label}</span>
    <span className={cn('tnum font-semibold', tone === 'success' && 'text-success')}>{value}</span>
  </div>
);

/* ── Rasmiylashtirish ── */
function CheckoutScreen({ subtotal, discount, delivery, total, back, onConfirm }) {
  const [addr, setAddr] = useState('Yunusobod-4, 23-uy, 14-xonadon');
  const [pay, setPay] = useState('cash');
  const [note, setNote] = useState('');
  const [err, setErr] = useState('');
  const submit = () => {
    if (!addr.trim()) { setErr('Manzilni kiriting'); return; }
    onConfirm(addr);
  };
  return (
    <div className="px-5 pt-2 pb-6">
      <div className="flex items-center gap-3 mb-4">
        <button onClick={back} aria-label="Orqaga" className="w-10 h-10 rounded-full bg-surface border border-line grid place-items-center">←</button>
        <h1 className="text-[18px] font-semibold">{t('cta.checkout')}</h1>
      </div>
      <Card>
        <SectionTitle>Yetkazib berish manzili</SectionTitle>
        <Input label="Manzil" value={addr} onChange={(e) => { setAddr(e.target.value); setErr(''); }} error={err} icon={MapPin} />
        <Input label="Izoh (ixtiyoriy)" placeholder="2-qavat, koddarsiz" value={note} onChange={(e) => setNote(e.target.value)} className="mt-3" />
      </Card>
      <div className="mt-4" role="radiogroup" aria-label="To'lov usuli">
        <SectionTitle>To'lov usuli</SectionTitle>
        <div className="space-y-2.5">
          <RadioCard name="pay" checked={pay === 'cash'} onChange={() => setPay('cash')} title="Naqd pul" sub="Yetkazilganda to'lash" icon-right />
          <RadioCard name="pay" checked={pay === 'card'} onChange={() => setPay('card')} title="Karta" sub="•••• 4679" />
          <RadioCard name="pay" checked={pay === 'payme'} onChange={() => setPay('payme')} title="Payme / Click" sub="Onlayn to'lov" />
        </div>
      </div>
      <Card className="mt-4 space-y-2">
        <Row label={t('sum.subtotal')} value={som(subtotal)} />
        {discount > 0 && <Row label={t('sum.discount')} value={`−${som(discount)}`} tone="success" />}
        <Row label={t('sum.delivery')} value={delivery === 0 ? t('sum.free') : som(delivery)} />
        <div className="border-t border-line pt-2.5 flex items-center justify-between">
          <span className="text-[14px] font-semibold">{t('sum.total')}</span>
          <PriceText value={total} size="lg" />
        </div>
      </Card>
      <div className="mt-4"><Button size="lg" onClick={submit}>{t('cta.confirmOrder')} · {som(total)}</Button></div>
    </div>
  );
}

/* ── Buyurtma holati ── */
function StatusScreen({ order, go }) {
  const step = STEP_OF[order.status] ?? 1;
  return (
    <div className="px-5 pt-2 pb-6">
      <h1 className="text-[18px] font-semibold mb-1">{t('status.title')}</h1>
      <p className="text-[12px] text-muted tnum">Buyurtma № {order.id} · {order.date}</p>

      <Card className="mt-4">
        <div className="flex items-center justify-between text-[11px] font-semibold mb-3">
          {STEPS.map((s, i) => (
            <span key={s} className={cn('text-center flex-1', i <= step ? 'text-primary-700' : 'text-muted')}>{s}</span>
          ))}
        </div>
        <div className="flex items-center">
          {STEPS.map((s, i) => (
            <div key={s} className="flex items-center flex-1 last:flex-none">
              <span className={cn('w-3.5 h-3.5 rounded-full shrink-0', i < step ? 'bg-primary-600' : i === step ? 'bg-primary-400 ring-4 ring-primary-100' : 'bg-line')} />
              {i < STEPS.length - 1 && <span className={cn('h-1 flex-1 rounded-full', i < step ? 'bg-primary-600' : 'bg-line')} />}
            </div>
          ))}
        </div>
        <p className="text-[12px] text-muted text-center mt-3 tnum">Taxminiy vaqt: 25–30 min</p>
      </Card>

      <Card className="mt-4 flex items-center gap-3">
        <span className="w-11 h-11 rounded-full bg-primary-100 grid place-items-center text-primary-700 font-bold">B</span>
        <div className="flex-1">
          <p className="text-[14px] font-semibold">Bekzod — kuryer</p>
          <Rating value={4.9} />
        </div>
        <Button variant="secondary" size="sm" icon={Phone}>Qo'ng'iroq</Button>
      </Card>

      <Card className="mt-4">
        <SectionTitle>Buyurtma tarkibi</SectionTitle>
        <div className="space-y-2">
          {order.items.map(({ pid, qty }) => (
            <div key={pid} className="flex items-center justify-between text-[13px]">
              <span className="text-muted">{P(pid).name} × <span className="tnum">{qty}</span></span>
              <span className="tnum font-semibold">{som(P(pid).price * qty)}</span>
            </div>
          ))}
          <div className="border-t border-line pt-2 flex justify-between">
            <span className="text-[13px] font-semibold">{t('sum.total')}</span>
            <PriceText value={order.items.reduce((s, x) => s + P(x.pid).price * x.qty, 0)} size="sm" />
          </div>
        </div>
      </Card>
      <div className="mt-4"><Button size="lg" onClick={() => go('home')}>Bosh sahifaga</Button></div>
    </div>
  );
}

/* ── Sevimlilar ── */
function FavScreen({ likes, onOpen, go }) {
  const list = PRODUCTS.filter((p) => likes[p.id]);
  if (list.length === 0)
    return <EmptyState icon={Heart} title="Sevimlilar bo'sh" text="Yurakcha belgisini bosib saqlab qo'ying"
      action={<Button onClick={() => go('home')}>Menyuga o'tish</Button>} />;
  return (
    <div className="px-5 pt-2 pb-6">
      <h1 className="text-[18px] font-semibold mb-3">{t('nav.fav')}</h1>
      <div className="grid grid-cols-2 gap-3.5">
        {list.map((p) => (
          <Card key={p.id} className="!p-2.5 cursor-pointer" onClick={() => onOpen(p.id)}>
            <ProductImage p={p} className="aspect-square rounded-[12px]" />
            <p className="text-[13px] font-medium truncate mt-2">{p.name}</p>
            <div className="flex items-center justify-between mt-1">
              <PriceText value={p.price} size="sm" />
              <ChevronRight size={14} className="text-muted" />
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}

/* ── Buyurtmalar ── */
function OrdersScreen({ orders, onOpenStatus }) {
  return (
    <div className="px-5 pt-2 pb-6">
      <h1 className="text-[18px] font-semibold mb-3">{t('nav.orders')}</h1>
      {orders.length === 0 ? (
        <EmptyState icon={ClipboardList} title="Buyurtmalar yo'q" text="Birinchi buyurtmaringizni berding" />
      ) : (
        <div className="space-y-3">
          {orders.map((o) => (
            <Card key={o.id} className="cursor-pointer" onClick={onOpenStatus}>
              <div className="flex items-center justify-between">
                <span className="text-[14px] font-semibold tnum">№ {o.id}</span>
                <Badge tone={o.status === 'Yetkazildi' ? 'success' : o.status === "Yo'lda" ? 'warning' : 'brand'}>{o.status}</Badge>
              </div>
              <p className="text-[12px] text-muted mt-1 tnum">{o.date} · {o.items.length} ta mahsulot</p>
              <div className="flex items-center justify-between mt-2">
                <PriceText value={o.items.reduce((s, x) => s + P(x.pid).price * x.qty, 0)} size="sm" />
                <ChevronRight size={16} className="text-muted" />
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

/* ── Profil ── */
function ProfileScreen({ show }) {
  const items = [
    { icon: MapPin, label: 'Manzillarim' },
    { icon: CreditCard, label: "To'lov kartalari" },
    { icon: Wallet, label: 'Hamyon' },
    { icon: Settings, label: 'Sozlamalar' },
    { icon: LogOut, label: 'Chiqish', tone: 'danger' },
  ];
  return (
    <div className="px-5 pt-2 pb-6">
      <Card className="flex items-center gap-3.5">
        <span className="w-14 h-14 rounded-full bg-primary-100 grid place-items-center text-primary-700 font-bold text-[17px]">AK</span>
        <div>
          <p className="text-[15px] font-semibold">Aziza Karimova</p>
          <p className="text-[12px] text-muted tnum">+998 90 123 45 67</p>
        </div>
      </Card>
      <Card className="mt-4 divide-y divide-line !p-0 overflow-hidden">
        {items.map((it) => (
          <button key={it.label} onClick={() => show('Tez orada qo\'shiladi')} className="w-full flex items-center gap-3 px-4 py-3.5 text-left">
            <it.icon size={17} className={it.tone === 'danger' ? 'text-danger' : 'text-primary-400'} />
            <span className={cn('flex-1 text-[14px] font-medium', it.tone === 'danger' && 'text-danger')}>{it.label}</span>
            <ChevronRight size={15} className="text-muted" />
          </button>
        ))}
      </Card>
      <p className="text-[11px] text-muted text-center mt-6">Shokoladchi · v1.0.0</p>
    </div>
  );
}
