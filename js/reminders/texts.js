import { getLang } from '../core/i18n.js';

/* Надписи красной плашки «Напоминания со звуком» на «Сегодня» и строки раздела «Уведомления» (nudge.js, settings).
   У обеих частей (женщины, мужчины) одинаковые. */
export const RT = {
  ru: {
    title: 'Напоминания со звуком',
    ask: 'Включи их — задание дня придёт в своё время, даже когда приложение закрыто.',
    askBtn: 'Включить напоминания',
    ios: 'На iPhone напоминания приходят, когда GSL открыт со значка на экране «Домой». В Safari: «Поделиться» → «На экран „Домой“», затем открой GSL со значка и включи напоминания.',
    iosBtn: 'Как поставить значок',
    on: 'Напоминания включены: приходят со звуком, даже когда приложение закрыто.',
    toast: 'Напоминания включены',
  },
  ua: {
    title: 'Нагадування зі звуком',
    ask: 'Увімкни їх — завдання дня прийде вчасно, навіть коли застосунок закритий.',
    askBtn: 'Увімкнути нагадування',
    ios: 'На iPhone нагадування приходять, коли GSL відкрито зі значка на екрані «Додому». У Safari: «Поділитися» → «На екран „Додому“», потім відкрий GSL зі значка й увімкни нагадування.',
    iosBtn: 'Як поставити значок',
    on: 'Нагадування увімкнено: приходять зі звуком, навіть коли застосунок закритий.',
    toast: 'Нагадування увімкнено',
  },
  en: {
    title: 'Reminders with sound',
    ask: 'Turn them on — the task of the day arrives on time, even when the app is closed.',
    askBtn: 'Turn on reminders',
    ios: 'On iPhone, reminders arrive when GSL is opened from its icon on the Home Screen. In Safari: “Share” → “Add to Home Screen”, then open GSL from the icon and turn on reminders.',
    iosBtn: 'How to add the icon',
    on: 'Reminders are on: they arrive with sound, even when the app is closed.',
    toast: 'Reminders are on',
  },
};

/** Надпись на языке приложения. */
export function rt(key) {
  const pack = RT[getLang()] || RT.ru;
  return pack[key] ?? RT.ru[key] ?? key;
}
