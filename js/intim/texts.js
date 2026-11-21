import { getLang } from '../core/i18n.js';

/* Надписи модуля «Интим 18⁺» (кнопки, подписи); сами тексты раздела — с сервера (поле intim программы). */
export const IT = {
  ru: {
    yes: 'Да', maybe: 'Может быть',
    matchesTitle: 'Совпадения', matchesLead: 'То, что хочется вам обоим. Видно только совпадения — остальное каждый держит при себе.',
    matchesNone: 'Пока совпадений нет — отметь свою карту, и когда партнёр отметит свою, здесь появится общее.',
    matchesSolo: 'Ты отмечаешь для себя. Когда будет пара (раздел «Мы»), здесь появятся совпадения.',
    both: 'вы оба — да', soft: 'совпало', mine: 'Отмечено: {n}',
    addPh: 'Своё желание…', add: 'Добавить своё', remove: 'Убрать', removeAsk: 'Убрать «{text}»?',
    weekendCaps: 'Интим-квест выходного', weekendOpen: 'Весь раздел', how: 'Как сделать', levels: ['Минимум', '100%', 'Максимум'],
    done: 'Сделали', doneOk: 'Сделали ✓', doneToast: 'Записано. Тепла вам!', doneOther: 'Сделали в другой день выходных ✓',
    plateLead: 'Близость пары: карта желаний, массажи, игры, задания на выходные',
    adult: 'Раздел для взрослых 18+. Всё — только по взаимному «да».',
  },
  ua: {
    yes: 'Так', maybe: 'Може бути',
    matchesTitle: 'Збіги', matchesLead: 'Те, чого хочеться вам обом. Видно лише збіги — решту кожен тримає при собі.',
    matchesNone: 'Поки збігів немає — познач свою карту, і коли партнер позначить свою, тут зʼявиться спільне.',
    matchesSolo: 'Ти позначаєш для себе. Коли буде пара (розділ «Ми»), тут зʼявляться збіги.',
    both: 'ви обоє — так', soft: 'збіглося', mine: 'Позначено: {n}',
    addPh: 'Своє бажання…', add: 'Додати своє', remove: 'Прибрати', removeAsk: 'Прибрати «{text}»?',
    weekendCaps: 'Інтим-квест вихідного', weekendOpen: 'Увесь розділ', how: 'Як зробити', levels: ['Мінімум', '100%', 'Максимум'],
    done: 'Зробили', doneOk: 'Зробили ✓', doneToast: 'Записано. Тепла вам!', doneOther: 'Зробили в інший день вихідних ✓',
    plateLead: 'Близькість пари: карта бажань, масажі, ігри, завдання на вихідні',
    adult: 'Розділ для дорослих 18+. Усе — лише за взаємним «так».',
  },
  en: {
    yes: 'Yes', maybe: 'Maybe',
    matchesTitle: 'Matches', matchesLead: 'What you both want. Only matches are visible — the rest each of you keeps to yourself.',
    matchesNone: 'No matches yet — mark your map, and when your partner marks theirs, what you share will appear here.',
    matchesSolo: 'You are marking for yourself. Once you have a pair (the “Us” section), matches will appear here.',
    both: 'you both — yes', soft: 'a match', mine: 'Marked: {n}',
    addPh: 'Your own wish…', add: 'Add your own', remove: 'Remove', removeAsk: 'Remove “{text}”?',
    weekendCaps: 'Weekend intimacy quest', weekendOpen: 'Open the section', how: 'How to do it', levels: ['Minimum', '100%', 'Maximum'],
    done: 'Done', doneOk: 'Done ✓', doneToast: 'Noted. Enjoy the warmth!', doneOther: 'Done on the other weekend day ✓',
    plateLead: 'A couple’s intimacy: desire map, massage, games, weekend tasks',
    adult: 'An adults-only section 18+. Everything only with a mutual “yes”.',
  },
};

/** Надпись на языке приложения; {n} — подстановки. */
export function it(key, vars = {}) {
  const v = (IT[getLang()] || IT.ru)[key] ?? IT.ru[key];
  return typeof v === 'string' ? v.replace(/\{(\w+)\}/g, (_, k) => String(vars[k] ?? '')) : v;
}
