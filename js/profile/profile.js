import * as settings from '../settings/settings.js';
import { choices } from '../love/love.js';

/* ПРОФИЛЬ ОТНОШЕНИЙ (владелец 14.11.2026): у обеих частей четыре версии программы — у женщины «замужем · живём
   вместе · встречаемся · в поиске», у мужчины «жена · живём вместе · встречаемся · в поиске». Выбор — в настройках
   (settings.profile, синхронизируется). Тексты профилей — на сервере: у задания поле variants { together, dating,
   single }; основной текст — для married. Здесь — только как подставить свои слова. */

export const PROFILES = ['married', 'together', 'dating', 'single'];

export const current = () => {
  const p = settings.get().profile;
  return PROFILES.includes(p) ? p : 'married';
};

/**
 * Задание в словах профиля. Нет варианта (задание про себя: зеркало, подруга) — задание как есть.
 * Фразы: в поиске — только свои; у пары — свои первыми, следом общие (они тоже про своего человека).
 */
export function applyTask(task, profile = current()) {
  const v = profile !== 'married' ? task?.variants?.[profile] : null;
  if (!v) return task;
  const say = v.say?.length ? (profile === 'single' ? v.say : [...v.say, ...(task.say || [])]) : task.say;
  return { ...task, text: v.text || task.text, say };
}

/** Дети добавлены в «Пять языков любви» → «Мои дети». */
export const hasKids = () => choices().children.length > 0;

/* Строка для детей написана про семью под одной крышей («Открой дверь маме при детях»), поэтому видна только
   там, где мама и папа рядом, — «жена / замужем» и «живём вместе», и только когда дети добавлены. */
export const showKids = (task, profile = current()) => !!task?.kids && ['married', 'together'].includes(profile) && hasKids();

/** Подсказка по делам на день недели n: день 1 — начало, 2–5 — каждый день, 6 — итог; седьмой — отдых. */
export function bizFor(biz, n) {
  if (!biz) return null;
  if (n === 1) return biz.start || null;
  if (n >= 2 && n <= 5) return biz.daily || null;
  if (n === 6) return biz.review || null;
  return null;
}
