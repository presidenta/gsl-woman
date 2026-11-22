import { getLang } from '../core/i18n.js';

/* Надписи «Секретных материалов»; главы, задания и строчки-интриги — с сервера (поле secret программы). */
export const ST = {
  ru: {
    chapter: 'Глава № {n}', of: 'Глава № {n} из 7', read: 'Читать главу', deeper: 'Читать глубже',
    tasks: 'Тебе — задания главы', pair: 'Паре', quote: 'Из досье', qo: '«', qc: '»',
    next: 'Следующая глава — в выходные, через {d} дн.', tomorrow: 'Следующая глава — завтра', last: 'Это последняя глава. Всё досье — в «Тайном архиве».',
    openAll: 'Открыть всё досье', closed: 'откроется через {d} дн.', closedTomorrow: 'откроется завтра',
    lead: 'Досье «{book}»: первая глава — сразу, дальше — по главе каждые выходные. Не терпится — всё досье ниже, в «Тайном архиве».', notYet: 'Первая глава — скоро.',
  },
  ua: {
    chapter: 'Розділ № {n}', of: 'Розділ № {n} із 7', read: 'Читати розділ', deeper: 'Читати глибше',
    tasks: 'Тобі — завдання розділу', pair: 'Парі', quote: 'Із досьє', qo: '«', qc: '»',
    next: 'Наступний розділ — у вихідні, через {d} дн.', tomorrow: 'Наступний розділ — завтра', last: 'Це останній розділ. Усе досьє — у «Таємному архіві».',
    openAll: 'Відкрити все досьє', closed: 'відкриється через {d} дн.', closedTomorrow: 'відкриється завтра',
    lead: 'Досьє «{book}»: перший розділ — одразу, далі — по розділу щовихідних. Не терпиться — усе досьє нижче, у «Таємному архіві».', notYet: 'Перший розділ — скоро.',
  },
  en: {
    chapter: 'Chapter {n}', of: 'Chapter {n} of 7', read: 'Read the chapter', deeper: 'Read deeper',
    tasks: 'Your tasks for this chapter', pair: 'For the couple', quote: 'From the file', qo: '“', qc: '”',
    next: 'Next chapter — at the weekend, in {d} days', tomorrow: 'Next chapter — tomorrow', last: 'This is the last chapter. The whole file is in the “Secret archive”.',
    openAll: 'Open the whole file', closed: 'opens in {d} days', closedTomorrow: 'opens tomorrow',
    lead: 'The file “{book}”: the first chapter right away, then one chapter every weekend. Can’t wait? The whole file is below, in the “Secret archive”.', notYet: 'The first chapter — soon.',
  },
};

/** Надпись на языке приложения; vars — подстановки {n}, {d}, {book}. */
export function st(key, vars = {}) {
  const pack = ST[getLang()] || ST.ru;
  return String(pack[key] ?? key).replace(/\{(\w+)\}/g, (_, k) => vars[k] ?? '');
}
