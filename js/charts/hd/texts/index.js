/* Тексты Human Design на языке приложения (сборка 218): ru / ua / en — одинаковые ключи. */
import ru from './ru.js';
import ua from './ua.js';
import en from './en.js';
import { pick } from '../../lang.js';

export const SETS = { ru, ua, en };
/** Тексты текущего языка. */
export const TX = () => pick(SETS);
/** Полное имя креста: «Правый угловой крест Сфинкса» / «Right Angle Cross of the Sphinx»; null — нет ключа. */
export function crossName(T, key, angle) {
  const name = key && T.crossNames[angle]?.[key];
  return name ? `${T.crossPrefix[angle]} ${name}` : null;
}
