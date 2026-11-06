/* POS Kassa (PWA): PIN kirish, smena, sotuv, aralash to'lov, oflayn navbat (IndexedDB outbox) */
(() => {
const $ = s => document.querySelector(s);
const app = $('#app');
const TOKEN_KEY = 'pos_token', USER_KEY = 'pos_user';
let token = localStorage.getItem(TOKEN_KEY) || '';
let user = JSON.parse(localStorage.getItem(USER_KEY) || 'null');
let shift = null, catalog = [], categories = [];
let cart = [];          // {product_id, variant_id, name, price, qty, unit}
let curCat = 0, searchQ = '';
let online = navigator.onLine;

const fmt = n => Math.round(n).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
const sum = () => cart.reduce((s, i) => s + Math.round(i.price * i.qty), 0);
const esc = s => String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
function toast(m) { const t = document.createElement('div'); t.className = 'toast'; t.textContent = m; document.body.appendChild(t); setTimeout(() => t.remove(), 2000); }
const uuid = () => (crypto.randomUUID ? crypto.randomUUID() : 'u' + Date.now() + Math.random().toString(16).slice(2));

async function api(path, method = 'GET', body) {
  const r = await fetch('/api' + path, {
    method, headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + token },
    body: body ? JSON.stringify(body) : undefined
  });
  const j = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(j.error || 'Xato ' + r.status);
  return j;
}

// --- OFLAYN NAVBAT (IndexedDB outbox) ---
let db;
function openDb() {
  return new Promise((res, rej) => {
    const rq = indexedDB.open('pos-outbox', 1);
    rq.onupgradeneeded = () => rq.result.createObjectStore('sales', { keyPath: 'uuid' });
    rq.onsuccess = () => res(db = rq.result);
    rq.onerror = () => rej(rq.error);
  });
}
function outboxAdd(sale) {
  return new Promise((res, rej) => {
    const tx = db.transaction('sales', 'readwrite');
    tx.objectStore('sales').put(sale);
    tx.oncomplete = res; tx.onerror = () => rej(tx.error);
  });
}
function outboxAll() {
  return new Promise((res, rej) => {
    const rq = db.transaction('sales').objectStore('sales').getAll();
    rq.onsuccess = () => res(rq.result); rq.onerror = () => rej(rq.error);
  });
}
function outboxDel(u) {
  return new Promise(res => { const tx = db.transaction('sales', 'readwrite'); tx.objectStore('sales').delete(u); tx.oncomplete = res; });
}
async function outboxCount() { return (await outboxAll()).length; }

async function syncOutbox() {
  if (!online || !token) return;
  const all = await outboxAll();
  for (const s of all) {
    try {
      await api('/pos/sale', 'POST', s.payload);
      await outboxDel(s.uuid);
    } catch (e) {
      if (/uuid|kerak/.test(e.message)) await outboxDel(s.uuid); // buzgan yozuvni tashla
      else break; // hali oflayn — keyin harakatda davom
    }
  }
  updateNetBadge();
}
window.addEventListener('online', () => { online = true; updateNetBadge(); syncOutbox(); loadCatalog(); });
window.addEventListener('offline', () => { online = false; updateNetBadge(); });
setInterval(syncOutbox, 30000);

function updateNetBadge() {
  const b = $('#net-badge');
  if (!b) return;
  outboxCount().then(n => {
    b.style.display = (online && !n) ? 'none' : '';
    if (!online) { b.className = 'offline-badge'; b.textContent = 'OFLAYN'; }
    else { b.className = 'offline-badge wait'; b.textContent = `Sinxron: ${n}`; }
  });
}

// --- PIN KIRISH ---
let pinBuf = '';
function pinScreen() {
  app.innerHTML = `<div class="pin-screen">
    <h2>POS Kassa</h2>
    <div class="muted">4 xonali PIN kiriting</div>
    <div class="pin-dots">${[0,1,2,3].map(i => `<span class="${i < pinBuf.length ? 'on' : ''}"></span>`).join('')}</div>
    <div class="pin-err" id="pin-err"></div>
    <div class="pin-pad">${[1,2,3,4,5,6,7,8,9,'⌫',0,'→'].map(k =>
      `<button data-k="${k}">${k}</button>`).join('')}</div>
  </div>`;
  document.querySelectorAll('[data-k]').forEach(b => b.onclick = () => pinPress(b.dataset.k));
}
async function pinPress(k) {
  if (k === '⌫') pinBuf = pinBuf.slice(0, -1);
  else if (k === '→') { if (pinBuf.length === 4) return pinLogin(pinBuf); }
  else if (pinBuf.length < 4) pinBuf += k;
  if (pinBuf.length === 4) return pinLogin(pinBuf);
  pinScreen();
}
async function pinLogin(pin) {
  try {
    const r = await fetch('/api/auth/pin-login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ pin }) });
    const j = await r.json();
    if (!r.ok) { $('#pin-err').textContent = j.error; pinBuf = ''; setTimeout(pinScreen, 1200); return; }
    token = j.token; user = { name: j.name, role: j.role, id: j.id };
    localStorage.setItem(TOKEN_KEY, token); localStorage.setItem(USER_KEY, JSON.stringify(user));
    pinBuf = '';
    await afterLogin();
  } catch (e) { $('#pin-err').textContent = 'Serverga ulanmadi (oflayn rejimda kirish mumkin emas)'; pinBuf = ''; setTimeout(pinScreen, 1500); }
}

async function afterLogin() {
  await openDb();
  await loadCatalog();
  try { shift = await api('/pos/shift').then(r => r.open); } catch (e) { shift = null; }
  // Katalog keshi (localStorage) — oflaynda ham sotuv davom etsin
  if (!catalog.length) {
    const cached = localStorage.getItem('pos_catalog_cache');
    if (cached) { catalog = JSON.parse(cached); toast('Oflayn katalog (kesh)'); }
  }
  shift ? posScreen() : shiftOpenScreen();
}

async function loadCatalog() {
  if (!online) return;
  try {
    catalog = await api('/pos/catalog');
    localStorage.setItem('pos_catalog_cache', JSON.stringify(catalog));
  } catch (e) { /* oflayn — kesh qoladi */ }
  updateNetBadge();
}

// --- SMENA OCHISH ---
function shiftOpenScreen() {
  app.innerHTML = `<div class="center-screen">
    <h2>Assalomu alaykum, ${esc(user?.name || '')}</h2>
    <div class="muted">Smenani ochish uchun boshlang'ich naqd pul summasini kiriting</div>
    <input id="opening" type="number" placeholder="Boshlang'ich naqd (so'm)" style="width:280px;font-size:18px;text-align:center">
    <div class="err" id="err"></div>
    <button class="btn" id="open-btn">Smenani ochish</button>
    <button class="btn ghost" id="logout">Chiqish</button>
  </div>`;
  $('#open-btn').onclick = async () => {
    try { const r = await api('/pos/shift/open', 'POST', { opening_cash: Number($('#opening').value) || 0 }); shift = r.shift; posScreen(); }
    catch (e) { $('#err').textContent = e.message; }
  };
  $('#logout').onclick = logout;
}

async function logout() {
  localStorage.removeItem(TOKEN_KEY); localStorage.removeItem(USER_KEY);
  token = ''; user = null; shift = null; cart = [];
  location.reload();
}

// --- SMENA YOPISH ---
function shiftCloseModal() {
  openModal(`<h3>Smenani yopish</h3>
    <div class="muted">Kassadagi haqiqiy naqd pulni sanab kiriting</div>
    <input id="counted" type="number" placeholder="Sanalgan naqd (so'm)" style="width:100%;font-size:18px;margin:10px 0">
    <div class="err" id="diff-err"></div>
    <button class="btn wide" id="close-btn">Yopish</button>
    <button class="btn ghost wide" style="margin-top:8px" onclick="this.closest('.modal-back').remove()">Bekor</button>`);
  $('#close-btn').onclick = async () => {
    try {
      const r = await api('/pos/shift/close', 'POST', { counted_cash: Number($('#counted').value) || 0 });
      shift = null;
      toast(`Smena yopildi. Farq: ${fmt(r.diff)} so'm`);
      closeModal(); shiftOpenScreen();
    } catch (e) {
      if (e.expected !== undefined) {
        $('#diff-err').textContent = e.message;
        const inp = document.createElement('textarea');
        inp.id = 'diff-note'; inp.placeholder = 'Farq sababi (majburiy)';
        inp.style.cssText = 'width:100%;margin-top:8px';
        $('#close-btn').before(inp);
        $('#close-btn').onclick = async () => {
          try { const r2 = await api('/pos/shift/close', 'POST', { counted_cash: Number($('#counted').value) || 0, diff_note: $('#diff-note').value }); shift = null; closeModal(); toast('Smena yopildi'); shiftOpenScreen(); }
          catch (e2) { $('#diff-err').textContent = e2.message; }
        };
      } else $('#diff-err').textContent = e.message;
    }
  };
}

// --- ASOSIY POS EKRANI ---
function posScreen() {
  app.innerHTML = `<div class="pos">
    <div class="cart-pane">
      <div class="cart-head"><span>Savat</span><button class="btn ghost" style="padding:6px 12px;font-size:12px" id="close-shift">Smena</button></div>
      <div class="cart-items" id="cart-items"></div>
      <div class="cart-foot">
        <div class="total"><span>JAMI</span><span id="total">0</span></div>
        <div class="pays">
          <button class="btn" id="pay-fast">💵 Naqd</button>
          <button class="btn ghost" id="pay-mixed">💳 Aralash / boshqa</button>
        </div>
        <button class="btn ghost wide" style="margin-top:8px;padding:8px" id="clear-cart">Savatni tozalash</button>
      </div>
    </div>
    <div class="cat-pane">
      <div class="pos-top">
        <input id="scan" placeholder="Barcode skaner / qidiruv (Enter)" autocomplete="off">
        <span class="offline-badge" id="net-badge" style="display:none"></span>
        <span class="muted">${esc(user?.name || '')}</span>
      </div>
      <div class="cat-tabs" id="cat-tabs"></div>
      <div class="prod-grid" id="prod-grid"></div>
    </div>
  </div>`;
  drawCats(); drawCart(); updateNetBadge();
  $('#close-shift').onclick = shiftCloseModal;
  $('#clear-cart').onclick = () => { cart = []; drawCart(); };
  $('#pay-fast').onclick = () => submitSale([{ method: 'cash', amount: sum() }]);
  $('#pay-mixed').onclick = mixedPayModal;
  const scan = $('#scan');
  scan.focus();
  scan.addEventListener('keydown', e => {
    if (e.key !== 'Enter') return;
    const v = scan.value.trim();
    if (!v) return;
    // Barcode skaner klaviatura kabi ishlaydi — barcode yoki nom bo'yicha qidirish
    const found = catalog.find(g => g.barcode === v || (g.variants || []).some(x => x.barcode === v));
    if (found) {
      const variant = (found.variants || []).find(x => x.barcode === v);
      addToCart(found, variant);
    } else {
      searchQ = v.toLowerCase(); drawCats();
      toast('Barcode topilmadi — nom bo\'yicha natijalar');
    }
    scan.value = ''; scan.focus();
  });
  setInterval(() => scan.focus(), 2000); // input focus doim qaytadi
}

function drawCats() {
  const tabs = $('#cat-tabs');
  const cats = [...new Set(catalog.map(g => g.category_id))];
  tabs.innerHTML = `<button class="cat-tab ${!curCat ? 'active' : ''}" data-c="0">Hammasi</button>` +
    cats.map(c => `<button class="cat-tab ${curCat === c ? 'active' : ''}" data-c="${c}">${esc((catalog.find(g => g.category_id === c) || {}).category_name || c)}</button>`).join('');
  tabs.querySelectorAll('[data-c]').forEach(b => b.onclick = () => { curCat = Number(b.dataset.c); drawCats(); });
  let list = catalog.filter(g => !curCat || g.category_id === curCat);
  if (searchQ) list = catalog.filter(g => g.name.toLowerCase().includes(searchQ)), curCat = 0;
  $('#prod-grid').innerHTML = list.map(g => {
    const stock = Number(g.stock || 0);
    const out = stock <= 0;
    return `<button class="prod-btn ${out ? 'out' : ''}" data-p="${g.id}">
      <span class="n">${esc(g.name)}</span>
      <span class="p">${fmt(g.price)}</span>
      <span class="s">qoldiq: ${stock} ${g.unit === 'kg' ? 'kg' : 'dona'}</span>
    </button>`;
  }).join('');
  $('#prod-grid').querySelectorAll('[data-p]').forEach(b => b.onclick = () => {
    const g = catalog.find(x => x.id === Number(b.dataset.p));
    if ((g.variants || []).length) return variantModal(g);
    addToCart(g, null);
  });
}

function addToCart(g, variant) {
  if (g.unit === 'kg' && !variant) return weightModal(g, null);
  if (g.unit === 'kg' && variant && variant.unit === 'kg') return weightModal(g, variant);
  const ex = cart.find(c => c.product_id === g.id && c.variant_id === (variant ? variant.id : null));
  if (ex) ex.qty++;
  else cart.push({ product_id: g.id, variant_id: variant ? variant.id : null, name: g.name + (variant ? ' (' + variant.name + ')' : ''), price: variant ? variant.price : g.price, qty: 1, unit: 'pcs' });
  drawCart();
}
function variantModal(g) {
  const vs = g.variants.filter(v => v.is_active);
  if (vs.length === 1) return addToCart(g, vs[0]);
  openModal(`<h3>${esc(g.name)}</h3>` + vs.map(v =>
    `<div class="pay-row"><button class="btn ghost wide" style="display:flex;justify-content:space-between" data-v="${v.id}">
      <span>${esc(v.name)}</span><b>${fmt(v.price)}</b></button></div>`).join(''));
  document.querySelectorAll('[data-v]').forEach(b => b.onclick = () => { closeModal(); addToCart(g, vs.find(v => v.id === Number(b.dataset.v))); });
}
function weightModal(g, variant) {
  openModal(`<h3>${esc(g.name)} — vazn (kg)</h3>
    <input id="w" type="number" step="0.001" min="0.001" placeholder="0.250" style="width:100%;font-size:22px;text-align:center">
    <div class="muted" style="text-align:center;margin-top:6px" id="w-sum"></div>
    <div class="numpad">${[1,2,3,4,5,6,7,8,9,'.',0,'⌫'].map(k => `<button data-n="${k}">${k}</button>`).join('')}</div>
    <button class="btn wide" id="w-ok">Qo'shish</button>`);
  const w = $('#w');
  document.querySelectorAll('[data-n]').forEach(b => b.onclick = () => {
    w.value = b.dataset.n === '⌫' ? w.value.slice(0, -1) : (b.dataset.n === '.' && w.value.includes('.') ? w.value : w.value + b.dataset.n);
    $('#w-sum').textContent = w.value ? fmt((variant ? variant.price : g.price) * Number(w.value || 0)) + " so'm" : '';
  });
  $('#w-ok').onclick = () => {
    const q = Number(w.value);
    if (!q || q <= 0) return;
    cart.push({ product_id: g.id, variant_id: variant ? variant.id : null, name: g.name + (variant ? ' (' + variant.name + ')' : ''), price: variant ? variant.price : g.price, qty: q, unit: 'kg' });
    closeModal(); drawCart();
  };
  w.focus();
}

function drawCart() {
  $('#cart-items').innerHTML = cart.map((c, i) => `
    <div class="cart-row">
      <div class="nm"><div class="n">${esc(c.name)}</div><div class="p">${fmt(c.price)} × ${c.qty}${c.unit === 'kg' ? 'kg' : ''} = ${fmt(c.price * c.qty)}</div></div>
      <button class="qty-btn" data-dec="${i}">−</button>
      <button class="qty-btn" data-inc="${i}">+</button>
      <button class="x" data-del="${i}">✕</button>
    </div>`).join('') || '<div class="muted" style="text-align:center;padding:30px 0">Savat bo\'sh</div>';
  $('#total').textContent = fmt(sum()) + " so'm";
  $('#cart-items').querySelectorAll('[data-inc]').forEach(b => b.onclick = () => {
    const c = cart[Number(b.dataset.inc)];
    c.qty = Math.round((c.qty + (c.unit === 'kg' ? 0.25 : 1)) * 1000) / 1000; drawCart();
  });
  $('#cart-items').querySelectorAll('[data-dec]').forEach(b => b.onclick = () => {
    const i = Number(b.dataset.dec), c = cart[i];
    c.qty = Math.round((c.qty - (c.unit === 'kg' ? 0.25 : 1)) * 1000) / 1000;
    if (c.qty <= 0) cart.splice(i, 1); drawCart();
  });
  $('#cart-items').querySelectorAll('[data-del]').forEach(b => b.onclick = () => { cart.splice(Number(b.dataset.del), 1); drawCart(); });
}

// --- ARALASH TO'LOV ---
function mixedPayModal() {
  if (!cart.length) return toast('Savat bo\'sh');
  const rest = () => sum() - pays.reduce((s, p) => s + (Number(p.amount) || 0), 0);
  let pays = [{ method: 'cash', amount: sum() }];
  const methods = [['cash', '💵 Naqd'], ['card', '💳 Karta'], ['click', '🟦 Click'], ['payme', '🟢 Payme'], ['transfer', "🏦 O'tkazma"]];
  const draw = () => {
    openModal(`<h3>To'lov</h3><div class="muted">Jami: ${fmt(sum())} so'm · Qoldi: <b id="rest">${fmt(rest())}</b> so'm</div><br>
      <div id="pay-rows">${pays.map((p, i) => `<div class="pay-row">
        <select data-m="${i}">${methods.map(([k, l]) => `<option value="${k}" ${p.method === k ? 'selected' : ''}>${l}</option>`).join('')}</select>
        <input type="number" data-a="${i}" value="${p.amount || ''}" placeholder="summa" style="width:130px">
        ${pays.length > 1 ? `<button class="x" data-x="${i}">✕</button>` : ''}
      </div>`).join('')}</div>
      <button class="btn ghost wide" style="padding:8px" id="add-pay">+ Yana to'lov usuli</button>
      <div class="err" id="pay-err"></div>
      <button class="btn wide" id="pay-ok">Sotuvni yakunlash</button>
      <button class="btn ghost wide" style="margin-top:8px" onclick="this.closest('.modal-back').remove()">Bekor</button>`);
    $('#add-pay').onclick = () => { if (rest() > 0) { pays.push({ method: 'card', amount: rest() }); draw(); } };
    document.querySelectorAll('[data-m]').forEach(s => s.onchange = () => pays[Number(s.dataset.m)].method = s.value);
    document.querySelectorAll('[data-a]').forEach(i2 => i2.oninput = () => pays[Number(i2.dataset.a)].amount = Number(i2.value) || 0);
    document.querySelectorAll('[data-x]').forEach(x => x.onclick = () => { pays.splice(Number(x.dataset.x), 1); draw(); });
    $('#pay-ok').onclick = () => {
      const totalPays = pays.map(p => ({ method: p.method, amount: Number(p.amount) || 0 })).filter(p => p.amount > 0);
      if (totalPays.reduce((s, p) => s + p.amount, 0) !== sum()) return $('#pay-err').textContent = "To'lov summalari jami bilan mos emas";
      closeModal(); submitSale(totalPays);
    };
  };
  draw();
}

// --- SOTUVNI YUBORISH (onlayn / oflayn outbox) ---
async function submitSale(payments) {
  const payload = {
    uuid: uuid(),
    items: cart.map(c => ({ product_id: c.product_id, variant_id: c.variant_id, name: c.name, price: c.price, qty: c.qty })),
    payment: payments, discount_percent: 0, customer_name: '', phone: ''
  };
  if (!online) {
    await outboxAdd({ uuid: payload.uuid, payload, created_at: Date.now() });
    cart = []; drawCart(); updateNetBadge();
    toast('Oflayn saqlandi — internet qaytganda yuboriladi');
    return;
  }
  try {
    const r = await api('/pos/sale', 'POST', payload);
    cart = []; drawCart();
    toast(r.duplicate ? 'Bu sotuv allaqachon yozilgan' : `Chek #${String(r.receipt_no).padStart(6, '0')} — ${r.printed ? 'chop etilmoqda' : 'printer agent ulanmagan!'}`);
    if (!r.printed) toast('⚠️ Print agentiga ulanmagan — chekni qo\'lda chop eting (smena tarixi)');
    await syncOutbox();
  } catch (e) {
    if (/qoldiq|yetarli|mos emas|ochilmagan|chegirma/.test(e.message)) return toast(e.message);
    // Tarmoq xatosi — oflayn navbatga
    await outboxAdd({ uuid: payload.uuid, payload, created_at: Date.now() });
    cart = []; drawCart(); updateNetBadge();
    toast('Serverga yuborilmadi — navbatga qo\'yildi');
  }
}

// --- Modal yordamchilari ---
function openModal(html) {
  const m = document.createElement('div');
  m.className = 'modal-back';
  m.innerHTML = `<div class="modal">${html}</div>`;
  document.body.appendChild(m);
  m.onclick = e => { if (e.target === m) m.remove(); };
}
function closeModal() { document.querySelectorAll('.modal-back').forEach(m => m.remove()); }

// --- START ---
(async () => {
  if (token) {
    try { await afterLogin(); return; } catch (e) { /* token eskirgan */ }
  }
  pinScreen();
})();
})();
