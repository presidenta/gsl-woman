import * as bookmarks from './bookmarks.js';
import { reveal } from './settings-card.js';

/* «МОЯ КНОПКА» — стыковка с приложением (README.md рядом). main.js: navItem() на месте бывшей «В разработке» и
   entered(name) после каждого перехода, decorate(name, view) после каждой отрисовки (ленточка закладки и «Продолжить
   с закладки»); настройки: shortcutCard(ctx). */
export { navItem } from './nav.js';
export { shortcutCard } from './settings-card.js';

export { decorate } from './bookmarks.js';

/** После перехода на экран: ждали закладку — вернуть место; пришли по шестерёнке — показать карточку в настройках. */
export function entered(name) {
  bookmarks.entered();
  if (name === 'settings' && location.hash.includes('?shortcut')) reveal(); // экран уже нарисован
}
