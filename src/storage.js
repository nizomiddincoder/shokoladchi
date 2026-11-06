// Rasm saqlash adapteri. Hozirgi implementatsiya: Postgres BYTEA (Railway fayl tizimi
// o'chuvchan bo'lgani uchun bazada turadi). Kelajakda R2/S3 ga o'tish uchun faqat
// shu faylning funksiyalarini S3 PUT/GET ga almashtirish kifoya (S3_ENDPOINT, S3_KEY... env).
const { q } = require('./db');
const crypto = require('crypto');

async function put(buffer, mime) {
  const id = crypto.randomBytes(16).toString('hex');
  await q('INSERT INTO image_blobs (id, data, mime) VALUES ($1,$2,$3)', [id, buffer, mime || 'image/webp']);
  return `/img/${id}`;
}

async function get(id) {
  const { rows } = await q('SELECT data, mime FROM image_blobs WHERE id = $1', [String(id).replace(/\W/g, '')]);
  return rows[0] || null;
}

module.exports = { put, get };
