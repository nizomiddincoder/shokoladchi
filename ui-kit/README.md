# Shokoladchi — Mobile E-Commerce UI Kit

A premium iOS-style mobile e-commerce UI kit for **Shokoladchi**, built with **React + Vite + Tailwind CSS**.
All 15 screens are fully clickable and connected in a real flow, rendered inside a 390×844 phone frame
on desktop (full-screen on real mobile devices).

The brand favicon (`public/favicon.svg` — a chocolate-bar mark) doubles as the logo and as premium
placeholder product imagery — no stock photos, stickers or emoji anywhere.

## Run it

```bash
cd ui-kit
npm install
npm run dev
```

Open http://localhost:5173

Production build:

```bash
npm run build
npm run preview
```

## Screens (all navigable by clicking)

| # | Screen | How to reach it |
|---|--------|-----------------|
| 1 | Special Offers | Home screen |
| 2 | Most Popular | Tap any promo card (or the bag icon) |
| 3 | Search | Search icon on "Most Popular" |
| 4 | Empty result | Search something like `zz` |
| 5 | Search results | Search `dark`, `bar`, `truffle`… |
| 6 | Filter bottom sheet | Sliders icon on "Most Popular" / results |
| 7 | Product detail | Tap any product card |
| 8 | Reviews | Tap the rating row on product detail |
| 9 | Cart | Add to Cart / bag icon |
| 10 | Remove confirmation | Trash icon on a cart item |
| 11 | Checkout | Checkout button in cart |
| 12 | Shipping Address | Pencil icon on checkout |
| 13 | Choose Shipping | Delivery row on checkout |
| 14 | Add Promo | Promo row on checkout |
| 15 | Payment Methods | "Continue to Payment" → Confirm |

## Interactions

- Quantity stepper, size & packaging selection update state and the total price.
- Filter sheet (category, dual-thumb price slider, sort, rating) actually filters & sorts the grids.
- Heart icons toggle; review likes toggle; promo / address / shipping / payment selections persist
  through checkout math (subtotal, shipping, discount, total).
- Toast confirmations on **Add to Cart**, address added, and **Confirm Payment** (cart clears,
  returns to Special Offers).

## Structure

```
ui-kit/
├── public/favicon.svg        # brand mark (chocolate bar) — also used as product imagery
├── index.html
└── src/
    ├── main.jsx / App.jsx    # navigation stack, cart & checkout state, toasts, desktop stage
    ├── data.js               # products, offers, reviews, addresses, shipping, promos, payments
    ├── components/
    │   ├── PhoneFrame.jsx    # 390×844 frame (desktop) / full-screen (mobile)
    │   ├── StatusBar.jsx     # 9:41 · signal · wifi · battery
    │   ├── TopBar.jsx / TopIcon.jsx
    │   ├── Chip.jsx / Stars.jsx / RangeSlider.jsx
    │   ├── ProductCard.jsx / ProductImage.jsx / BrandMark.jsx
    │   ├── QuantityStepper.jsx / PrimaryButton.jsx / SecondaryButton.jsx
    │   ├── RadioCard.jsx / BottomSheet.jsx / FilterSheet.jsx / Toast.jsx
    └── screens/              # one file per screen (15 total)
```

## Design tokens

- Background `#F3F3F5`, cards white, radius 16–20px, shadow `0 2px 10px rgba(0,0,0,0.05)`
- Primary `#111111` (black pill buttons, white bold text), secondary `#EDEDF0`
- Accent: gold stars (`#F5B301`), muted text `#8A8A8E`
- Font: **Outfit** (geometric sans), titles 18–20px semibold, product names 13–14px medium
