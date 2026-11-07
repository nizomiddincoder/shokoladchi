import { useRef, useState } from 'react';
import PhoneFrame from './components/PhoneFrame';
import BrandMark from './components/BrandMark';
import Toast from './components/Toast';
import OffersScreen from './screens/OffersScreen';
import PopularScreen from './screens/PopularScreen';
import SearchScreen from './screens/SearchScreen';
import NotFoundScreen from './screens/NotFoundScreen';
import ResultsScreen from './screens/ResultsScreen';
import DetailScreen from './screens/DetailScreen';
import ReviewsScreen from './screens/ReviewsScreen';
import CartScreen from './screens/CartScreen';
import CheckoutScreen from './screens/CheckoutScreen';
import AddressScreen from './screens/AddressScreen';
import ShippingScreen from './screens/ShippingScreen';
import PromoScreen from './screens/PromoScreen';
import PaymentScreen from './screens/PaymentScreen';
import { ADDRESSES, PRODUCTS, PROMOS, SHIPPING } from './data';

const SCREEN_COUNT = 15;

export default function App() {
  // Navigation stack
  const [stack, setStack] = useState([{ name: 'offers' }]);
  const screen = stack[stack.length - 1];
  const push = (name, params) => setStack((s) => [...s, { name, params }]);
  const back = () => setStack((s) => (s.length > 1 ? s.slice(0, -1) : s));
  const reset = (name) => setStack([{ name }]);

  // Shop state
  const [cart, setCart] = useState([]);
  const [likes, setLikes] = useState({});
  const [addresses, setAddresses] = useState(ADDRESSES);
  const [checkout, setCheckout] = useState({ addressId: 1, shippingId: 2, promoId: 0, paymentId: 1 });

  const toggleLike = (id) => setLikes((l) => ({ ...l, [id]: !l[id] }));

  const addToCart = (product, qty, size, pack) => {
    setCart((c) => {
      const i = c.findIndex((x) => x.pid === product.id && x.size === size && x.pack === pack.name);
      if (i >= 0) {
        const n = [...c];
        n[i] = { ...n[i], qty: n[i].qty + qty };
        return n;
      }
      return [...c, { pid: product.id, qty, size, pack: pack.name }];
    });
  };
  const setQty = (idx, qty) => setCart((c) => c.map((x, i) => (i === idx ? { ...x, qty } : x)));
  const removeAt = (idx) => setCart((c) => c.filter((_, i) => i !== idx));

  const addAddress = () => {
    const id = Math.max(...addresses.map((a) => a.id)) + 1;
    setAddresses((a) => [
      ...a,
      { id, label: `New Address ${id}`, name: 'Aziza Karimova', line: '1 Chimson St, Apt 4', city: 'Tashkent, 100000', phone: '+1 (555) 013-4477' },
    ]);
    setCheckout((c) => ({ ...c, addressId: id }));
    showToast('Address added');
  };

  // Money math
  const subtotal = cart.reduce((s, x) => s + PRODUCTS.find((p) => p.id === x.pid).price * x.qty, 0);
  const promo = PROMOS.find((p) => p.id === checkout.promoId);
  const shipping = promo?.value === 'ship' ? 0 : SHIPPING.find((s) => s.id === checkout.shippingId).price;
  const discount = typeof promo?.value === 'number' ? (promo.value < 1 ? subtotal * promo.value : promo.value) : 0;
  const total = Math.max(0, subtotal + shipping - discount);
  const totals = { subtotal, shipping, discount, total };
  const cartCount = cart.reduce((s, x) => s + x.qty, 0);

  // Toast
  const [toast, setToast] = useState(null);
  const timer = useRef(null);
  const showToast = (msg) => {
    clearTimeout(timer.current);
    setToast(msg);
    timer.current = setTimeout(() => setToast(null), 2200);
  };

  const renderScreen = () => {
    switch (screen.name) {
      case 'offers':
        return <OffersScreen push={push} cartCount={cartCount} />;
      case 'popular':
        return <PopularScreen back={back} push={push} likes={likes} toggleLike={toggleLike} />;
      case 'search':
        return <SearchScreen back={back} push={push} />;
      case 'notfound':
        return <NotFoundScreen back={back} push={push} params={screen.params} />;
      case 'results':
        return <ResultsScreen back={back} push={push} params={screen.params} likes={likes} toggleLike={toggleLike} />;
      case 'detail':
        return (
          <DetailScreen
            back={back}
            push={push}
            params={screen.params}
            likes={likes}
            toggleLike={toggleLike}
            addToCart={addToCart}
            showToast={showToast}
          />
        );
      case 'reviews':
        return <ReviewsScreen back={back} params={screen.params} />;
      case 'cart':
        return <CartScreen back={back} push={push} cart={cart} setQty={setQty} removeAt={removeAt} />;
      case 'checkout':
        return (
          <CheckoutScreen back={back} push={push} cart={cart} checkout={checkout} totals={totals} />
        );
      case 'address':
        return (
          <AddressScreen
            back={back}
            addresses={addresses}
            addressId={checkout.addressId}
            setAddressId={(id) => setCheckout((c) => ({ ...c, addressId: id }))}
            addAddress={addAddress}
          />
        );
      case 'shipping':
        return (
          <ShippingScreen
            back={back}
            push={push}
            params={screen.params}
            shippingId={checkout.shippingId}
            setShippingId={(id) => setCheckout((c) => ({ ...c, shippingId: id }))}
          />
        );
      case 'promo':
        return (
          <PromoScreen
            back={back}
            push={push}
            params={screen.params}
            promoId={checkout.promoId}
            setPromoId={(id) => setCheckout((c) => ({ ...c, promoId: id }))}
          />
        );
      case 'payment':
        return (
          <PaymentScreen
            back={back}
            paymentId={checkout.paymentId}
            setPaymentId={(id) => setCheckout((c) => ({ ...c, paymentId: id }))}
            totals={totals}
            onConfirm={() => {
              setCart([]);
              reset('offers');
              showToast('Payment confirmed — thank you!');
            }}
          />
        );
      default:
        return <OffersScreen push={push} cartCount={cartCount} />;
    }
  };

  return (
    <div className="min-h-[100dvh] w-full bg-[#0C0C0E] sm:grid sm:place-items-center relative overflow-hidden font-sans">
      {/* Ambient desktop backdrop */}
      <div
        className="hidden sm:block absolute inset-0 pointer-events-none"
        style={{
          background:
            'radial-gradient(60% 50% at 18% 20%, rgba(139,94,60,0.28), transparent 60%), radial-gradient(50% 45% at 85% 80%, rgba(245,179,1,0.10), transparent 60%)',
        }}
      />
      <div className="hidden sm:flex absolute left-[8%] top-1/2 -translate-y-1/2 flex-col items-start gap-5 max-w-[300px]">
        <div className="w-16 h-16 rounded-[18px] bg-ink shadow-card grid place-items-center">
          <BrandMark className="w-10 h-10" />
        </div>
        <div>
          <h1 className="text-white text-[28px] font-bold leading-tight">Shokoladchi</h1>
          <p className="text-white/50 text-[14px] mt-1 leading-relaxed">
            Premium mobile e-commerce UI kit — iOS style, {SCREEN_COUNT} screens, fully clickable flow.
          </p>
        </div>
        <p className="text-white/30 text-[12px] leading-relaxed">
          Offers → Popular → Detail → Cart → Checkout → Shipping → Promo → Payment. Click through it on
          the right.
        </p>
      </div>

      <PhoneFrame>
        {renderScreen()}
        <Toast msg={toast} />
      </PhoneFrame>
    </div>
  );
}
