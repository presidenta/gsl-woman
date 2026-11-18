/* РАБОТНИК: приложение целиком в кэше — открывается без интернета; уведомления открывают нужный экран.

   Номер сборки — в version.js, список файлов — в files.js (его пишет `npm run files`, руками не править).
   Браузер сверяет sw.js и подключённые им файлы при каждом открытии, поэтому новый номер в version.js
   и есть сигнал «вышла новая версия».

   Адрес presidenta.github.io общий с «Кванта» и спортом, и хранилище кэшей у всех одно: чистим ТОЛЬКО
   свои запасы — с приставкой gsl-woman- (та же, что CACHE_PREFIX в js/config.js; работник не модуль и
   импортировать её не может). */

/* 128: тот же работник; строка добавлена, чтобы изменился сам sw.js — браузер перепроверяет его при каждом открытии. */
importScripts('./version.js', './files.js');

const PREFIX = 'gsl-woman-';
const CACHE = PREFIX + self.GSL_VERSION;

/* Файлы кладём по одному, а не addAll: один недоехавший файл не отменяет всю установку — он докачается
   при первом запросе. cache: 'reload' — мимо HTTP-кэша браузера, иначе новая версия могла бы сложить
   себе вчерашние файлы.
   Адрес качаем с ?v=НОМЕР_СБОРКИ, а в запас кладём под обычным: раздача сайта (CDN) после выкладки ещё минуты
   отдаёт часть файлов прежними, и кэш новой версии выходил смесью старых и новых модулей — приложение не
   запускалось (18.11.2026). Адрес с номером для раздачи новый, значит, берётся с самого сайта. */
const bust = (url) => url + (url.includes('?') ? '&' : '?') + 'v=' + self.GSL_VERSION;

async function stock(cache, url) {
  const res = await fetch(new Request(bust(url), { cache: 'reload' }));
  if (!res.ok) throw new Error(`${url}: ${res.status}`);
  await cache.put(new Request(url), res);
}

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE).then((cache) =>
      Promise.allSettled(self.GSL_FILES.map((url) => stock(cache, url))),
    ),
  );
  self.skipWaiting();
});

/* Окно, в котором приложение «зависло» (модули не загрузились из испорченного кэша, кнопки не отвечают), само себя
   не обновит: страница мертва, перезагружать некому. Поэтому новый работник после установки «окликает» все окна:
   живая страница отвечает (js/core/updates.js) и перезагрузится сама, когда ей удобно; не ответила за 4 секунды —
   перезагружаем окно принудительно, уже на чистом кэше. */
const alive = new Set();
self.addEventListener('message', (event) => {
  if (event.data?.type === 'gsl-alive' && event.source?.id) alive.add(event.source.id);
});

async function reviveDead() {
  const windows = await self.clients.matchAll({ type: 'window' });
  windows.forEach((w) => w.postMessage({ type: 'gsl-ping' }));
  await new Promise((r) => setTimeout(r, 4000));
  for (const w of windows) if (!alive.has(w.id)) await w.navigate(w.url).catch(() => {});
  alive.clear();
}

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k.startsWith(PREFIX) && k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
      .then(reviveDead),
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

/* ПУШ С СЕРВЕРА — новое сообщение пары или семьи (js/push/, сервер circles/notify.js, 17.11.2026). Показываем каждый
   пуш обязательно: браузер, получивший пуш без уведомления, отзывает подписку. Нажатие — «Мы» (ниже, notificationclick). */
self.addEventListener('push', (event) => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch {
    data = { body: event.data ? event.data.text() : '' };
  }
  event.waitUntil(self.registration.showNotification(data.title || 'GSL', {
    body: data.body || '',
    tag: data.key || 'gsl-msg',
    renotify: true,
    icon: './assets/icons/icon-192.png',
    badge: './assets/icons/badge-96.png',
    data: { target: data.target || '#/us' },
  }));
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
