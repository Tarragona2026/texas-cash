const CACHE = 'texas-cash-v17';
const FILES = ['./', './index.html', './manifest.json', './icon-192.png', './icon-512.png', './apple-touch-icon.png', './ocr.js', './vendor/tesseract.min.js', './vendor/worker.min.js', './vendor/tesseract-core-simd-lstm.wasm.js', './vendor/tesseract-core-lstm.wasm.js', './vendor/eng.traineddata.gz', './img/bbq.jpg', './img/bluebonnet_0.jpg', './img/houston.jpg', './img/lostpines_0.jpg', './img/sunset-texas_0.jpg', './img/sunset-texas_1.jpg', './img/texas.jpg', './img/u_01-02_1.jpg', './img/u_01-02_2.jpg', './img/u_01-02_3.jpg', './img/u_01-03_1.jpg', './img/u_01-03_2.jpg', './img/u_01-03_3.jpg', './img/u_01-04_1.jpg', './img/u_01-04_2.jpg', './img/u_01-04_3.jpg', './img/u_12-22_1.jpg', './img/u_12-22_2.jpg', './img/u_12-22_3.jpg', './img/u_12-23_1.jpg', './img/u_12-23_2.jpg', './img/u_12-23_3.jpg', './img/u_12-25_1.jpg', './img/u_12-25_2.jpg', './img/u_12-25_3.jpg', './img/u_12-26_1.jpg', './img/u_12-26_2.jpg', './img/u_12-26_3.jpg', './img/u_12-27_1.jpg', './img/u_12-27_2.jpg', './img/u_12-27_3.jpg', './img/u_12-28_1.jpg', './img/u_12-28_2.jpg', './img/u_12-28_3.jpg', './img/u_12-29_1.jpg', './img/u_12-29_2.jpg', './img/u_12-29_3.jpg', './img/u_12-30_1.jpg', './img/u_12-30_2.jpg', './img/u_12-30_3.jpg', './img/u_12-31_1.jpg', './img/u_12-31_2.jpg', './img/u_12-31_3.jpg', './img/xmas-houston_0.jpg'];
self.addEventListener('install', e => { e.waitUntil(caches.open(CACHE).then(c => c.addAll(FILES)).then(() => self.skipWaiting())); });
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', e => {
  const u = new URL(e.request.url);
  if (e.request.method !== 'GET' || u.origin !== location.origin) return;
  e.respondWith(
    fetch(e.request, { cache: 'no-cache' }).then(r => { const copy = r.clone(); caches.open(CACHE).then(c => c.put(e.request, copy)); return r; })
      .catch(() => caches.match(e.request, { ignoreSearch: true }).then(r => r || caches.match('./index.html')))
  );
});
