import { getLang } from '../core/i18n.js';

/* Общие надписи анкеты «Чек-лист: 7 чакр в паре»; вопросы, ответы и фразы итога — с сервера (gsl/chakra-test). */
export const CT = {
  ru: {
    total: 'Итог', empty: 'Отвечай на вопросы — и здесь появится итог: как сейчас, как было у родителей и что повторяется.',
    fix: 'Как выправить — «Практики балансировки чакр у мужчины и женщины» и «Какие „проработки“…» в досье.',
    open: 'Открыть досье в «Тайном архиве»', note: 'Решаешь ты — это только подсказка.',
  },
  ua: {
    total: 'Підсумок', empty: 'Відповідай на запитання — і тут з’явиться підсумок: як зараз, як було в батьків і що повторюється.',
    fix: 'Як виправити — «Практики балансування чакр у чоловіка й жінки» і «Які „опрацювання“…» в досьє.',
    open: 'Відкрити досьє в «Таємному архіві»', note: 'Вирішуєш ти — це лише підказка.',
  },
  en: {
    total: 'Result', empty: 'Answer the questions — and the result appears here: how it is now, how it was with your parents and what repeats.',
    fix: 'How to set it right — “Practices for balancing the chakras” and “What inner work…” in the file.',
    open: 'Open the file in the “Secret archive”', note: 'You decide — this is only a hint.',
  },
};

/** Надпись на языке приложения. */
export function ct(key) {
  const pack = CT[getLang()] || CT.ru;
  return pack[key] ?? key;
}
