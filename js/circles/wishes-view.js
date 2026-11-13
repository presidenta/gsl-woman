import { h, svg } from '../core/dom.js';
import { t } from '../core/i18n.js';
import { icons } from '../ui/icons.js';
import * as circles from './circles.js';
import * as wishes from './wishes.js';

/* ЭКРАН ЖЕЛАНИЙ НА ВЫХОДНЫЕ (wishes.js — данные).

   Обычные разделы (отдых, природа, вдвоём…) — у каждого желания мои «Да» и «Возможно» и отметка партнёра рядом;
   совпадения светятся, сверху — итог «в эти выходные вы оба хотите».

   «Близость» (владелец 13.11.2026, сборка 44: «через я-сообщение; не „для меня“, а „буду благодарна за…“; служение —
   „хочу сделать для тебя“») — отдельный блок из двух списков с одинаковыми ключами:
     «Буду благодарна (благодарен) за…» — «Да» / «Возможно»; рядом — «он хочет сделать это для тебя», если так;
     «Хочу сделать для тебя» — «Хочу сделать»; рядом — «ей будет приятно», если партнёр отметил это у себя.
   Совпадение — когда одному приятно, а второй хочет это сделать. В каждом списке — «＋ своё».
   Раскрытые разделы помнит этот экран. */

const open = new Set(['rest']);
const MARK_ICON = { yes: '+', maybe: '±', give: '✦' };

const markLabel = (m) => (m === 'give' ? t('us.wishes.giveMark') : t(`us.wishes.${m}`));

function marksRow(circle, week, w, options, mine) {
  return h('div', { class: 'wish__marks', role: 'group', 'aria-label': w.text },
    ...options.map((m) => h('button', {
      type: 'button',
      class: `wish__mark is-${m}${mine === m ? ' is-on' : ''}`,
      'aria-pressed': String(mine === m),
      onclick: () => wishes.setMark(circle, week, w.key, m),
    }, h('span', { class: 'wish__mark-sign', 'aria-hidden': 'true' }, MARK_ICON[m]), markLabel(m))));
}

function wishRow({ circle, week, w, options, mine, note, match }) {
  return h('li', { class: `wish${match ? ` is-match is-${match}` : ''}${w.own ? ' is-own' : ''}` },
    h('div', { class: 'wish__text' },
      match === 'both' ? h('span', { class: 'wish__fire', 'aria-hidden': 'true' }, '🔥') : null,
      h('span', {}, w.text),
      note ? h('span', { class: `wish__partner${match ? ' is-yes' : ''}` }, note) : null,
    ),
    marksRow(circle, week, w, options, mine),
  );
}

function addForm(circle, mode, section, placeholder) {
  const input = h('input', { class: 'input wish__new-input', maxlength: '120', placeholder, 'aria-label': t('us.wishes.add') });
  const form = h('form', { class: 'wish__new' }, input, h('button', { type: 'submit', class: 'goals__add', 'aria-label': t('us.wishes.addBtn') }, svg(icons.plus)));
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    if (wishes.addOwn(circle, mode, section, input.value)) input.value = '';
  });
  return form;
}

function details(id, title, count, extraClass, ...body) {
  const box = h('details', { class: `wish-section${extraClass ? ` ${extraClass}` : ''}` },
    h('summary', { class: 'wish-section__head' },
      h('span', { class: 'wish-section__title' }, title),
      count ? h('span', { class: 'wish-section__count' }, String(count)) : null,
      h('span', { class: 'fold__arrow' }, svg(icons.chevronRight, 'fold__chevron')),
    ),
    ...body,
  );
  box.open = open.has(id);
  box.addEventListener('toggle', () => { if (box.open) open.add(id); else open.delete(id); });
  return box;
}

