// ─── Dummy data for the Shokoladchi mobile UI kit ────────────────────────────

export const BRAND = 'Shokoladchi';

export const CATEGORIES = ['All', 'Chocolate', 'Bars', 'Bonbons', 'Gifts', 'Drinks'];

export const PRODUCTS = [
  {
    id: 1, name: 'Royal Truffle Box', category: 'Chocolate',
    price: 24.90, oldPrice: 32.00, rating: 4.9, reviews: 1243, delivery: '25–35 min',
    c1: '#4a2c1a', c2: '#7b4a26',
    desc: 'A luxurious assortment of twelve hand-rolled truffles with silky ganache centers, dusted with premium cocoa. Crafted fresh every morning by our master chocolatiers.',
  },
  {
    id: 2, name: 'Dark 85% Cocoa Bar', category: 'Bars',
    price: 6.50, rating: 4.7, reviews: 861, delivery: '20–30 min',
    c1: '#2b1a12', c2: '#52301d',
    desc: 'Intensely rich single-origin dark chocolate with 85% cocoa content. Notes of roasted hazelnut and a long, bittersweet finish.',
  },
  {
    id: 3, name: 'Hazelnut Pralines', category: 'Bonbons',
    price: 18.00, oldPrice: 22.00, rating: 4.8, reviews: 932, delivery: '25–40 min',
    c1: '#6f4a2f', c2: '#a87848',
    desc: 'Crispy caramelized hazelnuts wrapped in creamy milk chocolate praline. A timeless classic, made in small batches.',
  },
  {
    id: 4, name: 'Caramel Bonbons', category: 'Bonbons',
    price: 14.20, rating: 4.6, reviews: 517, delivery: '20–35 min',
    c1: '#8a5a2b', c2: '#d19a54',
    desc: 'Golden salted caramel cores sealed in a thin shell of milk chocolate. Finished with a whisper of sea salt.',
  },
  {
    id: 5, name: 'Milk Chocolate Classic', category: 'Chocolate',
    price: 5.90, rating: 4.5, reviews: 2043, delivery: '15–25 min',
    c1: '#7a4e2d', c2: '#b07a44',
    desc: 'Our signature smooth and creamy milk chocolate bar with 38% cocoa. The one that started it all.',
  },
  {
    id: 6, name: 'Ruby Berry Bar', category: 'Bars',
    price: 8.40, rating: 4.8, reviews: 388, delivery: '20–30 min',
    c1: '#a03e52', c2: '#d4718a',
    desc: 'Naturally pink ruby chocolate fused with freeze-dried raspberry pieces. Tart, sweet and totally unique.',
  },
  {
    id: 7, name: 'Deluxe Gift Collection', category: 'Gifts',
    price: 49.00, oldPrice: 65.00, rating: 4.9, reviews: 645, delivery: '30–45 min',
    c1: '#1c1c1e', c2: '#4d3b2a',
    desc: 'A curated box of 24 signature pralines, truffles and bars presented in our elegant black-and-gold gift packaging.',
  },
  {
    id: 8, name: 'Cocoa Cookies Box', category: 'Gifts',
    price: 12.30, rating: 4.4, reviews: 274, delivery: '20–30 min',
    c1: '#5b4232', c2: '#93705a',
    desc: 'Buttery shortbread cookies dipped in dark chocolate and cocoa dust. Perfect alongside coffee or hot cocoa.',
  },
  {
    id: 9, name: 'Hot Cocoa Set', category: 'Drinks',
    price: 16.80, rating: 4.7, reviews: 198, delivery: '25–35 min',
    c1: '#4e3421', c2: '#8c6239',
    desc: 'Rich drinking chocolate flakes with two ceramic mugs and marshmallow miniatures. Winter in a cup.',
  },
  {
    id: 10, name: 'White Matcha Bar', category: 'Bars',
    price: 7.60, rating: 4.3, reviews: 121, delivery: '20–30 min',
    c1: '#6f7d5a', c2: '#b9c9a2',
    desc: 'Velvety white chocolate blended with ceremonial-grade matcha. Delicate sweetness with an earthy lift.',
  },
];

export const OFFERS = [
  { id: 1, pct: 30, label: "Today's Special", sub: 'On all truffle boxes', pid: 1 },
  { id: 2, pct: 25, label: 'Weekend Deals', sub: 'Bonbons & pralines', pid: 3 },
  { id: 3, pct: 40, label: 'New Arrivals', sub: 'Ruby berry collection', pid: 6 },
  { id: 4, pct: 20, label: 'Black Friday', sub: 'Deluxe gift collection', pid: 7 },
];

