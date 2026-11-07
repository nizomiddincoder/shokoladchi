// i18n — hozircha faqat 'uz'. Rus tilini qo'shish uchun dicts ga kalitlari bir xil
// bo'lgan 'ru' obyektini qo'shing va t(k, 'ru') deb chaqiring.
const uz = {
  'nav.home': 'Bosh sahifa', 'nav.fav': 'Sevimlilar', 'nav.cart': 'Savat',
  'nav.orders': 'Buyurtmalar', 'nav.profile': 'Profil',
  'cta.addToCart': "Savatga qo'shish", 'cta.order': 'Buyurtma berish',
  'cta.checkout': 'Rasmiylashtirish', 'cta.confirmOrder': 'Buyurtmani tasdiqlash',
  'cta.apply': "Qo'llash", 'cta.retry': 'Qayta urinish', 'cta.more': "Batafsil",
  'sum.subtotal': 'Jami', 'sum.delivery': 'Yetkazib berish', 'sum.discount': 'Chegirma',
  'sum.total': 'Umumiy', 'sum.free': 'Bepul',
  'home.search': 'Qidirish: shokolad, praline…', 'home.best': 'Eng ko\'p sotilganlar',
  'home.promo': 'Shirin hafta', 'home.promoSub': 'Truffle box to\'plamiga',
  'cart.title': 'Savat', 'cart.promo': 'Promokod', 'cart.empty': 'Savat bo\'sh',
  'cart.emptyText': "Shirinliklarni tanlab savatga qo'shing",
  'det.size': "O'lcham", 'det.addons': "Qo'shimchalar", 'det.qty': 'Miqdor',
  'status.title': 'Buyurtma holati', 'status.done': 'Yetkazildi',
  'wh.title': 'Ombor boshqaruvi', 'wh.stock': 'Inventarizatsiya', 'wh.in': 'Kirim',
  'wh.out': 'Chiqim', 'wh.count': 'Sanash', 'wh.suppliers': 'Yetkazib beruvchilar',
  'wh.transfers': 'Ko\'chirishlar', 'pos.title': 'Kassa', 'pos.pay.cash': 'Naqd',
  'pos.pay.card': 'Karta', 'pos.pay.qr': 'Click / Payme', 'pos.receipt': 'Chek',
  'state.loading': 'Yuklanmoqda…', 'state.empty': 'Ma\'lumot yo\'q', 'state.error': 'Xatolik yuz berdi',
};

const dicts = { uz };
export const t = (k, lang = 'uz') => (dicts[lang] && dicts[lang][k]) || k;
