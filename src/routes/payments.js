const router = require('express').Router();
const crypto = require('crypto');
const { q, getSettings } = require('../db');

// To'lov webhook'lari: Click va Payme. Idempotency — payments.idem_key UNIQUE orqali.
// To'lov holatlari: pending -> paid | refunded | failed

async function recordPayment({ kind, refId, method, amount, extId, idemKey, raw }) {
  if (idemKey) {
    const { rows: dup } = await q('SELECT id FROM payments WHERE idem_key = $1', [idemKey]);
    if (dup.length) return { duplicate: true, id: dup[0].id };
  }
  const { rows } = await q(
    `INSERT INTO payments (kind, ref_id, method, amount_uzs, status, ext_id, idem_key, raw)
     VALUES ($1,$2,$3,$4,'paid',$5,$6,$7) RETURNING id`,
    [kind, refId, method, amount, extId || '', idemKey || null, raw ? JSON.stringify(raw) : null]);
  return { duplicate: false, id: rows[0].id };
}

// --- CLICK Merchant API (prepare/complete, rasmiy md5 sxemasi) ---
router.post('/click', async (req, res) => {
  try {
    const b = req.body || {};
    const st = await getSettings();
    const serviceId = process.env.CLICK_SERVICE_ID || '';
    const merchantId = process.env.CLICK_MERCHANT_ID || '';
    const secretKey = process.env.CLICK_SECRET_KEY || '';
    // Rasmiy md5 tekshiruv: md5(click_trans_id + service_id + secret_key + merchant_trans_id + amount + action + sign_time)
    const signStr = [b.click_trans_id, serviceId, secretKey, b.merchant_trans_id, b.amount, b.action, b.sign_time].join('');
    const calcSign = crypto.createHash('md5').update(signStr).digest('hex');
    if (b.sign_string !== calcSign) return res.json({ error: -1, error_note: 'SIGN CHECK FAILED' });

    const orderId = Number(b.merchant_trans_id);
    const { rows } = await q('SELECT id, total_uzs, status FROM orders WHERE id = $1', [orderId]);
    const order = rows[0];
    if (!order) return res.json({ error: -5, error_note: 'Order not found' });
    const amountTiyn = Math.round(Number(b.amount) * 100); // Click tiyinda yuboradi
    const amountUzs = Math.round(Number(b.amount) * 1);    // biz so'mda saqlaymiz
    if (actionOk(b, 0)) { // prepare
      if (amountUzs !== Number(order.total_uzs)) return res.json({ error: -2, error_note: 'Incorrect parameter amount' });
      if (order.status === 'cancelled') return res.json({ error: -9, error_note: 'Transaction cancelled' });
      return res.json({ error: 0, error_note: 'Success', merchant_prepare_id: order.id });
    }
    if (actionOk(b, 1)) { // complete
      if (Number(b.previous_id) !== Number(order.id)) return res.json({ error: -7, error_note: 'Action not found for this transaction' });
      if (order.status === 'cancelled') return res.json({ error: -9, error_note: 'Transaction cancelled' });
      await recordPayment({ kind: 'order', refId: order.id, method: 'click',
        amount: Number(order.total_uzs), extId: String(b.click_trans_id),
        idemKey: 'click:' + b.click_trans_id, raw: b });
      await q(`UPDATE orders SET payment_method = 'click', status = CASE WHEN status = 'new' THEN 'accepted' ELSE status END,
        status_updated_at = now() WHERE id = $1`, [order.id]);
      return res.json({ error: 0, error_note: 'Success', merchant_confirm_id: order.id });
    }
    return res.json({ error: -3, error_note: 'Action not found' });
  } catch (e) { res.json({ error: -8, error_note: 'Internal error' }); }
});
function actionOk(b, action) { return Number(b.action) === action; }

