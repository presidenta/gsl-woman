import { h, svg } from '../core/dom.js';
import { t } from '../core/i18n.js';
import { icons } from '../ui/icons.js';
import { brand } from '../ui/brand.js';

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

/** Карточка для настроек; открыто со значка — null. */
export function installCard() {
  if (standalone()) return null;
  const body = [];
  if (deferred) {
    const btn = h('button', { type: 'button', class: 'btn btn--gold btn--block' }, svg(icons.phoneIcon), t('install.button'));
    btn.addEventListener('click', async () => {
      const e = deferred;
      deferred = null;
      e.prompt();
      await e.userChoice.catch(() => null);
      listeners.forEach((fn) => fn());
    });
    body.push(h('p', { class: 'field__hint install__lead' }, t('install.lead')), btn);
  } else {
    body.push(h('p', { class: 'field__hint install__lead' }, isIOS() ? t('install.ios') : t('install.menu')));
  }

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
