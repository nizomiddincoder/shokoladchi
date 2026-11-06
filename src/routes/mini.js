const router = require('express').Router();
const { q, getSettings } = require('../db');
const { verifyInitData } = require('../auth');
const { calcCart, ORDER_STATUSES } = require('../logic');
const { notifyNewOrder, notifyOrderStatus } = require('../bot');

// Mini App so'rovlari: X-Init-Data header orqali autentifikatsiya (HMAC serverda tekshiriladi)
async function auth(req, res, next) {
  const botToken = process.env.BOT_TOKEN;
  const d = verifyInitData(req.headers['x-init-data'] || '', botToken);
  if (!d) return res.status(401).json({ error: 'Telegram autentifikatsiyasi o\'tmadi' });
  req.tgUser = d.user;
  next();
}

async function ensureCustomer(tgUser) {
  const { rows } = await q(
    `INSERT INTO tg_customers (tg_id, name, username) VALUES ($1,$2,$3)
     ON CONFLICT (tg_id) DO UPDATE SET name = EXCLUDED.name, username = EXCLUDED.username
     RETURNING id, name, phone`,
    [tgUser.id, [tgUser.first_name, tgUser.last_name].filter(Boolean).join(' '), tgUser.username || '']);
  return rows[0];
}

router.use(auth);

// Katalog (mijozga: faqat faol, qoldiq bor-yo'qligi bilan; muddati o'tgan qoldiq hisobga kirmaydi)
router.get('/catalog', async (req, res) => {
  const { rows } = await q(`
    SELECT g.id, g.category_id, g.name, g.description, g.unit, g.price,
      COALESCE((SELECT SUM(v.remaining) FROM stock_lots v WHERE v.product_id = g.id AND v.variant_id IS NULL AND (v.expires_at IS NULL OR v.expires_at >= CURRENT_DATE)),0) AS stock,
      (SELECT json_agg(json_build_object('id',pi.id,'url',pi.url) ORDER BY pi.sort) FROM product_images pi WHERE pi.product_id = g.id) AS images,
      (SELECT json_agg(json_build_object('id',pv.id,'name',pv.name,'price',pv.price) ORDER BY pv.sort)
        FROM product_variants pv WHERE pv.product_id = g.id AND pv.is_active) AS variants
    FROM goods g WHERE g.is_deleted = false AND g.is_active = true ORDER BY g.id DESC`);
  res.json(rows.map(r => ({ ...r, price: Number(r.price), stock: Number(r.stock),
    variants: (r.variants || []).map(v => ({ ...v, price: Number(v.price) })) })));
});

router.get('/me', async (req, res) => {
  const c = await ensureCustomer(req.tgUser);
  res.json({ id: c.id, name: c.name || req.tgUser.first_name, phone: c.phone || '' });
});

router.post('/phone', async (req, res) => {
  const c = await ensureCustomer(req.tgUser);
  const phone = String((req.body || {}).phone || '').replace(/\D/g, '').slice(0, 12);
  await q('UPDATE tg_customers SET phone = $1 WHERE id = $2', [phone, c.id]);
  res.json({ ok: true });
});

