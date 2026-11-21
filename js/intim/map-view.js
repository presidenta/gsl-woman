import { h, svg } from '../core/dom.js';
import { icons } from '../ui/icons.js';
import { ask } from '../ui/ask.js';
import * as map from './map.js';
import { it } from './texts.js';

/* КАРТА ЖЕЛАНИЙ НА ЭКРАНЕ: сверху — совпадения пары (только они видны второму), ниже — разделы карты, раскрываются
   по нажатию; у каждого пункта — «Да» и «Может быть» (нажать ещё раз — снять); внизу раздела — «＋ своё».
   Раскрытые разделы переживают перерисовку. */

const open = new Set();
const SIGN = { yes: '+', maybe: '±' };

function marks(key, mine) {
  return h('div', { class: 'wish__marks', role: 'group' },
    ...map.MARKS.map((m) => h('button', {
      type: 'button',
      class: `wish__mark is-${m}${mine === m ? ' is-on' : ''}`,
      'aria-pressed': String(mine === m),
      onclick: () => map.setMark(key, m),
    }, h('span', { class: 'wish__mark-sign', 'aria-hidden': 'true' }, SIGN[m]), it(m))));
}

function row(key, text, mine, match, extra = null) {
  return h('li', { class: `wish${match ? ` is-match is-${match}` : ''}` },
    h('div', { class: 'wish__text' },
      match === 'both' ? h('span', { class: 'wish__fire', 'aria-hidden': 'true' }, '🔥') : null,
      h('span', {}, text),
      match ? h('span', { class: 'wish__partner is-yes' }, it(match)) : null,
      extra),
    marks(key, mine));
}

function addForm(section) {
  const input = h('input', { class: 'input wish__new-input', maxlength: '120', placeholder: it('addPh'), 'aria-label': it('add') });
  const form = h('form', { class: 'wish__new' }, input, h('button', { type: 'submit', class: 'goals__add', 'aria-label': it('add') }, svg(icons.plus)));
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    if (map.addOwn(section, input.value)) input.value = '';
  });
  return form;
}

const removeBtn = (w) => h('button', {
  type: 'button', class: 'intim-map__x', 'aria-label': it('remove'), title: it('remove'),
  onclick: async () => { if (await ask({ title: it('removeAsk', { text: w.text }), yes: it('remove') })) map.removeOwn(w.id); },
}, svg(icons.close));

/** Совпадения пары — список названий пунктов. */
function matchesBlock(data, matchList, paired) {
  const names = new Map();
  for (const s of data.sections) {
    for (const [k, text] of s.items) names.set(`${s.key}.${k}`, text);
    for (const w of map.ownList(s.key)) names.set(`${s.key}.${w.id}`, w.text);
  }
  const list = matchList.filter((m) => names.has(m.key));
  return h('div', { class: 'intim-map__matches' },
    h('p', { class: 'caps intim-map__caps' }, it('matchesTitle')),
    h('p', { class: 'faint' }, paired ? it('matchesLead') : it('matchesSolo')),
    paired && !list.length ? h('p', { class: 'faint' }, it('matchesNone')) : null,
    list.length ? h('ul', { class: 'wish-list' }, ...list.map((m) => h('li', { class: `wish is-match is-${m.match}` },
      h('div', { class: 'wish__text' },
        m.match === 'both' ? h('span', { class: 'wish__fire', 'aria-hidden': 'true' }, '🔥') : null,
        h('span', {}, names.get(m.key)),
        h('span', { class: 'wish__partner is-yes' }, it(m.match)))))) : null);
}

/** Карта желаний целиком. data — поле map раздела intim. */
export function mapView(data) {
  const p = map.pairNow();
  if (p) map.mirrorToPair(p); // отмеченное до пары — в контур (пишет только недостающее)
  const mine = map.myMarks();
  const matchList = map.matches(p);
  const matchBy = new Map(matchList.map((m) => [m.key, m.match]));
  return h('div', { class: 'intim-map' },
    h('p', { class: 'card__text' }, data.lead),
    matchesBlock(data, matchList, !!p),
    ...data.sections.map((s) => {
      const ready = s.items.map(([k, text]) => ({ key: `${s.key}.${k}`, text }));
      const own = map.ownList(s.key).map((w) => ({ key: `${s.key}.${w.id}`, text: w.text, w }));
      const count = [...ready, ...own].filter((x) => mine[x.key]).length;
      const box = h('details', { class: 'wish-section' },
        h('summary', { class: 'wish-section__head' },
          h('span', { class: 'wish-section__title' }, s.title),
          count ? h('span', { class: 'wish-section__count' }, String(count)) : null,
          h('span', { class: 'fold__arrow' }, svg(icons.chevronRight, 'fold__chevron'))),
        h('ul', { class: 'wish-list' },
          ...ready.map((x) => row(x.key, x.text, mine[x.key], matchBy.get(x.key))),
          ...own.map((x) => row(x.key, x.text, mine[x.key], matchBy.get(x.key), x.w.mine ? removeBtn(x.w) : null))),
        addForm(s.key));
      box.open = open.has(s.key);
      box.addEventListener('toggle', () => { if (box.open) open.add(s.key); else open.delete(s.key); });
      return box;
    }));
}
