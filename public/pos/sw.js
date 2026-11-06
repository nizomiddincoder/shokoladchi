// POS service worker: statik fayllarni keshlaydi (kassirning login ekrani oflaynda ham ochiladi)
const CACHE = 'pos-static-v1';
const ASSETS = ['/pos/', '/pos/index.html', '/pos/style.css', '/pos/app.js', '/pos/manifest.json'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(ASSETS)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
// API so'rovlarini keshlamaymiz (sotuvlar serverga real vaqtda borishi kerak),
// faqat oflaynda tarmoq xatosini qaytaramiz — outbox app.js tomonda boshqariladi.
self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);
  if (e.request.method === 'GET' && url.pathname.startsWith('/pos/')) {
    e.respondWith(caches.match(e.request).then(r => r || fetch(e.request)));
  }
});
