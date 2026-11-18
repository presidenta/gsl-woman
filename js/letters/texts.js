import { getLang } from '../core/i18n.js';

/* ТЕКСТЫ «ПИСЬМА СЕБЕ» — на трёх языках (14.11.2026 были только русские; владелец 18.11.2026: «все переведены?» —
   переведены как есть), положительными словами (проверка tests/letters.test.js). Обращение без рода — у мужчины и
   у женщины одни и те же слова. Слова — по языку приложения (core/i18n), чего нет — русское. */

const RU = {
  title: 'Письмо себе в будущее',
  lead: 'Напиши себе через год, 5 или 10 лет — письмо запечатается и откроется в этот день. До {n} писем сразу.',
  leadKid: 'Напиши себе в будущее — самостоятельно или вместе с мамой и папой. Письмо откроется в выбранный день.',
  write: 'Написать письмо',
  start: 'С чего начать',
  prompts: 'Через год я хочу…|Сейчас для меня важно…|Я горжусь тем, что…|Мои отношения через год…|Я благодарю себя за…|Через пять лет мой день…',
  ph: 'Здравствуй! Пишу тебе из сегодняшнего дня…',
  phKid: 'Привет! Это я из прошлого…',
  when: 'Когда открыть',
  years: { 1: 'Через год', 5: 'Через 5 лет', 10: 'Через 10 лет' },
  own: 'Своё число лет',
  togetherBtn: 'Пишу вместе с мамой или папой 👨‍👩‍👧',
  together: 'Вместе с родителями',
  seal: 'Запечатать письмо',
  sealedToast: 'Письмо запечатано до {date}',
  sealed: 'Откроется {date}',
  left: 'Ждать ещё {n} дн.',
  arrived: 'Пришло письмо из прошлого!',
  open: 'Открыть',
  written: 'Написано {date}',
  remove: 'Убрать письмо',
  removeAsk: 'Удалить это письмо?',
  removeText: 'Письмо уйдёт насовсем.',
  keep: 'Оставить',
  full: 'Уже ждут {n} письма — новое можно написать, когда одно откроется.',
};

const UA = {
  title: 'Лист собі в майбутнє',
  lead: 'Напиши собі за рік, 5 чи 10 років — лист запечатається й відкриється того дня. До {n} листів одночасно.',
  leadKid: 'Напиши собі в майбутнє — самостійно чи разом із мамою й татом. Лист відкриється в обраний день.',
  write: 'Написати лист',
  start: 'З чого почати',
  prompts: 'За рік я хочу…|Зараз для мене важливо…|Я пишаюся тим, що…|Мої стосунки за рік…|Я дякую собі за…|За п’ять років мій день…',
  ph: 'Привіт! Пишу тобі із сьогоднішнього дня…',
  phKid: 'Привіт! Це я з минулого…',
  when: 'Коли відкрити',
  years: { 1: 'За рік', 5: 'За 5 років', 10: 'За 10 років' },
  own: 'Своє число років',
  togetherBtn: 'Пишу разом із мамою чи татом 👨‍👩‍👧',
  together: 'Разом із батьками',
  seal: 'Запечатати лист',
  sealedToast: 'Лист запечатано до {date}',
  sealed: 'Відкриється {date}',
  left: 'Чекати ще {n} дн.',
  arrived: 'Прийшов лист із минулого!',
  open: 'Відкрити',
  written: 'Написано {date}',
  remove: 'Прибрати лист',
  removeAsk: 'Видалити цей лист?',
  removeText: 'Лист піде назавжди.',
  keep: 'Залишити',
  full: 'Уже чекають {n} листи — новий можна написати, коли один відкриється.',
};

const EN = {
  title: 'A letter to your future self',
  lead: 'Write to yourself in a year, 5 or 10 years — the letter is sealed and opens on that day. Up to {n} letters at a time.',
  leadKid: 'Write to your future self — on your own or together with mum and dad. The letter opens on the day you choose.',
  write: 'Write a letter',
  start: 'Where to start',
  prompts: 'In a year I want…|Right now what matters to me is…|I’m proud that…|My relationships in a year…|I thank myself for…|In five years my day…',
  ph: 'Hello! I’m writing to you from today…',
  phKid: 'Hi! It’s me from the past…',
  when: 'When to open',
  years: { 1: 'In a year', 5: 'In 5 years', 10: 'In 10 years' },
  own: 'Your own number of years',
  togetherBtn: 'I’m writing together with mum or dad 👨‍👩‍👧',
  together: 'Together with parents',
  seal: 'Seal the letter',
  sealedToast: 'The letter is sealed until {date}',
  sealed: 'Opens on {date}',
  left: '{n} more days to wait',
  arrived: 'A letter from the past has arrived!',
  open: 'Open',
  written: 'Written on {date}',
  remove: 'Remove the letter',
  removeAsk: 'Delete this letter?',
  removeText: 'The letter will be gone for good.',
  keep: 'Keep it',
  full: '{n} letters are already waiting — you can write a new one when one opens.',
};

/** Все три языка — для проверок. */
export const LT = { ru: RU, ua: UA, en: EN };

export function lt(path, vars = {}) {
  const pick = (dict) => path.split('.').reduce((v, part) => v?.[part], dict);
  const v = pick(LT[getLang()] || RU) ?? pick(RU);
  if (typeof v !== 'string') return path;
  return v.replace(/\{(\w+)\}/g, (_, k) => (k in vars ? String(vars[k]) : `{${k}}`));
}
