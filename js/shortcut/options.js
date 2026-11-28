import { icons } from '../ui/icons.js';

/* ЧТО МОЖНО ПОСТАВИТЬ НА «МОЮ КНОПКУ» (владелец 28.11.2026: «чат, книжки, архетипы — чтобы долго не искать»; «Неделю»
   — точно не нужно; «первое свидание, вопросы на первом свидании, анкеты, вопросы для пары, комплименты, тайный архив
   — серьёзно отнесись к разделам»). Названия — те же, что человек видит в приложении («Артефакты», «Тайный архив»,
   «Мы»). Группы — для выпадающего списка в настройках.
   id — ключ в настройках (settings.shortcut) и в текстах (texts.js); hash — куда ведёт; route — имя экрана (подсветка
   на панели); list — «Мои закладки»: не переход, а список сохранённых мест (bookmarks.js).
   ?open=<плашка> — плашка раскрыта и видна сразу; #/us?pair=wishes — нужная вкладка «Мы»; #/goals?tab=pair — цели пары. */
export const GROUPS = [
  { id: 'quick', items: [
    { id: 'bookmarks', icon: icons.bookmark, list: true }, // «Мои закладки» — список сохранённых мест (bookmarks.js)
  ] },
  { id: 'us', items: [
    { id: 'chatPair', icon: icons.chat, hash: '#/us?pair', route: 'us' },
    { id: 'wishes', icon: icons.sparkle, hash: '#/us?pair=wishes', route: 'us' },
    { id: 'chatFamily', icon: icons.chats, hash: '#/us?family', route: 'us' },
    { id: 'dreams', icon: icons.moon, hash: '#/us?family=dreams', route: 'us' },
    { id: 'goalsPair', icon: icons.rings, hash: '#/goals?tab=pair', route: 'goals' },
    { id: 'goalsFamily', icon: icons.home, hash: '#/goals?tab=family', route: 'goals' },
  ] },
  { id: 'date', items: [
    { id: 'meet', icon: icons.rings, hash: '#/meet', route: 'meet' },
    { id: 'questionsDate', icon: icons.chatAsk, hash: '#/help?date', route: 'help' },
    { id: 'questionsPair', icon: icons.chats, hash: '#/help?pair', route: 'help' },
    { id: 'surveys', icon: icons.check, hash: '#/goals?open=surveys', route: 'goals' },
    { id: 'anketa', icon: icons.check, hash: '#/anketa', route: 'anketa' },
    { id: 'love', icon: icons.heart, hash: '#/love', route: 'love' },
    { id: 'compliments', icon: icons.wink, hash: '#/goals?open=compliments', route: 'goals' },
    { id: 'redflag', icon: icons.flag, hash: '#/redflag', route: 'redflag' },
  ] },
  { id: 'archive', items: [
    { id: 'archive', icon: icons.archive, hash: '#/archive', route: 'archive' },
    { id: 'types', icon: icons.eye, hash: '#/archive?open=types', route: 'archive' },
    { id: 'rules', icon: icons.home, hash: '#/archive?open=rules', route: 'archive' },
    { id: 'dates', icon: icons.calendar, hash: '#/archive?open=dates', route: 'archive' },
    { id: 'topics', icon: icons.chats, hash: '#/archive?open=topics', route: 'archive' },
    { id: 'secret', icon: icons.sealed, hash: '#/goals?open=secret', route: 'goals' },
    { id: 'intim', icon: icons.adult, hash: '#/intim', route: 'intim' },
    { id: 'charts', icon: icons.natal, hash: '#/charts', route: 'charts' },
    { id: 'letter', icon: icons.mail, hash: '#/goals?open=letters', route: 'goals' },
  ] },
];

export const OPTIONS = GROUPS.flatMap((g) => g.items);

/** Вариант по ключу; неизвестный или пустой — null (кнопка ещё не настроена). */
export const option = (id) => OPTIONS.find((o) => o.id === id) || null;
