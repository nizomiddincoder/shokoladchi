/* Admin panel — vanilla JS SPA (hash tablar) */
(() => {
const $ = s => document.querySelector(s);
const app = $('#app');
const TKEY = 'admin_token';
let token = localStorage.getItem(TKEY) || '';
let user = null;

const fmt = n => Math.round(Number(n) || 0).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ' ') + " so'm";
const esc = s => String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const dstr = d => new Date(d).toLocaleString('ru-RU', { timeZone: 'Asia/Tashkent' });
function toast(m) { const t = document.createElement('div'); t.className = 'toast'; t.textContent = m; document.body.appendChild(t); setTimeout(() => t.remove(), 2200); }

async function api(path, method = 'GET', body, raw) {
  const r = await fetch('/api' + path, { method, headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + token },
    body: body ? JSON.stringify(body) : undefined });
  if (r.status === 401) { localStorage.removeItem(TKEY); token = ''; location.hash = '#/login'; throw new Error('Sessiya tugagan'); }
  if (raw) return r;
  const j = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(j.error || 'Xato ' + r.status);
  return j;
}

// ================= LOGIN =================
function loginPage() {
  app.innerHTML = `<div class="login-wrap"><div class="login-card">
    <h2>Admin panel</h2>
    <input id="lg-email" type="email" placeholder="Email">
    <input id="lg-pass" type="password" placeholder="Parol">
    <div class="err" id="lg-err"></div>
    <button class="btn" id="lg-btn">Kirish</button>
    <div class="muted" style="text-align:center">— yoki ro'yxatdan o'tish —</div>
    <input id="rg-name" placeholder="Ism (ro'yxatdan o'tish)">
    <input id="rg-email" type="email" placeholder="Email">
    <input id="rg-pass" type="password" placeholder="Parol (min 8 belgi)">
    <button class="btn ghost" id="rg-btn">Ro'yxatdan o'tish</button>
    <div class="muted" id="rg-msg"></div>
  </div></div>`;
  $('#lg-btn').onclick = async () => {
    try { const r = await api('/auth/login', 'POST', { email: $('#lg-email').value, password: $('#lg-pass').value });
      if (r.role !== 'admin') { $('#lg-err').textContent = 'Faqat admin kira oladi'; return; }
      token = r.token; localStorage.setItem(TKEY, token); render(); }
    catch (e) { $('#lg-err').textContent = e.message; }
  };
  $('#rg-btn').onclick = async () => {
    try {
      const r = await api('/auth/register', 'POST', { name: $('#rg-name').value, email: $('#rg-email').value, password: $('#rg-pass').value });
      $('#rg-msg').textContent = r.msg + ' Kodni server logdan oling va quyida kiriting.';
      const code = prompt('Email tasdiqlash kodi (6 xonali):');
      if (!code) return;
      const v = await api('/auth/verify-email', 'POST', { email: $('#rg-email').value, code });
      token = v.token; localStorage.setItem(TKEY, token);
      if (v.role !== 'admin') { alert('Bu admin panel — faqat admin uchun'); token = ''; return; }
      render();
    } catch (e) { $('#rg-msg').textContent = e.message; }
  };
}

// ================= LAYOUT =================
const MENU = [
  ['dash', 'Bosh sahifa'], ['catalog', 'Katalog'], ['orders', 'Buyurtmalar'], ['sales', 'POS sotuvlar'],
  ['warehouse', 'Ombor'], ['suppliers', 'Yetkazib beruvchilar'], ['staff', 'Xodimlar'], ['shifts', 'Smenalar'],
  ['customers', 'Mijozlar'], ['reports', 'Hisobotlar'], ['settings', 'Sozlamalar'], ['audit', 'Audit log']
];
function layout(page, content) {
  app.innerHTML = `<div class="layout">
    <div class="side"><div class="logo">🍬 Shirinlik admin</div>
      ${MENU.map(([k, l]) => `<a href="#/${k}" class="${page === k ? 'active' : ''}">${l}</a>`).join('')}
      <a href="#" id="logout" style="color:var(--danger)">Chiqish</a></div>
    <div class="main" id="main">${content}</div></div>`;
  $('#logout').onclick = e => { e.preventDefault(); localStorage.removeItem(TKEY); token = ''; location.hash = '#/login'; location.reload(); };
}

function modal(html) {
  const m = document.createElement('div');
  m.className = 'modal-back';
  m.innerHTML = `<div class="modal">${html}</div>`;
  document.body.appendChild(m);
  m.onclick = e => { if (e.target === m) m.remove(); };
  return m;
}

