// Kunlik hisobot (PDF) — har kuni 09:00 (Asia/Tashkent). Admin emailiga ilova VA Telegram admin chatiga.
const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');
const os = require('os');
const { q, getSettings } = require('./db');
const { formatSum } = require('./logic');
const { sendDocument } = require('./bot');

const TZ = 'Asia/Tashkent';

// Asia/Tashkent bo'yicha "kecha" (00:00 - 23:59) UTC intervalida
function yesterdayRange() {
  const now = new Date(new Date().toLocaleString('en-US', { timeZone: TZ }));
  now.setDate(now.getDate() - 1);
  const d = now.toISOString().slice(0, 10);
  return { dateStr: d, from: d + ' 00:00', to: d + ' 23:59' };
}

async function buildDailyReport(dateStr) {
  const st = await getSettings();
  const from = `${dateStr} 00:00`, to = `${dateStr} 23:59`;
  const { rows: agg } = await q(`
    SELECT COALESCE(SUM(total_uzs) FILTER (WHERE NOT is_return),0) total,
      COUNT(*) FILTER (WHERE NOT is_return) cnt,
      COUNT(*) FILTER (WHERE is_return) returns
    FROM pos_sales WHERE created_at >= $1 AND created_at <= $2`, [from, to]);
  const { rows: ord } = await q(`SELECT COUNT(*) cnt, COUNT(*) FILTER (WHERE status <> 'cancelled') ok,
    COUNT(*) FILTER (WHERE payment_method IN ('click','payme','card','transfer')) prepaid
    FROM orders WHERE created_at >= $1 AND created_at <= $2`, [from, to]);
  const byMethod = (await q(`
    SELECT p->>'method' method, SUM((p->>'amount')::bigint) sum
    FROM pos_sales s, jsonb_array_elements(s.payment) p
    WHERE s.created_at >= $1 AND s.created_at <= $2 AND NOT s.is_return
    GROUP BY 1 ORDER BY 2 DESC`, [from, to])).rows;
  const top = (await q(`
    SELECT si.name, SUM(si.qty) qty, SUM(si.line_total_uzs) sum FROM pos_sale_items si
    JOIN pos_sales s ON s.id = si.sale_id AND NOT s.is_return AND s.created_at >= $1 AND s.created_at <= $2
    GROUP BY si.name ORDER BY sum DESC LIMIT 10`, [from, to])).rows;
  const low = (await q(`
    SELECT g.name, g.min_stock, COALESCE(SUM(l.remaining) FILTER (WHERE l.expires_at IS NULL OR l.expires_at >= CURRENT_DATE),0) stock
    FROM goods g LEFT JOIN stock_lots l ON l.product_id = g.id
    WHERE g.is_deleted = false AND g.is_active GROUP BY g.id
    HAVING COALESCE(SUM(l.remaining) FILTER (WHERE l.expires_at IS NULL OR l.expires_at >= CURRENT_DATE),0) <= g.min_stock
    ORDER BY g.name LIMIT 15`)).rows;
  const expiring = (await q(`
    SELECT g.name, l.expires_at, l.remaining FROM stock_lots l JOIN goods g ON g.id = l.product_id
    WHERE l.remaining > 0 AND l.expires_at BETWEEN CURRENT_DATE AND CURRENT_DATE + 7 ORDER BY l.expires_at LIMIT 15`)).rows;
  const shiftDiffs = (await q(`SELECT s.id, u.name, s.diff_uzs, s.diff_note FROM shifts s LEFT JOIN users u ON u.id = s.user_id
    WHERE s.closed_at >= $1 AND s.closed_at <= $2 AND s.diff_uzs <> 0`, [from, to])).rows;
  const debt = (await q(`SELECT COALESCE(SUM(i.total_uzs),0) - COALESCE((SELECT SUM(amount_uzs) FROM supplier_payments),0) d FROM supplier_invoices i`)).rows[0].d;

  const total = Number(agg[0].total), cnt = Number(agg[0].cnt);
  const file = path.join(os.tmpdir(), `hisobot-${dateStr}.pdf`);
  await new Promise(resolve => {
    const doc = new PDFDocument({ size: 'A4', margin: 40 });
    const out = fs.createWriteStream(file);
    doc.pipe(out);
    doc.fontSize(16).font('Helvetica-Bold').text(st.shop_name, { align: 'center' });
    doc.fontSize(11).font('Helvetica').text(`Kunlik hisobot — ${dateStr} (Asia/Tashkent)`, { align: 'center' });
    doc.moveDown();
    const line = (l, r, bold) => {
      doc.font(bold ? 'Helvetica-Bold' : 'Helvetica').text(`${l}:  ${r}`);
    };
    line('Jami sotuv', formatSum(total) + " so'm", true);
    line('Cheklar soni', String(cnt));
    line("O'rtacha chek", cnt ? formatSum(Math.round(total / cnt)) + " so'm" : '—');
    line('Qaytarishlar', String(agg[0].returns));
    line('Telegram buyurtmalari', `${ord[0].ok} (bekor: ${ord[0].cnt - ord[0].ok})`);
    doc.moveDown();
    doc.font('Helvetica-Bold').text("To'lov usullari bo'yicha:");
    doc.font('Helvetica');
    const mNames = { cash: 'Naqd', card: 'Karta', click: 'Click', payme: 'Payme', transfer: "O'tkazma" };
    byMethod.forEach(m => line('  ' + (mNames[m.method] || m.method), formatSum(m.sum) + " so'm"));
    doc.moveDown();
    doc.font('Helvetica-Bold').text('Top 10 tovar:');
    doc.font('Helvetica');
    top.forEach(t => line(`  ${t.name} ×${Number(t.qty)}`, formatSum(t.sum) + " so'm"));
    doc.moveDown();
    doc.font('Helvetica-Bold').text('Kam qolgan tovarlar (minimal qoldiqdan past):');
    doc.font('Helvetica');
    low.forEach(l => line(`  ${l.name}`, `qoldiq: ${Number(l.stock)} / min: ${Number(l.min_stock)}`));
    doc.moveDown();
    doc.font('Helvetica-Bold').text('Muddati yaqin tovarlar (7 kun):');
    doc.font('Helvetica');
    expiring.forEach(e => line(`  ${e.name}`, `${e.expires_at} — ${Number(e.remaining)} qoldiq`));
    if (shiftDiffs.length) {
      doc.moveDown();
      doc.font('Helvetica-Bold').text('Smena farqlari:');
      doc.font('Helvetica');
      shiftDiffs.forEach(s => line(`  Smena #${s.id} (${s.name})`, formatSum(s.diff_uzs) + " so'm" + (s.diff_note ? ` — ${s.diff_note}` : '')));
    }
    doc.moveDown();
    doc.font('Helvetica-Bold').text("Yetkazib beruvchilarga qarzdorlik: " + formatSum(debt) + " so'm");
    doc.end();
    out.on('finish', resolve);
  });
  return file;
}

