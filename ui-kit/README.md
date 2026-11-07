# Shokoladchi — Retail Dizayn Tizimi

React + Vite + Tailwind CSS. Yagona dizayn tizimi + 3 modul: **Xaridor** (mobil 390px), **Ombor** (desktop), **Kassa** (planshet 1024×768). Barcha matn o'zbekcha (i18n kalitlari bilan), pullar UZS (`45 000 so'm`), sanalar DD.MM.YYYY.

## Ishga tushirish

```bash
cd ui-kit
npm install
npm run dev        # http://localhost:5173
```

Yuqoridagi switcher orqali modullar almashadi: **Xaridor / Ombor / Kassa**.

## Brend rangini bitta o'zgaruvchidan almashtirish

Barcha brend ranglar `src/index.css` dagi `:root` CSS-o'zgaruvchilaridan keladi — Tailwind hech qayerda hex saqlamaydi:

```css
:root {
  --c-primary-600: #4B2E1F;  /* asosiy — faqat shu oilani o'zgartiring */
  --c-primary-700: #3B2216;  /* hover/pressed */
  --c-primary-400: #8B5E3C;  /* aksent, focus ring */
  --c-primary-100: #F3EBE4;  /* tanlangan fon */
}
```

Masalan boshqa brend uchun shu 4 qiymatni almashtirish kifoya (semantik ranglar o'zgarmaydi).

## Tokenlar

| Token | Qiymat | Ishlatilishi |
|---|---|---|
| `--c-primary-700/600/400/100` | #3B2216 / #4B2E1F / #8B5E3C / #F3EBE4 | tugma, aktiv nav, narx, yulduz, focus |
| `--c-bg` / `--c-surface` | #F7F5F3 / #FFFFFF | fon / kartalar |
| `--c-text` / `--c-muted` | #2A1D16 / #8A7B72 | matn / ikkinchi darajali |
| `--c-border` | #EAE3DE | chegaralar |
| `--c-success/warning/danger` | #2E7D32 / #E08E0B / #C62828 | **faqat semantik**: zaxira holati, chegirma, xato |
| radius | karta 16px, tugma 12px, pill 999px | |
| shadow | `0 2px 8px rgba(42,29,22,.06)` | |
| shrift | Inter, pullar/miqdorlar `tabular-nums` | |

## Komponentlar (`src/ui.jsx`)

`Button` (primary/secondary/outline/ghost · sm/md/lg), `Card`, `Chip`, `Input` (label+xato), `Checkbox`, `RadioCard`, `Stepper` (aria-group), `Badge` (semantik), `PriceText` (tabular), `Rating` (shokolad yulduzlar), `StatCard`, `Table`/`Td`, `Modal`, `Toast`/`useToast`, `Skeleton`, `EmptyState`, `ErrorState`, `PhoneFrame`/`TabletFrame`, `BrandMark`/`ProductImage` (placeholder).

## Modullar

- **Xaridor** (`modules/customer.jsx`): Bosh sahifa (qidiruv, chip'lar, promo banner, best-seller grid + skeleton), Mahsulot (radio o'lchamlar, checkbox qo'shimchalar, stepper, sticky "Savatga qo'shish · narx"), Savat (stepper, promokod `SHIRIN10`, Jami/Yetkazish/Umumiy), Rasmiylashtirish, Buyurtma holati (timeline, kuryer), Sevimlilar, Buyurtmalar, Profil. Pastki nav — aktiv item shokolad pill.
- **Ombor** (`modules/warehouse.jsx`): KPI panel, inventar jadvali (SKU/miqdor/min/status badge/joy/amallar), mahsulot modali, kirim/chiqim shakl va modali (xato validatsiyasi bilan), sanash, yetkazib beruvchilar, 17 filiallararo ko'chirishlar. Sidebar — aktiv item pill uslubda.
- **Kassa** (`modules/pos.jsx`): chap — mahsulot grid + kategoriya chip + qidiruv; o'ng — joriy buyurtma, chegirma chip'lari, yirik Umumiy; past — 56px+ to'lov tugmalari (Naqd/Karta/Click-Payme QR). Naqd uchun raqamli klaviatura modali (qaytim hisobi, yetmasa bloklaydi), Chek ko'rinishi (chop etish/yuborish), offlayn indikator.

## Holatlar

Har bir ro'yxat/forma uchun: **skeleton** (yuklanmoqda), **bo'sh** (EmptyState), **xato** (ErrorState + Retry). Toast tasdiqlashlar: savatga qo'shish, kirim/chiqim, to'lov.

## Foydalanilgan manbalar

- i18n: `src/i18n.js` (uz; ru qo'shish uchun dict'ga `ru` obyekti)
- Format: `src/format.js` — `som()`, `dmy()`
- Ma'lumot: `src/data.js`
