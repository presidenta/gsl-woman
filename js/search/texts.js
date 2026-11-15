import { getLang } from '../core/i18n.js';

/* Подписи кнопок экрана «В поиске» — остальное приходит с сервера. */
const TEXTS = {
  ru: { open: 'Весь раздел: где искать, ритм, переписка, кого выбирать', add: 'Отметить шаг', undo: 'Убрать отметку', min: 'мин {n}', full: '100% {n}', max: 'макс {n}', 'reached.min': 'Минимум недели есть!', 'reached.full': '100% недели!', 'reached.max': 'Максимум недели — вот это разгон!', waiting: 'Раздел придёт вместе с программой — откройте приложение с интернетом.' },
  ua: { open: 'Весь розділ: де шукати, ритм, листування, кого обирати', add: 'Відмітити крок', undo: 'Прибрати відмітку', min: 'мін {n}', full: '100% {n}', max: 'макс {n}', 'reached.min': 'Мінімум тижня є!', 'reached.full': '100% тижня!', 'reached.max': 'Максимум тижня — оце розгін!', waiting: 'Розділ прийде разом із програмою — відкрийте застосунок з інтернетом.' },
  en: { open: 'The whole section: where to look, rhythm, chatting, who to choose', add: 'Mark a step', undo: 'Remove the mark', min: 'min {n}', full: '100% {n}', max: 'max {n}', 'reached.min': 'Weekly minimum reached!', 'reached.full': '100% for the week!', 'reached.max': 'Weekly maximum — what a run!', waiting: 'This section arrives with the program — open the app online.' },
};

export function st(key, vars = {}) {
  const s = (TEXTS[getLang()] || TEXTS.ru)[key] ?? TEXTS.ru[key] ?? key;
  return s.replace(/\{(\w+)\}/g, (_, k) => String(vars[k] ?? ''));
}

export const _TEXTS = TEXTS;
