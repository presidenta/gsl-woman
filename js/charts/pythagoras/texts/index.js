/* Тексты Квадрата Пифагора на языке приложения (сборка 218): ru / ua / en — одинаковые ключи. */
import ru from './ru.js';
import ua from './ua.js';
import en from './en.js';
import { pick } from '../../lang.js';

export const SETS = { ru, ua, en };
/** Тексты текущего языка. */
export const TX = () => pick(SETS);
/** Номер уровня линии (0…3) по сумме: 0–2, 3–4, 5–6, 7+. */
export const lineBand = (total) => (total >= 7 ? 3 : total >= 5 ? 2 : total >= 3 ? 1 : 0);
/** Текст по числу цифр: наибольший ключ, не больше n (у 4 → «4 и больше»). */
export function countText(T, digit, n) {
  const by = T.db[digit].byCount;
  const k = Math.max(...Object.keys(by).map(Number).filter((x) => x <= n));
  return by[k];
}
