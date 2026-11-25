import { subscribe } from '../core/store.js';
import { request, current } from '../account/session.js';
import * as push from '../push/push.js';
import { buildPlan, noticeTitle } from './plan.js';

/* НАПОМИНАНИЯ С СЕРВЕРА — и при закрытом приложении, и на iPhone (владелец 25.11.2026: «на айфоны напоминания не
   приходят — сделай, чтобы работали как будильники, со звуком»).

   Закрытый сайт сам будить телефон не умеет: на iPhone приложение, убранное с экрана, система останавливает за
   минуту, и local.js молчал. Принести напоминание туда может только пуш. Поэтому приложение отдаёт серверу то же
   расписание (plan.js) на неделю вперёд, а в час напоминания сервер присылает пуш (planner server/src/push.js,
   расписание GSL — отдельно от «Кванта», 036_push_plan_app.sql). Работник (sw.js) показывает его со звуком и
   вибрацией и держит на экране до нажатия.

   Где работает: iPhone — GSL на экране «Домой» (iOS 16.4+); Android и компьютер — в браузере и со значка. В APK для
   Android напоминания ставит будильник самого телефона (native/), сюда он не ходит.
   Шлём только изменившееся расписание: после правки (через 3 секунды), при возвращении в приложение и при запуске.
   Неделя вперёд — чтобы напоминания шли, даже если человек несколько дней приложение не открывает. */

const DAYS = 7;
const MAX = 200;
const clip = (s, n) => (s.length > n ? `${s.slice(0, n - 1)}…` : s);

/** Расписание для сервера: { key, at, title, body, target } — с красной меткой в заголовке. */
export function serverItems(ctx, now = new Date()) {
  if (!ctx?.settings) return [];
  return buildPlan({ ...ctx, now, since: now, days: DAYS }).slice(0, MAX).map((it) => ({
    key: it.key.slice(0, 120),
    at: it.at,
    title: clip(noticeTitle(it.title), 120),
    body: clip(it.body || '', 400),
    target: it.target,
  }));
}

let last = '';
let live = false;
let timer = null;
let context = null;

/** Сервер принял расписание: напоминания придут пушем — local.js системные уведомления сам уже не показывает. */
export const active = () => live;

/** Отдать серверу свежее расписание. Нет входа, разрешения или пушей на сервере — молча ничего. */
export async function send(ctx) {
  const session = current();
  if (!session?.token || !(await push.ensure())) {
    live = false;
    return false;
  }
  const items = serverItems(ctx);
  const snap = `${session.userId || session.token.slice(-8)}|${JSON.stringify(items)}`;
  if (snap === last) return live;
  try {
    await request('/api/push/plan', { body: { app: 'gsl', items } });
    last = snap;
    live = true;
  } catch {
    live = false;
  }
  return live;
}

/** Отправить сейчас — сразу после того, как человек разрешил уведомления (nudge.js, настройки). */
export const kick = () => (context ? send(context()) : Promise.resolve(false));

/** Забыть отправленное: следующий send пошлёт расписание заново (новая подписка, другой вход). */
export function reset() {
  last = '';
}

/** Запуск один раз из main.js. context() — свежие { settings, entries }. */
export function start(ctxFn) {
  if (!push.supported()) return;
  context = ctxFn;
  const later = () => {
    clearTimeout(timer);
    timer = setTimeout(() => send(context()).catch(() => {}), 3000);
  };
  subscribe((key) => {
    if (key === 'reminders-sent' || key === 'sync' || key === 'photo-sync' || key === 'push-gsl') return;
    later();
  });
  document.addEventListener('visibilitychange', () => document.visibilityState === 'visible' && later());
  send(context()).catch(() => {});
}
