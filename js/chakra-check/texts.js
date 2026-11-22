import { getLang } from '../core/i18n.js';

/* Надписи теста «Чек-лист: 7 чакр в паре»; сами признаки — с сервера (gsl/energy, слово в слово из книжечки). */
export const CT = {
  ru: {
    hint: 'Отметь признаки, которые повторяются регулярно (хотя бы несколько раз в месяц). Внизу сразу появится итог.',
    total: 'Итог', empty: 'Отметь признаки — и здесь появится итог: у кого перекос и в какой чакре.',
    who: { man: 'у мужчины', woman: 'у женщины', pair: 'в паре', both: 'у обоих' },
    most: 'Больше всего перекосов — {who}: {n}', equal: 'Перекосы поровну — у мужчины и у женщины: по {n}',
    of: '{who} {n} из {all}', lean: 'перекос {who}', leanEqual: 'перекос у обоих',
    fix: 'Как выправить — «Практики балансировки чакр у мужчины и женщины» и «Какие „проработки“…» в досье.',
    open: 'Открыть досье в «Тайном архиве»', note: 'Решаешь ты — это только подсказка.',
  },
  ua: {
    hint: 'Познач ознаки, які повторюються регулярно (хоча б кілька разів на місяць). Унизу одразу з’явиться підсумок.',
    total: 'Підсумок', empty: 'Познач ознаки — і тут з’явиться підсумок: у кого перекіс і в якій чакрі.',
    who: { man: 'у чоловіка', woman: 'у жінки', pair: 'у парі', both: 'в обох' },
    most: 'Найбільше перекосів — {who}: {n}', equal: 'Перекосів порівну — у чоловіка й у жінки: по {n}',
    of: '{who} {n} з {all}', lean: 'перекіс {who}', leanEqual: 'перекіс в обох',
    fix: 'Як виправити — «Практики балансування чакр у чоловіка й жінки» і «Які „опрацювання“…» в досьє.',
    open: 'Відкрити досьє в «Таємному архіві»', note: 'Вирішуєш ти — це лише підказка.',
  },
  en: {
    hint: 'Tick the signs that repeat regularly (at least a few times a month). The result appears below right away.',
    total: 'Result', empty: 'Tick the signs — and the result appears here: who is out of balance and in which chakra.',
    who: { man: 'in the man', woman: 'in the woman', pair: 'in the couple', both: 'in both' },
    most: 'Most imbalances — {who}: {n}', equal: 'Imbalances are equal — in the man and in the woman: {n} each',
    of: '{who} {n} of {all}', lean: 'imbalance {who}', leanEqual: 'imbalance in both',
    fix: 'How to set it right — “Practices for balancing the chakras” and “What inner work…” in the file.',
    open: 'Open the file in the “Secret archive”', note: 'You decide — this is only a hint.',
  },
};

/** Надпись на языке приложения; vars — подстановки {n}, {who}… */
export function ct(key, vars = {}) {
  const pack = CT[getLang()] || CT.ru;
  const s = key.split('.').reduce((o, k) => o?.[k], pack) ?? key;
  return String(s).replace(/\{(\w+)\}/g, (_, k) => vars[k] ?? '');
}
