/* ПОСТОЯННЫЕ ПРИЛОЖЕНИЯ — числа и ключи, на которые опираются остальные модули.
   Длина программы, ритм недели и время напоминаний по умолчанию живут здесь, а не в коде экранов:
   поменять ритм или продлить программу — правка одной строки. */

/** Программа: 24 недели по 7 дней, месяц — 4 недели (владелец, 05.11.2026). */
export const WEEK_DAYS = 7;
export const WEEKS = 24;
export const MONTH_WEEKS = 4;
export const PROGRAM_DAYS = WEEKS * WEEK_DAYS;

/** Дни недели с заданиями — 1–6; седьмой — итог и созвон. */
export const TASK_DAYS = 6;

/** Языки приложения, как у спорта и «Кванта»: украинский, русский, английский. */
export const LANGS = ['ua', 'ru', 'en'];
export const FALLBACK_LANG = 'ru';

/** Три напоминания дня: утро — задание, обед — комплимент и «как успехи», вечер — «что сделала». */
export const SLOTS = ['morning', 'noon', 'evening'];
export const DEFAULT_TIMES = { morning: '08:00', noon: '13:00', evening: '20:00' };

/** Уровни выполнения задания — по возрастанию. */
export const LEVELS = ['min', 'full', 'max'];

/* Адрес presidenta.github.io общий у нескольких наших приложений («Квант», спорт): хранилище браузера и
   кэши у них одни на всех. Поэтому ВСЁ своё — только с этой приставкой, и чистить можно только своё. */
export const STORAGE_PREFIX = 'gsl-woman:';
export const CACHE_PREFIX = 'gsl-woman-';

/* Сервер «Кванта»: вход его аккаунтом и программа тренинга (server/src/woman/ в planner). Своих
   пользователей и паролей у GSL Woman нет, как у спорта. Открыто с localhost по http — значит, проверка
   на компьютере: тогда сервер тоже свой, на 8580. */
const here = globalThis.location;
const local = here?.protocol === 'http:' && ['localhost', '127.0.0.1'].includes(here.hostname);
export const API_BASE = local ? 'http://localhost:8580' : 'https://game.coreviaflow.com/genesisystem';
