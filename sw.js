const CACHE = 'texas-cash-v9';
const FILES = ['./', './index.html', './manifest.json', './icon-192.png', './icon-512.png', './apple-touch-icon.png', './ocr.js', './vendor/tesseract.min.js', './vendor/worker.min.js', './vendor/tesseract-core-simd-lstm.wasm.js', './vendor/tesseract-core-lstm.wasm.js', './vendor/eng.traineddata.gz', './img/austin_0.jpg', './img/austin_3.jpg', './img/bastrop_0.jpg', './img/bastrop_2.jpg', './img/bbq.jpg', './img/bbq_0.jpg', './img/bbq_1.jpg', './img/bbq_3.jpg', './img/bluebonnet_0.jpg', './img/boots_0.jpg', './img/galv-beach_0.jpg', './img/galv-moody_0.jpg', './img/galv-pier_0.jpg', './img/galv-strand_0.jpg', './img/heb_1.jpg', './img/honky_1.jpg', './img/houston-bayou_0.jpg', './img/houston-bayou_1.jpg', './img/houston-night_1.jpg', './img/houston-night_2.jpg', './img/houston-night_3.jpg', './img/houston.jpg', './img/iah_2.jpg', './img/ladybird_0.jpg', './img/lostpines_0.jpg', './img/nasa-saturn_0.jpg', './img/nasa-shuttle_1.jpg', './img/rockets_1.jpg', './img/sunset-texas_0.jpg', './img/sunset-texas_1.jpg', './img/texas-flag_0.jpg', './img/texas.jpg', './img/toyota_1.jpg', './img/toyota_3.jpg', './img/xmas-houston_0.jpg'];
self.addEventListener('install', e => { e.waitUntil(caches.open(CACHE).then(c => c.addAll(FILES)).then(() => self.skipWaiting())); });
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', e => {
  const u = new URL(e.request.url);
  if (e.request.method !== 'GET' || u.origin !== location.origin) return;
  e.respondWith(
    fetch(e.request).then(r => { const copy = r.clone(); caches.open(CACHE).then(c => c.put(e.request, copy)); return r; })
      .catch(() => caches.match(e.request, { ignoreSearch: true }).then(r => r || caches.match('./index.html')))
  );
});
