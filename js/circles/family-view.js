import { h, svg } from '../core/dom.js';
import { t } from '../core/i18n.js';
import { icons } from '../ui/icons.js';
import { toast } from '../ui/toast.js';
import * as circles from './circles.js';

/* СЕМЬЯ: дети и их мечты (владелец 13.11.2026: «родители видят про ребёнка его цели, желания, о чём мечтает — чтобы
   помогать ему это реализовывать»; ТЗ раздел 1). Профиль ребёнка заводит родитель (свой вход у ребёнка — позже).
   Мечта — запись dream { child, type: dream|goal|wish, text, done } — общая для родителей. */

export const DREAM_TYPES = ['dream', 'goal', 'wish'];

/** Список детей с «Добавить ребёнка». */
export function childrenBlock(circle, onError) {
  const kids = circle.members.filter((m) => m.role === 'child');
  const input = h('input', { class: 'input', maxlength: '40', placeholder: t('us.children.ph'), 'aria-label': t('us.children.ph') });
  const form = h('form', { class: 'wish__new' }, input, h('button', { type: 'submit', class: 'goals__add', 'aria-label': t('us.children.save') }, svg(icons.plus)));
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const name = input.value.trim();
    if (!name) return;
    try {
      await circles.addChild(circle.id, name);
      input.value = '';
    } catch (err) {
      onError(err);
    }
  });
  return h('section', { class: 'card' },
    h('h2', { class: 'caps settings__heading' }, t('us.children.title')),
    kids.length ? h('ul', { class: 'us-members' }, ...kids.map((k) => h('li', { class: 'us-member is-child' }, h('span', { class: 'us-member__dot' }), k.name))) : null,
    h('p', { class: 'field__hint' }, t('us.children.hint')),
    form,
  );
}

/** Мечты и цели детей — по ребёнку. */
export function dreamsView(circle) {
  const kids = circle.members.filter((m) => m.role === 'child');
  const all = circles.items(circle.id, 'dream');
  return h('section', { class: 'card dreams' },
    h('h2', { class: 'card__title' }, t('us.dreams.title')),
    h('p', { class: 'card__text faint' }, t('us.dreams.lead')),
    ...kids.map((kid) => {
      const mine = all.filter((d) => d.data?.child === kid.id).sort((a, b) => a.updatedAt.localeCompare(b.updatedAt));
      const type = h('select', { class: 'input select__control', 'aria-label': t('us.dreams.add') },
        ...DREAM_TYPES.map((k) => h('option', { value: k }, t(`us.dreams.kinds.${k}`))));
      const input = h('input', { class: 'input', maxlength: '160', placeholder: t('us.dreams.ph'), 'aria-label': t('us.dreams.ph') });
      const form = h('form', { class: 'dreams__new' }, h('div', { class: 'select' }, type, svg(icons.chevronRight, 'select__chevron')), input,
        h('button', { type: 'submit', class: 'goals__add', 'aria-label': t('us.dreams.add') }, svg(icons.plus)));
      form.addEventListener('submit', (e) => {
        e.preventDefault();
        const text = input.value.trim();
        if (!text) return;
        circles.put(circle.id, 'dream', circles.newId('d'), { child: kid.id, type: type.value, text: text.slice(0, 160), done: false });
        input.value = '';
        toast({ title: t('love.saved') });
      });
      return h('div', { class: 'dreams__kid' },
        h('h3', { class: 'dreams__name' }, kid.name),
        h('ul', { class: 'dreams__list' }, ...mine.map((d) => h('li', { class: `dreams__item${d.data.done ? ' is-done' : ''}` },
          h('button', {
            type: 'button', class: `goal__mark${d.data.done ? ' is-done' : ''}`, 'aria-pressed': String(!!d.data.done), 'aria-label': d.data.text,
            onclick: () => circles.put(circle.id, 'dream', d.id, { ...d.data, done: !d.data.done }),
          }, svg(icons.check)),
          h('span', { class: 'dreams__type' }, t(`us.dreams.kinds.${d.data.type}`)),
          h('span', { class: 'dreams__text' }, d.data.text),
          h('button', { type: 'button', class: 'cgoal__remove', 'aria-label': t('us.children.remove'), onclick: () => circles.drop(circle.id, 'dream', d.id) }, svg(icons.trash)),
        ))),
        form,
      );
    }),
  );
}