export const RECENTS = ['Truffle box', 'Dark chocolate', 'Pralines', 'Gift set', 'Hot cocoa'];

export const SIZES = ['50g', '100g', '250g', '500g'];

export const PACKS = [
  { name: 'Classic Black', hex: '#111111' },
  { name: 'Gold', hex: '#D9A441' },
  { name: 'Ruby', hex: '#B0405A' },
  { name: 'Cream', hex: '#EFE3D3' },
];

export const REVIEWS = [
  { id: 1, name: 'Dilnoza R.', stars: 5, date: 'Nov 2, 2026', likes: 24, text: 'Absolutely divine — the truffles melt the moment they touch your tongue. You can taste the quality in every single piece.' },
  { id: 2, name: 'Mark T.', stars: 5, date: 'Oct 28, 2026', likes: 17, text: 'Ordered the Deluxe Gift Collection for my wife’s birthday. The packaging alone is worth the price. She was thrilled!' },
  { id: 3, name: 'Sarah K.', stars: 4, date: 'Oct 21, 2026', likes: 9, text: 'Rich and smooth, though slightly too sweet for my taste. Delivery was quick and everything arrived perfectly chilled.' },
  { id: 4, name: 'Jasur A.', stars: 5, date: 'Oct 15, 2026', likes: 31, text: 'Best chocolate in the city, hands down. The Dark 85% bar is my weekly ritual with morning coffee.' },
  { id: 5, name: 'Emily C.', stars: 4, date: 'Oct 9, 2026', likes: 6, text: 'The ruby berry bar is something else — tart, creamy and beautiful. Will definitely reorder for the holidays.' },
  { id: 6, name: 'Bekzod N.', stars: 3, date: 'Sep 30, 2026', likes: 12, text: 'A bit pricey for the portion size, but the craftsmanship and packaging are genuinely premium.' },
];

export const ADDRESSES = [
  { id: 1, label: 'Home', badge: 'Default', name: 'Aziza Karimova', line: '221B Baker Street, Apt 12', city: 'Tashkent, 100011', phone: '+1 (555) 013-4477' },
  { id: 2, label: 'Office', name: 'Aziza Karimova', line: '45 Corporate Ave, Floor 8', city: 'Tashkent, 100084', phone: '+1 (555) 013-4477' },
  { id: 3, label: "Parents' House", name: 'Aziza Karimova', line: '7 Green Garden Lane, House 3', city: 'Tashkent, 100096', phone: '+1 (555) 013-4477' },
];

export const SHIPPING = [
  { id: 1, name: 'Economy', eta: 'Thu, Nov 12', price: 10, note: 'Save more, arrive later' },
  { id: 2, name: 'Regular', eta: 'Wed, Nov 11', price: 15, note: 'Our most popular option' },
  { id: 3, name: 'Cargo', eta: 'Tue, Nov 10', price: 20, note: 'Extra-protected packaging' },
  { id: 4, name: 'Express', eta: 'Mon, Nov 9', price: 30, note: 'Fastest delivery available' },
];

export const PROMOS = [
  { id: 0, title: 'No promo code', desc: 'Pay the full price for this order', icon: 'ban', value: 0 },
  { id: 1, title: 'Special 25% Off', desc: 'On your entire order, today only', icon: 'percent', value: 0.25 },
  { id: 2, title: 'Free Shipping', desc: 'Delivery on us, for any order size', icon: 'truck', value: 'ship' },
  { id: 3, title: '$5 Off First Order', desc: 'For new customers only', icon: 'dollar', value: 5 },
];

export const PAYMENTS = [
  { id: 1, name: 'My Wallet', detail: 'Balance $120.50', icon: 'wallet' },
  { id: 2, name: 'PayPal', detail: 'aziza@email.com', icon: 'globe' },
  { id: 3, name: 'Google Pay', detail: 'Linked account', icon: 'chrome' },
  { id: 4, name: 'Apple Pay', detail: 'Face ID enabled', icon: 'apple' },
  { id: 5, name: 'Mastercard', detail: '•••• •••• •••• 4679', icon: 'card' },
];

export const money = (n) => `$${n.toFixed(2)}`;

// Token-based product search: any word of the query may hit name or category.
export const searchProducts = (query) => {
  const tokens = query.toLowerCase().split(/\s+/).filter((t) => t.length >= 2);
  if (tokens.length === 0) return [];
  return PRODUCTS.filter((p) => {
    const hay = `${p.name} ${p.category}`.toLowerCase();
    return tokens.some((t) => hay.includes(t));
  });
};
