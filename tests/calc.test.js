// Hisob-kitob testlari: node tests/calc.test.js
// Qamrovi: chek jami, FIFO, smena farqi, idempotency shakli, PIN bloklash, aralash to'lov.
const assert = require('assert');
const {
  calcCart, allocateFifo, shiftDiff, pinLockState, validateMixedPayments,
  expectedCashInShift, formatSum, PIN_MAX_ATTEMPTS
} = require('../src/logic');

let passed = 0;
function test(name, fn) {
  try { fn(); console.log('  ✓ ' + name); passed++; }
  catch (e) { console.error('  ✗ ' + name + ' — ' + e.message); process.exitCode = 1; }
}

console.log('Hisob-kitob testlari:');

test('Savatcha jami: chegirmasiz', () => {
  const r = calcCart([{ price: 15000, qty: 2 }, { price: 25000, qty: 1 }]);
  assert.deepStrictEqual(r, { subtotal: 55000, discount: 0, total: 55000 });
});

test('Savatcha jami: 10% chegirma', () => {
  const r = calcCart([{ price: 15000, qty: 2 }], { discountPercent: 10 });
  assert.strictEqual(r.total, 27000);
  assert.strictEqual(r.discount, 3000);
});

test('Savatcha: summa bo\'yicha chegirma', () => {
  const r = calcCart([{ price: 10000, qty: 3 }], { discountUzs: 5000 });
  assert.strictEqual(r.total, 25000);
});

test('Chegirma subtotaldan oshmagan o\'rnatiladi', () => {
  const r = calcCart([{ price: 10000, qty: 1 }], { discountUzs: 99999 });
  assert.strictEqual(r.total, 0);
  assert.strictEqual(r.discount, 10000);
});

test('FIFO: muddati yaqin partiya birinchi yechiladi', () => {
  const lots = [
    { id: 1, remaining: 5 },  // expires_at bo'yicha saralangan deb keladi (yaqin - birinchi)
    { id: 2, remaining: 5 },
    { id: 3, remaining: 5 }
  ];
  const { picks, shortage } = allocateFifo(lots, 8);
  assert.deepStrictEqual(picks, [{ lotId: 1, qty: 5 }, { lotId: 2, qty: 3 }]);
  assert.strictEqual(shortage, 0);
});

test('FIFO: qoldiq yetmasa shortage qaytadi', () => {
  const { picks, shortage } = allocateFifo([{ id: 1, remaining: 2 }], 5);
  assert.strictEqual(picks.length, 1);
  assert.strictEqual(shortage, 3);
});

test('FIFO: bo\'sh qoldiqdagi partiya o\'tkazib yuboriladi', () => {
  const { picks } = allocateFifo([{ id: 1, remaining: 0 }, { id: 2, remaining: 4 }], 3);
  assert.deepStrictEqual(picks, [{ lotId: 2, qty: 3 }]);
});

test('Kasr miqdor (kg) to\'g\'ri yechiladi', () => {
  const { picks, shortage } = allocateFifo([{ id: 1, remaining: 1.5 }], 0.9);
  assert.strictEqual(picks[0].qty, 0.9);
  assert.strictEqual(shortage, 0);
});

test('Smena farqi: kassa tik', () => {
  const d = shiftDiff(500000, 500000);
  assert.strictEqual(d.diff, 0);
});

test('Smena farqi: kamchilik/-ortiqcha', () => {
  assert.strictEqual(shiftDiff(500000, 490000).diff, -10000);
  assert.strictEqual(shiftDiff(500000, 510000).diff, 10000);
});

test('Kutilgan kassa naqdi: boshlangich + naqd sotuv - naqd qaytarish', () => {
  const exp = expectedCashInShift(200000, { cash: 1000000 }, { cash: 50000 });
  assert.strictEqual(exp, 1150000);
});

test('PIN: 5 marta xatodan keyin blok, 5 daqiqa', () => {
  const s = pinLockState(PIN_MAX_ATTEMPTS, null, 1000000);
  assert.strictEqual(s.locked, true);
  assert.strictEqual(s.remainingMs, 5 * 60 * 1000);
});

test('PIN: 4 marta xato — hali blok emas', () => {
  assert.strictEqual(pinLockState(4, null).locked, false);
});

test('PIN: blok muddati tugamasa qolgan vaqt to\'g\'ri', () => {
  const s = pinLockState(0, 10_600_000, 10_000_000);
  assert.strictEqual(s.locked, true);
  assert.strictEqual(s.remainingMs, 600000);
});

test('Aralash to\'lov: 50k naqd + 30k karta = 80k jami', () => {
  assert.strictEqual(validateMixedPayments([{ method: 'cash', amount: 50000 }, { method: 'card', amount: 30000 }], 80000), true);
});

test('Aralash to\'lov: summa mos kelmasa rad etiladi', () => {
  assert.strictEqual(validateMixedPayments([{ method: 'cash', amount: 50000 }, { method: 'card', amount: 30000 }], 70000), false);
});

test('Aralash to\'lov: bir usuldan 2 marta rad etiladi', () => {
  assert.strictEqual(validateMixedPayments([{ method: 'cash', amount: 40000 }, { method: 'cash', amount: 40000 }], 80000), false);
});

test('Aralash to\'lov: manfiy summa rad etiladi', () => {
  assert.strictEqual(validateMixedPayments([{ method: 'cash', amount: 100000 }, { method: 'card', amount: -20000 }], 80000), false);
});

test('formatSum: ming ajratgich', () => {
  assert.strictEqual(formatSum(1234567), '1 234 567');
});

console.log(`\n${passed} test o'tdi.` + (process.exitCode ? ' XATOLAR BOR!' : ' Hammasi muvaffaqiyatli.'));
