/* Тексты по МЕСТАМ матрицы (сборка 229): у каждого места — своя папка-ячейка, в ней файл на язык (ru / ua / en,
   ключи одинаковы). Новое место = новая папка + одна строка в PLACES. Подробно — README.md рядом. */
import { pick } from '../../lang.js';
import tailRu from './tail/ru.js';
import tailUa from './tail/ua.js';
import tailEn from './tail/en.js';
import workRu from './work/ru.js';
import workUa from './work/ua.js';
import workEn from './work/en.js';
import centerRu from './center/ru.js';
import centerUa from './center/ua.js';
import centerEn from './center/en.js';
import codesRu from './codes/ru.js';
import codesUa from './codes/ua.js';
import codesEn from './codes/en.js';
import topRu from './top/ru.js';
import topUa from './top/ua.js';
import topEn from './top/en.js';
import moneyRu from './money/ru.js';
import moneyUa from './money/ua.js';
import moneyEn from './money/en.js';

export const PLACES = {
  tail: { ru: tailRu, ua: tailUa, en: tailEn }, // кармический хвост: Г2 · Г1 · Г
  work: { ru: workRu, ua: workUa, en: workEn }, // работа: третья сверху, Б2
  center: { ru: centerRu, ua: centerUa, en: centerEn }, // центр Д: где черпает силы (230)
  top: { ru: topRu, ua: topUa, en: topEn }, // верх: Б и Б1 — что даётся сейчас (232)
  money: { ru: moneyRu, ua: moneyUa, en: moneyEn }, // вход в денежный канал: В2 (231)
  codes: { ru: codesRu, ua: codesUa, en: codesEn }, // полное описание аркана из PDF — для центра и выдержек (230)
};
/** Тексты места на языке приложения: PL('tail').text[n]. */
export const PL = (place) => pick(PLACES[place]);
