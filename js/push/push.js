import { read, write } from '../core/store.js';
import { request, current } from '../account/session.js';
import { state as permissionState } from '../reminders/permission.js';

/* УВЕДОМЛЕНИЯ О НОВЫХ СООБЩЕНИЯХ — ДАЖЕ КОГДА ПРИЛОЖЕНИЕ ЗАКРЫТО (владелец 17.11.2026: «это важнее»).

   Человек разрешил уведомления (настройки → «Уведомления») — телефон подписывается на пуши сервера, и новое
   сообщение пары или семьи приходит сразу (сервер: circles/notify.js). Показывает его работник (sw.js, событие
   push), нажатие открывает «Мы».

   Телефон не грузит: никакого опроса в фоне — пуш приходит от службы телефона (Google, Apple) только когда
   сообщение есть. Подписка одна на телефон; сервер помнит, что она от GSL (звонки «Кванта» сюда не приходят).
   - Android, компьютер — в браузере и с экрана «Домой».
   - iPhone — только для GSL, поставленного на экран «Домой» (iOS 16.4+).
   - В APK (Android-приложение) пушей из браузера нет — сообщения видны при открытии, как раньше.

   ensure() зовётся при каждом запуске и после разрешения: подписки нет — сделать; есть — напомнить серверу, чья
   она (вошёл другой человек). Ошибки молчат: уведомления — удобство, работа приложения от них не зависит. */

const KEY = 'push-gsl';

function urlB64ToBytes(b64) {
  const pad = '='.repeat((4 - (b64.length % 4)) % 4);
  const raw = atob((b64 + pad).replace(/-/g, '+').replace(/_/g, '/'));
  return Uint8Array.from(raw, (c) => c.charCodeAt(0));
}

export const supported = () => 'serviceWorker' in navigator && 'PushManager' in globalThis && !globalThis.Capacitor?.isNativePlatform?.();

let running = null;

export function ensure() {
  if (running) return running;
  running = (async () => {
    const session = current();
    if (!session?.token || !supported() || permissionState() !== 'granted') return false;
    const reg = await navigator.serviceWorker.ready;
    let sub = await reg.pushManager.getSubscription();
    if (!sub) {
      const { publicKey } = await request('/api/push/key');
      sub = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: urlB64ToBytes(publicKey) });
    }
    const json = sub.toJSON();
    const mark = `${session.userId || session.token.slice(-8)}|${json.endpoint}`;
    if (read(KEY, '') === mark) return true;
    await request('/api/push/subscribe', { body: { endpoint: json.endpoint, keys: json.keys, app: 'gsl' } });
    write(KEY, mark);
    return true;
  })().catch(() => false).finally(() => { running = null; });
  return running;
}
