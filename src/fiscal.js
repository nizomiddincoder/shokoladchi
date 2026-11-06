// Fiskal kassa apparati adapteri — HOZIR BO'SH IMPLEMENTATSIYA.
// Kelajakda (masalan, Uzum fiskal / OrangePOS) integratsiya qilinganda
// shu modulga real yuborish kodi yoziladi: fiscalReceipt(sale) -> { fiscal_sign, qr_url }.
// Chaqiruv joyi tayyor: routes/pos.js sale yaratilgandan keyin.
const enabled = !!process.env.FISCAL_API_URL;

async function fiscalReceipt(sale) {
  if (!enabled) return null; // fiskal o'chirilgan — hech narsa qilmaydi
  // TODO: FISCAL_API_URL + FISCAL_API_KEY orqali chekni yuborish va QR/sign olish
  return null;
}

module.exports = { fiscalReceipt, enabled };
