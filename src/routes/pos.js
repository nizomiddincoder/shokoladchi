const router = require('express').Router();
const { pool, q, getSettings, audit } = require('../db');
const { middleware } = require('../auth');
const { calcCart, allocateFifo, shiftDiff, validateMixedPayments, expectedCashInShift, formatSum } = require('../logic');
const { broadcast, agentOnline } = require('../ws');
const { notifySale, notifyCancel } = require('../bot');
const { fiscalReceipt } = require('../fiscal');

const SELLER = middleware(['seller', 'admin']);
const ADMIN = middleware('admin');

function receiptPayload(r, settings, reprint) {
  return {
    receipt_no: r.receipt_no, datetime_local: r.datetime_local || new Date().toLocaleString('ru-RU', { timeZone: 'Asia/Tashkent' }),
    receipt_title: settings.receipt_header || settings.shop_name, receipt_script: 'latin',
    footer_text: settings.receipt_footer || '', footer_phone: '',
    shop_phone: settings.shop_phone, phone_1: '', phone_2: '',
    seller_name: r.seller_name, seller_phone: '', usd_rate: settings.usd_rate || 0,
    customer_name: r.customer_name || '', customer_phone: r.phone || '',
    items: r.items, total_uzs: r.total_uzs, old_debt_uzs: 0,
    payment_method: (r.payment && r.payment[0] && r.payment[0].method) || 'cash', is_cancelled: !!r.is_cancelled
  };
}

function sendPrint(r, settings, reprint) {
  broadcast({ type: 'print', reprint: !!reprint, receipt: receiptPayload(r, settings, reprint) });
}

// --- Katalog (POS: qoldiq va tannarx bilan; oflayn kesh uchun to'liq ro'yxat) ---
router.get('/catalog', SELLER, async (req, res) => {
  const st = await getSettings();
  const { rows } = await q(`
    SELECT g.id, g.category_id, g.name, g.unit, g.price, g.barcode, g.is_active,
      (SELECT c.name FROM categories c WHERE c.id = g.category_id) AS category_name,
      COALESCE((SELECT SUM(v.remaining) FROM stock_lots v WHERE v.product_id = g.id AND v.variant_id IS NULL AND (v.expires_at IS NULL OR v.expires_at >= CURRENT_DATE)),0) AS stock,
      (SELECT json_agg(json_build_object('id',pv.id,'name',pv.name,'price',pv.price,'barcode',pv.barcode,'unit',pv.unit,'stock',
        COALESCE((SELECT SUM(l.remaining) FROM stock_lots l WHERE l.variant_id = pv.id AND (l.expires_at IS NULL OR l.expires_at >= CURRENT_DATE)),0)) ORDER BY pv.sort)
        FROM product_variants pv WHERE pv.product_id = g.id AND pv.is_active) AS variants
    FROM goods g WHERE g.is_deleted = false ORDER BY g.name`);
  res.json(rows.map(r => ({ ...r, price: Number(r.price), stock: Number(r.stock), cost: st.warehouse_sees_cost ? undefined : undefined,
    variants: (r.variants || []).map(v => ({ ...v, price: Number(v.price), stock: Number(v.stock) })) })));
});

// --- Smena ---
router.get('/shift', SELLER, async (req, res) => {
  const { rows } = await q(`SELECT * FROM shifts WHERE user_id = $1 AND status = 'open' ORDER BY id DESC LIMIT 1`, [req.user.id]);
  res.json({ open: rows[0] || null });
});

router.post('/shift/open', SELLER, async (req, res) => {
  const { rows: ex } = await q(`SELECT id FROM shifts WHERE user_id = $1 AND status = 'open'`, [req.user.id]);
  if (ex.length) return res.status(400).json({ error: 'Smena allaqachon ochilgan' });
  const opening = Math.max(0, Math.round(Number((req.body || {}).opening_cash) || 0));
  const { rows } = await q('INSERT INTO shifts (user_id, opening_cash) VALUES ($1,$2) RETURNING *', [req.user.id, opening]);
  await audit(req.user.id, req.user.name, 'shift_open', 'shift', rows[0].id, null, { opening });
  res.json({ ok: true, shift: rows[0] });
});

