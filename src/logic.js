// Toza (DB ga bog'liq bo'lmagan) hisob-kitob funksiyalari — testlar shu faylni tekshiradi.
// Pullar butun son (so'm) sifatida, miqdorlar o'lchov birligiga qarab dona=butun yoki kg=kasr.

// Chek jami: chegirma foiz yoki summa bo'yicha, chegirma subtotaldan oshmaydi.
function calcCart(items, { discountPercent = 0, discountUzs = 0 } = {}) {
  const subtotal = items.reduce((s, i) => s + Math.round(i.price * i.qty), 0);
  let discount = Math.round(subtotal * (Math.max(0, discountPercent) / 100));
  if (discountUzs > 0) discount = Math.max(discount, Math.round(discountUzs));
  discount = Math.min(discount, subtotal);
  return { subtotal, discount, total: subtotal - discount };
}

// FIFO: partiyalar eskirgani bo'yicha (expires_at null oxirida, so'ng created_at) tartiblangan bo'lishi kerak.
// qty yetmasa null qaytarmaydi, shunchaki bor qadar oladi — tekshiruv caller tomonda.
function allocateFifo(lots, qty) {
  let need = Number(qty);
  const picks = [];
  for (const lot of lots) {
    if (need <= 0) break;
    const avail = Number(lot.remaining);
    if (avail <= 0) continue;
    const take = Math.min(avail, need);
    picks.push({ lotId: lot.id, qty: take });
    need -= take;
  }
  return { picks, shortage: Math.round(need * 1000) / 1000 };
}

// Smena farqi — kassada sanalgan haqiqiy naqd vs tizim kutilgani.
function shiftDiff(expectedCash, countedCash) {
  const e = Math.round(Number(expectedCash) || 0);
  const c = Math.round(Number(countedCash) || 0);
  return { expected: e, counted: c, diff: c - e };
}

// PIN bloklash: 5 marta xato -> 5 daqiqa blok.
const PIN_MAX_ATTEMPTS = 5;
const PIN_LOCK_MS = 5 * 60 * 1000;
function pinLockState(failedAttempts, lockedUntil, now = Date.now()) {
  const lu = lockedUntil ? new Date(lockedUntil).getTime() : 0;
  if (lu && lu > now) return { locked: true, until: lu, remainingMs: lu - now };
  if (failedAttempts >= PIN_MAX_ATTEMPTS) return { locked: true, until: now + PIN_LOCK_MS, remainingMs: PIN_LOCK_MS };
  return { locked: false, until: 0, remainingMs: 0 };
}

// Aralash to'lov: yig'indi aynan total bo'lishi shart (qaytim POS tomonda oldindan hisoblanadi).
// Har bir usuldan 1 martadan ortiq bo'lmasin, summa musbat bo'lsin.
function validateMixedPayments(payments, total) {
  if (!Array.isArray(payments) || payments.length === 0) return false;
  const seen = new Set();
  let sum = 0;
  for (const p of payments) {
    const amount = Math.round(Number(p.amount) || 0);
    if (amount <= 0) return false;
    if (seen.has(p.method)) return false;
    seen.add(p.method);
    sum += amount;
  }
  return sum === Math.round(Number(total) || 0);
}

// Kassadagi naqd kutilgan summa: boshlang'ich naqd + naqd tushum - naqd chiqim (qaytarish).
function expectedCashInShift(openingCash, salesByMethod, returnsByMethod) {
  const cashIn = (salesByMethod.cash || 0) - (returnsByMethod.cash || 0);
  return Math.round(Number(openingCash) || 0) + Math.round(cashIn);
}

function formatSum(n) {
  return Math.round(Number(n) || 0).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
}

// O'zbekcha holat nomlari (UI uchun umumiy)
const ORDER_STATUSES = {
  new: 'YANGI', accepted: 'QABUL QILINDI', preparing: 'TAYYORLANMOQDA',
  ready: 'TAYYOR', given: 'BERILDI', cancelled: 'BEKOR QILINDI'
};

module.exports = {
  calcCart, allocateFifo, shiftDiff, pinLockState, validateMixedPayments,
  expectedCashInShift, formatSum, ORDER_STATUSES, PIN_MAX_ATTEMPTS, PIN_LOCK_MS
};
