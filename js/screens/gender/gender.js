import { h, svg, add } from '../../core/dom.js';
import { t } from '../../core/i18n.js';
import { icons } from '../../ui/icons.js';
import { brand } from '../../ui/brand.js';
import * as side from '../../side/side.js';

/* «КТО ТЫ?» — выбор пола при первом входе (владелец 13.11.2026: «при входе обязательно указать пол: мужской или
   женский»). Пока пол пуст, приложение дальше этого экрана не идёт (main.js). Выбор — один раз: сервер запоминает
   его в учётной записи (gsl/gender.js в planner), поменять потом может только администратор.

   Нажатие на карточку сразу показывает цвет своей части (side.apply — только вид, ничего не сохраняет), кнопка
   «Это я — продолжить» сохраняет. Шапка — та же, что у входа (классы onboarding__*). */

// Знаки ♀ и ♂ — золотой линией, как остальные значки приложения
const MARKS = {
  female: '<circle cx="12" cy="9" r="5.2"/><path d="M12 14.2V21M8.8 18h6.4"/>',
  male: '<circle cx="10" cy="14" r="5.2"/><path d="M13.7 10.3 19 5M14.6 5H19v4.4"/>',
};

const mark = (gender) => {
  const el = svg(`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">${MARKS[gender]}</svg>`, 'gender__mark-svg');
  return h('span', { class: 'gender__mark', 'aria-hidden': 'true' }, el);
};

let picked = null;

export function render(view, { onChoose }) {
  const error = h('p', { class: 'login__error', role: 'alert', hidden: true });
  const confirm = h('button', { type: 'button', class: 'btn btn--gold btn--block onboarding__begin', disabled: !picked },
    t('gender.confirm'), svg(icons.chevronRight));

  const card = (gender, key) => {
    const node = h('button', {
      type: 'button',
      class: `card gender__card${picked === gender ? ' is-picked' : ''}`,
      'aria-pressed': String(picked === gender),
      onclick: () => {
        picked = gender;
        side.apply(side.sideOfGender(gender));
        for (const c of cards) {
          const on = c.dataset.gender === picked;
          c.classList.toggle('is-picked', on);
          c.setAttribute('aria-pressed', String(on));
        }
        confirm.disabled = false;
        error.hidden = true;
      },
    },
    mark(gender),
    h('span', { class: 'gender__text' },
      h('span', { class: 'gender__title' }, t(`gender.${key}`)),
      h('span', { class: 'gender__hint' }, t(`gender.${key}Hint`)),
    ));
    node.dataset.gender = gender;
    return node;
  };
  const cards = [card('female', 'woman'), card('male', 'man')];

  confirm.addEventListener('click', async () => {
    if (!picked) return;
    confirm.disabled = true;
    confirm.firstChild.textContent = t('gender.busy');
    error.hidden = true;
    try {
      await onChoose(picked);
      picked = null;
    } catch (err) {
      error.textContent = err?.code === 'gender_locked' ? t('gender.locked') : t('gender.fail');
      error.hidden = false;
      confirm.disabled = false;
      confirm.firstChild.textContent = t('gender.confirm');
    }
  });

  add(view, h('div', { class: 'onboarding login gender' },
    h('div', { class: 'onboarding__mark' }, svg(icons.sparkle)),
    h('p', { class: 'caps onboarding__eyebrow' }, t('login.eyebrow')),
    h('h1', { class: 'onboarding__brand gold-text' }, brand('', t('app.shared'))),
    h('h2', { class: 'gender__ask' }, t('gender.title')),
    h('p', { class: 'onboarding__lead' }, t('gender.lead')),
    h('div', { class: 'gender__choices' }, ...cards),
    error,
    confirm,
    h('p', { class: 'login__hint' }, t('gender.note')),
  ));
}
