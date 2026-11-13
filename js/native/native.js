import { t } from '../core/i18n.js';
import { subscribe } from '../core/store.js';
import { isoDate, addDays, programDay, weekOf } from '../core/dates.js';
import { buildPlan } from '../reminders/plan.js';
import { dayPlan } from '../program/index.js';
import { morningFor } from '../program/morning.js';
import { ideaFor, groupIdeas } from '../love/love.js';
import { getLang } from '../core/i18n.js';

/* РОДНАЯ ЧАСТЬ В ПРИЛОЖЕНИИ ДЛЯ ANDROID (владелец 13.11.2026: напоминания при закрытом приложении, будильник
   как в «Кванте», виджет на экран). Работает только внутри APK GSL Woman+: там Capacitor кладёт мост
   window.Capacitor.Plugins.GslNative (android-app/plugin/). В браузере всё это молчит, а настройки предлагают
   скачать приложение.

   Что делаем, пока приложение открыто (и после каждой правки — через 3 секунды):
   - schedule: напоминания на неделю вперёд из того же расписания, что и в браузере (reminders/plan.js). Каждое —
     обычным уведомлением или будильником на весь экран (настройки → «Виджет и будильник», settings.alarms).
     Android хранит их сам и будит телефон и при закрытом приложении, и после перезагрузки;
   - setWidget: виджету — данные на неделю вперёд; новый день он берёт сам, по дате.
   Пока приложение открыто, «внутренние» напоминания (reminders/local.js) молчат — чтобы не было двойных. */

export const APK_URL = 'https://presidenta.github.io/quantum-diary/app/gsl-woman.apk';
/* Тот же файл с другого адреса — для кнопки внутри приложения: окно приложения скачивать файлы не умеет, а ссылку
   на чужой адрес (github.com) приложение отдаёт обычному браузеру телефона — он и скачает (владелец 13.11.2026:
   «не работает кнопка Скачать для Android»). */
export const APK_URL_EXTERNAL = 'https://github.com/presidenta/quantum-diary/raw/main/app/gsl-woman.apk';
const DAYS = 7;

const plugin = () => globalThis.Capacitor?.Plugins?.GslNative || null;

/** Открыто внутри приложения GSL Woman+ для Android. */
export const isApp = () => !!(globalThis.Capacitor?.isNativePlatform?.() && plugin());

/** Открыто в приложении для Android прежней версии — без родной части (виджета, будильника): нужно обновить. */
export const isOldApp = () => !!(globalThis.Capacitor?.isNativePlatform?.() && !plugin());

/** Вызов родной части; нет её или отказ — null (веб-часть от этого не падает). */
export async function call(name, args = {}) {
  const p = plugin();
  if (!p || typeof p[name] !== 'function') return null;
  try {
    return await p[name](args);
  } catch {
    return null;
  }
}

/** Напоминания на неделю: { key, at (мс), title, body, loud }. */
export function nativeItems({ settings, entries }, now = new Date()) {
  if (!settings?.startDate) return [];
  const alarms = settings.alarms || {};
  return buildPlan({ settings, entries, now, since: now, days: DAYS }).map((it) => {
    const slot = it.key.split(':').pop();
    return { key: it.key, at: new Date(it.at).getTime(), title: it.title, body: it.body, loud: !!alarms[slot] };
  });
}

/** Виджет на неделю: по дню — подпись, заголовок и строки. */
export function widgetDays({ settings }, now = new Date()) {
  if (!settings?.startDate) return [];
  const lang = getLang();
  const out = [];
  for (let i = 0; i < DAYS; i++) {
    const date = addDays(isoDate(now), i);
    const day = programDay(settings.startDate, date);
    const plan = dayPlan(day, lang);
    if (!plan) continue;
    const title = plan.kind === 'task' ? `«${plan.task.title}»` : t(`kinds.${plan.kind}`);
    const m = morningFor(day);
    const minute = m.addon ? `${t('morning.heels.title')} ${t(`morning.addon.${m.addon}.title`)}` : t('morning.heels.title');
    const lines = [`☀ ${minute}`];
    const him = ideaFor('him', day, lang);
    if (him) lines.push(`♡ ${him.text}`);
    for (const group of ['children', 'family']) {
      for (const k of groupIdeas(group, day, lang).slice(0, 2)) {
        lines.push(`• ${k.person.name || t(group === 'children' ? 'love.childN' : 'love.familyN', { n: k.index + 1 })}: ${k.text}`);
      }
    }
    out.push({ date, eyebrow: `${t('today.dayOf', { day })} · ${t('today.week', { n: weekOf(day) })}`, title, lines });
  }
  return out;
}

let timer = null;

/** Передать родной части свежее расписание и виджет. */
export async function push(ctx) {
  if (!isApp()) return;
  await call('labels', {
    open: t('native.open'), done: t('native.done'),
    channelRemind: t('native.channelRemind'), channelAlarm: t('native.channelAlarm'),
    widgetEmptyTitle: 'GSL Woman+', widgetEmpty: t('native.widgetEmpty'),
  });
  await call('schedule', { items: nativeItems(ctx) });
  await call('setWidget', { days: widgetDays(ctx) });
}

/** Запуск один раз из main.js: сразу, после каждой правки (через 3 секунды) и при возвращении в приложение. */
export function start(context) {
  if (!isApp()) return;
  const later = () => {
    clearTimeout(timer);
    timer = setTimeout(() => push(context()), 3000);
  };
  subscribe((key) => {
    if (key === 'reminders-sent' || key === 'sync' || key === 'photo-sync') return;
    later();
  });
  document.addEventListener('visibilitychange', () => document.visibilityState === 'visible' && later());
  push(context());
}
