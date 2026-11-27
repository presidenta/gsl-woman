/* Тексты по МЕСТАМ матрицы (сборка 229): у каждого места — своя папка-ячейка, в ней файл на язык (ru / ua / en,
   ключи одинаковы). Новое место = новая папка + одна строка в PLACES. Подробно — README.md рядом. */
import { pick } from '../../lang.js';
import tailRu from './tail/ru.js';
import tailUa from './tail/ua.js';
import tailEn from './tail/en.js';
import workRu from './work/ru.js';
import workUa from './work/ua.js';
import workEn from './work/en.js';

export const PLACES = {
  tail: { ru: tailRu, ua: tailUa, en: tailEn }, // кармический хвост: Г2 · Г1 · Г
  work: { ru: workRu, ua: workUa, en: workEn }, // работа: третья сверху, Б2
};
/** Тексты места на языке приложения: PL('tail').text[n]. */
export const PL = (place) => pick(PLACES[place]);
