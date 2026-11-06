const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { getSettings } = require('./db');

async function secret() {
  if (process.env.JWT_SECRET) return process.env.JWT_SECRET;
  const s = await getSettings();
  return s.jwt_secret || 'dev-secret';
}

async function sign(payload) {
  return jwt.sign(payload, await secret(), { expiresIn: '30d' });
}

// RBAC: role ro'yxati bo'sh bo'lsa istalgan autentifikatsiyalangan foydalanuvchi o'tadi.
function middleware(roles) {
  const allowed = Array.isArray(roles) ? roles : (roles ? [roles] : null);
  return async (req, res, next) => {
    try {
      const h = req.headers.authorization || '';
      const token = h.startsWith('Bearer ') ? h.slice(7) : null;
      if (!token) return res.status(401).json({ error: 'Kirilmagan' });
      const d = await jwt.verify(token, await secret());
      if (allowed && !allowed.includes(d.role)) return res.status(403).json({ error: 'Ruxsat yo\'q' });
      req.user = d;
      next();
    } catch (e) {
      res.status(401).json({ error: 'Sessiya tugagan, qaytadan kiring' });
    }
  };
}

const hashPin = p => bcrypt.hashSync(String(p), 8);
const checkPin = (p, h) => h ? bcrypt.compareSync(String(p), h) : false;
const hashPassword = p => bcrypt.hashSync(String(p), 10);
const checkPassword = (p, h) => h ? bcrypt.compareSync(String(p), h) : false;

// Telegram Mini App initData tekshiruvi (HMAC-SHA256, rasmiy algoritm)
function verifyInitData(initData, botToken) {
  if (!initData || !botToken) return null;
  try {
    const params = new URLSearchParams(initData);
    const hash = params.get('hash');
    if (!hash) return null;
    params.delete('hash');
    const dataCheckString = [...params.entries()].sort(([a], [b]) => a.localeCompare(b))
      .map(([k, v]) => `${k}=${v}`).join('\n');
    const secretKey = cryptoHmac('HMAC', 'WebAppData', botToken);
    const calc = cryptoHmacHex(secretKey, dataCheckString);
    if (calc !== hash) return null;
    const authDate = Number(params.get('auth_date') || 0) * 1000;
    // 1 sutkadan eski initData qabul qilinmaydi
    if (!authDate || Date.now() - authDate > 24 * 3600 * 1000) return null;
    const user = JSON.parse(params.get('user') || 'null');
    return user ? { user, raw: params } : null;
  } catch (e) { return null; }
}

const crypto = require('crypto');
function cryptoHmac(alg, key, msg) { return crypto.createHmac(alg, key).update(msg).digest(); }
function cryptoHmacHex(key, msg) { return crypto.createHmac('sha256', key).update(msg).digest('hex'); }

// Loglarda telefon maskalansin: 998901234567 -> 99890***4567
function maskPhone(p) {
  const s = String(p || '').replace(/\D/g, '');
  if (s.length < 8) return '***';
  return s.slice(0, 5) + '***' + s.slice(-4);
}

module.exports = { sign, middleware, hashPin, checkPin, hashPassword, checkPassword, verifyInitData, maskPhone };
