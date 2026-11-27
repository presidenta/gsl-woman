/* Тексты Матрицы судьбы на языке приложения (сборка 218): ru / ua / en — одинаковые ключи. */
import ru from './ru.js';
import ua from './ua.js';
import en from './en.js';
import { pick } from '../../lang.js';

export const SETS = { ru, ua, en };
/** Тексты текущего языка. */
export const TX = () => pick(SETS);