async function sendDaily(dateStr) {
  const st = await getSettings();
  const file = await buildDailyReport(dateStr);
  let sent = false, lastErr = '';
  for (let i = 0; i < 3 && !sent; i++) {
    try {
      await sendDocument(file, `Kunlik hisobot ${dateStr}`);
      sent = true;
    } catch (e) { lastErr = e.message; await new Promise(r => setTimeout(r, 5000)); }
  }
  if (!sent) console.error(`[hisobot] Telegramga yuborilmadi (${dateStr}): ${lastErr}`);
  if (st.report_email && process.env.SMTP_URL && process.env.SMTP_FROM) {
    try {
      const nodemailer = require('nodemailer');
      const tr = nodemailer.createTransport(process.env.SMTP_URL);
      await tr.sendMail({ from: process.env.SMTP_FROM, to: st.report_email, subject: `Kunlik hisobot ${dateStr}`,
        text: 'Ilova: kunlik hisobot', attachments: [{ filename: path.basename(file), path: file }] });
    } catch (e) { console.error('[hisobot] email xato:', e.message); }
  } else if (st.report_email) {
    console.log('[hisobot] SMTP_URL sozlanmagan — email yuborilmadi, faqat Telegram');
  }
  console.log(`[hisobot] ${dateStr} tayyor: ${file}`);
  return file;
}

function startDailyCron() {
  let cron;
  try { cron = require('node-cron'); } catch (e) { console.error('node-cron o\'rnatilmagan — cron ishlamaydi'); return; }
  const scheduleDaily = async () => {
    const st = await getSettings();
    const hour = Math.min(23, Math.max(0, Number(st.report_hour) || 9));
    // Har kuni report_hour:00 (Asia/Tashkent) da
    cron.schedule(`0 ${hour} * * *`, async () => {
      try {
        const { dateStr } = yesterdayRange();
        await sendDaily(dateStr);
      } catch (e) { console.error('[hisobot] cron xato:', e.message); }
    }, { timezone: TZ });
    console.log(`Kunlik hisobot cron sozlandi: har kuni ${String(hour).padStart(2, '0')}:00 (${TZ})`);
  };
  // Baza ulangach sozlaymiz
  const wait = setInterval(() => {
    getSettings().then(() => { clearInterval(wait); scheduleDaily(); }).catch(() => {});
  }, 3000);
}

module.exports = { buildDailyReport, sendDaily, startDailyCron, yesterdayRange };
