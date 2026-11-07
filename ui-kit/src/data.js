// Dummy ma'lumotlar (UZS, o'zbekcha).
export const CATEGORIES = ['Barchasi', 'Shokolad', 'Baton', 'Praline', "Sovg'a", 'Ichimlik'];

const P = (id, name, cat, price, old, rating, reviews, mins, c1, c2, desc) => ({
  id, name, cat, price, old, rating, reviews, mins, c1, c2, desc,
});
export const PRODUCTS = [
  P(1, 'Royal Truffle Box', 'Shokolad', 189000, 245000, 4.9, 1243, 25, '#3B2216', '#6B4226', "Qo'lda tayyorlangan 12 dona truffle, nordon kakao kukuni bilan."),
  P(2, 'Dark 85% Baton', 'Baton', 55000, 68000, 4.7, 861, 20, '#2B1A12', '#52301D', '85% kakao, intensiv buzqong\'ir ta\'m, yong\'oq notalari.'),
  P(3, 'Hazelnut Praline', 'Praline', 145000, 178000, 4.8, 932, 25, '#6F4A2F', '#A87848', 'Karamellangan funduk, sutli shokolad praline.'),
  P(4, 'Caramel Bonbon', 'Praline', 98000, null, 4.6, 517, 20, '#8A5A2B', '#D19A54', 'Tuzli karamel ichi, yupqa sutli shokolad qobiq.'),
  P(5, 'Sutli Klassik', 'Shokolad', 42000, 52000, 4.5, 2043, 15, '#7A4E2D', '#B07A44', '38% kakao, tekis va kremali klassik ta\'m.'),
  P(6, 'Ruby Olcha Baton', 'Baton', 72000, null, 4.8, 388, 20, '#A03E52', '#D4718A', 'Tabiiy pushti ruby shokolad, muzlatilgan olcha bilan.'),
  P(7, "Deluxe Sovg'a To'plami", "Sovg'a", 450000, 560000, 4.9, 645, 30, '#1C1C1E', '#4D3B2A', '24 dona praline va batonlar, premium qadoqlash.'),
  P(8, 'Kakao Pechene', "Sovg'a", 65000, null, 4.4, 274, 20, '#5B4232', '#93705A', 'Qora shokoladga cho\'ktirilgan yumshoq pechene.'),
  P(9, "Issiq Kakao To'plami", 'Ichimlik', 120000, null, 4.7, 198, 25, '#4E3421', '#8C6239', 'Ichish uchun shokolad bo\'laklari + 2 krujka.'),
  P(10, 'Oq Matcha Baton', 'Baton', 68000, null, 4.3, 121, 20, '#6F7D5A', '#B9C9A2', 'Oq shokolad va matcha aralashmasi.'),
];

export const SIZES = [
  { k: '100 g', f: 1 },
  { k: '250 g', f: 1.8 },
  { k: '500 g', f: 3.2 },
];
export const ADDONS = [
  { k: 'Funduk', p: 12000 },
  { k: 'Olcha', p: 8000 },
  { k: 'Kakao kukuni', p: 5000 },
  { k: 'Vanil', p: 7000 },
];
export const unitPrice = (p, sizeK = '100 g', addons = []) => {
  const f = (SIZES.find((s) => s.k === sizeK) || SIZES[0]).f;
  const add = ADDONS.filter((a) => addons.includes(a.k)).reduce((s, a) => s + a.p, 0);
  return Math.round((p.price * f) / 1000) * 1000 + add;
};

export const PROMOS = { SHIRIN10: 0.1, SHIRIN20: 0.2 };
export const DELIVERY = 15000;
export const FREE_OVER = 300000;

// ── Ombor ──
export const STOCK = [
  { sku: 'SH-0101', name: 'Royal Truffle Box', cat: 'Shokolad', qty: 142, min: 30, loc: 'A-12' },
  { sku: 'SH-0102', name: 'Dark 85% Baton', cat: 'Baton', qty: 24, min: 40, loc: 'A-03' },
  { sku: 'SH-0103', name: 'Hazelnut Praline', cat: 'Praline', qty: 76, min: 25, loc: 'B-08' },
  { sku: 'SH-0104', name: 'Caramel Bonbon', cat: 'Praline', qty: 0, min: 20, loc: 'B-09' },
  { sku: 'SH-0105', name: 'Sutli Klassik', cat: 'Shokolad', qty: 310, min: 60, loc: 'A-01' },
  { sku: 'SH-0106', name: 'Ruby Olcha Baton', cat: 'Baton', qty: 18, min: 30, loc: 'A-05' },
  { sku: 'SH-0107', name: "Deluxe Sovg'a To'plami", cat: "Sovg'a", qty: 44, min: 15, loc: 'C-02' },
  { sku: 'SH-0108', name: 'Kakao Pechene', cat: "Sovg'a", qty: 9, min: 25, loc: 'C-05' },
  { sku: 'SH-0109', name: "Issiq Kakao To'plami", cat: 'Ichimlik', qty: 61, min: 20, loc: 'D-01' },
  { sku: 'SH-0110', name: 'Oq Matcha Baton', cat: 'Baton', qty: 37, min: 20, loc: 'A-07' },
];
export const statusOf = (r) =>
  r.qty === 0 ? { k: 'danger', l: 'Tugagan' } : r.qty < r.min ? { k: 'warning', l: 'Kam' } : { k: 'success', l: 'Yetarli' };

