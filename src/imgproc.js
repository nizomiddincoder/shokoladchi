// Rasm ishlovi adapteri: IMG_PROVIDER env orqali tanlanadi.
//  - 'google' (Gemini/Studio API, IMG_API_KEY kerak): fon olib tashlanadi, 1000x1000 oq fonga markazlanadi
//  - bo'sh/yoki xato: asl rasm o'zgarishsiz saqlanadi (admin panelda ogohlantiriladi)
// processImage(file) -> { processed: Buffer|null, note }  — null bo'lsa fallback.
const IMG_PROVIDER = (process.env.IMG_PROVIDER || '').toLowerCase();
const IMG_API_KEY = process.env.IMG_API_KEY || '';

async function processImage(file) {
  if (!IMG_PROVIDER || !IMG_API_KEY) return { processed: null, note: 'AI rasm ishlovi sozlanmagan — asl rasm saqlandi' };
  try {
    if (IMG_PROVIDER === 'google') return await googleProcess(file);
    return { processed: null, note: `Noma'lum provayder: ${IMG_PROVIDER}` };
  } catch (e) {
    console.error('imgproc:', e.message);
    return { processed: null, note: 'AI servis xatosi — asl rasm saqlandi' };
  }
}

// Google (Gemini image / Imagen REST) — promt bilan oq fonda mahsulot rasmi generatsiya.
// API o'zgarganda faqat shu funksiya tuzatiladi.
async function googleProcess(file) {
  const model = process.env.IMG_MODEL || 'gemini-2.0-flash-preview-image-generation';
  const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${IMG_API_KEY}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts: [
        { text: 'Remove the background and place the product centered on a plain white background, 1000x1000, product fully visible, not cropped. Return only the image.' },
        { inline_data: { mime_type: file.mime, data: file.data.toString('base64') } }
      ] }]
    }),
    signal: AbortSignal.timeout(60000)
  });
  const j = await r.json();
  const part = j?.candidates?.[0]?.content?.parts?.find(p => p.inline_data || p.inlineData);
  const b64 = part?.inline_data?.data || part?.inlineData?.data;
  if (!b64) throw new Error(j?.error?.message || 'Rasm generatsiya bo\'lmadi');
  return { processed: Buffer.from(b64, 'base64'), note: 'AI bilan ishlandi' };
}

module.exports = { processImage, enabled: !!IMG_API_KEY };