router.post('/shift/close', SELLER, async (req, res) => {
  const { counted_cash, diff_note } = req.body || {};
  const { rows } = await q(`SELECT * FROM shifts WHERE user_id = $1 AND status = 'open' ORDER BY id DESC LIMIT 1`, [req.user.id]);
  const sh = rows[0];
  if (!sh) return res.status(400).json({ error: 'Ochiq smena yo\'q' });
  // Kutilgan naqd: boshlang'ich + naqd sotuv - naqd qaytarish
  const { rows: agg } = await q(`
    SELECT COALESCE(SUM(CASE WHEN NOT is_return THEN (p->>'amount')::bigint ELSE 0 END),0) cash_in,
           COALESCE(SUM(CASE WHEN is_return THEN (p->>'amount')::bigint ELSE 0 END),0) cash_out
    FROM pos_sales s, jsonb_array_elements(s.payment) p
    WHERE s.shift_id = $1 AND p->>'method' = 'cash'`, [sh.id]);
  const cashSales = Number(agg[0].cash_in), cashReturns = Number(agg[0].cash_out);
  const exp = expectedCashInShift(sh.opening_cash, { cash: cashSales }, { cash: cashReturns });
  const d = shiftDiff(exp, counted_cash);
  if (d.diff !== 0 && !diff_note) return res.status(400).json({ error: 'Farq bor — sababni yozish majburiy', expected: d.expected, diff: d.diff });
  await q(`UPDATE shifts SET closed_at = now(), status = 'closed', expected_cash = $1, counted_cash = $2, diff_uzs = $3, diff_note = $4 WHERE id = $5`,
    [d.expected, d.counted, d.diff, diff_note || '', sh.id]);
  await audit(req.user.id, req.user.name, 'shift_close', 'shift', sh.id, null, d);
  res.json({ ok: true, ...d });
});

