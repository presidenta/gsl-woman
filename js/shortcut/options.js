import { icons } from '../ui/icons.js';

/* ЧТО МОЖНО ПОСТАВИТЬ НА СВОЮ КНОПКУ (владелец 28.11.2026: «кнопка, которую человек настраивает сам: чат, книжки,
   архетипы — чтобы долго не искать»; «Неделю» — точно не нужно). id — ключ в настройках (settings.shortcut) и в
   текстах (texts.js); hash — куда ведёт кнопка; route — имя экрана (подсветка на панели, как у соседей);
   resume — «Продолжить с того же места»: адрес берётся из запомненного места (resume.js). */
export const OPTIONS = [
  { id: 'resume', icon: icons.play, resume: true },
  { id: 'chatPair', icon: icons.chat, hash: '#/us?pair', route: 'us' },
  { id: 'chatFamily', icon: icons.chats, hash: '#/us?family', route: 'us' },
  { id: 'library', icon: icons.journal, hash: '#/library', route: 'library' },
  { id: 'archetypes', icon: icons.eye, hash: '#/library?open=types', route: 'library' }, // «Кто перед тобой»
  { id: 'questions', icon: icons.chatAsk, hash: '#/help', route: 'help' },
  { id: 'charts', icon: icons.natal, hash: '#/charts', route: 'charts' },
  { id: 'love', icon: icons.heart, hash: '#/love', route: 'love' },
  { id: 'redflag', icon: icons.flag, hash: '#/redflag', route: 'redflag' },
  { id: 'intim', icon: icons.adult, hash: '#/intim', route: 'intim' },
  { id: 'anketa', icon: icons.check, hash: '#/anketa', route: 'anketa' },
];

/** Вариант по ключу; неизвестный или пустой — null (кнопка ещё не настроена). */
export const option = (id) => OPTIONS.find((o) => o.id === id) || null;
