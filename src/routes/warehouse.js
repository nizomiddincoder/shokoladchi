const router = require('express').Router();
const { q, audit } = require('../db');
const { middleware, maskPhone } = require('../auth');

const WH = middleware(['warehouse', 'admin']);
const ADMIN = middleware('admin');

// --- Yetkazib beruvchilar ---
router.get('/suppliers', WH, async (req, res) => {
  const { rows } = await q(`SELECT s.*,
    COALESCE((SELECT SUM(i.total_uzs) FROM supplier_invoices i WHERE i.supplier_id = s.id),0) AS invoiced,
    COALESCE((SELECT SUM(p.amount_uzs) FROM supplier_payments p WHERE p.supplier_id = s.id),0) AS paid
    FROM suppliers s WHERE s.is_active = true ORDER BY s.name`);
  res.json(rows.map(r => ({ ...r, debt_uzs: Number(r.invoiced) - Number(r.paid) })));
});

router.post('/suppliers', WH, async (req, res) => {
  const b = req.body || {};
  if (!b.name) return res.status(400).json({ error: 'Nom kerak' });
  const { rows } = await q('INSERT INTO suppliers (name, phone, stir, note) VALUES ($1,$2,$3,$4) RETURNING id',
    [b.name.trim(), b.phone || '', b.stir || '', b.note || '']);
  await audit(req.user.id, req.user.name, 'create', 'supplier', rows[0].id, null, { name: b.name });
  res.json({ ok: true, id: rows[0].id });
});

router.put('/suppliers/:id', WH, async (req, res) => {
  const b = req.body || {};
  await q('UPDATE suppliers SET name = COALESCE($1,name), phone = COALESCE($2,phone), stir = COALESCE($3,stir), note = COALESCE($4,note) WHERE id = $5',
    [b.name, b.phone, b.stir, b.note, req.params.id]);
  res.json({ ok: true });
});

// --- Kirim (nakladnoy): partiyalar + yaroqlilik muddati + qarz ---
router.get('/invoices', WH, async (req, res) => {
  const { rows } = await q(`SELECT i.*, s.name AS supplier_name, u.name AS by_name
    FROM supplier_invoices i JOIN suppliers s ON s.id = i.supplier_id LEFT JOIN users u ON u.id = i.by_user_id
    ORDER BY i.id DESC LIMIT 200`);
  res.json(rows.map(r => ({ ...r, total_uzs: Number(r.total_uzs) })));
});

router.post('/invoices', WH, async (req, res) => {
  const b = req.body || {};
  if (!b.supplier_id || !Array.isArray(b.items) || !b.items.length) return res.status(400).json({ error: 'Yetkazib beruvchi va mahsulotlar kerak' });
  const client = await require('../db').pool.connect();
  try {
    await client.query('BEGIN');
    let total = 0;
    for (const it of b.items) total += Math.round(Number(it.cost_price) * Number(it.qty));
    const { rows: inv } = await client.query(
      'INSERT INTO supplier_invoices (supplier_id, doc_no, total_uzs, note, by_user_id) VALUES ($1,$2,$3,$4,$5) RETURNING id',
      [b.supplier_id, b.doc_no || '', total, b.note || '', req.user.id]);
    for (const it of b.items) {
      const qty = Number(it.qty);
      if (qty <= 0) continue;
      const { rows: lot } = await client.query(
        `INSERT INTO stock_lots (product_id, variant_id, qty, remaining, cost_price, supplier_id, invoice_id, lot_no, expires_at)
         VALUES ($1,$2,$3,$3,$4,$5,$6,$7,$8) RETURNING id`,
        [it.product_id, it.variant_id || null, qty, Math.round(Number(it.cost_price) || 0), b.supplier_id, inv.id, it.lot_no || '', it.expires_at || null]);
      await client.query(`INSERT INTO stock_movements (product_id, variant_id, lot_id, qty, kind, ref_type, ref_id, by_user_id, note)
        VALUES ($1,$2,$3,$4,'in','invoice',$5,$6,$7)`,
        [it.product_id, it.variant_id || null, lot[0].id, qty, inv.id, req.user.id, `Kirim: ${b.doc_no || ''}`]);
      // Tannarxni yangilash (oxirgi kirim tannarxi)
      if (it.variant_id) await client.query('UPDATE product_variants SET cost_price = $1 WHERE id = $2', [Math.round(Number(it.cost_price) || 0), it.variant_id]);
      else await client.query('UPDATE goods SET cost_price = $1 WHERE id = $2', [Math.round(Number(it.cost_price) || 0), it.product_id]);
    }
    await client.query('COMMIT');
    await audit(req.user.id, req.user.name, 'create', 'invoice', inv.id, null, { supplier_id: b.supplier_id, total });
    res.json({ ok: true, id: inv.id, total_uzs: total });
  } catch (e) { await client.query('ROLLBACK').catch(() => {}); res.status(500).json({ error: e.message }); }
  finally { client.release(); }
});

