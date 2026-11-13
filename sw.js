/* РАБОТНИК: приложение целиком в кэше — открывается без интернета; уведомления открывают нужный экран.

   Номер сборки — в version.js, список файлов — в files.js (его пишет `npm run files`, руками не править).
   Браузер сверяет sw.js и подключённые им файлы при каждом открытии, поэтому новый номер в version.js
   и есть сигнал «вышла новая версия».

   Адрес presidenta.github.io общий с «Кванта» и спортом, и хранилище кэшей у всех одно: чистим ТОЛЬКО
   свои запасы — с приставкой gsl-woman- (та же, что CACHE_PREFIX в js/config.js; работник не модуль и
   импортировать её не может). */

importScripts('./version.js', './files.js');

const PREFIX = 'gsl-woman-';
const CACHE = PREFIX + self.GSL_VERSION;

/* Файлы кладём по одному, а не addAll: один недоехавший файл не отменяет всю установку — он докачается
   при первом запросе. cache: 'reload' — мимо HTTP-кэша браузера, иначе новая версия могла бы сложить
   себе вчерашние файлы. */
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE).then((cache) =>
      Promise.allSettled(self.GSL_FILES.map((url) => cache.add(new Request(url, { cache: 'reload' })))),
    ),
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k.startsWith(PREFIX) && k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

/* Сначала кэш, потом сеть. Все файлы одной версии лежат вместе, и страница никогда не смешивает новый
   index.html со старыми модулями. Обновление приходит целиком — через новую версию работника. */
self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== location.origin || !url.href.startsWith(self.registration.scope)) return;
  // «Обновить» спрашивает номер версии у сайта напрямую (core/updates.js) — мимо кэша и в кэш не кладём
  if (url.searchParams.has('fresh')) return;

  event.respondWith((async () => {
    const cache = await caches.open(CACHE);
    if (req.mode === 'navigate') {
      return (await cache.match('./index.html')) || (await cache.match('./')) || fetch(req);
    }
    const hit = await cache.match(req);
    if (hit) return hit;
    const res = await fetch(req);
    if (res.ok) cache.put(req, res.clone());
    return res;
  })());
});

/* Нажатие на уведомление: есть открытое окно приложения — переводим его на нужный экран, нет — открываем. */
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const target = event.notification.data?.target || '#/today';
  const url = new URL(target, self.registration.scope).href;
  event.waitUntil((async () => {
    const windows = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
    const own = windows.find((w) => w.url.startsWith(self.registration.scope));
    if (own) {
      await own.focus();
      return own.navigate(url).catch(() => {});
    }
    return self.clients.openWindow(url);
  })());
});
