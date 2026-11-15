import { getLang } from '../core/i18n.js';

/* ТЕКСТЫ «КОПИИ НА ПОЧТУ» (backup/). Обращение без рода — у мужчины и у женщины одни слова. {email}, {date}, {n} —
   подстановки. */

const TEXTS = {
  ru: {
    title: 'Копия на твою почту',
    lead: 'Всё своё — записи, цели, фото и голос — одним файлом на твоей почте. Сменишь телефон — вернёшь всё из файла.',
    to: 'Почта: {email}',
    save: 'Сохранить на почту',
    restore: 'Вернуть из файла',
    later: 'Позже',
    ask: 'Сохранить копию всего на свою почту?',
    last: 'Последняя копия: {date}',
    first: 'Первая копия — одной кнопкой',
    making: 'Собираю файл…',
    subject: 'Копия GSL (W+M)⁺ — {date}',
    body: 'Копия всего из GSL (W+M)⁺ от {date}: записи, цели, фото и голос. Сохрани это письмо. Вернуть всё: Настройки → «Копия на твою почту» → «Вернуть из файла».',
    sent: 'Выбери почту и отправь письмо себе',
    downloaded: 'Файл сохранён в «Загрузки» — прикрепи его к письму себе на почту',
    failed: 'Собрать файл сейчас сложно — попробуй ещё раз чуть позже',
    restoreAsk: 'Вернуть из файла то, чего сейчас нет на телефоне? Всё, что уже есть, останется как есть.',
    restored: 'Вернулось: {n}',
    restoredNothing: 'Всё из файла уже на телефоне',
    badFile: 'Это другой файл — нужен файл копии GSL из письма',
  },
  ua: {
    title: 'Копія на твою пошту',
    lead: 'Усе своє — записи, цілі, фото й голос — одним файлом на твоїй пошті. Зміниш телефон — повернеш усе з файлу.',
    to: 'Пошта: {email}',
    save: 'Зберегти на пошту',
    restore: 'Повернути з файлу',
    later: 'Пізніше',
    ask: 'Зберегти копію всього на свою пошту?',
    last: 'Остання копія: {date}',
    first: 'Перша копія — однією кнопкою',
    making: 'Збираю файл…',
    subject: 'Копія GSL (W+M)⁺ — {date}',
    body: 'Копія всього з GSL (W+M)⁺ від {date}: записи, цілі, фото й голос. Збережи цей лист. Повернути все: Налаштування → «Копія на твою пошту» → «Повернути з файлу».',
    sent: 'Обери пошту й надішли лист собі',
    downloaded: 'Файл збережено в «Завантаження» — додай його до листа собі на пошту',
    failed: 'Зібрати файл зараз складно — спробуй ще раз трохи пізніше',
    restoreAsk: 'Повернути з файлу те, чого зараз бракує на телефоні? Усе, що вже є, залишиться як є.',
    restored: 'Повернулося: {n}',
    restoredNothing: 'Усе з файлу вже на телефоні',
    badFile: 'Це інший файл — потрібен файл копії GSL з листа',
  },
  en: {
    title: 'Copy to your email',
    lead: 'Everything of yours — notes, goals, photos and voice — in one file in your email. New phone? Bring it all back from the file.',
    to: 'Email: {email}',
    save: 'Save to email',
    restore: 'Restore from file',
    later: 'Later',
    ask: 'Save a copy of everything to your email?',
    last: 'Last copy: {date}',
    first: 'Your first copy — one tap',
    making: 'Preparing the file…',
    subject: 'GSL (W+M)⁺ copy — {date}',
    body: 'A copy of everything from GSL (W+M)⁺ as of {date}: notes, goals, photos and voice. Keep this email. To restore: Settings → “Copy to your email” → “Restore from file”.',
    sent: 'Pick your email app and send it to yourself',
    downloaded: 'The file is in Downloads — attach it to an email to yourself',
    failed: 'The file is hard to prepare right now — try again a little later',
    restoreAsk: 'Bring back from the file what this phone is missing? Everything already here stays as it is.',
    restored: 'Restored: {n}',
    restoredNothing: 'Everything from the file is already on this phone',
    badFile: 'This is a different file — pick the GSL copy file from the email',
  },
};

export function bt(key, vars = {}) {
  const dict = TEXTS[getLang()] || TEXTS.ru;
  const s = dict[key] ?? TEXTS.ru[key] ?? key;
  return s.replace(/\{(\w+)\}/g, (_, k) => (k in vars ? String(vars[k]) : `{${k}}`));
}

export const _TEXTS = TEXTS;
