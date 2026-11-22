import { getLang } from '../core/i18n.js';

/* Надписи «Секретных материалов»; главы, задания и строчки-интриги — с сервера (поле secret программы).
   Глава — словом, как в книге: «Глава первая» (владелец 22.11.2026: «це ж книжка — глава перша, а не розділ»). */
export const ST = {
  ru: {
    nums: ['первая', 'вторая', 'третья', 'четвёртая', 'пятая', 'шестая', 'седьмая'],
    chapter: 'Глава {w}', of: 'Глава {w} из семи', deeper: 'Читать глубже',
    tasks: 'Тебе — задания главы', pair: 'Паре', quote: 'Из досье', qo: '«', qc: '»',
    next: 'Следующая глава — в выходные, через {d} дн.', tomorrow: 'Следующая глава — завтра', last: 'Это последняя глава. Всё досье — в «Тайном архиве».',
    openAll: 'Открыть всё досье', closed: 'откроется через {d} дн.', closedTomorrow: 'откроется завтра',
    lead: 'Досье «{book}»: первая глава — сразу, дальше — по главе каждые выходные. Не терпится — всё досье ниже, в «Тайном архиве».', notYet: 'Первая глава — скоро.',
  },
  ua: {
    nums: ['перша', 'друга', 'третя', 'четверта', 'п’ята', 'шоста', 'сьома'],
    chapter: 'Глава {w}', of: 'Глава {w} із семи', deeper: 'Читати глибше',
    tasks: 'Тобі — завдання глави', pair: 'Парі', quote: 'Із досьє', qo: '«', qc: '»',
    next: 'Наступна глава — у вихідні, через {d} дн.', tomorrow: 'Наступна глава — завтра', last: 'Це остання глава. Усе досьє — у «Таємному архіві».',
    openAll: 'Відкрити все досьє', closed: 'відкриється через {d} дн.', closedTomorrow: 'відкриється завтра',
    lead: 'Досьє «{book}»: перша глава — одразу, далі — по главі щовихідних. Не терпиться — усе досьє нижче, у «Таємному архіві».', notYet: 'Перша глава — скоро.',
  },
  en: {
    nums: ['One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven'],
    chapter: 'Chapter {w}', of: 'Chapter {w} of seven', deeper: 'Read deeper',
    tasks: 'Your tasks for this chapter', pair: 'For the couple', quote: 'From the file', qo: '“', qc: '”',
    next: 'Next chapter — at the weekend, in {d} days', tomorrow: 'Next chapter — tomorrow', last: 'This is the last chapter. The whole file is in the “Secret archive”.',
    openAll: 'Open the whole file', closed: 'opens in {d} days', closedTomorrow: 'opens tomorrow',
    lead: 'The file “{book}”: the first chapter right away, then one chapter every weekend. Can’t wait? The whole file is below, in the “Secret archive”.', notYet: 'The first chapter — soon.',
  },
};

const pack = () => ST[getLang()] || ST.ru;

/** Надпись на языке приложения; vars — подстановки {d}, {book}; {w} — номер главы словом (n — 1…7). */
export function st(key, vars = {}) {
  const p = pack();
  const all = { ...vars, ...(vars.n ? { w: p.nums[vars.n - 1] } : {}) };
  return String(p[key] ?? key).replace(/\{(\w+)\}/g, (_, k) => all[k] ?? '');
}
