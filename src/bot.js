let started = false;

const API = m => `https://api.telegram.org/bot${process.env.BOT_TOKEN}/${m}`;
const sleep = ms => new Promise(res => setTimeout(res, ms));

function groupChatId() { return process.env.GROUP_CHAT_ID || null; }
function adminChatId() { return process.env.ADMIN_CHAT_ID || null; }

async function tg(method, body) {
  try {
    const r = await fetch(API(method), {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body), signal: AbortSignal.timeout(35000)
    });
    return await r.json();
  } catch (e) { console.error('tg:', e.message); }
}

function fmtUz(n) { return Math.round(n).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ' '); }

function initBot() {
  if (started) return;
  started = true;
  if (!process.env.BOT_TOKEN) { console.log('BOT_TOKEN yo\'q — bot ishlamaydi'); return; }
  // Mini App -> /mini/ ; kassir POS -> /pos/
  const miniUrl = process.env.APP_URL ? process.env.APP_URL.replace(/\/$/, '') + '/mini/' : null;
  if (miniUrl) {
    tg('setChatMenuButton', { menu_button: { type: 'web_app', text: '🛍 Do\'kon', web_app: { url: miniUrl } } });
    tg('setMyCommands', { commands: [
      { command: 'start', description: 'Do\'konni ochish' },
      { command: 'id', description: 'Chat ID ni olish' }
    ] });
  }
  let offset = 0;
  (async function loop() {
    while (true) {
      try {
        const r = await tg('getUpdates', { offset, timeout: 25, allowed_updates: ['message'] });
        if (!r || !r.ok) { await sleep(5000); continue; }
        for (const u of r.result || []) {
          offset = u.update_id + 1;
          const m = u.message;
          if (!m || !m.text) continue;
          if (m.text.startsWith('/id')) {
            tg('sendMessage', { chat_id: m.chat.id, text: 'Chat ID: ' + m.chat.id });
          } else if (m.text.startsWith('/start')) {
            tg('sendMessage', {
              chat_id: m.chat.id,
              text: 'Assalomu alaykum! Shirinliklar do\'koniga xush kelibsiz 🍰',
              reply_markup: {
                inline_keyboard: [[
                  miniUrl ? { text: '🛍 Do\'konni ochish', web_app: { url: miniUrl } }
                          : { text: 'Dastur hali sozlanmagan (APP_URL yo\'q)', url: 'https://example.com' }
                ]]
              }
            });
          }
        }
      } catch (e) { console.error('bot loop:', e.message); await sleep(3000); }
    }
  })();
  console.log('Telegram bot ishlayapti. Guruh:', groupChatId() || 'belgilanmagan');
}

// --- POS chek xabari (kassa guruhiga) ---
async function notifySale(r) {
  if (!process.env.BOT_TOKEN || !groupChatId()) return;
  const lines = r.items.map(i => `• ${i.name} ×${i.qty} — ${fmtUz(i.line_total_uzs)} so'm`).join('\n');
  const pay = (r.payment || []).map(p => ({ cash: '💵 Naqd', card: '💳 Karta', click: '🟦 Click', payme: '🟢 Payme', transfer: '🏦 O\'tkazma' }[p.method] || p.method) + ': ' + fmtUz(p.amount)).join('\n');
  await tg('sendMessage', {
    chat_id: groupChatId(),
    text: `🧾 POS Chek #${String(r.receipt_no).padStart(6, '0')}\n🕒 ${r.datetime_local}\n👤 Kassir: ${r.seller_name}\n${lines}\n💰 Jami: ${fmtUz(r.total_uzs)} so'm\n${pay}`
  });
}

async function notifyCancel(r, byName, reason) {
  if (!process.env.BOT_TOKEN || !groupChatId()) return;
  await tg('sendMessage', {
    chat_id: groupChatId(),
    text: `⛔ Chek #${String(r.receipt_no).padStart(6, '0')} BEKOR QILINDI\n🕒 ${r.datetime_local}\nBekor qilgan: ${byName}` + (reason ? `\nSabab: ${reason}` : '') + `\nSumma: ${fmtUz(r.total_uzs)} so'm`
  });
}

// --- Yangi buyurtma xabari (admin + kassa guruhiga) ---
async function notifyNewOrder(o) {
  if (!process.env.BOT_TOKEN) return;
  const lines = (o.items || []).map(i => `• ${i.name}${i.variant_name ? ' (' + i.variant_name + ')' : ''} ×${i.qty} — ${fmtUz(i.line_total_uzs)} so'm`).join('\n');
  const text = `🆕 YANGI BUYURTMA #${o.no}\n👤 ${o.customer_name} (${o.phone || 'telefon yo\'q'})\n⏰ Olib ketish: ${o.pickup_date} ${o.pickup_time}\n${lines}\n💰 Jami: ${fmtUz(o.total_uzs)} so'm\n💳 To'lov: ${o.payment_method}`;
  const targets = [adminChatId(), groupChatId()].filter(Boolean);
  for (const chat of targets) await tg('sendMessage', { chat_id: chat, text });
}

// --- Buyurtma holati o'zgarganda MIJOZGA xabar ---
const STATUS_UZ = { new: '🆕 Yangi', accepted: '✅ Qabul qilindi', preparing: '👨‍🍳 Tayyorlanmoqda', ready: '🎉 Tayyor — olib ketishingiz mumkin', given: '✅ Berildi', cancelled: '⛔ Bekor qilindi' };
async function notifyOrderStatus(order, customerTgId) {
  if (!process.env.BOT_TOKEN || !customerTgId) return;
  await tg('sendMessage', {
    chat_id: String(customerTgId),
    text: `Buyurtma #${order.no}: ${STATUS_UZ[order.status] || order.status}\n${order.status === 'ready' ? 'Olib ketish vaqti: ' + (order.pickup_date + ' ' + order.pickup_time) : ''}`
  });
}

// Kam qolgan / muddati yaqin tovarlar ogohlantirishi
async function notifyStockAlert(lines) {
  if (!process.env.BOT_TOKEN || !adminChatId() || !lines.length) return;
  await tg('sendMessage', { chat_id: adminChatId(), text: '⚠️ Ombor ogohlantirishi:\n' + lines.join('\n') });
}

// PDF hisobotni admin chatga yuborish
async function sendDocument(filePath, caption) {
  if (!process.env.BOT_TOKEN || !adminChatId()) return;
  const fs = require('fs');
  const fd = new FormData();
  fd.append('chat_id', adminChatId());
  if (caption) fd.append('caption', caption);
  fd.append('document', new Blob([fs.readFileSync(filePath)]), filePath.split(/[\\/]/).pop());
  try {
    await fetch(API('sendDocument'), { method: 'POST', body: fd, signal: AbortSignal.timeout(60000) });
  } catch (e) { console.error('sendDocument:', e.message); }
}

module.exports = { initBot, notifySale, notifyCancel, notifyNewOrder, notifyOrderStatus, notifyStockAlert, sendDocument };
