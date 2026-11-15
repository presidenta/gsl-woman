import { h } from '../core/dom.js';
import { t } from '../core/i18n.js';

/* «ВЫ ТОЧНО ХОТИТЕ УДАЛИТЬ?» — окно-вопрос посреди экрана (владелец 15.11.2026: «при удалении игры или ещё чего-то
   обязательно должно всплывать сообщение — чтобы случайно не поудалять»).

   Своё окно, а не системное confirm(): одинаково выглядит в браузере, в установленном приложении и в APK, говорит
   словами приложения и не теряется на телефоне. Нажатие мимо, Esc и «Отмена» — «нет»: случайное касание ничего
   не удаляет. Кнопка удаления — красная и стоит второй, чтобы большой палец не попал в неё сразу.

   ask({ title, text, yes, no }) → Promise<true | false>. */

let open = null;

export function ask({ title, text = '', yes = t('common.delete'), no = t('common.cancel'), danger = true } = {}) {
  open?.(false);
  return new Promise((resolve) => {
    const prevFocus = document.activeElement;
    const keep = h('button', { type: 'button', class: 'btn btn--ghost btn--block' }, no);
    const go = h('button', { type: 'button', class: `btn ${danger ? 'btn--danger' : 'btn--gold'} btn--block` }, yes);
    const titleId = 'ask-' + Math.random().toString(36).slice(2, 8);
    const box = h('section', { class: 'ask', role: 'alertdialog', 'aria-modal': 'true', 'aria-labelledby': titleId },
      h('div', { class: 'ask__icon', 'aria-hidden': 'true' }, danger ? '🗑️' : '❔'),
      h('h2', { id: titleId, class: 'ask__title' }, title),
      text ? h('p', { class: 'ask__text' }, text) : null,
      h('div', { class: 'ask__actions' }, keep, go),
    );
    const backdrop = h('div', { class: 'ask-backdrop' }, box);
    const onKey = (e) => { if (e.key === 'Escape') finish(false); };
    function finish(answer) {
      if (open !== finish) return;
      open = null;
      document.removeEventListener('keydown', onKey);
      backdrop.classList.remove('is-open');
      setTimeout(() => backdrop.remove(), 180);
      prevFocus?.focus?.();
      resolve(answer);
    }
    open = finish;
    keep.addEventListener('click', () => finish(false));
    go.addEventListener('click', () => finish(true));
    backdrop.addEventListener('click', (e) => { if (e.target === backdrop) finish(false); });
    document.addEventListener('keydown', onKey);
    document.body.append(backdrop);
    requestAnimationFrame(() => { backdrop.classList.add('is-open'); keep.focus(); });
  });
}