export const SUPPLIERS = [
  { id: 1, name: 'Kakao Trade MChJ', phone: '+998 90 123-45-67', items: 34, city: 'Toshkent' },
  { id: 2, name: 'Premium Nuts', phone: '+998 93 222-33-44', items: 12, city: 'Samarqand' },
  { id: 3, name: 'Vanilla Group', phone: '+998 97 555-66-77', items: 8, city: 'Buxoro' },
  { id: 4, name: 'PackPro Qadoqlash', phone: '+998 71 200-10-20', items: 21, city: 'Toshkent' },
];

export const BRANCHES = [
  'Toshkent-1', 'Toshkent-2', 'Toshkent-3', 'Toshkent-4', 'Toshkent-5', 'Toshkent-6',
  'Chilonzor', 'Yunusobod', 'Mirzo Ulug\'bek', 'Sergeli', 'Olmazor', 'Bektemir',
  'Samarqand', 'Buxoro', 'Andijon', 'Namangan', 'Farg\'ona',
]; // 17 filial

export const TRANSFERS = [
  { id: 'TR-341', from: 'Toshkent-1', to: 'Chilonzor', item: 'Sutli Klassik', qty: 40, date: '05.11.2026', status: 'Yo\'lda' },
  { id: 'TR-340', from: 'Toshkent-2', to: 'Samarqand', item: 'Royal Truffle Box', qty: 12, date: '04.11.2026', status: 'Qabul qilindi' },
  { id: 'TR-339', from: 'Yunusobod', to: 'Toshkent-3', item: 'Ruby Olcha Baton', qty: 25, date: '04.11.2026', status: 'Qabul qilindi' },
  { id: 'TR-338', from: 'Toshkent-1', to: 'Bektemir', item: 'Kakao Pechene', qty: 30, date: '02.11.2026', status: 'Bekor qilindi' },
  { id: 'TR-337', from: 'Buxoro', to: 'Toshkent-4', item: 'Hazelnut Praline', qty: 18, date: '01.11.2026', status: 'Qabul qilindi' },
];

export const MOVES = [
  { id: 1, item: 'Sutli Klassik', type: 'in', qty: 200, date: '06.11.2026', user: 'Sardor A.' },
  { id: 2, item: 'Caramel Bonbon', type: 'out', qty: 20, date: '06.11.2026', user: 'Malika T.' },
  { id: 3, item: 'Dark 85% Baton', type: 'out', qty: 45, date: '05.11.2026', user: 'Malika T.' },
  { id: 4, item: 'Ruby Olcha Baton', type: 'in', qty: 60, date: '05.11.2026', user: 'Sardor A.' },
  { id: 5, item: 'Kakao Pechene', type: 'out', qty: 15, date: '04.11.2026', user: 'Jasur N.' },
];

export const EXPIRING = [
  { name: 'Caramel Bonbon', batch: 'P-2231', date: '15.11.2026', qty: 18 },
  { name: 'Kakao Pechene', batch: 'P-2218', date: '20.11.2026', qty: 9 },
  { name: 'Oq Matcha Baton', batch: 'P-2204', date: '28.11.2026', qty: 12 },
];

export const COUNTS = [
  { zone: 'A sahifa (Shokolad/Baton)', expected: 512, counted: 512, status: 'Tugallandi' },
  { zone: 'B sahifa (Praline)', expected: 148, counted: 96, status: 'Davom etmoqda' },
  { zone: 'C sahifa (Sovg\'a)', expected: 220, counted: 0, status: "Boshlanmagan" },
];

// ── Xaridor buyurtmalari ──
export const ORDERS = [
  { id: 'SK-1041', date: '06.11.2026', items: [{ pid: 2, qty: 2 }, { pid: 5, qty: 1 }], status: "Yo'lda" },
  { id: 'SK-1038', date: '02.11.2026', items: [{ pid: 7, qty: 1 }], status: 'Yetkazildi' },
  { id: 'SK-1030', date: '28.10.2026', items: [{ pid: 3, qty: 1 }, { pid: 9, qty: 2 }], status: 'Yetkazildi' },
];
export const STEP_OF = { 'Qabul qilindi': 0, 'Tayyorlanmoqda': 1, "Yo'lda": 2, 'Yetkazildi': 3 };
export const STEPS = ['Qabul qilindi', 'Tayyorlanmoqda', "Yo'lda", 'Yetkazildi'];
