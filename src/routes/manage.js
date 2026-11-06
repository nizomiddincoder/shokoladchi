const router = require('express').Router();
const { q, getSettings, audit } = require('../db');
const { middleware, maskPhone } = require('../auth');
const { ORDER_STATUSES } = require('../logic');
const { notifyOrderStatus } = require('../bot');

const ADMIN = middleware('admin');
const STAFF = middleware(['admin', 'warehouse']);

// --- Dashboard ---
router.get('/dashboard', ADMIN, async (req, res) => {
  const { rows } = await q(`
    SELECT
      (SELECT COALESCE(SUM(total_uzs),0) FROM pos_sales WHERE created_at::date = CURRENT_DATE AND NOT is_return) AS today_sales,
      (SELECT COUNT(*) FROM pos_sales WHERE created_at::date = CURRENT_DATE AND NOT is_return) AS today_receipts,
      (SELECT COUNT(*) FROM orders WHERE created_at::date = CURRENT_DATE) AS today_orders,
      (SELECT COUNT(*) FROM orders WHERE status = 'new') AS new_orders,
      (SELECT COALESCE(SUM(total_uzs - p.amount_uzs * 0),0) FROM pos_sales WHERE created_at::date = CURRENT_DATE AND NOT is_return) AS x,
      (SELECT COUNT(*) FROM tg_customers) AS customers`);
  // Eng ko'p sotilgan va kam qolgan tovarlar
  const top = (await q(`
    SELECT si.name, SUM(si.qty) qty, SUM(si.line_total_uzs) sum FROM pos_sale_items si
    JOIN pos_sales s ON s.id = si.sale_id AND NOT s.is_return AND s.created_at >= now() - interval '30 days'
    GROUP BY si.name ORDER BY sum DESC LIMIT 10`)).rows.map(r => ({ name: r.name, qty: Number(r.qty), sum: Number(r.sum) }));
  const low = (await q(`
    SELECT g.name, g.min_stock, COALESCE(SUM(l.remaining) FILTER (WHERE l.expires_at IS NULL OR l.expires_at >= CURRENT_DATE),0) stock
    FROM goods g LEFT JOIN stock_lots l ON l.product_id = g.id
    WHERE g.is_deleted = false AND g.is_active GROUP BY g.id
    HAVING COALESCE(SUM(l.remaining) FILTER (WHERE l.expires_at IS NULL OR l.expires_at >= CURRENT_DATE),0) <= g.min_stock
    ORDER BY g.name LIMIT 20`)).rows.map(r => ({ name: r.name, min_stock: Number(r.min_stock), stock: Number(r.stock) }));
  const d = rows[0];
  const receipts = Number(d.today_receipts);
  res.json({
    today_sales: Number(d.today_sales), today_receipts: receipts,
    avg_receipt: receipts ? Math.round(Number(d.today_sales) / receipts) : 0,
    today_orders: Number(d.today_orders), new_orders: Number(d.new_orders), customers: Number(d.customers),
    top_products: top, low_stock: low
  });
});

// --- Buyurtmalar (admin) ---
router.get('/orders', ADMIN, async (req, res) => {
  const { status, date } = req.query;
  const params = [];
  let where = '1=1';
  if (status) { params.push(status); where += ` AND o.status = $${params.length}`; }
  if (date) { params.push(date); where += ` AND o.created_at::date = $${params.length}`; }
  const { rows } = await q(`
    SELECT o.*, c.name AS customer_name, c.tg_id,
      (SELECT json_agg(json_build_object('name',i.name,'qty',i.qty,'price',i.price_uzs,'sum',i.line_total_uzs))
        FROM order_items i WHERE i.order_id = o.id) AS items
    FROM orders o LEFT JOIN tg_customers c ON c.id = o.customer_id
    WHERE ${where} ORDER BY o.id DESC LIMIT 300`, params);
  res.json(rows.map(r => ({ ...r, total_uzs: Number(r.total_uzs), status_uz: ORDER_STATUSES[r.status], phone: maskPhone(r.phone) })));
});

const ALLOWED = ['new', 'accepted', 'preparing', 'ready', 'given', 'cancelled'];
router.post('/orders/:id/status', ADMIN, async (req, res) => {
  const { status } = req.body || {};
  if (!ALLOWED.includes(status)) return res.status(400).json({ error: 'Holat noto\'g\'ri' });
  const { rows } = await q(`SELECT o.*, c.tg_id FROM orders o LEFT JOIN tg_customers c ON c.id = o.customer_id WHERE o.id = $1`, [req.params.id]);
  const o = rows[0];
  if (!o) return res.status(404).json({ error: 'Topilmadi' });
  await q('UPDATE orders SET status = $1, status_updated_at = now() WHERE id = $2', [status, o.id]);
  // Bekor qilinganda rezervni qaytaramiz
  if (status === 'cancelled' && o.status !== 'cancelled')
    await q(`UPDATE stock_movements SET qty = -qty, kind = 'cancel' WHERE kind = 'order' AND ref_id = $1`, [o.id]);
  notifyOrderStatus(o, o.tg_id).catch(() => {});
  await audit(req.user.id, req.user.name, 'order_status', 'order', o.id, { status: o.status }, { status });
  res.json({ ok: true });
});

