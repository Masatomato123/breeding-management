/* 繁殖巡回 PWA サービスワーカー
   アプリ本体（プログラム）だけをキャッシュしてオフライン起動を可能にする。
   繁殖データは IndexedDB にあり、ここでは扱わない（キャッシュされない）。 */
const CACHE = 'hanshoku-v1';
const ASSETS = [
  './',
  './index.html',
  './manifest.json',
  './icon-180.png',
  './icon-192.png',
  './icon-512.png',
  './icon-maskable-512.png'
];

self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE).then((c) => c.addAll(ASSETS)).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  // ナビゲーション（ページ遷移）はキャッシュのindex.htmlを優先し、オフラインでも起動できるように
  if (req.mode === 'navigate') {
    e.respondWith(
      caches.match('./index.html').then((cached) => cached || fetch(req).catch(() => caches.match('./')))
    );
    return;
  }
  // それ以外はキャッシュ優先、無ければネットワーク（取得できたら実行時キャッシュ）
  e.respondWith(
    caches.match(req).then((cached) => {
      if (cached) return cached;
      return fetch(req).then((res) => {
        if (res && res.ok && new URL(req.url).origin === self.location.origin) {
          const copy = res.clone();
          caches.open(CACHE).then((c) => c.put(req, copy));
        }
        return res;
      }).catch(() => cached);
    })
  );
});