// --- Yetkazib beruvchiga to'lov ---
router.post('/suppliers/:id/pay', WH, async (req, res) => {
  const amount = Math.round(Number((req.body || {}).amount) || 0);
  if (amount <= 0) return res.status(400).json({ error: 'Summa noto\'g\'ri' });
  await q('INSERT INTO supplier_payments (supplier_id, amount_uzs, method, note, by_user_id) VALUES ($1,$2,$3,$4,$5)',
    [req.params.id, amount, (req.body || {}).method || 'naqd', (req.body || {}).note || '', req.user.id]);
  await audit(req.user.id, req.user.name, 'pay', 'supplier', req.params.id, null, { amount });
  res.json({ ok: true });
});

// --- Oldi-berdi hisoboti (davr bo'yicha) ---
router.get('/suppliers-report', ADMIN, async (req, res) => {
  const { from, to } = req.query;
  const { rows } = await q(`
    SELECT s.id, s.name, s.phone,
      COALESCE((SELECT SUM(total_uzs) FROM supplier_invoices i WHERE i.supplier_id = s.id AND i.created_at::date BETWEEN $1 AND $2),0) AS kirim,
      COALESCE((SELECT SUM(amount_uzs) FROM supplier_payments p WHERE p.supplier_id = s.id AND p.created_at::date BETWEEN $1 AND $2),0) AS tolangan
    FROM suppliers s WHERE s.is_active = true ORDER BY s.name`, [from || '2000-01-01', to || '2099-12-31']);
  res.json(rows.map(r => ({ ...r, kirim: Number(r.kirim), tolangan: Number(r.tolangan), qarz: Number(r.kirim) - Number(r.tolangan) })));
});

// --- Chiqim (brak, yo'qotish, ichki iste'mol) ---
router.post('/writeoff', WH, async (req, res) => {
  const b = req.body || {};
  if (!b.product_id || !(Number(b.qty) > 0) || !b.reason) return res.status(400).json({ error: 'Mahsulot, miqdor va sabab kerak' });
  const client = await require('../db').pool.connect();
  try {
    await client.query('BEGIN');
    const pid = Number(b.product_id), vid = b.variant_id ? Number(b.variant_id) : null, qty = Number(b.qty);
    const { rows: lots } = await client.query(`SELECT id, remaining FROM stock_lots WHERE product_id = $1 AND (variant_id IS NOT DISTINCT FROM $2)
      AND remaining > 0 AND (expires_at IS NULL OR expires_at >= CURRENT_DATE) ORDER BY expires_at NULLS LAST, created_at`, [pid, vid]);
    const { allocateFifo } = require('../logic');
    const { picks, shortage } = allocateFifo(lots.map(l => ({ id: l.id, remaining: Number(l.remaining) })), qty);
    if (shortage > 0) { await client.query('ROLLBACK'); return res.status(400).json({ error: 'Qoldiq yetarli emas' }); }
    for (const p of picks) {
      await client.query('UPDATE stock_lots SET remaining = remaining - $1 WHERE id = $2', [p.qty, p.lotId]);
      await client.query(`INSERT INTO stock_movements (product_id, variant_id, lot_id, qty, kind, note, by_user_id)
        VALUES ($1,$2,$3,$4,'writeoff',$5,$6)`, [pid, vid, p.lotId, -p.qty, b.reason.slice(0, 300), req.user.id]);
    }
    await client.query('COMMIT');
    await audit(req.user.id, req.user.name, 'writeoff', 'goods', pid, null, { qty, reason: b.reason });
    res.json({ ok: true });
  } catch (e) { await client.query('ROLLBACK').catch(() => {}); res.status(500).json({ error: e.message }); }
  finally { client.release(); }
});

