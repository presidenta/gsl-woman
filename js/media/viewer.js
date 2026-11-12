import { h, svg } from '../core/dom.js';
import { t } from '../core/i18n.js';
import { icons } from '../ui/icons.js';
import * as photos from './photos.js';

/* ПРОСМОТР СНИМКА во весь экран, поверх всего (и поверх листа записи). Листается кнопками, стрелками
   клавиатуры и пальцем вбок; закрывается крестиком, Esc или нажатием на тёмное поле. */

export function openViewer(ids, start = 0) {
  if (!ids.length) return;
  let i = Math.max(0, Math.min(start, ids.length - 1));
  const before = document.activeElement;

  const img = h('img', { class: 'viewer__img', alt: '' });
  const counter = h('span', { class: 'viewer__count' });
  const prev = h('button', { type: 'button', class: 'viewer__nav viewer__nav--prev', 'aria-label': t('common.prev') }, svg(icons.chevronLeft));
  const next = h('button', { type: 'button', class: 'viewer__nav viewer__nav--next', 'aria-label': t('common.next') }, svg(icons.chevronRight));
  const close = h('button', { type: 'button', class: 'viewer__close', 'aria-label': t('common.close') }, svg(icons.close));
  const root = h('div', { class: 'viewer', role: 'dialog', 'aria-modal': 'true', tabindex: '-1' },
    img, prev, next, close, counter);

  async function show() {
    const u = photos.cachedUrl(ids[i]) || await photos.url(ids[i]);
    if (u) img.src = u;
    counter.textContent = ids.length > 1 ? `${i + 1} / ${ids.length}` : '';
    prev.hidden = next.hidden = ids.length < 2;
  }
  const step = (d) => { i = (i + d + ids.length) % ids.length; show(); };

  function shut() {
    root.classList.add('is-leaving');
    removeEventListener('keydown', onKey, true);
    setTimeout(() => root.remove(), 200);
    before?.focus?.();
  }
  function onKey(e) {
    if (e.key === 'Escape') { e.stopPropagation(); shut(); }
    else if (e.key === 'ArrowLeft') step(-1);
    else if (e.key === 'ArrowRight') step(1);
  }

  prev.addEventListener('click', (e) => { e.stopPropagation(); step(-1); });
  next.addEventListener('click', (e) => { e.stopPropagation(); step(1); });
  close.addEventListener('click', shut);
  root.addEventListener('click', (e) => { if (e.target === root) shut(); });
  let x0 = null;
  root.addEventListener('touchstart', (e) => { x0 = e.touches[0].clientX; }, { passive: true });
  root.addEventListener('touchend', (e) => {
    if (x0 === null) return;
    const dx = e.changedTouches[0].clientX - x0;
    x0 = null;
    if (Math.abs(dx) > 50 && ids.length > 1) step(dx < 0 ? 1 : -1);
  });
  addEventListener('keydown', onKey, true);

  document.body.append(root);
  show();
  root.focus();
}