// --- Sotuv (yagona nuqta: oflayn sinxron ham shu yerga keladi, uuid idempotency) ---
router.post('/sale', SELLER, async (req, res) => {
  const b = req.body || {};
  try {
    const uuid = String(b.uuid || '').slice(0, 64);
    if (!uuid) return res.status(400).json({ error: 'uuid kerak (idempotency)' });
    const st = await getSettings();
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      // Idempotency: bir xil uuid = mavjud sotuvni qaytaramiz, ikki marta yozilmaydi
      const { rows: dup } = await client.query('SELECT id, receipt_no, total_uzs FROM pos_sales WHERE uuid = $1', [uuid]);
      if (dup.length) { await client.query('COMMIT'); return res.json({ ok: true, duplicate: true, id: dup[0].id, receipt_no: dup[0].receipt_no, total_uzs: Number(dup[0].total_uzs) }); }

      const { rows: sh } = await client.query(`SELECT id FROM shifts WHERE user_id = $1 AND status = 'open' ORDER BY id DESC LIMIT 1`, [req.user.id]);
      if (!sh.length) { await client.query('ROLLBACK'); return res.status(400).json({ error: 'Smena ochilmagan' }); }

      if (!Array.isArray(b.items) || !b.items.length) { await client.query('ROLLBACK'); return res.status(400).json({ error: 'Savatcha bo\'sh' }); }
      const calc = calcCart(b.items.map(i => ({ price: Number(i.price) || 0, qty: Number(i.qty) || 0 })), { discountPercent: b.discount_percent || 0, discountUzs: b.discount_uzs || 0 });
      if (calc.total <= 0) { await client.query('ROLLBACK'); return res.status(400).json({ error: 'Summa noto\'g\'ri' }); }
      // Chegirma chegarasi (sozlamadan oshsa — faqat admin ruxsat beradi)
      const maxUzs = st.discount_max_percent ? Math.round(calc.subtotal * st.discount_max_percent / 100) : 0;
      const limit = st.discount_max_uzs > 0 && (maxUzs === 0 || st.discount_max_uzs < maxUzs) ? st.discount_max_uzs : maxUzs;
      if (calc.discount > limit && req.user.role !== 'admin')
        { await client.query('ROLLBACK'); return res.status(403).json({ error: `Chegirma chegaradan oshdi (maks: ${formatSum(limit)} so'm)` }); }

      // Aralash to'lov tekshiruvi
      const payments = b.payment || [{ method: 'cash', amount: calc.total }];
      if (!validateMixedPayments(payments, calc.total)) { await client.query('ROLLBACK'); return res.status(400).json({ error: 'To\'lov summalari jami bilan mos emas' }); }

      // FIFO: partiyalardan yechish (muddati yaqin — avval)
      const itemIds = b.items.map(i => Number(i.product_id));
      const { rows: lots } = await client.query(`SELECT id, product_id, variant_id, remaining FROM stock_lots
        WHERE product_id = ANY($1) AND remaining > 0 AND (expires_at IS NULL OR expires_at >= CURRENT_DATE)
        ORDER BY product_id, expires_at NULLS LAST, created_at`, [itemIds]);
      const picksByProduct = {};
      for (const it of b.items) {
        const pid = Number(it.product_id), vid = it.variant_id ? Number(it.variant_id) : null;
        const need = Number(it.qty);
        const prodLots = lots.filter(l => l.product_id === pid && (l.variant_id || null) === vid);
        const { picks, shortage } = allocateFifo(prodLots, need);
        if (shortage > 0) { await client.query('ROLLBACK'); return res.status(400).json({ error: `"${it.name}" qoldiq yetarli emas (${shortage} yetishmaydi)` }); }
        picksByProduct[pid + ':' + (vid || '')] = picks;
      }

      const { rows: sale } = await client.query(
        `INSERT INTO pos_sales (uuid, shift_id, user_id, customer_name, phone, subtotal_uzs, discount_uzs, total_uzs, payment, offline_synced)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) RETURNING id, receipt_no`,
        [uuid, sh[0].id, req.user.id, (b.customer_name || '').slice(0, 100), (b.phone || '').replace(/\D/g, '').slice(0, 12),
         calc.subtotal, calc.discount, calc.total, JSON.stringify(payments), !!b.offline]);
      for (const it of b.items) {
        const pid = Number(it.product_id), vid = it.variant_id ? Number(it.variant_id) : null;
        const qty = Number(it.qty);
        await client.query(`INSERT INTO pos_sale_items (sale_id, product_id, variant_id, name, qty, price_uzs, line_total_uzs) VALUES ($1,$2,$3,$4,$5,$6,$7)`,
          [sale.id, pid, vid, (it.name || '').slice(0, 200), qty, Math.round(Number(it.price) || 0), Math.round(Number(it.price) * qty)]);
        for (const pick of picksByProduct[pid + ':' + (vid || '')]) {
          await client.query('UPDATE stock_lots SET remaining = remaining - $1 WHERE id = $2', [pick.qty, pick.lotId]);
          await client.query(`INSERT INTO stock_movements (product_id, variant_id, lot_id, qty, kind, ref_type, ref_id, by_user_id)
            VALUES ($1,$2,$3,$4,'sale','sale',$5,$6)`, [pid, vid, pick.lotId, -pick.qty, sale.id, req.user.id]);
        }
      }
      await client.query('COMMIT');

      const items = b.items.map(i => ({ name: i.name, qty: i.qty, price_uzs: Number(i.price), line_total_uzs: Math.round(Number(i.price) * Number(i.qty)) }));
      const receipt = { ...sale, ...calc, seller_name: req.user.name, customer_name: b.customer_name, phone: b.phone, items, payment: payments };
      sendPrint(receipt, st);
      notifySale(receipt);
      fiscalReceipt(receipt).catch(() => {});
      res.json({ ok: true, id: sale.id, receipt_no: Number(sale.receipt_no), total_uzs: calc.total, printed: agentOnline() });
    } catch (e) {
      await client.query('ROLLBACK').catch(() => {});
      throw e;
    } finally { client.release(); }
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// --- Sotuvlar ro'yxati (smena/kun bo'yicha) ---
router.get('/sales', SELLER, async (req, res) => {
  const { shift_id, date, limit } = req.query;
  const params = [];
  let where = '1=1';
  if (shift_id) { params.push(shift_id); where += ` AND s.shift_id = $${params.length}`; }
  if (date) { params.push(date); where += ` AND s.created_at::date = $${params.length}`; }
  const { rows } = await q(`SELECT s.*, u.name AS seller_name FROM pos_sales s LEFT JOIN users u ON u.id = s.user_id
    WHERE ${where} ORDER BY s.id DESC LIMIT ${Math.min(Number(limit) || 100, 500)}`, params);
  res.json(rows.map(r => ({ ...r, total_uzs: Number(r.total_uzs), subtotal_uzs: Number(r.subtotal_uzs), discount_uzs: Number(r.discount_uzs) })));
});

// --- Qaytarish (vozvrat): chek bo'yicha, admin tasdig'i bilan (admin o'zi yoki token bilan) ---
router.post('/return', middleware(['seller', 'admin']), async (req, res) => {
  const b = req.body || {};
  if (req.user.role !== 'admin' && !b.admin_pin) return res.status(403).json({ error: 'Admin tasdig\'i kerak' });
  if (req.user.role !== 'admin' && b.admin_pin) {
    const { rows: a } = await q(`SELECT * FROM users WHERE role = 'admin' AND is_active = true AND pin_hash IS NOT NULL`);
    const ok = a.some(u => require('../auth').checkPin(b.admin_pin, u.pin_hash));
    if (!ok) return res.status(403).json({ error: 'Admin PIN xato' });
  }
  const { rows } = await q('SELECT * FROM pos_sales WHERE receipt_no = $1 AND is_return = false', [Number(b.receipt_no)]);
  const orig = rows[0];
  if (!orig) return res.status(404).json({ error: 'Chek topilmadi' });
  try {
    const st = await getSettings();
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const uuid = 'ret-' + orig.uuid;
      const { rows: dup } = await client.query('SELECT id FROM pos_sales WHERE uuid = $1', [uuid]);
      if (dup.length) { await client.query('COMMIT'); return res.status(400).json({ error: 'Bu chek allaqachon qaytarilgan' }); }
      const { rows: ret } = await client.query(
        `INSERT INTO pos_sales (uuid, shift_id, user_id, customer_name, subtotal_uzs, discount_uzs, total_uzs, payment, is_return, return_of)
         VALUES ($1,$2,$3,$4,$5,0,$6,$7,true,$8) RETURNING id, receipt_no`,
        [uuid, orig.shift_id, req.user.id, orig.customer_name, -Number(orig.subtotal_uzs), -Number(orig.total_uzs),
         JSON.stringify([{ method: 'cash', amount: -Number(orig.total_uzs) }]), orig.id]);
      const { rows: items } = await client.query('SELECT * FROM pos_sale_items WHERE sale_id = $1', [orig.id]);
      for (const it of items) {
        await client.query(`INSERT INTO pos_sale_items (sale_id, product_id, variant_id, name, qty, price_uzs, line_total_uzs) VALUES ($1,$2,$3,$4,$5,$6,$7)`,
          [ret.id, it.product_id, it.variant_id, it.name, -Number(it.qty), Number(it.price_uzs), -Number(it.line_total_uzs)]);
        // Qaytarilgan tovar omborga qaytadi — yangi partiya sifatida
        await client.query(
          `INSERT INTO stock_lots (product_id, variant_id, qty, remaining, cost_price, lot_no) VALUES ($1,$2,$3,$4,0,'RETURN')`,
          [it.product_id, it.variant_id, Number(it.qty), Number(it.qty)]);
        await client.query(`INSERT INTO stock_movements (product_id, variant_id, qty, kind, ref_type, ref_id, by_user_id)
          VALUES ($1,$2,$3,'return','sale',$4,$5)`, [it.product_id, it.variant_id, Number(it.qty), ret.id, req.user.id]);
      }
      await client.query('COMMIT');
      await audit(req.user.id, req.user.name, 'return', 'sale', ret.id, { orig_receipt: orig.receipt_no, total: orig.total_uzs });
      const rItems = items.map(i => ({ name: i.name, qty: -Number(i.qty), price_uzs: Number(i.price_uzs), line_total_uzs: -Number(i.line_total_uzs) }));
      sendPrint({ ...ret, seller_name: req.user.name, customer_name: orig.customer_name, items: rItems, payment: [{ method: 'cash', amount: -Number(orig.total_uzs) }], total_uzs: -Number(orig.total_uzs) }, st);
      notifyCancel({ receipt_no: orig.receipt_no, total_uzs: orig.total_uzs, datetime_local: new Date().toLocaleString('ru-RU', { timeZone: 'Asia/Tashkent' }) }, req.user.name, 'Qaytarish (vozvrat)');
      res.json({ ok: true, receipt_no: Number(ret.receipt_no) });
    } catch (e) { await client.query('ROLLBACK').catch(() => {}); throw e; }
    finally { client.release(); }
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// Oflayn navbatdagi sotuvlar sonini ko'rsatish uchun — frontend IndexedDB da o'zi hisoblaydi.

// Chek qayta chop etish (log bilan)
router.post('/sales/:id/reprint', SELLER, async (req, res) => {
  const { rows } = await q(`SELECT s.*, u.name AS seller_name FROM pos_sales s LEFT JOIN users u ON u.id = s.user_id WHERE s.id = $1`, [req.params.id]);
  const s = rows[0];
  if (!s) return res.status(404).json({ error: 'Topilmadi' });
  const items = (await q('SELECT name, qty, price_uzs, line_total_uzs FROM pos_sale_items WHERE sale_id = $1', [s.id])).rows
    .map(i => ({ name: i.name, qty: Number(i.qty), price_uzs: Number(i.price_uzs), line_total_uzs: Number(i.line_total_uzs) }));
  const st = await getSettings();
  await q('UPDATE pos_sales SET reprint_count = COALESCE(reprint_count,0) + 1 WHERE id = $1', [s.id]);
  sendPrint({ receipt_no: s.receipt_no, seller_name: s.seller_name || req.user.name, customer_name: s.customer_name,
    items, total_uzs: Number(s.total_uzs), payment: s.payment, is_cancelled: false, datetime_local: s.created_at }, st, true);
  await audit(req.user.id, req.user.name, 'reprint', 'sale', s.id, null, { receipt_no: s.receipt_no });
  res.json({ ok: true });
});

module.exports = router;
