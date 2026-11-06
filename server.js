const fs = require('fs');
const path = require('path');
const http = require('http');
const express = require('express');

// Oddiy .env yuklovchi (dotenv o'rniga)
(function loadEnv() {
  try {
    const f = path.join(__dirname, '.env');
    if (fs.existsSync(f)) {
      for (const line of fs.readFileSync(f, 'utf8').split(/\r?\n/)) {
        const m = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)\s*$/);
        if (m && process.env[m[1]] === undefined) {
          process.env[m[1]] = m[2].replace(/^["']|["']$/g, '');
        }
      }
    }
  } catch (e) { /* ignore */ }
})();

const { initDb, isDbReady } = require('./src/db');
const authRoutes = require('./src/routes/auth');
const catalogRoutes = require('./src/routes/catalog');
const miniRoutes = require('./src/routes/mini');
const posRoutes = require('./src/routes/pos');
const warehouseRoutes = require('./src/routes/warehouse');
const paymentRoutes = require('./src/routes/payments');
const manageRoutes = require('./src/routes/manage');
const { initBot } = require('./src/bot');
const { initWs } = require('./src/ws');
const { startDailyCron } = require('./src/reports');

const app = express();
app.disable('x-powered-by');

// Statik interfeyslar: /mini (Telegram Mini App), /pos (PWA kassa), /admin (admin panel)
app.use(express.static(path.join(__dirname, 'public')));

app.get('/api/health', (req, res) => res.json({ ok: true, db_ready: isDbReady(), time: new Date().toISOString() }));

// Baza ulanmaguncha aniq xato — process qotmaydi
app.use('/api', (req, res, next) => {
  if (!isDbReady()) return res.status(503).json({ error: 'Baza hali ulanmadi. DATABASE_URL to\'g\'rilgach 5 soniyada o\'zi ulanadi.' });
  next();
});

// Webhook'lar — Click (JSON/form) va Payme (JSON) umumiy parserdan oldin o'z limitida
app.use('/api/payments', express.json({ limit: '1mb' }), express.urlencoded({ extended: false, limit: '1mb' }), paymentRoutes);

app.use(express.json({ limit: '25mb' }));

app.use('/api/auth', authRoutes);
app.use('/api', catalogRoutes);
app.use('/api/mini', miniRoutes);
app.use('/api/pos', posRoutes);
app.use('/api/warehouse', warehouseRoutes);
app.use('/api/manage', manageRoutes);

app.use((err, req, res, next) => {
  console.error(err);
  if (res.headersSent) return;
  res.status(err.status || 400).json({ error: err.message || 'Server xatosi' });
});

// Hech qanday kutilmagan xato processni o'ldirmasin
process.on('uncaughtException', e => console.error('UNCAUGHT:', (e && (e.stack || e.message)) || e));
process.on('unhandledRejection', e => console.error('UNHANDLED:', (e && (e.stack || e.message)) || e));

const server = http.createServer(app);
const PORT = process.env.PORT || 3000;

(async () => {
  server.listen(PORT, () => console.log('HTTP server ishlayapti, port:', PORT));

  while (true) {
    try {
      await initDb();
      console.log('✅ Baza ulandi, jadvallar tayyor');
      break;
    } catch (e) {
      console.error('❌ Baza ulanmadi [' + (e.code || 'xato') + '] ' + (e.message || e));
      if (!process.env.DATABASE_URL) console.error("   ➜ DATABASE_URL o'rnatilmagan!");
      await new Promise(r => setTimeout(r, 5000));
    }
  }

  initWs(server);
  initBot();
  startDailyCron();
})();
