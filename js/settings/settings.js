import { read, write } from '../core/store.js';
import { DEFAULT_TIMES, LANGS, SLOTS } from '../config.js';
import { isValidIso, isValidTime } from '../core/dates.js';

/* НАСТРОЙКИ УЧАСТНИЦЫ: язык, имя для обращения, дата старта, время трёх напоминаний, показывать ли
   текст задания в уведомлении. Одна запись в хранилище; чтение всегда отдаёт полный набор полей —
   недостающее (старая версия, ручная правка) добивается значениями по умолчанию. */

const KEY = 'settings';

const DEFAULTS = {
  onboarded: false,
  lang: 'ua',
  name: '',
  startDate: null,
  times: { ...DEFAULT_TIMES },
  // Экран блокировки видят чужие: по умолчанию в уведомлении нейтральная фраза, без текста задания
  showTaskInNotice: false,
  // В приложении для Android: какое напоминание звонит будильником на весь экран (native/, 13.11.2026)
  alarms: { morning: true, noon: false, evening: false },
  // Что человек кладёт в утренний стакан тёплой воды (js/water/, 13.11.2026)
  water: [],
};

export function get() {
  const saved = read(KEY, {}) || {};
  const times = { ...DEFAULT_TIMES };
  for (const slot of SLOTS) if (isValidTime(saved.times?.[slot])) times[slot] = saved.times[slot];
  return {
    ...DEFAULTS,
    ...saved,
    lang: LANGS.includes(saved.lang) ? saved.lang : DEFAULTS.lang,
    startDate: isValidIso(saved.startDate) ? saved.startDate : null,
    name: typeof saved.name === 'string' ? saved.name.slice(0, 40) : '',
    times,
    alarms: { ...DEFAULTS.alarms, ...(saved.alarms && typeof saved.alarms === 'object' ? saved.alarms : {}) },
    water: Array.isArray(saved.water) ? saved.water.filter((x) => typeof x === 'string').slice(0, 12) : [],
  };
}

export function update(patch) {
  const next = { ...get(), ...patch };
  if (patch.times) next.times = { ...get().times, ...patch.times };
  write(KEY, next);
  return next;
}

export const KEY_NAME = KEY;
