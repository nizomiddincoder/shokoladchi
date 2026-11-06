const router = require('express').Router();
const { q, getSettings, audit } = require('../db');
const { middleware, maskPhone } = require('../auth');
const storage = require('../storage');
const imgproc = require('../imgproc');

// --- Rasm: public o'qish, yuklash admin/ombor uchun ---
router.get('/img/:id', async (req, res) => {
  try {
    const b = await storage.get(req.params.id);
    if (!b) return res.status(404).end();
    res.set('Content-Type', b.mime).set('Cache-Control', 'public, max-age=31536000').send(b.data);
  } catch (e) { res.status(404).end(); }
});

// --- Kategoriyalar (ierarxik) ---
router.get('/categories', async (req, res) => {
  const { rows } = await q('SELECT id, parent_id, name, sort, is_active FROM categories WHERE is_active = true ORDER BY sort, id');
  res.json(rows);
});

router.get('/admin/categories', middleware('admin'), async (req, res) => {
  const { rows } = await q('SELECT * FROM categories ORDER BY sort, id');
  res.json(rows);
});

router.post('/admin/categories', middleware('admin'), async (req, res) => {
  const { name, parent_id, sort } = req.body || {};
  if (!name) return res.status(400).json({ error: 'Nom kerak' });
  const { rows } = await q('INSERT INTO categories (name, parent_id, sort) VALUES ($1,$2,$3) RETURNING id', [name.trim(), parent_id || null, sort || 0]);
  await audit(req.user.id, req.user.name, 'create', 'category', rows[0].id, null, { name });
  res.json({ ok: true, id: rows[0].id });
});

router.put('/admin/categories/:id', middleware('admin'), async (req, res) => {
  const { name, parent_id, sort, is_active } = req.body || {};
  await q('UPDATE categories SET name = COALESCE($1,name), parent_id = $2, sort = COALESCE($3,sort), is_active = COALESCE($4,is_active) WHERE id = $5',
    [name, parent_id === undefined ? null : parent_id, sort, is_active, req.params.id]);
  await audit(req.user.id, req.user.name, 'update', 'category', req.params.id, null, { name, is_active });
  res.json({ ok: true });
});

// --- Mahsulotlar ---
router.get('/goods', async (req, res) => {
  const { category_id, search, include_inactive } = req.query;
  const where = ['g.is_deleted = false'];
  const params = [];
  if (category_id) { params.push(category_id); where.push(`(g.category_id = $${params.length} OR g.category_id IN (SELECT id FROM categories WHERE parent_id = $${params.length}))`); }
  if (search) { params.push('%' + search + '%'); where.push(`g.name ILIKE $${params.length}`); }
  if (!include_inactive) where.push('g.is_active = true');
  const { rows } = await q(`
    SELECT g.*, 
      COALESCE((SELECT SUM(v.remaining) FROM stock_lots v WHERE v.product_id = g.id AND v.variant_id IS NULL AND (v.expires_at IS NULL OR v.expires_at >= CURRENT_DATE)), 0) AS stock,
      (SELECT json_agg(json_build_object('id',pi.id,'url',pi.url) ORDER BY pi.sort) FROM product_images pi WHERE pi.product_id = g.id) AS images,
      (SELECT json_agg(json_build_object('id',pv.id,'name',pv.name,'price',pv.price,'barcode',pv.barcode) ORDER BY pv.sort)
        FROM product_variants pv WHERE pv.product_id = g.id AND pv.is_active) AS variants
    FROM goods g WHERE ${where.join(' AND ')} ORDER BY g.id DESC`, params);
  res.json(rows.map(r => ({ ...r, price: Number(r.price), stock: Number(r.stock) })));
});

router.get('/admin/goods/:id', middleware(['admin', 'warehouse']), async (req, res) => {
  const { rows } = await q('SELECT * FROM goods WHERE id = $1 AND is_deleted = false', [req.params.id]);
  if (!rows.length) return res.status(404).json({ error: 'Topilmadi' });
  const g = rows[0];
  g.variants = (await q('SELECT * FROM product_variants WHERE product_id = $1 ORDER BY sort', [g.id])).rows;
  g.images = (await q('SELECT id, url, sort FROM product_images WHERE product_id = $1 ORDER BY sort', [g.id])).rows;
  g.stock = Number((await q(`SELECT COALESCE(SUM(remaining),0) s FROM stock_lots WHERE product_id=$1 AND (expires_at IS NULL OR expires_at >= CURRENT_DATE)`, [g.id])).rows[0].s);
  const st = await getSettings();
  if (!st.warehouse_sees_cost && req.user.role === 'warehouse') { delete g.cost_price; g.variants.forEach(v => delete v.cost_price); }
  res.json(g);
});

