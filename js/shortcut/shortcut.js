import * as resume from './resume.js';
import { reveal } from './settings-card.js';

/* СВОЯ КНОПКА — стыковка с приложением (README.md рядом). main.js: navItem() на месте бывшей «В разработке» и
   entered(name) после каждого перехода; настройки: shortcutCard(ctx). */
export { navItem } from './nav.js';
export { shortcutCard } from './settings-card.js';

/** После перехода на экран: запомнить или вернуть место; пришли по шестерёнке — показать карточку в настройках. */
export function entered(name) {
  resume.entered(name);
  if (name === 'settings' && location.hash.includes('?shortcut')) reveal(); // экран уже нарисован
}
