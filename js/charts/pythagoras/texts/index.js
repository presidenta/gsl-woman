/* Тексты Квадрата Пифагора на языке приложения (сборка 218): ru / ua / en — одинаковые ключи.
   advice-*.js — что делать каждому и как быть паре (222); подписи сравнения пары — PAIR_UI ниже. */
import ru from './ru.js';
import ua from './ua.js';
import en from './en.js';
import adviceRu from './advice-ru.js';
import adviceUa from './advice-ua.js';
import adviceEn from './advice-en.js';
import { pick } from '../../lang.js';

const PAIR_UI = {
  ru: {
    act: 'Что делать:',
    pairLead: 'Пару не складывают в одну кучу (так «111111» и «1» выглядели бы как гармония). Два квадрата — рядом, и по каждой цифре видно: кто кого дополняет, где перекос, где вы похожи и чего нет у обоих.',
    compare: 'Сравнение по цифрам',
    pairLines: 'Линии',
    pairAdvice: 'Как быть паре:',
    resource: 'Общий ресурс пары',
    resourceNote: 'Сумма цифр двоих — только общий потенциал, «погода» пары. Это дополнительный слой, а не замена двух квадратов.',
    status: { void: 'нет у обоих', comp: 'один дополняет другого', tilt: 'перекос', both: 'много у обоих', even: 'примерно поровну' },
  },
  ua: {
    act: 'Що робити:',
    pairLead: 'Пару не складають в одну купу (так «111111» і «1» виглядали б як гармонія). Два квадрати — поруч, і за кожною цифрою видно: хто кого доповнює, де перекіс, де ви схожі й чого немає в обох.',
    compare: 'Порівняння за цифрами',
    pairLines: 'Лінії',
    pairAdvice: 'Як бути парі:',
    resource: 'Спільний ресурс пари',
    resourceNote: 'Сума цифр двох — лише спільний потенціал, «погода» пари. Це додатковий шар, а не заміна двох квадратів.',
    status: { void: 'немає в обох', comp: 'один доповнює іншого', tilt: 'перекіс', both: 'багато в обох', even: 'приблизно порівну' },
  },
  en: {
    act: 'What to do:',
    pairLead: 'A couple isn’t poured into one pile (then “111111” and “1” would look like harmony). The two squares stand side by side, and for every digit you see who complements whom, where it’s lopsided, where you’re alike and what both lack.',
    compare: 'Digit by digit',
    pairLines: 'Lines',
    pairAdvice: 'As a couple:',
    resource: 'The couple’s shared resource',
    resourceNote: 'The two people’s digits added up — only the shared potential, the couple’s “weather”. An extra layer, not a replacement for the two squares.',
    status: { void: 'both lack it', comp: 'one complements the other', tilt: 'lopsided', both: 'both have plenty', even: 'about equal' },
  },
};
const join = (base, advice, lang) => ({ ...base, advice, ui: { ...base.ui, ...PAIR_UI[lang] } });

export const SETS = { ru: join(ru, adviceRu, 'ru'), ua: join(ua, adviceUa, 'ua'), en: join(en, adviceEn, 'en') };
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