// Buyurtma berish — FAQAT OLIB KETISH (yetkazib berish yo'q)
router.post('/orders', async (req, res) => {
  try {
    const b = req.body || {};
    if (!Array.isArray(b.items) || !b.items.length) return res.status(400).json({ error: 'Savatcha bo\'sh' });
    if (!b.pickup_date || !b.pickup_time) return res.status(400).json({ error: 'Olib ketish vaqtini tanlang' });
    if (!/^[\d+]{9,12}$/.test(String(b.phone || '').replace(/\D/g, ''))) return res.status(400).json({ error: 'Telefon raqam kerak' });
    const st = await getSettings();
    const methods = { cash: st.pay_cash, card: st.pay_card, click: st.pay_click, payme: st.pay_payme, transfer: st.pay_transfer };
    if (!methods[b.payment_method]) return res.status(400).json({ error: 'Bu to\'lov usuli o\'chirilgan' });

    const cust = await ensureCustomer(req.tgUser);
    if (!cust.phone) await q('UPDATE tg_customers SET phone = $1 WHERE id = $2', [String(b.phone).replace(/\D/g, ''), cust.id]);

    // Narxlar server tomonda mahsulotlardan olinadi — mijoz yuborgan narx ishonchsiz
    const ids = b.items.map(i => Number(i.product_id)).filter(Boolean);
    const { rows: goods } = await q(`SELECT id, name, price, is_active FROM goods WHERE id = ANY($1) AND is_deleted = false`, [ids]);
    const { rows: variants } = await q(`SELECT id, product_id, name, price, is_active FROM product_variants WHERE product_id = ANY($1)`, [ids]);
    const items = [];
    for (const it of b.items) {
      const g = goods.find(x => x.id === Number(it.product_id));
      if (!g || !g.is_active) return res.status(400).json({ error: 'Mahsulot topilmadi: ' + it.name });
      const v = it.variant_id ? variants.find(x => x.id === Number(it.variant_id) && x.is_active) : null;
      const price = v ? Number(v.price) : Number(g.price);
      const qty = Math.max(0.001, Number(it.qty) || 1);
      items.push({ product_id: g.id, variant_id: v ? v.id : null, name: g.name + (v ? ' (' + v.name + ')' : ''),
        qty, price_uzs: price, line_total_uzs: Math.round(price * qty) });
    }
    const { subtotal } = calcCart(items.map(i => ({ price: i.price_uzs, qty: i.qty })));

    // Qoldiq tekshiruvi: 0 bo'lsa buyurtma qabul qilinmaydi
    for (const it of items) {
      const { rows: s } = await q(`SELECT COALESCE(SUM(remaining),0) r FROM stock_lots
        WHERE product_id = $1 AND (variant_id IS NOT DISTINCT FROM $2) AND (expires_at IS NULL OR expires_at >= CURRENT_DATE)`,
        [it.product_id, it.variant_id]);
      if (Number(s[0].r) < it.qty) return res.status(400).json({ error: `"${it.name}" tugagan yoki yetarli emas` });
    }

    const { rows: or } = await q(`INSERT INTO orders (customer_id, pickup_date, pickup_time, phone, note, payment_method, total_uzs, status_updated_at)
      VALUES ($1,$2,$3,$4,$5,$6,$7, now()) RETURNING id, no`,
      [cust.id, b.pickup_date, b.pickup_time, String(b.phone).replace(/\D/g, ''), (b.note || '').slice(0, 500), b.payment_method, subtotal]);
    const order = or[0];
    for (const it of items)
      await q('INSERT INTO order_items (order_id, product_id, variant_id, name, qty, price_uzs, line_total_uzs) VALUES ($1,$2,$3,$4,$5,$6,$7)',
        [order.id, it.product_id, it.variant_id, it.name, it.qty, it.price_uzs, it.line_total_uzs]);
    // Rezerv: stock_movements 'order' (ombor chiqimi to'lov tasdiqlanganda yoki berilganda rasmiylashadi)
    for (const it of items)
      await q(`INSERT INTO stock_movements (product_id, variant_id, qty, kind, ref_type, ref_id, note)
               VALUES ($1,$2,$3,'order','order',$4,'Mini App buyurtma rezervi')`,
        [it.product_id, it.variant_id, -it.qty, order.id]);

    notifyNewOrder({ ...b, no: order.no, total_uzs: subtotal, items,
      customer_name: cust.name || req.tgUser.first_name });
    res.json({ ok: true, order_no: order.no, total_uzs: subtotal });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// Mijoz buyurtmalari
router.get('/orders', async (req, res) => {
  const cust = await ensureCustomer(req.tgUser);
  const { rows } = await q(`
    SELECT o.id, o.no, o.status, o.pickup_date, o.pickup_time, o.total_uzs, o.payment_method, o.created_at,
      (SELECT json_agg(json_build_object('name',i.name,'qty',i.qty,'price',i.price_uzs,'sum',i.line_total_uzs))
        FROM order_items i WHERE i.order_id = o.id) AS items
    FROM orders o WHERE o.customer_id = $1 ORDER BY o.id DESC LIMIT 50`, [cust.id]);
  res.json(rows.map(r => ({ ...r, status_uz: ORDER_STATUSES[r.status], total_uzs: Number(r.total_uzs) })));
});

// Buyurtmani bekor qilish (faqat yangi holatda)
router.post('/orders/:id/cancel', async (req, res) => {
  const cust = await ensureCustomer(req.tgUser);
  const { rows } = await q('SELECT * FROM orders WHERE id = $1 AND customer_id = $2', [req.params.id, cust.id]);
  const o = rows[0];
  if (!o) return res.status(404).json({ error: 'Topilmadi' });
  if (o.status !== 'new') return res.status(400).json({ error: 'Bu buyurtma allaqachon qabul qilingan' });
  await q(`UPDATE orders SET status = 'cancelled', status_updated_at = now() WHERE id = $1`, [o.id]);
  await q(`UPDATE stock_movements SET qty = -qty, kind = 'cancel' WHERE kind = 'order' AND ref_id = $1`, [o.id]);
  notifyOrderStatus({ ...o, status: 'cancelled' }, cust.tg_id);
  res.json({ ok: true });
});

module.exports = router;