// --- PAYME Merchant API (JSON-RPC, Basic auth: "Paycom:KEY") ---
router.post('/payme', async (req, res) => {
  try {
    const b = req.body || {};
    const auth = (req.headers.authorization || '').replace('Basic ', '');
    const expected = Buffer.from('Paycom:' + (process.env.PAYME_KEY || '')).toString('base64');
    if (!process.env.PAYME_KEY || auth !== expected) return jsonRpc(res, b.id, null, { code: -32504, message: 'Unauthorized' });
    const order = async id => {
      const { rows } = await q('SELECT id, total_uzs, status FROM orders WHERE id = $1', [Number(String(id).replace(/^Order_?/, ''))]);
      return rows[0] || null;
    };
    if (b.method === 'CheckPerformTransaction') {
      const o = await order(b.params?.account?.order_id || b.params?.account?.['order']);
      if (!o) return jsonRpc(res, b.id, null, { code: -31050, message: 'Buyurtma topilmadi' });
      if (Number(b.params?.amount) !== Number(o.total_uzs) * 100) return jsonRpc(res, b.id, null, { code: -31001, message: 'Summa mos emas' });
      return jsonRpc(res, b.id, { allow: true }, null);
    }
    if (b.method === 'CreateTransaction') {
      const o = await order(b.params?.account?.order_id || b.params?.account?.['order']);
      if (!o) return jsonRpc(res, b.id, null, { code: -31050, message: 'Buyurtma topilmadi' });
      const { rows } = await q(
        `INSERT INTO payments (kind, ref_id, method, amount_uzs, status, ext_id, idem_key, raw)
         VALUES ('order',$1,'payme',$2,'pending',$3,$4,$5)
         ON CONFLICT (idem_key) DO UPDATE SET raw = EXCLUDED.raw RETURNING id, status`,
        [o.id, Math.round(Number(b.params.amount) / 100), String(b.params.id), 'payme:' + b.params.id, JSON.stringify(b.params)]);
      const created = String(Math.floor(Date.now() / 1000));
      return jsonRpc(res, b.id, { create_time: created, transaction: String(rows[0].id), state: 1 }, null);
    }
    if (b.method === 'PerformTransaction') {
      const txId = String(b.params.id);
      const { rows } = await q(`SELECT p.*, o.status AS order_status FROM payments p JOIN orders o ON o.id = p.ref_id
        WHERE p.method = 'payme' AND p.ext_id = $1`, [txId]);
      const pay = rows[0];
      if (!pay) return jsonRpc(res, b.id, null, { code: -31003, message: 'Tranzaksiya topilmadi' });
      if (pay.status === 'paid') return jsonRpc(res, b.id, { transaction: String(pay.id), state: 2 }, null);
      await q(`UPDATE payments SET status = 'paid' WHERE id = $1`, [pay.id]);
      await q(`UPDATE orders SET payment_method = 'payme', status = CASE WHEN status = 'new' THEN 'accepted' ELSE status END,
        status_updated_at = now() WHERE id = $1`, [pay.ref_id]);
      return jsonRpc(res, b.id, { transaction: String(pay.id), state: 2 }, null);
    }
    if (b.method === 'CancelTransaction') {
      const { rows } = await q(`SELECT * FROM payments WHERE method = 'payme' AND ext_id = $1`, [String(b.params.id)]);
      if (!rows.length) return jsonRpc(res, b.id, null, { code: -31003, message: 'Tranzaksiya topilmadi' });
      const p = rows[0];
      await q(`UPDATE payments SET status = 'refunded' WHERE id = $1 AND status <> 'refunded'`, [p.id]);
      return jsonRpc(res, b.id, { transaction: String(p.id), state: -1, cancel_time: String(Math.floor(Date.now() / 1000)) }, null);
    }
    if (b.method === 'CheckTransaction' || b.method === 'GetStatement') {
      const { rows } = await q(`SELECT * FROM payments WHERE method = 'payme' AND ext_id = $1`, [String(b.params?.id || '')]);
      if (!rows.length) return jsonRpc(res, b.id, null, { code: -31003, message: 'Tranzaksiya topilmadi' });
      return jsonRpc(res, b.id, { state: rows[0].status === 'paid' ? 2 : 1, transaction: String(rows[0].id) }, null);
    }
    return jsonRpc(res, b.id, null, { code: -32601, message: 'Method not found' });
  } catch (e) { jsonRpc(res, null, null, { code: -32400, message: e.message }); }
});

function jsonRpc(res, id, result, error) {
  res.json({ jsonrpc: '2.0', ...(result ? { result } : { error }), id: id ?? null });
}

// --- Qo'lda tasdiqlash (o'tkazma / Uzum / Telegram Payments) — admin panel orqali ---
router.post('/manual-confirm', async (req, res) => {
  const b = req.body || {};
  const { middleware } = require('../auth');
  // Bu route admin token bilan chaqiriladi (server.js da mount qilinadi, token tekshiruvi shu yerda)
  const token = (req.headers.authorization || '').replace('Bearer ', '');
  const jwt = require('jsonwebtoken');
  let user;
  try { user = jwt.verify(token, process.env.JWT_SECRET || (await getSettings()).jwt_secret); } catch (e) { return res.status(401).json({ error: 'Kirilmagan' }); }
  if (user.role !== 'admin') return res.status(403).json({ error: 'Faqat admin' });
  const { rows } = await q('UPDATE payments SET status = \'paid\' WHERE id = $1 AND status = \'pending\' RETURNING *', [b.payment_id]);
  if (!rows.length) return res.status(400).json({ error: 'To\'lov topilmadi yoki allaqachon tasdiqlangan' });
  const p = rows[0];
  if (p.kind === 'order') {
    await q(`UPDATE orders SET payment_method = $1, status = CASE WHEN status = 'new' THEN 'accepted' ELSE status END,
      status_updated_at = now() WHERE id = $2`, [p.method, p.ref_id]);
  }
  res.json({ ok: true });
});

module.exports = router;
