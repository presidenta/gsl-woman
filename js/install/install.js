import { h, svg } from '../core/dom.js';
import { t } from '../core/i18n.js';
import { icons } from '../ui/icons.js';
import { brand } from '../ui/brand.js';
import { openSheet, isOpen as sheetOpen } from '../ui/sheet.js';

/* ЗНАЧОК НА ЭКРАН ТЕЛЕФОНА — как у спорта. Chrome сам присылает событие beforeinstallprompt, если сайт
   можно поставить, — тогда кнопка «Поставить значок» ставит его одним нажатием. Нет события (iPhone,
   другой браузер, уже отказались) — подсказка, где это в меню. Открыто со значка — карточки нет.

   «Квант» открывает GSL Woman с #install (кнопка «Значок на экран» на его плитке) — тогда сразу
   настройки и эта карточка подсвечена: main.js зовёт requestHighlight(). */

let deferred = null;
let highlight = false;
const listeners = new Set();

addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault();
  deferred = e;
  listeners.forEach((fn) => fn());
});
addEventListener('appinstalled', () => {
  deferred = null;
  listeners.forEach((fn) => fn());
});

export const standalone = () =>
  matchMedia('(display-mode: standalone)').matches || navigator.standalone === true;

const isIOS = () => /iPhone|iPad|iPod/i.test(navigator.userAgent)
  || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);

/** Перерисовать, когда браузер разрешил установку. */
export function onChange(fn) {
  listeners.add(fn);
}

export function requestHighlight() {
  highlight = true;
}

/* Пришли из «Кванта» по кнопке «Значок на экран» (12.11.2026: «нажимаю — просто открывается приложение,
   иконка не ставится»). Значок браузер ставит только по нажатию внутри приложения, а при первом открытии
   женщина сначала проходит вход и первую настройку — до карточки в настройках она не доходила. Поэтому, как
   только приложение готово, — сразу лист с одной большой кнопкой. Нажатие на неё и есть то касание, которого
   ждёт браузер. */
let offerPending = false;

export function requestOffer() {
  offerPending = true;
}

/** Показать лист «Значок на экран», если его просили. Зовёт main.js, когда экраны уже на месте. */
export function offerIfRequested() {
  if (!offerPending || sheetOpen()) return;
  offerPending = false;
  highlight = false;
  if (standalone()) return;
  const holder = h('div', { class: 'install-sheet' });
  const paint = () => holder.replaceChildren(...sheetBody());
  paint();
  listeners.add(paint);   // браузер разрешил установку, пока лист открыт, — появится кнопка
  openSheet({ title: t('install.title'), content: holder, onClose: () => listeners.delete(paint) });
}

/* Содержимое: значок, название и кнопка — или подсказка, где это в меню браузера. */
function sheetBody() {
  return [
    h('div', { class: 'install__head install__head--sheet' },
      h('span', { class: 'install__icon' }, h('img', { src: 'assets/icons/icon-192.png', alt: '', width: '44', height: '44' })),
      h('p', { class: 'install__name' }, brand()),
    ),
    ...actionBody(),
  ];
}

function actionBody() {
  if (deferred) {
    const btn = h('button', { type: 'button', class: 'btn btn--gold btn--block' }, svg(icons.phoneIcon), t('install.button'));
    btn.addEventListener('click', async () => {
      const e = deferred;
      deferred = null;
      e.prompt();
      await e.userChoice.catch(() => null);
      listeners.forEach((fn) => fn());
    });
    return [h('p', { class: 'field__hint install__lead' }, t('install.lead')), btn];
  }
  return [h('p', { class: 'field__hint install__lead' }, isIOS() ? t('install.ios') : t('install.menu'))];
}

/** Карточка для настроек; открыто со значка — null. */
export function installCard() {
  if (standalone()) return null;
  const body = actionBody();

  const card = h('section', { class: 'card settings__section install', id: 'install' },
    h('div', { class: 'install__head' },
      h('span', { class: 'install__icon' }, h('img', { src: 'assets/icons/icon-192.png', alt: '', width: '44', height: '44' })),
      h('div', {},
        h('h2', { class: 'caps settings__heading install__title' }, t('install.title')),
        h('p', { class: 'install__name' }, brand()),
      ),
    ),
    ...body,
  );
  if (highlight) {
    highlight = false;
    card.classList.add('is-flash');
    requestAnimationFrame(() => card.scrollIntoView({ block: 'center', behavior: 'smooth' }));
  }
  return card;
}
