import { getLang } from '../core/i18n.js';

/* Тексты своей кнопки на трёх языках. names[id] = [полное название — в настройках, короткое — под значком на панели].
   Слова нейтральные к полу: «Продолжить с того же места» (у мужчин и женщин один текст). */
const TX = {
  ru: {
    title: 'Своя кнопка',
    lead: 'Кнопка внизу, между «Сегодня» и «Артефактами», — твоя: выбери, что она открывает. Маленькая шестерёнка на ней всегда ведёт сюда.',
    pick: 'Что открывает кнопка',
    none: '— не выбрано —',
    empty: 'Выбрать',
    gear: 'Настроить свою кнопку',
    resumeHint: 'Кнопка откроет последний раздел, который ты смотришь: ту же книгу, те же открытые главы и то же место на странице.',
    resumeEmpty: 'Пока нечего продолжать: открой книгу или раздел — кнопка запомнит место.',
    names: {
      resume: ['Продолжить с того же места', 'Продолжить'],
      chatPair: ['Чат пары', 'Чат пары'],
      chatFamily: ['Семейный чат', 'Чат семьи'],
      library: ['Библиотека', 'Библиотека'],
      archetypes: ['Кто перед тобой (архетипы)', 'Архетипы'],
      questions: ['Вопросы для разговора', 'Вопросы'],
      charts: ['Разбор по дате рождения', 'Разбор'],
      love: ['Пять языков любви', 'Языки любви'],
      redflag: ['Красный флаг', 'Красный флаг'],
      intim: ['Интим 18⁺', 'Интим 18⁺'],
      anketa: ['Анкета партнёра', 'Анкета'],
    },
  },
  ua: {
    title: 'Своя кнопка',
    lead: 'Кнопка внизу, між «Сьогодні» та «Артефактами», — твоя: обери, що вона відкриває. Маленька шестірня на ній завжди веде сюди.',
    pick: 'Що відкриває кнопка',
    none: '— не обрано —',
    empty: 'Обрати',
    gear: 'Налаштувати свою кнопку',
    resumeHint: 'Кнопка відкриє останній розділ, який ти переглядаєш: ту саму книгу, ті самі відкриті глави й те саме місце на сторінці.',
    resumeEmpty: 'Поки нічого продовжувати: відкрий книгу чи розділ — кнопка запам’ятає місце.',
    names: {
      resume: ['Продовжити з того ж місця', 'Продовжити'],
      chatPair: ['Чат пари', 'Чат пари'],
      chatFamily: ['Сімейний чат', 'Чат родини'],
      library: ['Бібліотека', 'Бібліотека'],
      archetypes: ['Хто перед тобою (архетипи)', 'Архетипи'],
      questions: ['Питання для розмови', 'Питання'],
      charts: ['Розбір за датою народження', 'Розбір'],
      love: ['П’ять мов кохання', 'Мови кохання'],
      redflag: ['Червоний прапорець', 'Червоний прапорець'],
      intim: ['Інтим 18⁺', 'Інтим 18⁺'],
      anketa: ['Анкета партнера', 'Анкета'],
    },
  },
  en: {
    title: 'Your own button',
    lead: 'The button at the bottom, between “Today” and “Artifacts”, is yours: choose what it opens. The small gear on it always brings you here.',
    pick: 'What the button opens',
    none: '— not chosen —',
    empty: 'Choose',
    gear: 'Set up your button',
    resumeHint: 'The button opens the last section you were viewing: the same book, the same open chapters and the same spot on the page.',
    resumeEmpty: 'Nothing to continue yet: open a book or a section and the button will remember the spot.',
    names: {
      resume: ['Continue where I left off', 'Continue'],
      chatPair: ['Couple chat', 'Couple chat'],
      chatFamily: ['Family chat', 'Family chat'],
      library: ['Library', 'Library'],
      archetypes: ['Who is in front of you (archetypes)', 'Archetypes'],
      questions: ['Questions for a talk', 'Questions'],
      charts: ['Birth date reading', 'Reading'],
      love: ['The five love languages', 'Love languages'],
      redflag: ['Red flag', 'Red flag'],
      intim: ['Intimacy 18⁺', 'Intimacy 18⁺'],
      anketa: ['Partner questionnaire', 'Questionnaire'],
    },
  },
};

export const ST = () => TX[getLang()] || TX.ua;
export const LANG_KEYS = Object.keys(TX); // для проверок: одинаковые ключи на всех языках
export const ALL = TX;
