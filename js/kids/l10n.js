import { onLang } from '../core/i18n.js';
import { SKILL_SECTIONS, SKILLS, SKILL_STEPS, GAMES, TASK_IDEAS, LEVELS, DREAM_CATEGORIES } from './catalog.js';
import { PROFESSIONS, FAMILY_DREAM_IDEAS, KID_LETTER_PROMPTS } from './dreams-catalog.js';
import { POT_STOPS } from './dream-stops.js';
import { NORMS, POWER } from './ages.js';
import UA from './l10n-ua.js';
import EN from './l10n-en.js';

/* КАТАЛОГИ КАБІНЕТУ НА ЯЗЫКЕ ПРИЛОЖЕНИЯ (владелец 17.11.2026: «переводи остальные части на украинский и
   английский»). Каталоги (catalog.js, dreams-catalog.js, dream-stops.js, ages.js) — русские и с id; переводы —
   в l10n-ua.js и l10n-en.js по тем же id. При смене языка (core/i18n onLang) слова подставляются в те же
   записи, а для русского возвращаются запомненные русские. Экранам кабинета ничего менять не нужно: они читают
   те же каталоги. Перевода нет — остаётся русское слово. */

const TABLES = { ua: UA, en: EN };

// Русские слова — один раз, до первой подстановки
const RU = {
  sections: SKILL_SECTIONS.map((s) => ({ title: s.title, skills: s.skills.map(([, t]) => t) })),
  steps: SKILL_STEPS.map((s) => s.title),
  games: GAMES.map((g) => ({ title: g.title, players: g.players, place: g.place, grows: [...g.grows], need: g.need, rules: g.rules })),
  tasks: [...TASK_IDEAS],
  levels: LEVELS.map((l) => l.title),
  dreamCats: DREAM_CATEGORIES.map((c) => c[2]),
  stops: POT_STOPS.map((s) => s.title),
  professions: PROFESSIONS.map((p) => ({ title: p.title, steps: p.steps.map(([, t]) => t) })),
  ideas: FAMILY_DREAM_IDEAS.map((x) => x.title),
  prompts: [...KID_LETTER_PROMPTS],
  norms: Object.fromEntries(Object.entries(NORMS).map(([k, v]) => [k, v.word])),
  power: Object.fromEntries(Object.entries(POWER).map(([k, v]) => [k, [...v]])),
};

const pickList = (list, i, ru) => list?.[i] ?? ru;

/** Подставить слова языка lang в каталоги (ru — вернуть русские). */
export function applyLang(lang) {
  const T = TABLES[lang] || null;
  SKILL_SECTIONS.forEach((s, i) => {
    s.title = T?.sections?.[s.id] ?? RU.sections[i].title;
    s.skills.forEach((row, j) => {
      row[1] = T?.skills?.[row[0]] ?? RU.sections[i].skills[j];
      if (SKILLS[row[0]]) SKILLS[row[0]].title = row[1];
    });
  });
  SKILL_STEPS.forEach((s, i) => { s.title = pickList(T?.steps, i, RU.steps[i]); });
  GAMES.forEach((g, i) => {
    const tr = T?.games?.[g.id];
    const ru = RU.games[i];
    for (const k of ['title', 'players', 'place', 'need', 'rules']) g[k] = tr?.[k] ?? ru[k];
    g.grows = tr?.grows ? [...tr.grows] : [...ru.grows];
  });
  TASK_IDEAS.forEach((_, i) => { TASK_IDEAS[i] = pickList(T?.tasks, i, RU.tasks[i]); });
  LEVELS.forEach((l, i) => { l.title = pickList(T?.levels, i, RU.levels[i]); });
  DREAM_CATEGORIES.forEach((c, i) => { c[2] = T?.dreamCats?.[c[0]] ?? RU.dreamCats[i]; });
  POT_STOPS.forEach((s, i) => { s.title = pickList(T?.stops, i, RU.stops[i]); });
  PROFESSIONS.forEach((p, i) => {
    const tr = T?.professions?.[p.id];
    p.title = tr?.title ?? RU.professions[i].title;
    p.steps.forEach((row, j) => {
      if (!row[0].startsWith('skill:')) row[1] = tr?.steps?.[row[0]] ?? RU.professions[i].steps[j];
    });
  });
  FAMILY_DREAM_IDEAS.forEach((x, i) => { x.title = pickList(T?.ideas, i, RU.ideas[i]); });
  KID_LETTER_PROMPTS.forEach((_, i) => { KID_LETTER_PROMPTS[i] = pickList(T?.prompts, i, RU.prompts[i]); });
  for (const [k, v] of Object.entries(NORMS)) v.word = T?.norms?.[k] ?? RU.norms[k];
  for (const [k, list] of Object.entries(POWER)) list.forEach((_, i) => { list[i] = pickList(T?.power?.[k], i, RU.power[k][i]); });
}

/** Для проверок: русские слова каталогов. */
export const _ru = RU;

onLang(applyLang);
