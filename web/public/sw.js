// Service worker de la app instalable. Estrategia simple y segura:
// - assets con hash (/assets/*): cache-first;
// - la página: network-first con copia offline;
// - la API (chat, reclamos, recorridos): nunca se cachea acá.
const VERSION = 'l126-v1';
const SHELL = ['./', './index.html', './favicon.svg', './manifest.webmanifest'];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(VERSION).then((c) => c.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== VERSION).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.pathname.includes('/api/')) return;

  const esAsset = url.origin === self.location.origin && url.pathname.includes('/assets/');
  if (esAsset) {
    e.respondWith(caches.match(req).then((hit) => hit || fetch(req).then((res) => {
      if (res.ok) { const copia = res.clone(); caches.open(VERSION).then((c) => c.put(req, copia)); }
      return res;
    })));
    return;
  }

  if (req.mode === 'navigate') {
    e.respondWith(fetch(req).then((res) => {
      const copia = res.clone();
      caches.open(VERSION).then((c) => c.put('./index.html', copia));
      return res;
    }).catch(() => caches.match('./index.html')));
  }
});
