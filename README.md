# 🍬 Shirinliklar Savdo Markazi

Telegram Mini App (mijoz) + Admin panel + POS kassa (PWA) + Ombor — bitta Node.js tizimi.

**Muhim:** tizimda yetkazib berish YO'Q — faqat **olib ketish** va **do'konda sotuv (POS)**.
Fiskal kassa va tarozi integratsiyasi hozir ishlamaydi, lekin adapter joyi tayyor (`src/fiscal.js`).

## Tuzilma

```
server.js              — HTTP server (Express), barcha API + statik interfeyslar
src/
  db.js                — PostgreSQL sxema (migratsiyalar avtomatik, ishga tushganda)
  logic.js             — toza hisob funksiyalari (testlar shuni tekshiradi)
  auth.js              — JWT, RBAC, PIN, Telegram initData HMAC tekshiruvi
  bot.js               — Telegram bot + xabarlar (buyurtma, holat, hisobot)
  reports.js           — kunlik PDF hisobot + cron (har kuni 09:00 Asia/Tashkent)
  storage.js           — rasm saqlash adapteri (hozir: DB; keyin: R2/S3)
  imgproc.js           — AI rasm ishlovi adapteri (fon olib tashlash)
  fiscal.js            — fiskal kassa adapteri (bo'sh, keyin qo'shiladi)
  ws.js                — WebSocket (print-agent ulanadi, chek yuboriladi)
  routes/
    auth.js            — admin ro'yxatdan o'tish/kirish, xodimlar, PIN login
    catalog.js         — kategoriyalar, mahsulotlar, variantlar, rasmlar, barcode
    mini.js            — Mini App API (katalog, buyurtma — faqat olib ketish)
    pos.js             — smena, sotuv (FIFO, aralash to'lov, idempotency), qaytarish
    warehouse.js       — kirim/chqim/inventar/partiyalar, yetkazib beruvchilar, qarz
    payments.js        — Click/Payme webhook (idempotent), qo'lda tasdiqlash
    manage.js          — dashboard, buyurtmalar, sozlamalar, audit, eksport
public/
  mini/                — mijoz Telegram Mini App (qora tema, spec dizayn tokenlari)
  pos/                 — POS kassa PWA (PIN, smena, barcode, OFLAYN rejim)
  admin/               — admin panel
print-agent/           — Windows chek printer agenti (ESC/POS, 80mm)
tests/calc.test.js     — hisob-kitob testlari (node tests/calc.test.js)
```

## Ishga tushirish (lokal)

```bash
npm install
# .env fayl yarating (.env.example dan nusxa) — DATABASE_URL shart
npm start        # http://localhost:3000
npm test         # hisob-kitob testlari
```

Interfeyslar: `/admin` — admin panel, `/pos` — kassa, `/mini` — Telegram do'kon.

## Railway deploy

1. **Postgres** servis yarating, `Database URL` ni nusxalab backend servisning `DATABASE_URL` o'zgaruvchisiga qo'ying.
2. **Backend** servis: repo ildizi, `npm start`. Variables: `.env.example` dagi ro'yxat (kamida `DATABASE_URL`, `BOT_TOKEN`, `APP_URL`, `ADMIN_CHAT_ID`, `JWT_SECRET`).
3. `APP_URL` = Railway domeni (masalan `https://xxx.up.railway.app`).
4. Telegram: @BotFather → bot yaratish → `/id` buyrug'i bilan chat ID olish → `ADMIN_CHAT_ID` / `GROUP_CHAT_ID` variable'larga qo'yish.
5. Birinchi admin: `/admin` sahifasida ro'yxatdan o'tish → 6 xonali kod **Railway Logs**da (`[EMAIL]` yozuvi) yoki emailga keladi.
6. Migratsiyalar avtomatik: server ishga tushganda `CREATE TABLE IF NOT EXISTS` bajaradi.
7. Kunlik hisobot: har kuni 09:00 (Asia/Tashkent) PDF yaratilib, Telegram admin chatiga yuboriladi (vaqt Sozlamalar > Hisobot vaqti dan o'zgartiriladi).

## POS chek printeri (Windows)

`print-agent/` papkada `PRINTERNI ISHGA TUSHIRISH.bat` ni ishga tushiring (SERVER_URL + AGENT_TOKEN to'g'rilang).
Kassir chek yakunlaganda server agent orqali 80mm ESC/POS chek chiqaradi. Test: `TEST CHEK.bat`.

## Xavfsizlik

- Barcha API JWT + rol (RBAC): admin / ombor / sotuvchi / mijoz (Telegram HMAC).
- PIN 4 xonali, bcrypt hash; 5 marta xato → 5 daqiqa blok; PIN admin panelda ko'rinadi.
- Rate limit login/PIN, input validatsiya, audit log (kim, qachon, nima o'zgartirdi).
- Pullar butun son (so'm); sotuvlar idempotency key (UUID) bilan — dublikat yo'q.
- Oflayn POS: sotuvlar IndexedDB navbatida, internet qaytganda sinxronlanadi.

## Foydalanuvchi qo'llanmasi (qisqa)

**Mijoz (Telegram):** botda 🛍 tugma → katalog → mahsulot → variant/izoh → savat → olib ketish vaqti + to'lov usuli → buyurtma. Holat o'zgarganda bot xabar yuboradi.

**Kassir (POS):** `/pos` → PIN → smena ochish (boshlang'ich naqd) → barcode/mahsulot tanlash → Naqd yoki Aralash to'lov → chek chop etiladi. Smena yopish: naqdni sanab kiriting, farq sababini yozing.

**Admin:** `/admin` — katalog (rasm+variantlar), buyurtmalar (holat o'zgarishi mijozga yuboriladi), ombor (kirim/chqim/inventar), yetkazib beruvchilar va qarz, xodimlar (PIN boshqaruvi), smenalar, hisobotlar (PDF/CSV), sozlamalar, audit log.

## Testlar

```bash
npm test   # 19 test: chek jami, FIFO, smena farqi, PIN blok, aralash to'lov
```
