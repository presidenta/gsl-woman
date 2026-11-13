import { read, write } from '../core/store.js';

/* ОТМЕТКИ ПРИВЫЧЕК ДНЯ — Кегель и шаги (владелец 13.11.2026, сборка 42; ТЗ — docs/TZ-para-semya.md, раздел 8).
   По дате, как стакан воды (water/water-log.js) и утренняя минута (journal/morning-log.js); синхронизируются
   (sync/ → виды kegel и steps). Значение — объект: синхронизация принимает объект, а не число.

     kegel[iso] = { level: 'min' | 'full' | 'max' } — лучший уровень за день;
     steps[iso] = { n: 8400 }                        — сколько шагов человек отметил.

   Очки и рейтинги (отложены владельцем) потом посчитаются прямо из этих отметок. */

const KEEP = 400;
export const KEGEL_KEY = 'kegel';
export const STEPS_KEY = 'steps';

export const LEVELS = ['min', 'full', 'max'];

/** Шаги по уровням: Минимум 3000, 100% — 6000, Максимум — 12 000 и больше. */
export const STEP_LEVELS = { min: 3000, full: 6000, max: 12000 };
export const MAX_STEPS = 60000;

function log(key) {
  const v = read(key, {});
  return v && typeof v === 'object' ? v : {};
}

function save(key, next) {
  const keys = Object.keys(next).sort();
  for (const k of keys.slice(0, Math.max(0, keys.length - KEEP))) delete next[k];
  write(key, next);
}

/* — Кегель — */

export const kegelLevel = (iso) => (LEVELS.includes(log(KEGEL_KEY)[iso]?.level) ? log(KEGEL_KEY)[iso].level : null);
export const kegelDone = (iso) => kegelLevel(iso) !== null;

/** Отметить уровень дня: остаётся лучший из сделанных. */
export function markKegel(iso, level) {
  if (!LEVELS.includes(level)) return;
  const now = kegelLevel(iso);
  if (now && LEVELS.indexOf(now) >= LEVELS.indexOf(level)) return;
  save(KEGEL_KEY, { ...log(KEGEL_KEY), [iso]: { level } });
}

export function clearKegel(iso) {
  const next = { ...log(KEGEL_KEY) };
  delete next[iso];
  save(KEGEL_KEY, next);
}

/* — Шаги — */

export function stepsOf(iso) {
  const n = Number(log(STEPS_KEY)[iso]?.n);
  return Number.isFinite(n) && n > 0 ? Math.min(MAX_STEPS, Math.round(n)) : 0;
}

/** Уровень по числу шагов: null — меньше минимума. */
export function stepsLevel(n) {
  if (n >= STEP_LEVELS.max) return 'max';
  if (n >= STEP_LEVELS.full) return 'full';
  if (n >= STEP_LEVELS.min) return 'min';
  return null;
}

export const stepsDone = (iso) => stepsLevel(stepsOf(iso)) !== null;

/** Записать шаги дня (0 — стереть отметку). */
export function setSteps(iso, n) {
  const value = Math.max(0, Math.min(MAX_STEPS, Math.round(Number(n) || 0)));
  const next = { ...log(STEPS_KEY) };
  if (value) next[iso] = { n: value };
  else delete next[iso];
  save(STEPS_KEY, next);
}
