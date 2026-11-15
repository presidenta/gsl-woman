import { getLang } from '../core/i18n.js';

/* Подписи кнопок экрана «В поиске» — остальное приходит с сервера. */
const TEXTS = {
  ru: { add: 'Отметить шаг', undo: 'Убрать отметку', done: 'Цель недели есть!', of: '{n} из {goal}', waiting: 'Раздел придёт вместе с программой — откройте приложение с интернетом.' },
  ua: { add: 'Відмітити крок', undo: 'Прибрати відмітку', done: 'Мету тижня досягнуто!', of: '{n} з {goal}', waiting: 'Розділ прийде разом із програмою — відкрийте застосунок з інтернетом.' },
  en: { add: 'Mark a step', undo: 'Remove the mark', done: 'Weekly goal reached!', of: '{n} of {goal}', waiting: 'This section arrives with the program — open the app online.' },
};

export function st(key, vars = {}) {
  const s = (TEXTS[getLang()] || TEXTS.ru)[key] ?? TEXTS.ru[key] ?? key;
  return s.replace(/\{(\w+)\}/g, (_, k) => String(vars[k] ?? ''));
}

export const _TEXTS = TEXTS;
