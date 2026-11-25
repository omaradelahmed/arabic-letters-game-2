/* وين الحرف؟ — Service Worker
 * كل حاجة محلية: بعد أول زيارة اللعبة تشتغل بدون إنترنت.
 * لو نشرت نسخة جديدة، غيّر رقم CACHE_VERSION.
 */

const CACHE_VERSION = 'hurouf2-v5';

const APP_SHELL = [
  './',
  './index.html',
  './styles.css',
  './game.js',
  './manifest.webmanifest',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/icon-maskable-512.png',
  './icons/apple-touch-icon.png',
  './icons/favicon-32.png',
];

// بنجيب كل ملف من الشبكة متجاهلين كاش المتصفح، عشان النسخة الجديدة
// متخزّنش ملفات قديمة (GitHub Pages بيدي الملفات كاش 10 دقايق).
async function precache() {
  const cache = await caches.open(CACHE_VERSION);
  await Promise.all(
    APP_SHELL.map(async (url) => {
      try {
        let response;
        try {
          response = await fetch(url, { cache: 'reload' });
        } catch {
          response = await fetch(url);
        }
        if (response && response.ok) await cache.put(url, response);
      } catch {
        /* ملف واحد فشل: نحاول تاني وقت الاستخدام، والباقي يفضل متخزّن */
      }
    })
  );
}

self.addEventListener('install', (event) => {
  event.waitUntil(precache().then(() => self.skipWaiting()));
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(keys.filter((key) => key !== CACHE_VERSION).map((key) => caches.delete(key)))
      )
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const request = event.request;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  // صفحات التنقل: جوه اللعبة نفسها بس (الجذر أو index.html).
  // أي ملف تاني (زي qr/hurouf-qr.png أو ملف PDF) يروح للشبكة عادي.
  if (request.mode === 'navigate') {
    const isAppPage = url.pathname.endsWith('/') || url.pathname.endsWith('/index.html');
    if (!isAppPage) return;

    event.respondWith(
      (async () => {
        const cached = await caches.match('./index.html');
        if (cached) return cached;
        try {
          return await fetch(request);
        } catch {
          return new Response('اللعبة مش محمّلة على الجهاز. افتحها مرة واحدة والنت شغّال.', {
            status: 504,
            headers: { 'Content-Type': 'text/plain; charset=utf-8' },
          });
        }
      })()
    );
    return;
  }

  event.respondWith(
    (async () => {
      const cached = await caches.match(request);
      if (cached) return cached;
      try {
        const response = await fetch(request);
        if (response && response.ok) {
          const cache = await caches.open(CACHE_VERSION);
          cache.put(request, response.clone());
        }
        return response;
      } catch {
        return new Response('', { status: 504, statusText: 'Offline' });
      }
    })()
  );
});
