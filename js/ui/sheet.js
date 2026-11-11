import { h, svg } from '../core/dom.js';
import { icons } from './icons.js';
import { t } from '../core/i18n.js';

/* НИЖНИЙ ЛИСТ — форма записи и подтверждения. Закрывается крестиком, нажатием мимо, клавишей Esc и
   системной «назад» на телефоне: лист кладёт в историю свою отметку, и «назад» снимает её, а не
   уводит с экрана. Пока лист открыт, приложение не перерисовывает экран под ним (isOpen). */

let active = null;

export const isOpen = () => !!active;

export function openSheet({ title, content, onClose }) {
  closeSheet(true);

  const backdrop = h('div', { class: 'sheet-backdrop' });
  const closeBtn = h('button', { type: 'button', class: 'icon-btn', 'aria-label': t('common.close') }, svg(icons.close));
  const titleId = 'sheet-' + Math.random().toString(36).slice(2, 8);
  const panel = h('section', { class: 'sheet', tabindex: '-1', role: 'dialog', 'aria-modal': 'true', 'aria-labelledby': titleId },
    h('div', { class: 'sheet__grip' }),
    h('header', { class: 'sheet__head' }, h('h2', { id: titleId, class: 'sheet__title' }, title), closeBtn),
    h('div', { class: 'sheet__body' }, content),
  );

  const previousFocus = document.activeElement;
  const onKey = (e) => e.key === 'Escape' && closeSheet();
  const onPop = () => active && closeSheet(true);

  active = { backdrop, panel, onClose, onKey, onPop, previousFocus };

  backdrop.addEventListener('click', () => closeSheet());
  closeBtn.addEventListener('click', () => closeSheet());
  document.addEventListener('keydown', onKey);
  history.pushState({ sheet: true }, '');
  addEventListener('popstate', onPop);

  document.body.append(backdrop, panel);
  document.body.classList.add('is-locked');
  requestAnimationFrame(() => {
    backdrop.classList.add('is-open');
    panel.classList.add('is-open');
  });
  // Фокус — на сам лист, а не в поле: поле подняло бы клавиатуру раньше, чем женщина решила писать
  setTimeout(() => panel.focus({ preventScroll: true }), 320);

  return () => closeSheet();
}

/** fromHistory — закрывается сама «назад»: отметку из истории снимать уже не нужно. */
export function closeSheet(fromHistory = false) {
  if (!active) return;
  const { backdrop, panel, onClose, onKey, onPop, previousFocus } = active;
  active = null;
  document.removeEventListener('keydown', onKey);
  removeEventListener('popstate', onPop);
  if (!fromHistory && history.state?.sheet) history.back();
  backdrop.classList.remove('is-open');
  panel.classList.remove('is-open');
  document.body.classList.remove('is-locked');
  setTimeout(() => {
    backdrop.remove();
    panel.remove();
  }, 420);
  previousFocus?.focus?.({ preventScroll: true });
  onClose?.();
  // Приложение ждёт этого, чтобы перерисовать экран, изменившийся, пока лист был открыт
  dispatchEvent(new Event('sheet-closed'));
}