router.post('/admin/goods', middleware(['admin']), async (req, res) => {
  try {
    const b = req.body || {};
    if (!b.name) return res.status(400).json({ error: 'Nom kerak' });
    const { rows } = await q(`INSERT INTO goods (category_id, name, sku, barcode, unit, price, cost_price, min_stock, description, is_active)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) RETURNING id`,
      [b.category_id || null, b.name.trim(), b.sku || '', b.barcode || null, b.unit || 'pcs',
       Math.round(b.price || 0), Math.round(b.cost_price || 0), b.min_stock || 0, b.description || '', b.is_active !== false]);
    const id = rows[0].id;
    await saveVariants(id, b.variants);
    await saveImages(id, b.images, req);
    await audit(req.user.id, req.user.name, 'create', 'goods', id, null, { name: b.name, price: b.price });
    res.json({ ok: true, id });
  } catch (e) {
    if (/duplicate key/.test(e.message)) return res.status(400).json({ error: 'Bunday barcode allaqachon mavjud' });
    res.status(500).json({ error: e.message });
  }
});

router.put('/admin/goods/:id', middleware(['admin']), async (req, res) => {
  try {
    const b = req.body || {};
    const cur = (await q('SELECT * FROM goods WHERE id = $1', [req.params.id])).rows[0];
    if (!cur) return res.status(404).json({ error: 'Topilmadi' });
    await q(`UPDATE goods SET category_id = COALESCE($1,category_id), name = COALESCE($2,name), sku = COALESCE($3,sku),
      barcode = $4, unit = COALESCE($5,unit), price = COALESCE($6,price), cost_price = COALESCE($7,cost_price),
      min_stock = COALESCE($8,min_stock), description = COALESCE($9,description), is_active = COALESCE($10,is_active)
      WHERE id = $${11}`,
      [b.category_id, b.name, b.sku, b.barcode === undefined ? cur.barcode : (b.barcode || null),
       b.unit, b.price, b.cost_price, b.min_stock, b.description, b.is_active, req.params.id]);
    if (b.variants) { await q('DELETE FROM product_variants WHERE product_id = $1', [req.params.id]); await saveVariants(req.params.id, b.variants); }
    if (b.images) { await q('DELETE FROM product_images WHERE product_id = $1', [req.params.id]); await saveImages(req.params.id, b.images, req); }
    await audit(req.user.id, req.user.name, 'update', 'goods', req.params.id,
      { name: cur.name, price: cur.price, is_active: cur.is_active }, { name: b.name, price: b.price, is_active: b.is_active });
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.delete('/admin/goods/:id', middleware(['admin']), async (req, res) => {
  await q('UPDATE goods SET is_deleted = true, is_active = false WHERE id = $1', [req.params.id]);
  await audit(req.user.id, req.user.name, 'delete', 'goods', req.params.id);
  res.json({ ok: true });
});

async function saveVariants(productId, variants) {
  for (const [i, v] of (variants || []).entries()) {
    if (!v.name) continue;
    await q(`INSERT INTO product_variants (product_id, name, barcode, price, cost_price, sort) VALUES ($1,$2,$3,$4,$5,$6)`,
      [productId, v.name, v.barcode || null, Math.round(v.price || 0), Math.round(v.cost_price || 0), i]);
  }
}

// Rasm yuklash: imgproc adapter (fon olib tashlash + markazlash) -> storage -> DB
async function saveImages(productId, images, req) {
  for (const [i, img] of (images || []).entries()) {
    let url = img.url || '';
    if (img.data) {
      const buf = Buffer.from(img.data.split(',').pop(), 'base64');
      const { processed, note } = await imgproc.processImage({ data: buf, mime: img.mime || 'image/jpeg' });
      url = await storage.put(processed || buf, processed ? 'image/webp' : (img.mime || 'image/jpeg'));
      if (note && !imgproc.enabled) console.log(`[imgproc] product ${productId}: ${note}`);
    }
    if (url) await q('INSERT INTO product_images (product_id, url, sort) VALUES ($1,$2,$3)', [productId, url, i]);
  }
}

// Barcode bo'yicha qidiruv (POS skaner uchun)
router.get('/barcode/:code', middleware(['seller', 'admin']), async (req, res) => {
  const code = req.params.code;
  const { rows } = await q(`
    SELECT g.id, g.name, g.unit, g.price, pv.id AS variant_id, pv.name AS variant_name, pv.price AS variant_price
    FROM goods g LEFT JOIN product_variants pv ON pv.product_id = g.id
    WHERE g.is_deleted = false AND g.is_active = true AND (g.barcode = $1 OR pv.barcode = $1) LIMIT 1`, [code]);
  if (!rows.length) return res.status(404).json({ error: 'Barcode topilmadi' });
  const r = rows[0];
  res.json({ product_id: r.id, name: r.name, unit: r.unit, variant_id: r.variant_id || null,
    price: r.variant_id ? Number(r.variant_price) : Number(r.price) });
});

module.exports = router;
