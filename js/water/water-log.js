import { read, write } from '../core/store.js';

/* СТАКАН ВЫПИТ: отметка по дате (владелец 13.11.2026: «нужна статистика, пил ли человек воду, каждый день»).
   Человек ставит её сам кнопкой «Я выпила стакан» на карточке (утренний и вечерний стакан — отдельно) — пить ли воду, приложение узнать само не может.
   Как и отметки утренней минуты (journal/morning-log.js), это привычка дня: в процент недели не входит, идёт в
   итоги «Утро» (insights/habits.js) и синхронизируется (sync/ → вид записи water). Хранятся последние 400 дат. */

const KEY = 'waterlog';
const NIGHT_KEY = 'waternight';
const KEEP = 400;

/** Отметки по дням под ключом key: isDone(iso), setDone(iso, on). */
function dayLog(key) {
  const log = () => {
    const value = read(key, {});
    return value && typeof value === 'object' ? value : {};
  };
  return {
    isDone: (iso) => log()[iso] === true,
    setDone(iso, on) {
      const next = { ...log() };
      if (on) next[iso] = true;
      else delete next[iso];
      const keys = Object.keys(next).sort();
      for (const k of keys.slice(0, Math.max(0, keys.length - KEEP))) delete next[k];
      write(key, next);
    },
  };
}

const morning = dayLog(KEY);
export const isDone = morning.isDone;
export const setDone = morning.setDone;

/** Стакан воды на ночь (сборка 43) — свой ключ waternight, синхронизируется видом waternight. */
export const night = dayLog(NIGHT_KEY);

/** Журнал стакана нужного вида. */
export const logOf = (kind) => (kind === 'night' ? night : morning);

export const KEY_NAME = KEY;
export const NIGHT_KEY_NAME = NIGHT_KEY;