// Обычный раздел: «Да / Возможно» у обоих
function section(circle, week, name, all) {
  const partner = circles.partnerOf(circle);
  const ids = [circle.me, partner?.id].filter(Boolean);
  const list = wishes.sectionList(circle.id, name);
  const count = list.filter((w) => (all[w.key] || {})[circle.me]).length;
  return details(`want.${name}`, t(`us.wishes.sections.${name}`), count, '',
    h('ul', { class: 'wish-list' }, ...list.map((w) => {
      const by = all[w.key] || {};
      const theirs = partner ? by[partner.id] : null;
      return wishRow({
        circle, week, w, options: wishes.MARKS, mine: by[circle.me],
        note: theirs ? `${t('us.wishes.partner')}: ${t(`us.wishes.${theirs}`)}` : '',
        match: wishes.matchOf(by, ids),
      });
    })),
    name === 'care' ? addForm(circle, 'give', 'care', t('us.wishes.givePh')) : addForm(circle, 'want', name, t('us.wishes.addPh')),
  );
}

// «Близость»: «буду благодарна за…» и «хочу сделать для тебя», совпадения — крест-накрест по ключу
function closeBlock(circle, week, all) {
  const partner = circles.partnerOf(circle);
  const pid = partner?.id;
  const receive = wishes.list(circle.id, 'want', 'close');
  const give = wishes.list(circle.id, 'give', 'close');
  const mineCount = [...receive, ...give].filter((w) => (all[w.key] || {})[circle.me]).length;

  const receiveRows = receive.map((w) => {
    const mine = (all[w.key] || {})[circle.me];
    const gives = !!pid && w.pairKey && (all[w.pairKey] || {})[pid] === 'give';
    const theirs = pid ? (all[w.key] || {})[pid] : null;
    const note = gives ? t('us.wishes.partnerGives') : theirs ? `${t('us.wishes.partner')}: ${t(`us.wishes.${theirs}`)}` : '';
    const match = gives && mine === 'yes' ? 'both' : gives && mine === 'maybe' ? 'soft' : null;
    return wishRow({ circle, week, w, options: wishes.MARKS, mine, note, match });
  });
  const giveRows = give.map((w) => {
    const mine = (all[w.key] || {})[circle.me];
    const wants = pid && w.pairKey ? (all[w.pairKey] || {})[pid] : null;
    const note = wants === 'yes' ? t('us.wishes.partnerWants') : wants === 'maybe' ? t('us.wishes.partnerMaybe') : '';
    const match = mine === 'give' && wants === 'yes' ? 'both' : mine === 'give' && wants === 'maybe' ? 'soft' : null;
    return wishRow({ circle, week, w, options: ['give'], mine, note, match });
  });

  return details('close', t('us.wishes.closeTitle'), mineCount, 'is-close',
    h('p', { class: 'faint wish-section__lead' }, t('us.wishes.closeLead')),
    h('h3', { class: 'wish-sub' }, t('us.wishes.receive')),
    h('ul', { class: 'wish-list' }, ...receiveRows),
    addForm(circle, 'want', 'close', t('us.wishes.receivePh')),
    h('h3', { class: 'wish-sub' }, t('us.wishes.giveTitle')),
    h('ul', { class: 'wish-list' }, ...giveRows),
    addForm(circle, 'give', 'close', t('us.wishes.givePh')),
  );
}

export function wishesView(circle) {
  const week = circles.weekOf();
  const all = wishes.marks(circle.id, week);
  const found = wishes.matches(circle, week);
  return h('section', { class: 'card wishes' },
    h('h2', { class: 'card__title' }, t('us.wishes.title')),
    h('p', { class: 'card__text faint' }, t('us.wishes.lead')),
    h('div', { class: `wishes__matches${found.length ? '' : ' is-empty'}` },
      h('p', { class: 'caps wishes__matches-title' }, t('us.wishes.match')),
      found.length
        ? h('ul', { class: 'wishes__chips' }, ...found.map((w) => h('li', { class: `wishes__chip is-${w.match}` }, w.match === 'both' ? '🔥 ' : '', w.text)))
        : h('p', { class: 'faint' }, t('us.wishes.matchSoon')),
    ),
    ...wishes.WANT_SECTIONS.map((s) => section(circle, week, s, all)),
    closeBlock(circle, week, all),
    h('button', { type: 'button', class: 'btn btn--ghost btn--block wishes__copy', onclick: () => wishes.copyLastWeek(circle, week) }, t('us.wishes.lastWeek')),
  );
}
