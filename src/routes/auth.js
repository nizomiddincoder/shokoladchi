const router = require('express').Router();
const { q, audit } = require('../db');
const { sign, middleware, hashPin, checkPin, hashPassword, checkPassword } = require('../auth');
const { pinLockState, PIN_MAX_ATTEMPTS } = require('../logic');

// Rate limit — login va PIN urinishlari uchun (IP bo'yicha, oddiy in-memory)
const hits = new Map();
function rateLimit(key, max, windowMs) {
  const now = Date.now();
  const arr = (hits.get(key) || []).filter(t => now - t < windowMs);
  arr.push(now);
  hits.set(key, arr);
  return arr.length > max;
}
setInterval(() => {
  const now = Date.now();
  for (const [k, v] of hits) { const f = v.filter(t => now - t < 3600e3); if (f.length) hits.set(k, f); else hits.delete(k); }
}, 600e3).unref();

function ip(req) { return (req.headers['x-forwarded-for'] || req.socket.remoteAddress || '').toString().slice(0, 50); }

// --- ADMIN: ro'yxatdan o'tish (birinchi admin yoki admin o'zi qo'shsin) ---
// Email tasdiqlash: 6 xonali kod. SMTP sozlanmagan bo'lsa kod server logga yoziladi
// (Railway Logs'dan olinadi) — prod'da SMTP_URL env orqali yoqiladi.
// Ro'yxatdan o'tish — email tasdiqlash YO'Q: darhol hisob ochiladi va token qaytadi.
// Birinchi foydalanuvchi ADMIN bo'ladi, keyingilari SOTUVCHI (admin panelga kira olmaydi).
router.post('/register', async (req, res) => {
  try {
    if (rateLimit('reg:' + ip(req), 10, 3600e3)) return res.status(429).json({ error: 'Juda ko\'p urinish, biroz kutib turing' });
    const { name, email, password } = req.body || {};
    if (!name || !email || !password || String(password).length < 8)
      return res.status(400).json({ error: 'Ism, email va kamida 8 belgili parol kerak' });
    const mail = String(email).toLowerCase();
    const exists = await q('SELECT id, email_verified FROM users WHERE email = $1', [mail]);
    if (exists.rows.length && exists.rows[0].email_verified)
      return res.status(400).json({ error: 'Bu email allaqachon ro\'yxatdan o\'tgan — kirishdan foydalaning' });
    const anyAdmin = await q(`SELECT id FROM users WHERE role = 'admin' AND email_verified = true LIMIT 1`);
    const role = anyAdmin.rows.length ? 'seller' : 'admin';
    let row;
    if (exists.rows.length) {
      // oldingi yarim yozuvni yangilaymiz
      row = (await q(`UPDATE users SET name = $1, password_hash = $2, role = $3, email_verified = true, email_code = NULL
        WHERE email = $4 RETURNING id, name`, [name.trim(), hashPassword(password), role, mail])).rows[0];
    } else {
      row = (await q(`INSERT INTO users (name, email, password_hash, role, email_verified)
        VALUES ($1,$2,$3,$4,true) RETURNING id, name`, [name.trim(), mail, hashPassword(password), role])).rows[0];
    }
    const token = await sign({ id: row.id, role, name: row.name });
    await audit(row.id, row.name, role === 'admin' ? 'register_admin' : 'register', 'user', row.id);
    res.json({ ok: true, token, role });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.post('/login', async (req, res) => {
  try {
    if (rateLimit('login:' + ip(req), 10, 600e3)) return res.status(429).json({ error: 'Juda ko\'p urinish, keyinroq urinib ko\'ring' });
    const { email, password } = req.body || {};
    const { rows } = await q('SELECT * FROM users WHERE email = $1 AND is_active = true', [String(email || '').toLowerCase()]);
    const u = rows[0];
    if (!u || !checkPassword(password, u.password_hash)) return res.status(401).json({ error: 'Email yoki parol xato' });
    const token = await sign({ id: u.id, role: u.role, name: u.name });
    await audit(u.id, u.name, 'login', 'user', u.id, null, null, ip(req));
    res.json({ ok: true, token, role: u.role, name: u.name });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// --- KASSIR/OMBOR: PIN bilan kirish ---
router.post('/pin-login', async (req, res) => {
  try {
    if (rateLimit('pin:' + ip(req), 30, 600e3)) return res.status(429).json({ error: 'Juda ko\'p urinish' });
    const { pin } = req.body || {};
    if (!/^\d{4}$/.test(String(pin || ''))) return res.status(400).json({ error: '4 xonali PIN kerak' });
    const { rows } = await q(`SELECT * FROM users WHERE role IN ('seller','warehouse','admin') AND is_active = true AND pin_hash IS NOT NULL`);
    for (const u of rows) {
      const lock = pinLockState(u.failed_attempts, u.locked_until);
      if (lock.locked) {
        return res.status(423).json({ error: `PIN bloklangan. ${Math.ceil(lock.remainingMs / 60000)} daqiqa kutib turing`, lockedUntil: lock.until });
      }
      if (checkPin(pin, u.pin_hash)) {
        if (u.failed_attempts > 0) await q('UPDATE users SET failed_attempts = 0, locked_until = NULL WHERE id = $1', [u.id]);
        const token = await sign({ id: u.id, role: u.role, name: u.name });
        await audit(u.id, u.name, 'pin_login', 'user', u.id, null, null, ip(req));
        return res.json({ ok: true, token, role: u.role, name: u.name, id: u.id });
      }
    }
    await audit(null, '', 'pin_login_failed', 'user', null, null, null, ip(req));
    res.status(401).json({ error: `PIN xato. ${PIN_MAX_ATTEMPTS} marta xatodan keyin bloklanadi` });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// --- XODIMLAR (admin boshqaradi) ---
router.get('/staff', middleware('admin'), async (req, res) => {
  const { rows } = await q(`SELECT id, name, phone, role, email, email_verified, pin_view, is_active, failed_attempts, locked_until, created_at FROM users ORDER BY id`);
  res.json(rows);
});

router.post('/staff', middleware('admin'), async (req, res) => {
  try {
    const { name, phone, role, pin } = req.body || {};
    if (!name || !['seller', 'warehouse', 'admin'].includes(role)) return res.status(400).json({ error: 'Ism va to\'g\'ri rol kerak' });
    if (pin && !/^\d{4}$/.test(pin)) return res.status(400).json({ error: 'PIN 4 xonali bo\'lishi kerak' });
    const { rows } = await q(
      `INSERT INTO users (name, phone, role, pin_hash, pin_view) VALUES ($1,$2,$3,$4,$5) RETURNING id`,
      [name.trim(), phone || '', role, pin ? hashPin(pin) : null, pin || '']);
    await audit(req.user.id, req.user.name, 'create', 'staff', rows[0].id, null, { name, role });
    res.json({ ok: true, id: rows[0].id });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.put('/staff/:id', middleware('admin'), async (req, res) => {
  try {
    const { id } = req.params;
    const { name, phone, role, pin, is_active } = req.body || {};
    const cur = (await q('SELECT * FROM users WHERE id = $1', [id])).rows[0];
    if (!cur) return res.status(404).json({ error: 'Topilmadi' });
    if (pin !== undefined && pin !== null && pin !== '') {
      if (!/^\d{4}$/.test(pin)) return res.status(400).json({ error: 'PIN 4 xonali bo\'lishi kerak' });
      await q('UPDATE users SET pin_hash = $1, pin_view = $2, failed_attempts = 0, locked_until = NULL WHERE id = $3', [hashPin(pin), pin, id]);
    }
    if (name !== undefined || phone !== undefined || role !== undefined || is_active !== undefined) {
      await q(`UPDATE users SET name = $1, phone = $2, role = $3, is_active = $4 WHERE id = $5`,
        [name !== undefined ? name : cur.name, phone !== undefined ? phone : cur.phone,
         role !== undefined ? role : cur.role, is_active !== undefined ? !!is_active : cur.is_active, id]);
    }
    await audit(req.user.id, req.user.name, 'update', 'staff', id,
      { name: cur.name, role: cur.role, is_active: cur.is_active, pin: cur.pin_view },
      { name, role, is_active, pin: pin || undefined });
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.delete('/staff/:id', middleware('admin'), async (req, res) => {
  await q('UPDATE users SET is_active = false WHERE id = $1', [req.params.id]);
  await audit(req.user.id, req.user.name, 'block', 'staff', req.params.id);
  res.json({ ok: true });
});

module.exports = router;
