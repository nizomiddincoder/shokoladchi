/* Shirinliklar Telegram Mini App — vanilla JS SPA */
(() => {
const $ = sel => document.querySelector(sel);
const app = $('#app');
const tg = window.Telegram?.WebApp || {};
try { tg.ready && tg.ready(); tg.expand && tg.expand(); } catch (e) {}

const API = location.origin + '/api/mini';
const initData = tg.initData || '';

// --- Savatcha (localStorage) ---
const CART_KEY = 'mini_cart_v1', FAV_KEY = 'mini_fav_v1', PHONE_KEY = 'mini_phone_v1';
let cart = JSON.parse(localStorage.getItem(CART_KEY) || '[]');
let favs = JSON.parse(localStorage.getItem(FAV_KEY) || '[]');
const saveCart = () => { localStorage.setItem(CART_KEY, JSON.stringify(cart)); updateBadge(true); };

const fmt = n => Math.round(n).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ' ') + " so'm";
const esc = s => String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

let cache = { catalog: null, categories: null, me: null, settings: null };
async function api(path, opts = {}) {
  const r = await fetch(API + path, {
    method: opts.method || 'GET',
    headers: { 'Content-Type': 'application/json', 'X-Init-Data': initData },
    body: opts.body ? JSON.stringify(opts.body) : undefined
  });
  const j = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(j.error || 'Xatolik yuz berdi');
  return j;
}

const haptic = type => { try { type === 'ok' ? tg.HapticFeedback?.notificationOccurred('success') : tg.HapticFeedback?.impactOccurred('light'); } catch (e) {} };

function toast(msg) {
  const t = document.createElement('div');
  t.className = 'toast'; t.textContent = msg;
  document.body.appendChild(t);
  setTimeout(() => t.remove(), 1800);
}

function updateBadge(bounce) {
  const n = cart.reduce((s, i) => s + Number(i.qty), 0);
  const b = $('#cart-badge');
  if (b) { b.textContent = n > 99 ? '99+' : n; b.style.display = n ? '' : 'none'; if (bounce) { b.classList.remove('bounce'); void b.offsetWidth; b.classList.add('bounce'); } }
}

// --- Routing ---
const routes = {
  '': homePage, '#/': homePage, '#/cat': catPage, '#/p': productPage, '#/cart': cartPage,
  '#/checkout': checkoutPage, '#/orders': ordersPage, '#/fav': favPage, '#/profile': profilePage
};
let lastHash = '';
window.addEventListener('hashchange', render);
function go(hash) { lastHash = location.hash; location.hash = hash; }
function render() {
  const h = location.hash.split('?')[0].split('/').slice(0, 2).join('/') || '#/';
  const key = h === '#/p' ? '#/p' : h;
  (routes[key] || homePage)();
  window.scrollTo(0, 0);
  const showBack = key !== '#/' && key !== '';
  try { showBack ? tg.BackButton?.show() : tg.BackButton?.hide(); tg.BackButton?.onClick(() => history.back()); } catch (e) {}
}

// --- Umumiy header + bottom nav ---
function header(title, back = true) {
  return `<div class="app-header">
    ${back ? `<button class="icon-btn" onclick="history.back()">←</button>` : `<button class="icon-btn dark" onclick="location.hash='#/profile'">☰</button>`}
    <h1>${esc(title)}</h1>
    <button class="icon-btn dark" onclick="location.hash='#/cart'">🛍<span class="badge" id="cart-badge"></span></button>
  </div>`;
}
function bottomNav(active) {
  const t = (name, hash, icon) =>
    `<a class="nav-tab ${active === name ? 'active' : ''}" onclick="location.hash='${hash}'" style="text-decoration:none">${icon}<span>${name}</span></a>`;
  return `<nav class="bottom-nav">
    ${t('Bosh', '#/', '🏠')}
    ${t('Kategoriya', '#/cat', '▦')}
    <button class="nav-plus" onclick="location.hash='#/cart'">+</button>
    ${t('Sevimli', '#/fav', '♥')}
    ${t('Profil', '#/profile', '👤')}
  </nav>`;
}
function skeletonGrid(n = 6) {
  return `<div class="grid">${Array(n).fill('<div class="skeleton sk-card"></div>').join('')}</div>`;
}
function emptyPage(ico, text, btnHash, btnText) {
  return `<div class="empty"><div class="ico">${ico}</div><p>${text}</p>
    ${btnHash ? `<br><button class="btn-primary" style="width:auto;padding:12px 28px" onclick="location.hash='${btnHash}'">${btnText}</button>` : ''}</div>`;
}

// --- Mahsulot kartochkasi ---
function cardHtml(g) {
  const img = g.images && g.images.length ? g.images[0].url : '';
  const stock = Number(g.stock || 0);
  const vs = g.variants && g.variants.length ? g.variants : null;
  let wRange = '', pRange = fmt(g.price);
  if (vs && vs.length > 1) {
    wRange = vs.map(v => v.name).join(', ');
    const ps = vs.map(v => Number(v.price));
    pRange = `${fmt(Math.min(...ps))} - ${fmt(Math.max(...ps))}`;
  }
  const isFav = favs.includes(g.id);
  return `<div class="product-card">
    <div class="img-wrap">
      ${img ? `<img loading="lazy" src="${img}" alt="">` : ''}
      <button class="fav-btn ${isFav ? 'active' : ''}" data-fav="${g.id}">${isFav ? '♥' : '♡'}</button>
      ${stock <= 0 ? '<div class="sold-out"></div>' : ''}
    </div>
    <div class="name" onclick="location.hash='#/p/${g.id}'">${esc(g.name)}</div>
    ${wRange ? `<div class="weight">${esc(wRange)}</div>` : ''}
    <div class="price" onclick="location.hash='#/p/${g.id}'">${pRange}</div>
  </div>`;
}

function bindFavs(after) {
  document.querySelectorAll('[data-fav]').forEach(b => b.onclick = async () => {
    const id = Number(b.dataset.fav);
    haptic('light');
    b.classList.add('pop');
    if (favs.includes(id)) { favs = favs.filter(x => x !== id); b.textContent = '♡'; b.classList.remove('active'); }
    else { favs.push(id); b.textContent = '♥'; b.classList.add('active'); }
    localStorage.setItem(FAV_KEY, JSON.stringify(favs));
    if (after) after();
  });
}

// --- Ekran: Bosh sahifa (katalog) ---
async function homePage() {
  app.innerHTML = header('Shirinliklar', false) + `<div class="search-box"><input id="q" placeholder="Qidirish..." value="${esc(render._q || '')}"></div><div id="body">${skeletonGrid()}</div>` + bottomNav('home');
  updateBadge();
  try {
    if (!cache.catalog) cache.catalog = await api('/catalog');
    const list = cache.catalog;
    const q = (render._q || '').toLowerCase();
    if (q) list = list.filter(g => g.name.toLowerCase().includes(q));
    renderGrid(list);
  } catch (e) { $('#body').innerHTML = `<div class="err-box">${esc(e.message)}</div>`; }
  // Qidiruv
  const qi = $('#q');
  qi.oninput = () => { render._q = qi.value; const q = qi.value.toLowerCase();
    const list = (cache.catalog || []).filter(g => g.name.toLowerCase().includes(q));
    renderGrid(list); };
}

function renderGrid(list) {
  const body = $('#body');
  if (!body) return;
  body.innerHTML = list.length ? `<div class="grid">${list.map(cardHtml).join('')}</div>` : emptyPage('🔍', 'Mahsulot topilmadi');
  bindFavs();
}

// --- Ekran: Kategoriyalar ---
async function catPage() {
  app.innerHTML = header('Kategoriya') + `<div id="body">${skeletonGrid()}</div>` + bottomNav('cat');
  updateBadge();
  try {
    const [cats, catalog] = await Promise.all([fetch(location.origin + '/api/categories').then(r => r.json()), cache.catalog || api('/catalog').then(c => (cache.catalog = c))]);
    cache.categories = cats;
    const roots = cats.filter(c => !c.parent_id);
    $('#body').innerHTML = `<div class="page-pad" style="padding-top:16px">` +
      (roots.length ? roots.map(c => `<button class="category-btn" onclick="location.hash='#/cat/${c.id}'">${esc(c.name)}</button>`).join('')
        : emptyPage('📂', 'Kategoriyalar hali qo\'shilmagan')) + `</div>`;
  } catch (e) { $('#body').innerHTML = `<div class="err-box">${esc(e.message)}</div>`; }
}

// hash '#/cat/ID' — kategoriya ichidagi mahsulotlar (homePage ga yo'naltiriladi, lekin filtr bilan)
// Soddalik uchun kategoriya tanlansa bosh sahifa filtr bilan ochiladi:
window.addEventListener('hashchange', () => {
  const m = location.hash.match(/^#\/cat\/(\d+)$/);
  if (m) renderCatProducts(Number(m[1]));
});
async function renderCatProducts(catId) {
  try {
    const catalog = cache.catalog || await api('/catalog').then(c => (cache.catalog = c));
    const cats = await fetch(location.origin + '/api/categories').then(r => r.json());
    const kids = cats.filter(c => c.parent_id === catId).map(c => c.id);
    const list = catalog.filter(g => g.category_id === catId || kids.includes(g.category_id));
    const cat = cats.find(c => c.id === catId);
    app.innerHTML = header(cat ? cat.name : 'Katalog') + `<div id="body">${list.length ? `<div class="grid">${list.map(cardHtml).join('')}</div>` : emptyPage('📦', 'Bu kategoriyada mahsulot yo\'q')}</div>` + bottomNav('cat');
    bindFavs();
  } catch (e) { app.innerHTML = header('Xato') + `<div class="err-box">${esc(e.message)}</div>` + bottomNav('cat'); }
}

// --- Ekran: Mahsulot ---
let pdState = null;
async function productPage() {
  const id = Number(location.hash.match(/#\/p\/(\d+)/)?.[1]);
  if (!id) return;
  app.innerHTML = header('Mahsulot') + skeletonGrid(2) + bottomNav('');
  updateBadge();
  try {
    const list = cache.catalog || await api('/catalog').then(c => (cache.catalog = c));
    const g = list.find(x => x.id === id);
    if (!g) return void (app.innerHTML = header('Mahsulot') + emptyPage('❓', 'Mahsulot topilmadi', '#/', 'Katalogga') + bottomNav(''));
    const variants = g.variants && g.variants.length ? g.variants : null;
    pdState = { g, variant: variants ? variants[0] : null, qty: 1, note: '' };
    drawProduct(variants);
  } catch (e) { app.innerHTML = header('Xato') + `<div class="err-box">${esc(e.message)}</div>` + bottomNav(''); }
}

function drawProduct(variants) {
  const { g } = pdState;
  const price = pdState.variant ? pdState.variant.price : g.price;
  const unit = g.unit === 'kg' ? 'kg' : 'dona';
  const img = g.images && g.images.length ? g.images[0].url : '';
  const isFav = favs.includes(g.id);
  const stock = Number(g.stock || 0);
  app.innerHTML = header('Mahsulot') + `
    <div class="pd-img-wrap">
      ${img ? `<img src="${img}" alt="">` : ''}
      <button class="fav-btn ${isFav ? 'active' : ''}" style="top:8px;right:8px" data-fav="${g.id}">${isFav ? '♥' : '♡'}</button>
    </div>
    <div class="pd-name">${esc(g.name)}</div>
    <div class="pd-price">${fmt(price * pdState.qty)}</div>
    ${variants ? `<div class="page-pad"><div class="chips">${variants.map(v =>
      `<button class="chip ${pdState.variant && pdState.variant.id === v.id ? 'active' : ''}" data-var="${v.id}">${esc(v.name)}</button>`).join('')}</div></div>` : ''}
    <div class="customize-row" id="customize"><span>Mahsulotni sozlash (izoh)</span><b style="color:var(--color-primary)">+</b></div>
    ${g.description ? `<div class="pd-desc" id="pd-desc">${esc(g.description)}</div><div class="link" id="more-link">Batafsil</div>` : ''}
    <div class="pd-bottom">
      <div class="stepper">
        <button id="minus">−</button>
        ${g.unit === 'kg' ? `<input id="qty-in" type="number" step="0.01" min="0.01" value="${pdState.qty}">` : `<span id="qty">${pdState.qty}</span>`}
        <button id="plus">+</button>
      </div>
      <button class="circle-add" id="add-btn" ${stock <= 0 ? 'disabled style="opacity:.5"' : ''}>+</button>
    </div>
    ${stock <= 0 ? '<div class="err-box" style="text-align:center">Tugagan</div>' : ''}
    ${bottomNav('')}`;
  updateBadge();
  bindFavs();
  document.querySelectorAll('[data-var]').forEach(b => b.onclick = () => {
    pdState.variant = variants.find(v => v.id === Number(b.dataset.var));
    haptic('light'); drawProduct(variants);
  });
  const setQty = q => { pdState.qty = Math.max(0.001, Math.round(q * 1000) / 1000); drawProduct(variants); };
  const plus = $('#plus'), minus = $('#minus');
  if (plus) plus.onclick = () => setQty(pdState.qty + (g.unit === 'kg' ? 0.25 : 1));
  if (minus) minus.onclick = () => setQty(pdState.qty - (g.unit === 'kg' ? 0.25 : 1));
  const qi = $('#qty-in');
  if (qi) qi.onchange = () => setQty(Number(qi.value) || 1);
  if ($('#more-link')) $('#more-link').onclick = () => { $('#pd-desc').classList.toggle('open'); $('#more-link').textContent = $('#pd-desc').classList.contains('open') ? 'Yopish' : 'Batafsil'; };
  $('#customize').onclick = () => openNoteModal();
  $('#add-btn').onclick = () => {
    if (stock <= 0) return;
    haptic('ok');
    const name = g.name + (pdState.variant ? ' (' + pdState.variant.name + ')' : '');
    const ex = cart.find(c => c.product_id === g.id && c.variant_id === (pdState.variant ? pdState.variant.id : null) && c.note === pdState.note);
    if (ex) ex.qty = Math.round((Number(ex.qty) + pdState.qty) * 1000) / 1000;
    else cart.push({ product_id: g.id, variant_id: pdState.variant ? pdState.variant.id : null, name, price: pdState.variant ? pdState.variant.price : g.price, qty: pdState.qty, note: pdState.note, img: img });
    saveCart();
    toast('Savatga qo\'shildi');
  };
}

function openNoteModal() {
  const m = document.createElement('div');
  m.className = 'modal-back';
  m.innerHTML = `<div class="modal">
    <h3>Izoh qo'shish</h3>
    <textarea id="note-t" maxlength="200" rows="3" placeholder="Masalan: yozuv bo'lsin...">${esc(pdState.note)}</textarea>
    <div style="font-size:12px;color:var(--color-text-muted);margin-top:4px"><span id="cnt">${pdState.note.length}</span>/200</div>
    <br><button class="btn-primary" id="note-ok">Saqlash</button>
  </div>`;
  document.body.appendChild(m);
  const t = m.querySelector('#note-t');
  t.oninput = () => m.querySelector('#cnt').textContent = t.value.length;
  m.querySelector('#note-ok').onclick = () => { pdState.note = t.value.slice(0, 200); m.remove(); toast(pdState.note ? 'Izoh saqlandi' : 'Izoh olib tashlandi'); };
  m.onclick = e => { if (e.target === m) m.remove(); };
}

// --- Ekran: Savatcha ---
async function cartPage() {
  const total = cart.reduce((s, i) => s + i.price * i.qty, 0);
  app.innerHTML = header('Savatcha') +
    (cart.length ? cart.map((c, i) => `
      <div class="list-row">
        ${c.img ? `<img src="${c.img}" alt="">` : ''}
        <div class="grow">
          <div class="t">${esc(c.name)}</div>
          <div class="s">${fmt(c.price)}${c.note ? ' · ' + esc(c.note) : ''}</div>
        </div>
        <div class="stepper">
          <button data-dec="${i}">−</button><span>${c.qty}</span><button data-inc="${i}">+</button>
        </div>
        <button class="trash" data-del="${i}">🗑</button>
      </div>`).join('') +
      `<div class="list-row" style="justify-content:space-between"><b style="font-size:16px">Jami</b><b class="p" style="font-size:18px">${fmt(total)}</b></div>
      <div style="padding:8px 16px"><button class="btn-primary" onclick="location.hash='#/checkout'">Buyurtma berish</button></div>`
    : emptyPage('🛍', 'Savatcha bo\'sh', '#/', 'Katalogga o\'tish')) + bottomNav('cart');
  updateBadge();
  const setQ = (i, d) => {
    cart[i].qty = Math.max(0.001, Math.round((Number(cart[i].qty) + d) * 1000) / 1000);
    if (cart[i].qty <= 0) cart.splice(i, 1);
    saveCart(); cartPage();
  };
  document.querySelectorAll('[data-inc]').forEach(b => b.onclick = () => setQ(Number(b.dataset.inc), cart[Number(b.dataset.inc)].unit === 'kg' ? 0.25 : 1));
  document.querySelectorAll('[data-dec]').forEach(b => b.onclick = () => setQ(Number(b.dataset.dec), -(cart[Number(b.dataset.dec)].qty <= 0.3 ? cart[Number(b.dataset.dec)].qty : 0.25)));
  document.querySelectorAll('[data-del]').forEach(b => b.onclick = () => { cart.splice(Number(b.dataset.del), 1); saveCart(); cartPage(); });
}

// --- Ekran: Buyurtma rasmiylashtirish (FAQAT OLIB KETISH) ---
async function checkoutPage() {
  if (!cart.length) return go('#/cart');
  if (!cache.me) { try { cache.me = await api('/me'); } catch (e) {} }
  const phone = cache.me?.phone || localStorage.getItem(PHONE_KEY) || '';
  const methods = [['cash', '💵 Naqd (olib ketishda)'], ['card', '💳 Plastik karta'], ['click', '🟦 Click'], ['payme', '🟢 Payme'], ['transfer', "🏦 O'tkazma"]];
  // Soat oralig'i: bugun, soatlar ro'yxati
  const slots = [];
  for (let h = 9; h <= 20; h++) slots.push(`${String(h).padStart(2, '0')}:00`, `${String(h).padStart(2, '0')}:30`);
  const today = new Date().toLocaleDateString('sv-SE', { timeZone: 'Asia/Tashkent' });
  const total = cart.reduce((s, i) => s + i.price * i.qty, 0);
  app.innerHTML = header('Buyurtma berish') + `
    <div class="sec-title">Olib ketish vaqti</div>
    <div class="page-pad"><input type="date" id="co-date" value="${today}" min="${today}"></div>
    <div class="sec-title">Soat</div>
    <div class="page-pad"><div class="chips" id="slots">${slots.map((s, i) => `<button class="chip" data-slot="${s}">${s}</button>`).join('')}</div></div>
    <div class="sec-title">To'lov usuli</div>
    <div id="methods">${methods.map(([k, l], i) => `<div class="radio-row ${i === 0 ? 'sel' : ''}" data-m="${k}"><span class="dot"></span>${l}</div>`).join('')}</div>
    <div class="sec-title">Telefon</div>
    <div class="page-pad"><input id="co-phone" inputmode="tel" placeholder="998 90 123 45 67" value="${esc(phone)}"></div>
    <div class="sec-title">Izoh</div>
    <div class="page-pad"><textarea id="co-note" rows="2" maxlength="500" placeholder="Buyurtma bo'yicha izoh..."></textarea></div>
    <br>
    <div class="list-row" style="justify-content:space-between"><b style="font-size:16px">Jami</b><b class="p" style="font-size:18px">${fmt(total)}</b></div>
    <div style="padding:8px 16px 24px"><button class="btn-primary" id="co-submit">Buyurtmani tasdiqlash</button></div>` + bottomNav('');
  updateBadge();
  let slot = null, method = 'cash';
  document.querySelectorAll('[data-slot]').forEach(b => b.onclick = () => {
    document.querySelectorAll('[data-slot]').forEach(x => x.classList.remove('active'));
    b.classList.add('active'); slot = b.dataset.slot; haptic('light');
  });
  document.querySelectorAll('[data-m]').forEach(r => r.onclick = () => {
    document.querySelectorAll('[data-m]').forEach(x => x.classList.remove('sel'));
    r.classList.add('sel'); method = r.dataset.m;
  });
  $('#co-submit').onclick = async () => {
    const btn = $('#co-submit');
    if (!slot) return toast('Olib ketish soatini tanlang');
    const phoneVal = $('#co-phone').value.replace(/\D/g, '');
    if (phoneVal.length < 9) return toast('Telefon raqamni kiriting');
    btn.disabled = true;
    try {
      const res = await api('/orders', { method: 'POST', body: {
        items: cart.map(c => ({ product_id: c.product_id, variant_id: c.variant_id, qty: c.qty, name: c.name })),
        pickup_date: $('#co-date').value, pickup_time: slot, phone: phoneVal,
        note: $('#co-note').value, payment_method: method
      } });
      try { await api('/phone', { method: 'POST', body: { phone: phoneVal } }); } catch (e) {}
      localStorage.setItem(PHONE_KEY, phoneVal);
      cart = []; saveCart();
      haptic('ok');
      toast(`Buyurtma #${res.order_no} qabul qilindi!`);
      go('#/orders');
    } catch (e) { btn.disabled = false; toast(e.message); }
  };
}

// --- Ekran: Buyurtmalarim ---
async function ordersPage() {
  app.innerHTML = header('Buyurtmalarim') + `<div id="body">${skeletonGrid(3)}</div>` + bottomNav('orders');
  updateBadge();
  try {
    const orders = await api('/orders');
    if (!orders.length) return void ($('#body').innerHTML = emptyPage('🧾', 'Buyurtmalar yo\'q', '#/', 'Katalogga'));
    $('#body').innerHTML = orders.map(o => `
      <div class="list-row" style="flex-direction:column;align-items:stretch;gap:6px">
        <div style="display:flex;justify-content:space-between;align-items:center">
          <b>Buyurtma #${o.no}</b>
          <span class="status-pill st-${o.status}">${o.status_uz}</span>
        </div>
        <div class="s">${new Date(o.created_at).toLocaleString('ru-RU')} · ${esc(o.pickup_date)} ${esc(o.pickup_time)}</div>
        ${(o.items || []).map(i => `<div class="s">• ${esc(i.name)} ×${i.qty} — ${fmt(i.sum)}</div>`).join('')}
        <div style="display:flex;justify-content:space-between"><b>Jami: <span class="p">${fmt(o.total_uzs)}</span></b>
        ${o.status === 'new' ? `<button class="trash" data-cancel="${o.id}">Bekor qilish</button>` : ''}</div>
      </div>`).join('');
    document.querySelectorAll('[data-cancel]').forEach(b => b.onclick = async () => {
      try { await api(`/orders/${b.dataset.cancel}/cancel`, { method: 'POST' }); toast('Bekor qilindi'); ordersPage(); }
      catch (e) { toast(e.message); }
    });
  } catch (e) { $('#body').innerHTML = `<div class="err-box">${esc(e.message)}</div>`; }
}

// --- Ekran: Sevimlilar ---
async function favPage() {
  app.innerHTML = header('Sevimlilar') + `<div id="body">${skeletonGrid()}</div>` + bottomNav('fav');
  updateBadge();
  try {
    const list = cache.catalog || await api('/catalog').then(c => (cache.catalog = c));
    const fl = list.filter(g => favs.includes(g.id));
    $('#body').innerHTML = fl.length ? `<div class="grid">${fl.map(cardHtml).join('')}</div>` : emptyPage('♡', 'Sevimlilar bo\'sh', '#/', 'Katalogga');
    bindFavs(() => favPage());
  } catch (e) { $('#body').innerHTML = `<div class="err-box">${esc(e.message)}</div>`; }
}

// --- Ekran: Profil ---
async function profilePage() {
  try { cache.me = cache.me || await api('/me'); } catch (e) { cache.me = { name: tg.initDataUnsafe?.user?.first_name || 'Mijoz', phone: '' }; }
  const me = cache.me;
  app.innerHTML = header('Profil') + `
    <div class="empty"><div class="ico">👤</div>
      <b style="font-size:16px;color:var(--color-text)">${esc(me.name || tg.initDataUnsafe?.user?.first_name || 'Mijoz')}</b>
    </div>
    <div class="sec-title">Telefon raqam</div>
    <div class="page-pad" style="display:flex;gap:8px">
      <input id="pr-phone" inputmode="tel" value="${esc(me.phone)}" placeholder="998 90 123 45 67">
      <button class="circle-add" id="pr-save" style="width:48px;height:48px;font-size:20px">✓</button>
    </div>
    <br>
    <div class="radio-row" onclick="location.hash='#/orders'">🧾 Buyurtmalarim ›</div>
    <div class="radio-row" onclick="location.hash='#/fav'">♥ Sevimlilar ›</div>
    <div class="radio-row">💬 Yordam: admin bilan bog'laning (bot orqali)</div>
    <div class="radio-row">🌐 Til: O'zbekcha · Tema: Qora</div>` + bottomNav('profile');
  updateBadge();
  $('#pr-save').onclick = async () => {
    const v = $('#pr-phone').value.replace(/\D/g, '');
    try { await api('/phone', { method: 'POST', body: { phone: v } }); localStorage.setItem(PHONE_KEY, v); toast('Saqlandi'); }
    catch (e) { toast(e.message); }
  };
}

render();
})();
