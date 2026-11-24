import { getLang } from '../core/i18n.js';

/* Надписи карточки «Ритуал нежности»; сами ритуалы — с сервера (поле tender программы). */
export const TT = {
  ru: { how: 'Как сделать', say: 'Что сказать', levels: ['Минимум', '100%', 'Максимум'], done: 'Получилось', doneOk: 'Получилось ✓', doneToast: 'Записано. Тепла вам!' },
  ua: { how: 'Як зробити', say: 'Що сказати', levels: ['Мінімум', '100%', 'Максимум'], done: 'Вийшло', doneOk: 'Вийшло ✓', doneToast: 'Записано. Тепла вам!' },
  en: { how: 'How to do it', say: 'What to say', levels: ['Minimum', '100%', 'Maximum'], done: 'Done', doneOk: 'Done ✓', doneToast: 'Noted. Enjoy the warmth!' },
};

/** Надпись на языке приложения. */
export function tt(key) {
  const pack = TT[getLang()] || TT.ru;
  return pack[key] ?? TT.ru[key] ?? key;
}