// --- Mijozlar ---
router.get('/customers', ADMIN, async (req, res) => {
  const { rows } = await q(`
    SELECT c.*, COUNT(o.id) AS orders_cnt, COALESCE(SUM(o.total_uzs),0) AS total_spent
    FROM tg_customers c LEFT JOIN orders o ON o.customer_id = c.id
    GROUP BY c.id ORDER BY total_spent DESC LIMIT 500`);
  res.json(rows.map(r => ({ ...r, total_spent: Number(r.total_spent), phone: maskPhone(r.phone) })));
});

// --- Smenalar (admin ko'rishi) ---
router.get('/shifts', ADMIN, async (req, res) => {
  const { rows } = await q(`
    SELECT s.*, u.name AS user_name,
      (SELECT COUNT(*) FROM pos_sales x WHERE x.shift_id = s.id AND NOT x.is_return) AS sales_cnt,
      (SELECT COALESCE(SUM(total_uzs),0) FROM pos_sales x WHERE x.shift_id = s.id AND NOT x.is_return) AS sales_sum
    FROM shifts s LEFT JOIN users u ON u.id = s.user_id ORDER BY s.id DESC LIMIT 200`);
  res.json(rows.map(r => ({ ...r, sales_sum: Number(r.sales_sum), opening_cash: Number(r.opening_cash),
    expected_cash: r.expected_cash == null ? null : Number(r.expected_cash),
    counted_cash: r.counted_cash == null ? null : Number(r.counted_cash), diff_uzs: r.diff_uzs == null ? null : Number(r.diff_uzs) })));
});

// --- Sozlamalar ---
router.get('/settings', STAFF, async (req, res) => {
  const s = await getSettings();
  const { jwt_secret, ...pub } = s;
  if (req.user.role === 'warehouse') { pub.usd_rate = undefined; }
  res.json(pub);
});

router.put('/settings', ADMIN, async (req, res) => {
  const b = req.body || {};
  const old = await getSettings();
  const fields = ['shop_name', 'shop_phone', 'shop_address', 'receipt_header', 'receipt_footer', 'work_open', 'work_close',
    'pay_cash', 'pay_card', 'pay_click', 'pay_payme', 'pay_transfer', 'pay_tg', 'discount_max_percent', 'discount_max_uzs',
    'report_hour', 'report_email', 'admin_chat_id', 'group_chat_id', 'warehouse_sees_cost', 'usd_rate'];
  const sets = [], vals = [];
  fields.forEach((f, i) => {
    if (b[f] !== undefined) {
      sets.push(`${f} = $${vals.length + 1}`);
      const num = ['discount_max_percent', 'discount_max_uzs', 'report_hour', 'usd_rate'].includes(f);
      const bool = ['pay_cash', 'pay_card', 'pay_click', 'pay_payme', 'pay_transfer', 'pay_tg', 'warehouse_sees_cost'].includes(f);
      vals.push(bool ? !!b[f] : num ? Math.round(Number(b[f]) || 0) : String(b[f]));
    }
  });
  if (sets.length) {
    vals.push(1);
    await q(`UPDATE app_settings SET ${sets.join(', ')} WHERE id = $${vals.length}`, vals);
    await audit(req.user.id, req.user.name, 'update', 'settings', 1,
      Object.fromEntries(Object.keys(b).map(k => [k, old[k]])), b);
  }
  res.json({ ok: true });
});

// --- Audit log ---
router.get('/audit', ADMIN, async (req, res) => {
  const { rows } = await q('SELECT * FROM audit_log ORDER BY id DESC LIMIT 300');
  res.json(rows);
});

// --- Sotuvlar hisoboti CSV (oddiy eksport) ---
router.get('/export/sales.csv', ADMIN, async (req, res) => {
  const { from, to } = req.query;
  const { rows } = await q(`
    SELECT s.receipt_no, s.created_at, u.name AS seller, s.customer_name, s.subtotal_uzs, s.discount_uzs, s.total_uzs, s.payment
    FROM pos_sales s LEFT JOIN users u ON u.id = s.user_id
    WHERE s.created_at::date BETWEEN $1 AND $2 ORDER BY s.id`, [from || '2000-01-01', to || '2099-12-31']);
  const head = 'chek_no;sana;kassir;xaridor;subtotal;chegirma;jami;tovlov';
  const lines = rows.map(r => [r.receipt_no, new Date(r.created_at).toLocaleString('ru-RU', { timeZone: 'Asia/Tashkent' }),
    r.seller, r.customer_name, r.subtotal_uzs, r.discount_uzs, r.total_uzs,
    (r.payment || []).map(p => p.method + ':' + p.amount).join('+')].join(';'));
  res.set('Content-Type', 'text/csv; charset=utf-8');
  res.set('Content-Disposition', `attachment; filename="savdo-${from}-${to}.csv"`);
  res.send('\uFEFF' + [head, ...lines].join('\n'));
});

// Kunlik hisobotni qo'lda yaratib yuklab olish (PDF)
router.get('/report/daily', ADMIN, async (req, res) => {
  const { dateStr } = require('../reports').yesterdayRange();
  const file = await require('../reports').buildDailyReport(req.query.date || dateStr);
  res.set('Content-Type', 'application/pdf');
  res.set('Content-Disposition', `attachment; filename="${require('path').basename(file)}"`);
  require('fs').createReadStream(file).pipe(res);
});

module.exports = router;