// --- Inventarizatsiya: sanalgan qoldiqni kiritish, farq avtomatik tuzatiladi ---
router.post('/inventory', WH, async (req, res) => {
  const b = req.body || {};
  if (!Array.isArray(b.lines) || !b.lines.length) return res.status(400).json({ error: 'Qatorlar kerak' });
  const client = await require('../db').pool.connect();
  try {
    await client.query('BEGIN');
    const diffs = [];
    for (const line of b.lines) {
      const pid = Number(line.product_id), vid = line.variant_id ? Number(line.variant_id) : null;
      const counted = Number(line.counted) || 0;
      const { rows: s } = await client.query(`SELECT COALESCE(SUM(remaining),0) r FROM stock_lots
        WHERE product_id = $1 AND (variant_id IS NOT DISTINCT FROM $2) AND (expires_at IS NULL OR expires_at >= CURRENT_DATE)`, [pid, vid]);
      const systemQty = Number(s[0].r);
      const diff = Math.round((counted - systemQty) * 1000) / 1000;
      if (diff === 0) continue;
      if (diff > 0) {
        // Yetishmayotgan qo'shildi — yangi partiya (tannarx 0, inventar tuzatish)
        const { rows: lot } = await client.query(
          'INSERT INTO stock_lots (product_id, variant_id, qty, remaining, cost_price, lot_no) VALUES ($1,$2,$3,$3,0,$4) RETURNING id',
          [pid, vid, diff, 'INVENTORY']);
        await client.query(`INSERT INTO stock_movements (product_id, variant_id, lot_id, qty, kind, note, by_user_id)
          VALUES ($1,$2,$3,$4,'inventory',$5,$6)`, [pid, vid, lot[0].id, diff, `Inventar: +${diff}`, req.user.id]);
      } else {
        // Ortig'i yechildi — FIFO bo'yicha
        const { rows: lots } = await client.query(`SELECT id, remaining FROM stock_lots WHERE product_id = $1 AND (variant_id IS NOT DISTINCT FROM $2)
          AND remaining > 0 AND (expires_at IS NULL OR expires_at >= CURRENT_DATE) ORDER BY expires_at NULLS LAST, created_at`, [pid, vid]);
        let need = -diff;
        for (const l of lots) {
          if (need <= 0) break;
          const take = Math.min(Number(l.remaining), need);
          await client.query('UPDATE stock_lots SET remaining = remaining - $1 WHERE id = $2', [take, l.id]);
          await client.query(`INSERT INTO stock_movements (product_id, variant_id, lot_id, qty, kind, note, by_user_id)
            VALUES ($1,$2,$3,$4,'inventory',$5,$6)`, [pid, vid, l.id, -take, `Inventar: -${take}`, req.user.id]);
          need -= take;
        }
      }
      diffs.push({ product_id: pid, variant_id: vid, system: systemQty, counted, diff });
    }
    await client.query('COMMIT');
    await audit(req.user.id, req.user.name, 'inventory', 'stock', null, null, diffs);
    res.json({ ok: true, adjusted: diffs.length, diffs });
  } catch (e) { await client.query('ROLLBACK').catch(() => {}); res.status(500).json({ error: e.message }); }
  finally { client.release(); }
});

// --- Qoldiqlar, partiyalar, yaroqlilik ---
router.get('/stock', WH, async (req, res) => {
  const { rows } = await q(`
    SELECT g.id, g.name, g.unit, g.min_stock,
      COALESCE(SUM(l.remaining) FILTER (WHERE l.expires_at IS NULL OR l.expires_at >= CURRENT_DATE), 0) AS stock,
      COALESCE(SUM(l.remaining) FILTER (WHERE l.expires_at < CURRENT_DATE), 0) AS expired
    FROM goods g LEFT JOIN stock_lots l ON l.product_id = g.id
    WHERE g.is_deleted = false GROUP BY g.id ORDER BY g.name`);
  res.json(rows.map(r => ({ ...r, stock: Number(r.stock), expired: Number(r.expired) })));
});

router.get('/lots', WH, async (req, res) => {
  const { rows } = await q(`
    SELECT l.*, g.name AS product_name, pv.name AS variant_name, s.name AS supplier_name
    FROM stock_lots l JOIN goods g ON g.id = l.product_id
    LEFT JOIN product_variants pv ON pv.id = l.variant_id LEFT JOIN suppliers s ON s.id = l.supplier_id
    WHERE l.remaining > 0 ORDER BY l.expires_at NULLS LAST, l.created_at`);
  res.json(rows.map(r => ({ ...r, qty: Number(r.qty), remaining: Number(r.remaining) })));
});

// Muddati yaqinlashgan partiyalar (7 kun ichida) — ogohlantirish uchun ham ishlatiladi
router.get('/expiring', WH, async (req, res) => {
  const { rows } = await q(`
    SELECT l.*, g.name AS product_name, pv.name AS variant_name FROM stock_lots l
    JOIN goods g ON g.id = l.product_id LEFT JOIN product_variants pv ON pv.id = l.variant_id
    WHERE l.remaining > 0 AND l.expires_at BETWEEN CURRENT_DATE AND CURRENT_DATE + 7
    ORDER BY l.expires_at`);
  res.json(rows.map(r => ({ ...r, remaining: Number(r.remaining) })));
});

// Qoldiq o'zgarishlari tarixi (kim, qachon, nima sababdan)
router.get('/movements', WH, async (req, res) => {
  const { rows } = await q(`
    SELECT m.*, g.name AS product_name, u.name AS by_name FROM stock_movements m
    JOIN goods g ON g.id = m.product_id LEFT JOIN users u ON u.id = m.by_user_id
    ORDER BY m.id DESC LIMIT 300`);
  res.json(rows.map(r => ({ ...r, qty: Number(r.qty) })));
});

module.exports = router;
