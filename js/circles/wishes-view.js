import { h, svg } from '../core/dom.js';
import { t } from '../core/i18n.js';
import { icons } from '../ui/icons.js';
import { segmented } from '../ui/controls.js';
import * as circles from './circles.js';
import * as wishes from './wishes.js';

/* ЭКРАН ЖЕЛАНИЙ НА ВЫХОДНЫЕ (wishes.js — данные). «Хочу» — по разделам: у каждого желания мои кнопки «Да» и
   «Возможно» и отметка партнёра рядом; совпадения светятся, сверху — итог «в эти выходные вы оба хотите».
   «Для тебя» — что я хочу сделать для тебя: «Хочу сделать» у себя; если это хочет сделать партнёр — «Да».
   В каждом разделе — «＋ своё». Раскрытые разделы помнит этот экран. */

let mode = 'want';
const open = new Set(['rest']);
const MARK_ICON = { yes: '+', maybe: '±', give: '✦' };

function partnerMark(circle, mark) {
  const partner = circles.partnerOf(circle);
  if (!mark || !partner) return null;
  const text = mark === 'give' ? `${t('us.wishes.partner')} ${t('us.wishes.giveTheirs')}` : `${t('us.wishes.partner')}: ${t(`us.wishes.${mark}`)}`;
  return h('span', { class: `wish__partner is-${mark}` }, text);
}

function row(circle, week, section, w, all) {
  const partner = circles.partnerOf(circle);
  const by = all[w.key] || {};
  const mine = by[circle.me];
  const theirs = partner ? by[partner.id] : null;
  const ids = [circle.me, partner?.id].filter(Boolean);
  let options;
  if (mode === 'give') options = theirs === 'give' ? ['give', 'yes'] : ['give'];
  else options = wishes.marksOf(section);
  const match = mode === 'give'
    ? ((mine === 'give' && theirs === 'yes') || (mine === 'yes' && theirs === 'give') ? 'both' : null)
    : wishes.matchOf(by, ids);
  return h('li', { class: `wish${match ? ` is-match is-${match}` : ''}${w.own ? ' is-own' : ''}` },
    h('div', { class: 'wish__text' },
      match === 'both' ? h('span', { class: 'wish__fire', 'aria-hidden': 'true' }, '🔥') : null,
      h('span', {}, w.text),
      partnerMark(circle, theirs),
    ),
    h('div', { class: 'wish__marks', role: 'group', 'aria-label': w.text },
      ...options.map((m) => h('button', {
        type: 'button',
        class: `wish__mark is-${m}${mine === m ? ' is-on' : ''}`,
        'aria-pressed': String(mine === m),
        onclick: () => wishes.setMark(circle, week, w.key, m),
      }, h('span', { class: 'wish__mark-sign', 'aria-hidden': 'true' }, MARK_ICON[m]), m === 'give' ? t('us.wishes.giveMark') : t(`us.wishes.${m}`)))),
  );
}

function section(circle, week, name, all) {
  const list = wishes.list(circle.id, mode, name);
  const input = h('input', { class: 'input wish__new-input', maxlength: '120', placeholder: mode === 'give' ? t('us.wishes.givePh') : t('us.wishes.addPh'), 'aria-label': t('us.wishes.add') });
  const form = h('form', { class: 'wish__new' }, input, h('button', { type: 'submit', class: 'goals__add', 'aria-label': t('us.wishes.addBtn') }, svg(icons.plus)));
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    if (wishes.addOwn(circle, mode, name, input.value)) input.value = '';
  });
  const count = list.filter((w) => (all[w.key] || {})[circle.me]).length;
  const box = h('details', { class: `wish-section${name === 'close' ? ' is-close' : ''}` },
    h('summary', { class: 'wish-section__head' },
      h('span', { class: 'wish-section__title' }, t(`us.wishes.sections.${name}`)),
      count ? h('span', { class: 'wish-section__count' }, String(count)) : null,
      h('span', { class: 'fold__arrow' }, svg(icons.chevronRight, 'fold__chevron')),
    ),
    h('ul', { class: 'wish-list' }, ...list.map((w) => row(circle, week, name, w, all))),
    form,
  );
  box.open = open.has(`${mode}.${name}`);
  box.addEventListener('toggle', () => { if (box.open) open.add(`${mode}.${name}`); else open.delete(`${mode}.${name}`); });
  return box;
}

export function wishesView(circle, rerender) {
  const week = circles.weekOf();
  const all = wishes.marks(circle.id, week);
  const found = mode === 'want' ? wishes.matches(circle, week) : [];
  return h('section', { class: 'card wishes' },
    h('h2', { class: 'card__title' }, t('us.wishes.title')),
    h('div', { class: 'wishes__mode' }, segmented({
      label: t('us.wishes.title'),
      options: wishes.MODES.map((m) => ({ value: m, label: t(`us.wishes.${m}`) })),
      value: mode,
      onChange: (m) => { mode = m; rerender(); },
    })),
    h('p', { class: 'card__text faint' }, mode === 'want' ? t('us.wishes.lead') : t('us.wishes.giveLead')),
    mode === 'want'
      ? h('div', { class: `wishes__matches${found.length ? '' : ' is-empty'}` },
        h('p', { class: 'caps wishes__matches-title' }, t('us.wishes.match')),
        found.length
          ? h('ul', { class: 'wishes__chips' }, ...found.map((w) => h('li', { class: `wishes__chip is-${w.match}` }, w.match === 'both' ? '🔥 ' : '', w.text)))
          : h('p', { class: 'faint' }, t('us.wishes.matchSoon')),
      )
      : null,
    ...wishes.sectionsOf(mode).map((s) => section(circle, week, s, all)),
    h('button', { type: 'button', class: 'btn btn--ghost btn--block wishes__copy', onclick: () => wishes.copyLastWeek(circle, week) }, t('us.wishes.lastWeek')),
  );
}
