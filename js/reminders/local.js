import { read, write } from '../core/store.js';
import { buildPlan } from './plan.js';
import { isApp } from '../native/native.js';

/* ПОКАЗ НАПОМИНАНИЙ НА ТЕЛЕФОНЕ — пока приложение открыто или свёрнуто, но живо.

   Раз в 20 секунд и при каждом возвращении в приложение смотрим расписание: что подошло по времени и
   ещё не показано — показываем. На экране приложение — короткая плашка сверху; приложение свёрнуто —
   системное уведомление через работника (sw.js), нажатие на него открывает «Сегодня».

   ЧЕСТНОЕ ОГРАНИЧЕНИЕ. Закрытый сайт сам будить телефон не умеет — это могут только пуши с сервера или
   свой APK с будильниками. Расписание для пушей уже готово (plan.js); подключение — отдельный шаг,
   см. README этой папки. */

const SENT_KEY = 'reminders-sent';
const TICK_MS = 20_000;
// Напоминание, пришедшееся на время, пока телефон спал, показываем не позже чем через 30 минут
const GRACE_MS = 30 * 60 * 1000;

let timer = null;

function sentKeys() {
  const list = read(SENT_KEY, []);
  return Array.isArray(list) ? list : [];
}

function markSent(key) {
  // Хранится последняя сотня: старые ключи уже никогда не совпадут — дни программы не повторяются
  write(SENT_KEY, [...sentKeys(), key].slice(-100));
}

async function systemNotice(item) {
  if (!('Notification' in globalThis) || Notification.permission !== 'granted') return false;
  const reg = await navigator.serviceWorker?.getRegistration();
  if (!reg) return false;
  await reg.showNotification(item.title, {
    body: item.body,
    tag: item.key,
    icon: 'assets/icons/icon-192.png',
    badge: 'assets/icons/badge-96.png',
    data: { target: item.target },
  });
  return true;
}

/**
 * Запустить. context() — свежие { settings, entries } на каждый шаг;
 * inApp(item) — показать плашку, когда приложение на экране.
 */
export function start({ context, inApp }) {
  stop();
  const tick = async () => {
    // В приложении для Android напоминания ставит сам телефон (native/) — здесь молчим, чтобы не было двойных
    if (isApp()) return;
    const now = new Date();
    const items = buildPlan({ ...context(), now, since: new Date(now - GRACE_MS), days: 1 });
    const sent = new Set(sentKeys());
    for (const item of items) {
      if (new Date(item.at) > now || sent.has(item.key)) continue;
      markSent(item.key);
      if (document.visibilityState === 'visible') inApp(item);
      else await systemNotice(item).catch(() => inApp(item));
    }
  };
  timer = setInterval(tick, TICK_MS);
  document.addEventListener('visibilitychange', tick);
  tick();
  return stop;
}

export function stop() {
  if (timer) clearInterval(timer);
  timer = null;
}