const pages = {};
window.addEventListener('hashchange', render);
async function render() {
  if (!token) return loginPage();
  const page = (location.hash.match(/#\/(\w+)/) || [])[1] || 'dash';
  if (!pages[page]) return render();
  layout(page, '<h2 class="page">Yuklanmoqda...</h2>');
  try { await pages[page](); } catch (e) { $('#main').innerHTML = `<h2 class="page">Xato</h2><div class="err">${esc(e.message)}</div>`; }
}

// ================= DASHBOARD =================
pages.dash = async () => {
  const d = await api('/manage/dashboard');
  layout('dash', `<h2 class="page">Bosh sahifa</h2>
    <div class="cards">
      <div class="card"><div class="l">Bugungi sotuv</div><div class="v">${fmt(d.today_sales)}</div></div>
      <div class="card"><div class="l">Cheklar</div><div class="v">${d.today_receipts}</div></div>
      <div class="card"><div class="l">O'rtacha chek</div><div class="v">${fmt(d.avg_receipt)}</div></div>
      <div class="card"><div class="l">Buyurtmalar (bugun)</div><div class="v">${d.today_orders} <span class="pill ${d.new_orders ? 'r' : 'g'}">${d.new_orders} yangi</span></div></div>
      <div class="card"><div class="l">Mijozlar</div><div class="v">${d.customers}</div></div>
    </div>
    <div class="grid2">
      <div><h3 style="margin-bottom:10px">Eng ko'p sotilgan (30 kun)</h3>
        <table class="tbl"><tr><th>Tovar</th><th>Miqdor</th><th>Summa</th></tr>
        ${d.top_products.map(t => `<tr><td>${esc(t.name)}</td><td>${t.qty}</td><td>${fmt(t.sum)}</td></tr>`).join('') || '<tr><td colspan=3 class="muted">Ma\'lumot yo\'q</td></tr>'}</table></div>
      <div><h3 style="margin-bottom:10px">Kam qolgan tovarlar</h3>
        <table class="tbl"><tr><th>Tovar</th><th>Qoldiq</th><th>Min</th></tr>
        ${d.low_stock.map(t => `<tr><td>${esc(t.name)}</td><td><span class="pill ${t.stock <= 0 ? 'r' : 'y'}">${t.stock}</span></td><td>${t.min_stock}</td></tr>`).join('') || '<tr><td colspan=3 class="muted">Hammasi yetarli</td></tr>'}</table></div>
    </div>`);
};

// ================= KATALOG =================
let catCache = [];
pages.catalog = async () => {
  const [cats, goods] = await Promise.all([api('/categories'), api('/goods?include_inactive=1')]);
  catCache = cats;
  layout('catalog', `<h2 class="page">Katalog</h2>
    <div class="toolbar">
      <button class="btn" id="add-goods">+ Mahsulot</button>
      <button class="btn ghost" id="add-cat">+ Kategoriya</button>
    </div>
    <table class="tbl"><tr><th>Rasm</th><th>Nomi</th><th>Kategoriya</th><th>Narx</th><th>Qoldiq</th><th>Unit</th><th></th></tr>
    ${goods.map(g => `<tr>
      <td>${g.images && g.images.length ? `<img class="img-thumb" src="${g.images[0].url}">` : ''}</td>
      <td>${esc(g.name)}<div class="muted">${g.barcode || ''} ${g.sku || ''}</div></td>
      <td>${esc((cats.find(c => c.id === g.category_id) || {}).name || '—')}</td>
      <td>${fmt(g.price)}</td><td>${g.stock}</td><td>${g.unit === 'kg' ? 'kg' : 'dona'}</td>
      <td><button class="btn sm ghost" data-edit="${g.id}">✎</button>
          <button class="btn sm danger" data-del="${g.id}">✕</button></td></tr>`).join('')}</table>`);
  $('#add-cat').onclick = () => {
    const m = modal(`<h3>Yangi kategoriya</h3>
      <label>Nomi</label><input id="c-name">
      <label>Ota kategoriya</label><select id="c-parent"><option value="">—</option>${cats.map(c => `<option value="${c.id}">${esc(c.name)}</option>`).join('')}</select>
      <div class="err" id="c-err"></div><br><button class="btn" id="c-ok">Saqlash</button>`);
    m.querySelector('#c-ok').onclick = async () => {
      try { await api('/admin/categories', 'POST', { name: m.querySelector('#c-name').value, parent_id: m.querySelector('#c-parent').value || null }); m.remove(); pages.catalog(); }
      catch (e) { m.querySelector('#c-err').textContent = e.message; }
    };
  };
  $('#add-goods').onclick = () => goodsForm(null);
  document.querySelectorAll('[data-edit]').forEach(b => b.onclick = () => goodsForm(Number(b.dataset.edit)));
  document.querySelectorAll('[data-del]').forEach(b => b.onclick = async () => {
    if (!confirm('O\'chirilsinmi?')) return;
    await api('/admin/goods/' + b.dataset.del, 'DELETE'); pages.catalog();
  });
};

async function goodsForm(id) {
  const g = id ? await api('/admin/goods/' + id) : { variants: [], images: [] };
  const m = modal(`<h3>${id ? 'Tahrirlash' : 'Yangi mahsulot'}</h3>
    <label>Nomi</label><input id="g-name" value="${esc(g.name || '')}">
    <div class="row2">
      <div><label>Kategoriya</label><select id="g-cat"><option value="">—</option>${catCache.map(c => `<option value="${c.id}" ${g.category_id === c.id ? 'selected' : ''}>${esc(c.name)}</option>`).join('')}</select></div>
      <div><label>O'lchov birligi</label><select id="g-unit"><option value="pcs" ${g.unit === 'pcs' ? 'selected' : ''}>Dona</option><option value="kg" ${g.unit === 'kg' ? 'selected' : ''}>Kg</option></select></div>
    </div>
    <div class="row2">
      <div><label>Sotuv narxi (so'm)</label><input id="g-price" type="number" value="${g.price || ''}"></div>
      <div><label>Tannarx (so'm)</label><input id="g-cost" type="number" value="${g.cost_price || ''}"></div>
    </div>
    <div class="row2">
      <div><label>Barcode</label><input id="g-barcode" value="${esc(g.barcode || '')}"></div>
      <div><label>SKU</label><input id="g-sku" value="${esc(g.sku || '')}"></div>
    </div>
    <label>Minimal qoldiq</label><input id="g-min" type="number" value="${g.min_stock || 0}">
    <label>Tavsif</label><textarea id="g-desc" rows="2">${esc(g.description || '')}</textarea>
    <label>Variantlar (masalan: 1 kg / 2 kg — har biri alohida narx)</label>
    <div id="g-vars">${(g.variants || []).map(v => `<div class="row2" style="margin-bottom:6px">
      <input class="gv-name" placeholder="nom (1 kg)" value="${esc(v.name || '')}">
      <div style="display:flex;gap:6px"><input class="gv-price" type="number" placeholder="narx" value="${v.price || ''}">
      <input class="gv-barcode" placeholder="barcode" value="${esc(v.barcode || '')}"></div></div>`).join('')}</div>
    <button class="btn sm ghost" id="g-addvar">+ Variant</button>
    <label>Rasm (yuklash — AI fon olib tashlaydi)</label><input id="g-img" type="file" accept="image/*">
    ${g.images && g.images.length ? `<div style="margin-top:8px">${g.images.map(i => `<img class="img-thumb" src="${i.url}">`).join('')}</div>` : ''}
    <div class="err" id="g-err"></div><br>
    <button class="btn" id="g-ok">Saqlash</button>`);
  m.querySelector('#g-addvar').onclick = () => {
    const d = document.createElement('div');
    d.className = 'row2'; d.style.marginBottom = '6px';
    d.innerHTML = `<input class="gv-name" placeholder="nom (1 kg)"><div style="display:flex;gap:6px"><input class="gv-price" type="number" placeholder="narx"><input class="gv-barcode" placeholder="barcode"></div>`;
    m.querySelector('#g-vars').appendChild(d);
  };
  m.querySelector('#g-ok').onclick = async () => {
    const btn = m.querySelector('#g-ok');
    btn.disabled = true;
    try {
      const imgFile = m.querySelector('#g-img').files[0];
      let imgData = null, imgMime = null;
      if (imgFile) {
        imgMime = imgFile.type;
        imgData = await new Promise(res => { const r = new FileReader(); r.onload = () => res(r.result); r.readAsDataURL(imgFile); });
      }
      const body = {
        name: m.querySelector('#g-name').value, category_id: m.querySelector('#g-cat').value || null,
        unit: m.querySelector('#g-unit').value, price: Number(m.querySelector('#g-price').value) || 0,
        cost_price: Number(m.querySelector('#g-cost').value) || 0, barcode: m.querySelector('#g-barcode').value || null,
        sku: m.querySelector('#g-sku').value, min_stock: Number(m.querySelector('#g-min').value) || 0,
        description: m.querySelector('#g-desc').value,
        variants: [...m.querySelectorAll('#g-vars .row2')].map(r => ({ name: r.querySelector('.gv-name').value, price: Number(r.querySelector('.gv-price').value) || 0, barcode: r.querySelector('.gv-barcode').value || null })),
        images: imgData ? [{ data: imgData, mime: imgMime }] : undefined
      };
      if (id) await api('/admin/goods/' + id, 'PUT', body);
      else await api('/admin/goods', 'POST', body);
      m.remove(); pages.catalog();
    } catch (e) { m.querySelector('#g-err').textContent = e.message; btn.disabled = false; }
  };
}

// ================= BUYURTMALAR =================
pages.orders = async () => {
  const st = $('#f-status')?.value || '';
  const orders = await api('/manage/orders' + (st ? '?status=' + st : ''));
  const names = { new: ['YANGI', 'r'], accepted: ['QABUL QILINDI', 'y'], preparing: ['TAYYORLANMOQDA', 'y'], ready: ['TAYYOR', 'g'], given: ['BERILDI', 'g'], cancelled: ['BEKOR', 'r'] };
  layout('orders', `<h2 class="page">Buyurtmalar</h2>
    <div class="toolbar"><select id="f-status">
      <option value="">Hammasi</option>${Object.entries(names).map(([k, v]) => `<option value="${k}" ${st === k ? 'selected' : ''}>${v[0]}</option>`).join('')}</select></div>
    <table class="tbl"><tr><th>#</th><th>Sana</th><th>Mijoz</th><th>Telefon</th><th>Olib ketish</th><th>Summa</th><th>To'lov</th><th>Holat</th><th></th></tr>
    ${orders.map(o => `<tr>
      <td><b>${o.no}</b></td><td>${dstr(o.created_at)}</td><td>${esc(o.customer_name || '—')}</td><td>${esc(o.phone || '—')}</td>
      <td>${esc(o.pickup_date)} ${esc(o.pickup_time)}</td><td>${fmt(o.total_uzs)}</td><td>${esc(o.payment_method)}</td>
      <td><span class="pill ${names[o.status][1]}">${names[o.status][0]}</span></td>
      <td><button class="btn sm ghost" data-view="${o.id}">👁</button></td></tr>`).join('')}</table>`);
  $('#f-status').onchange = pages.orders;
  document.querySelectorAll('[data-view]').forEach(b => b.onclick = async () => {
    const o = orders.find(x => x.id === Number(b.dataset.view));
    const m = modal(`<h3>Buyurtma #${o.no}</h3>
      <div class="muted">${esc(o.customer_name)} · ${esc(o.phone)} · ${esc(o.pickup_date)} ${esc(o.pickup_time)} · ${esc(o.note || '')}</div><br>
      <table class="tbl"><tr><th>Tovar</th><th>Miqdor</th><th>Summa</th></tr>
      ${(o.items || []).map(i => `<tr><td>${esc(i.name)}</td><td>${i.qty}</td><td>${fmt(i.sum)}</td></tr>`).join('')}</table>
      <br><label>Holatni o'zgartirish</label>
      <select id="o-st">${Object.entries(names).map(([k, v]) => `<option value="${k}" ${o.status === k ? 'selected' : ''}>${v[0]}</option>`).join('')}</select>
      <div class="err" id="o-err"></div><br><button class="btn" id="o-ok">Saqlash</button>`);
    m.querySelector('#o-ok').onclick = async () => {
      try { await api(`/manage/orders/${o.id}/status`, 'POST', { status: m.querySelector('#o-st').value }); m.remove(); toast('Holat o\'zgartirildi, mijozga xabar yuborildi'); pages.orders(); }
      catch (e) { m.querySelector('#o-err').textContent = e.message; }
    };
  });
};

// ================= POS SOTUVLAR =================
pages.sales = async () => {
  const date = $('#f-date')?.value || '';
  const sales = await api('/pos/sales?limit=200' + (date ? '&date=' + date : ''));
  layout('sales', `<h2 class="page">POS sotuvlar</h2>
    <div class="toolbar"><input type="date" id="f-date" value="${date}">
      <a class="btn ghost" href="/api/manage/export/sales.csv${date ? '?from=' + date + '&to=' + date : ''}" target="_blank">CSV eksport</a></div>
    <table class="tbl"><tr><th>Chek</th><th>Sana</th><th>Kassir</th><th>Mijoz</th><th>Jami</th><th>To'lov</th><th></th></tr>
    ${sales.map(s => `<tr>
      <td>${s.is_return ? '<span class="pill r">QAYTARILDI</span> ' : ''}#${String(s.receipt_no).padStart(6, '0')}</td>
      <td>${dstr(s.created_at)}</td><td>${esc(s.seller_name || '')}</td><td>${esc(s.customer_name || '—')}</td>
      <td>${fmt(s.total_uzs)}</td>
      <td>${(s.payment || []).map(p => p.method + ': ' + fmt(p.amount)).join(', ')}</td>
      <td><button class="btn sm ghost" data-reprint="${s.id}">🖨 Chek</button></td></tr>`).join('')}</table>`);
  $('#f-date').onchange = pages.sales;
  document.querySelectorAll('[data-reprint]').forEach(b => b.onclick = async () => {
    try { await api(`/pos/sales/${b.dataset.reprint}/reprint`, 'POST'); toast('Chek qayta chop etilmoqda'); } catch (e) { toast(e.message); }
  });
};

// ================= OMBOR =================
pages.warehouse = async () => {
  const [stock, lots, expiring, movements] = await Promise.all([
    api('/warehouse/stock'), api('/warehouse/lots'), api('/warehouse/expiring'), api('/warehouse/movements')]);
  const wActions = `
    <div class="toolbar">
      <button class="btn" id="wh-in">📥 Kirim (nakladnoy)</button>
      <button class="btn ghost" id="wh-out">📤 Chiqim (brak/yo'qotish)</button>
      <button class="btn ghost" id="wh-inv">📋 Inventarizatsiya</button>
    </div>`;
  layout('warehouse', `<h2 class="page">Ombor</h2>${wActions}
    <div class="grid2">
      <div><h3>Qoldiqlar</h3><table class="tbl"><tr><th>Tovar</th><th>Qoldiq</th><th>Muddati o'tgan</th><th>Min</th></tr>
        ${stock.map(s => `<tr><td>${esc(s.name)}</td><td>${s.stock}${s.unit === 'kg' ? 'kg' : ''} ${s.min_stock >= s.stock ? '<span class="pill r">kam!</span>' : ''}</td><td>${s.expired || ''}</td><td>${s.min_stock}</td></tr>`).join('')}</table></div>
      <div><h3>Partiyalar (FIFO)</h3><table class="tbl"><tr><th>Tovar</th><th>Lot</th><th>Qoldiq</th><th>Tannarx</th><th>Yaroqlilik</th><th>Yetkazib beruvchi</th></tr>
        ${lots.map(l => `<tr><td>${esc(l.product_name)}${l.variant_name ? ' (' + esc(l.variant_name) + ')' : ''}</td><td>${esc(l.lot_no || '—')}</td>
        <td>${l.remaining}${l.expires_at && l.expires_at <= new Date(Date.now() + 7 * 864e5).toISOString().slice(0, 10) ? ' <span class="pill y">muddat yaqin</span>' : ''}</td>
        <td>${fmt(l.cost_price)}</td><td>${l.expires_at || '—'}</td><td>${esc(l.supplier_name || '—')}</td></tr>`).join('')}</table></div>
    </div>
    <h3 style="margin-top:20px">Muddati yaqin (7 kun)</h3>
    <table class="tbl"><tr><th>Tovar</th><th>Qoldiq</th><th>Yaroqlilik</th></tr>
    ${expiring.map(e => `<tr><td>${esc(e.product_name)}${e.variant_name ? ' (' + esc(e.variant_name) + ')' : ''}</td><td>${e.remaining}</td><td>${e.expires_at}</td></tr>`).join('') || '<tr><td colspan=3 class="muted">Yo\'q</td></tr>'}</table>
    <h3 style="margin-top:20px">Qoldiq o'zgarishlari (oxirgi 300)</h3>
    <table class="tbl"><tr><th>Vaqt</th><th>Tovar</th><th>Miqdor</th><th>Turi</th><th>Kim</th><th>Izoh</th></tr>
    ${movements.map(mv => `<tr><td>${dstr(mv.created_at)}</td><td>${esc(mv.product_name)}</td>
      <td style="color:${mv.qty >= 0 ? 'var(--ok)' : 'var(--danger)'}">${mv.qty}</td><td>${esc(mv.kind)}</td><td>${esc(mv.by_name || '')}</td><td>${esc(mv.note || '')}</td></tr>`).join('')}</table>`);
  $('#wh-in').onclick = () => invoiceForm(stock);
  $('#wh-out').onclick = () => writeoffForm(stock);
  $('#wh-inv').onclick = () => inventoryForm(stock);
};

async function invoiceForm(stock) {
  const suppliers = await api('/warehouse/suppliers');
  const goods = await api('/goods?include_inactive=1');
  const m = modal(`<h3>Kirim (nakladnoy)</h3>
    <div class="row2">
      <div><label>Yetkazib beruvchi</label><select id="i-sup">${suppliers.map(s => `<option value="${s.id}">${esc(s.name)}</option>`).join('')}</select></div>
      <div><label>Hujjat raqami</label><input id="i-doc"></div>
    </div>
    <label>Tovarlar</label><div id="i-lines"></div>
    <button class="btn sm ghost" id="i-add">+ Qator</button>
    <div class="err" id="i-err"></div><br><button class="btn" id="i-ok">Qabul qilish</button>`);
  const addLine = () => {
    const d = document.createElement('div');
    d.className = 'row2'; d.style.marginBottom = '6px';
    d.innerHTML = `<select class="il-g">${goods.map(g => `<option value="${g.id}" data-unit="${g.unit}">${esc(g.name)} (${g.unit === 'kg' ? 'kg' : 'dona'})</option>`).join('')}</select>
      <div style="display:flex;gap:6px"><input class="il-qty" type="number" step="0.001" placeholder="miqdor">
      <input class="il-cost" type="number" placeholder="tannarx">
      <input class="il-exp" type="date" title="yaroqlilik"></div>`;
    m.querySelector('#i-lines').appendChild(d);
  };
  addLine();
  m.querySelector('#i-add').onclick = addLine;
  m.querySelector('#i-ok').onclick = async () => {
    try {
      await api('/warehouse/invoices', 'POST', {
        supplier_id: Number(m.querySelector('#i-sup').value), doc_no: m.querySelector('#i-doc').value,
        items: [...m.querySelectorAll('#i-lines .row2')].map(r => ({
          product_id: Number(r.querySelector('.il-g').value),
          qty: Number(r.querySelector('.il-qty').value), cost_price: Number(r.querySelector('.il-cost').value),
          expires_at: r.querySelector('.il-exp').value || null })).filter(i => i.qty > 0)
      });
      m.remove(); toast('Kirim qabul qilindi'); pages.warehouse();
    } catch (e) { m.querySelector('#i-err').textContent = e.message; }
  };
}
function writeoffForm(stock) {
  const m = modal(`<h3>Chiqim (brak / yo'qotish / ichki iste'mol)</h3>
    <label>Tovar</label><select id="w-g">${stock.map(s => `<option value="${s.id}">${esc(s.name)} — qoldiq: ${s.stock}</option>`).join('')}</select>
    <label>Miqdor</label><input id="w-q" type="number" step="0.001">
    <label>Sabab</label><input id="w-r" placeholder="masalan: sindirildi">
    <div class="err" id="w-err"></div><br><button class="btn danger" id="w-ok">Yozish</button>`);
  m.querySelector('#w-ok').onclick = async () => {
    try { await api('/warehouse/writeoff', 'POST', { product_id: Number(m.querySelector('#w-g').value), qty: Number(m.querySelector('#w-q').value), reason: m.querySelector('#w-r').value }); m.remove(); toast('Chiqim yozildi'); pages.warehouse(); }
    catch (e) { m.querySelector('#w-err').textContent = e.message; }
  };
}
function inventoryForm(stock) {
  const m = modal(`<h3>Inventarizatsiya — sanalgan qoldiqni kiriting</h3>
    <div id="inv-lines"></div><button class="btn sm ghost" id="inv-add">+ Qator</button>
    <div class="err" id="inv-err"></div><br><button class="btn" id="inv-ok">Farqlarni tuzatish</button>`);
  const addLine = () => {
    const d = document.createElement('div');
    d.className = 'row2'; d.style.marginBottom = '6px';
    d.innerHTML = `<select class="iv-g">${stock.map(s => `<option value="${s.id}" data-sys="${s.stock}">${esc(s.name)} — tizim: ${s.stock}</option>`).join('')}</select>
      <input class="iv-q" type="number" step="0.001" placeholder="sanalgan qoldiq">`;
    m.querySelector('#inv-lines').appendChild(d);
  };
  addLine();
  m.querySelector('#inv-add').onclick = addLine;
  m.querySelector('#inv-ok').onclick = async () => {
    try {
      const r = await api('/warehouse/inventory', 'POST', { lines: [...m.querySelectorAll('#inv-lines .row2')]
        .map(r => ({ product_id: Number(r.querySelector('.iv-g').value), counted: Number(r.querySelector('.iv-q').value) })) });
      m.remove(); toast(`Tuzatildi: ${r.adjusted} qator`); pages.warehouse();
    } catch (e) { m.querySelector('#inv-err').textContent = e.message; }
  };
}

// ================= YETKAZIB BERUVCHILAR =================
pages.suppliers = async () => {
  const [suppliers, report] = await Promise.all([api('/warehouse/suppliers'), api('/warehouse/suppliers-report')]);
  layout('suppliers', `<h2 class="page">Yetkazib beruvchilar va oldi-berdi</h2>
    <div class="toolbar"><button class="btn" id="s-add">+ Yetkazib beruvchi</button></div>
    <h3>Oldi-berdi (davr: hamma vaqt)</h3>
    <table class="tbl"><tr><th>Nomi</th><th>Telefon</th><th>Kirim jami</th><th>To'langan</th><th>Qarz</th><th></th></tr>
    ${report.map(s => `<tr><td>${esc(s.name)}</td><td>${esc(s.phone || '—')}</td><td>${fmt(s.kirim)}</td><td>${fmt(s.tolangan)}</td>
      <td><b style="color:${s.qarz > 0 ? 'var(--danger)' : 'var(--ok)'}">${fmt(s.qarz)}</b></td>
      <td><button class="btn sm" data-pay="${s.id}" data-name="${esc(s.name)}">💵 To'lov</button></td></tr>`).join('')}</table>`);
  $('#s-add').onclick = () => {
    const m = modal(`<h3>Yangi yetkazib beruvchi</h3>
      <label>Nomi</label><input id="s-name"><label>Telefon</label><input id="s-phone">
      <label>STIR</label><input id="s-stir"><label>Izoh</label><input id="s-note">
      <div class="err" id="s-err"></div><br><button class="btn" id="s-ok">Saqlash</button>`);
    m.querySelector('#s-ok').onclick = async () => {
      try { await api('/warehouse/suppliers', 'POST', { name: m.querySelector('#s-name').value, phone: m.querySelector('#s-phone').value, stir: m.querySelector('#s-stir').value, note: m.querySelector('#s-note').value }); m.remove(); pages.suppliers(); }
      catch (e) { m.querySelector('#s-err').textContent = e.message; }
    };
  };
  document.querySelectorAll('[data-pay]').forEach(b => b.onclick = () => {
    const m = modal(`<h3>To'lov: ${b.dataset.name}</h3>
      <label>Summa (so'm)</label><input id="p-a" type="number">
      <label>Usul</label><select id="p-m"><option value="naqd">Naqd</option><option value="karta">Karta</option><option value="otkazma">O'tkazma</option></select>
      <div class="err" id="p-err"></div><br><button class="btn" id="p-ok">To'lash</button>`);
    m.querySelector('#p-ok').onclick = async () => {
      try { await api(`/warehouse/suppliers/${b.dataset.pay}/pay`, 'POST', { amount: Number(m.querySelector('#p-a').value), method: m.querySelector('#p-m').value }); m.remove(); toast('To\'lov yozildi'); pages.suppliers(); }
      catch (e) { m.querySelector('#p-err').textContent = e.message; }
    };
  });
};

// ================= XODIMLAR =================
pages.staff = async () => {
  const staff = await api('/auth/staff');
  const roleNames = { admin: 'ADMIN', warehouse: 'OMBOR', seller: 'SOTUVCHI' };
  layout('staff', `<h2 class="page">Xodimlar</h2>
    <div class="toolbar"><button class="btn" id="u-add">+ Xodim</button></div>
    <table class="tbl"><tr><th>Ism</th><th>Rol</th><th>Telefon</th><th>Email</th><th>PIN</th><th>Holat</th><th></th></tr>
    ${staff.map(s => `<tr><td>${esc(s.name)}</td><td><span class="pill b">${roleNames[s.role]}</span></td>
      <td>${esc(s.phone || '—')}</td><td>${esc(s.email || '—')}</td>
      <td><b>${esc(s.pin_view || '—')}</b></td>
      <td>${s.locked_until && new Date(s.locked_until) > new Date() ? '<span class="pill r">bloklangan</span>' : (s.is_active ? '<span class="pill g">faol</span>' : '<span class="pill r">o\'chirilgan</span>')}</td>
      <td><button class="btn sm ghost" data-edit='${JSON.stringify(s)}'>✎</button>
          ${s.is_active ? `<button class="btn sm danger" data-block="${s.id}">Bloklash</button>` : ''}</td></tr>`).join('')}</table>`);
  $('#u-add').onclick = () => staffForm(null);
  document.querySelectorAll('[data-block]').forEach(b => b.onclick = async () => {
    if (!confirm('Bloklansinmi?')) return;
    await api('/auth/staff/' + b.dataset.block, 'DELETE'); pages.staff();
  });
  document.querySelectorAll('[data-edit]').forEach(b => b.onclick = () => staffForm(JSON.parse(b.dataset.edit)));
};
function staffForm(s) {
  const m = modal(`<h3>${s ? 'Tahrirlash: ' + esc(s.name) : 'Yangi xodim'}</h3>
    <label>Ism</label><input id="u-name" value="${esc(s?.name || '')}">
    <div class="row2">
      <div><label>Rol</label><select id="u-role">${['seller', 'warehouse', 'admin'].map(r => `<option value="${r}" ${s?.role === r ? 'selected' : ''}>${r}</option>`).join('')}</select></div>
      <div><label>Telefon</label><input id="u-phone" value="${esc(s?.phone || '')}"></div>
    </div>
    <label>${s ? 'Yangi PIN (bo\'sh — o\'zgarmaydi)' : 'PIN (4 xonali)'}</label><input id="u-pin" maxlength="4" inputmode="numeric">
    <label>Faol</label><select id="u-active"><option value="1" ${s?.is_active !== false ? 'selected' : ''}>Ha</option><option value="0" ${s?.is_active === false ? 'selected' : ''}>Yo'q</option></select>
    <div class="err" id="u-err"></div><br><button class="btn" id="u-ok">Saqlash</button>`);
  m.querySelector('#u-ok').onclick = async () => {
    try {
      const pin = m.querySelector('#u-pin').value;
      if (s) await api('/auth/staff/' + s.id, 'PUT', { name: m.querySelector('#u-name').value, role: m.querySelector('#u-role').value, phone: m.querySelector('#u-phone').value, pin: pin || undefined, is_active: m.querySelector('#u-active').value === '1' });
      else await api('/auth/staff', 'POST', { name: m.querySelector('#u-name').value, role: m.querySelector('#u-role').value, phone: m.querySelector('#u-phone').value, pin });
      m.remove(); pages.staff();
    } catch (e) { m.querySelector('#u-err').textContent = e.message; }
  };
}

// ================= SMENALAR =================
pages.shifts = async () => {
  const shifts = await api('/manage/shifts');
  layout('shifts', `<h2 class="page">Smenalar</h2>
    <table class="tbl"><tr><th>Kassir</th><th>Ochildi</th><th>Yopildi</th><th>Boshlang'ich</th><th>Sotuv</th><th>Kutilgan</th><th>Sanalgan</th><th>Farq</th><th>Sabab</th></tr>
    ${shifts.map(s => `<tr><td>${esc(s.user_name || '')}</td><td>${dstr(s.opened_at)}</td><td>${s.closed_at ? dstr(s.closed_at) : '<span class="pill g">ochiq</span>'}</td>
      <td>${fmt(s.opening_cash)}</td><td>${fmt(s.sales_sum)} (${s.sales_cnt})</td>
      <td>${s.expected_cash == null ? '—' : fmt(s.expected_cash)}</td><td>${s.counted_cash == null ? '—' : fmt(s.counted_cash)}</td>
      <td>${s.diff_uzs == null ? '—' : `<b style="color:${s.diff_uzs === 0 ? 'var(--ok)' : 'var(--danger)'}">${fmt(s.diff_uzs)}</b>`}</td>
      <td>${esc(s.diff_note || '')}</td></tr>`).join('')}</table>`);
};

// ================= MIJOZLAR =================
pages.customers = async () => {
  const customers = await api('/manage/customers');
  layout('customers', `<h2 class="page">Mijozlar</h2>
    <table class="tbl"><tr><th>Ism</th><th>Telegram</th><th>Telefon</th><th>Buyurtmalar</th><th>Jami sarflagan</th><th>Ro'yxatdan</th></tr>
    ${customers.map(c => `<tr><td>${esc(c.name || '—')}</td><td>${esc(c.username ? '@' + c.username : c.tg_id)}</td>
      <td>${esc(c.phone || '—')}</td><td>${c.orders_cnt}</td><td>${fmt(c.total_spent)}</td><td>${dstr(c.created_at)}</td></tr>`).join('')}</table>`);
};

// ================= HISOBOTLAR =================
pages.reports = async () => {
  layout('reports', `<h2 class="page">Hisobotlar</h2>
    <div class="cards">
      <div class="card"><div class="l">Kunlik PDF (kecha)</div><div class="v"><a class="btn sm" href="/api/manage/report/daily" target="_blank">⬇ Yuklab olish</a></div></div>
      <div class="card"><div class="l">Savdo CSV (davr)</div>
        <input type="date" id="r-from" style="margin-bottom:6px"><input type="date" id="r-to" style="margin-bottom:6px">
        <br><a class="btn sm ghost" id="r-csv" href="/api/manage/export/sales.csv" target="_blank">⬇ CSV</a></div>
    </div>
    <div class="muted">Kunlik PDF hisobot har kuni sozlangan vaqtda (Sozlamalar > Hisobot vaqti) avtomatik yaratilib, admin emailiga va Telegram admin chatiga yuboriladi.</div>`);
  const upd = () => { const f = $('#r-from').value, t = $('#r-to').value; $('#r-csv').href = `/api/manage/export/sales.csv${f ? '?from=' + f + (t ? '&to=' + t : '') : ''}`; };
  $('#r-from').onchange = upd; $('#r-to').onchange = upd;
};

// ================= SOZLAMALAR =================
pages.settings = async () => {
  const s = await api('/manage/settings');
  const F = (k, l, type = 'text') => `<div><label>${l}</label><input id="f-${k}" type="${type}" value="${esc(s[k] ?? '')}"></div>`;
  const C = (k, l) => `<div><label>&nbsp;</label><div style="display:flex;gap:6px;align-items:center"><input type="checkbox" id="f-${k}" ${s[k] ? 'checked' : ''} style="width:auto"><span>${l}</span></div></div>`;
  layout('settings', `<h2 class="page">Sozlamalar</h2>
    <div class="grid2">
      <div class="card">
        <h3>Do'kon</h3>
        ${F('shop_name', "Do'kon nomi")}${F('shop_phone', 'Telefon')}${F('shop_address', 'Manzil')}${F('usd_rate', 'USD kursi (0 = korsatilmasin)', 'number')}
      </div>
      <div class="card"><h3>To'lov usullari (yoqish/o'chirish)</h3>
        <div class="row2">${C('pay_cash', 'Naqd')}${C('pay_card', 'Plastik karta')}${C('pay_click', 'Click')}${C('pay_payme', 'Payme')}${C('pay_transfer', "O'tkazma")}${C('pay_tg', 'Telegram Payments')}</div>
      </div>
      <div class="card"><h3>Chek va chegirma</h3>
        ${F('receipt_header', 'Chek sarlavhasi')}${F('receipt_footer', 'Chek pastki matni')}${F('discount_max_percent', 'Maks chegirma %', 'number')}${F('discount_max_uzs', 'Maks chegirma (so\'m, 0=o\'chiq)', 'number')}
      </div>
      <div class="card"><h3>Ish vaqti va hisobot (Asia/Tashkent)</h3>
        ${F('work_open', 'Ochilish')}${F('work_close', 'Yopilish')}${F('report_hour', 'Kunlik hisobot vaqti (soat, 0-23)', 'number')}${F('report_email', 'Hisobot email')}${F('admin_chat_id', 'Admin Telegram chat ID')}${F('group_chat_id', 'Kassa guruh chat ID')}
        <div>${C('warehouse_sees_cost', 'Ombor tannarxni ko\'rsin')}</div>
      </div>
    </div>
    <br><button class="btn" id="save-set">Saqlash</button>
    <div class="muted" style="margin-top:10px">Printer sozlamasi: print-agent printerni o'zi boshqaradi (Windows yoki tarmoq). Sozlash uchun print-agent/.env fayliga qarang.</div>`);
  $('#save-set').onclick = async () => {
    const body = {};
    ['shop_name', 'shop_phone', 'shop_address', 'usd_rate', 'receipt_header', 'receipt_footer', 'discount_max_percent', 'discount_max_uzs',
     'work_open', 'work_close', 'report_hour', 'report_email', 'admin_chat_id', 'group_chat_id'].forEach(k => body[k] = $('#f-' + k).value);
    ['pay_cash', 'pay_card', 'pay_click', 'pay_payme', 'pay_transfer', 'pay_tg', 'warehouse_sees_cost'].forEach(k => body[k] = $('#f-' + k).checked);
    await api('/manage/settings', 'PUT', body);
    toast('Saqlandi');
  };
};

// ================= AUDIT =================
pages.audit = async () => {
  const logs = await api('/manage/audit');
  layout('audit', `<h2 class="page">Audit log</h2>
    <table class="tbl"><tr><th>Vaqt</th><th>Kim</th><th>Amal</th><th>Obyekt</th><th>ID</th><th>Eski</th><th>Yangi</th></tr>
    ${logs.map(l => `<tr><td>${dstr(l.created_at)}</td><td>${esc(l.user_name || '—')}</td><td><span class="pill b">${esc(l.action)}</span></td>
      <td>${esc(l.entity)}</td><td>${l.entity_id ?? ''}</td>
      <td class="muted" style="max-width:220px;overflow:hidden;text-overflow:ellipsis">${esc(l.old_data || '')}</td>
      <td class="muted" style="max-width:220px;overflow:hidden;text-overflow:ellipsis">${esc(l.new_data || '')}</td></tr>`).join('')}</table>`);
};

render();
})();
