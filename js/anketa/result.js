import { h } from '../core/dom.js';
import { at } from './texts.js';

/* «НАШ ИТОГ» — итог двух анкет (сервер считает его сам: planner gsl/anketa/compare.js). Без процентов (владелец
   26.11.2026): по блокам «совпало · попробовать · обсудить»; интим — только совпадения; данные рождения сюда не
   приходят вовсе. resultView(result, them) — them — имя второго человека. Один вид в приложении и на странице гостя. */

const KINDS = ['together', 'tryIt', 'talk', 'differ', 'info'];
// «+» → «+ да» и т. п.; варианты и свои строки — как есть
const word = (v) => (v == null ? '—' : at('answer')[v] || v);

function rows(list, kind, them) {
  return h('ul', { class: `anketa-res__list anketa-res__list--${kind}` }, ...list.map((r) => h('li', {},
    h('span', { class: 'anketa-res__label' }, r.label),
    r.no ? h('span', { class: 'faint' }, ` — ${at('no')}`) : null,
    kind !== 'together' || r.mine !== r.theirs
      ? h('span', { class: 'anketa-res__answers' },
        h('span', {}, `${at('me')}: ${word(r.mine)}`), h('span', {}, `${them}: ${word(r.theirs)}`))
      : null)));
}

function section(title, kind, node) {
  return h('div', { class: `anketa-res__part anketa-res__part--${kind}` }, h('p', { class: 'caps anketa-res__cap' }, title), node);
}

function exchangeView(list) {
  return h('ul', { class: 'anketa-res__list' }, ...list.map((s) => h('li', {},
    h('span', { class: 'anketa-res__label' }, s.title),
    h('span', { class: 'anketa-res__status', dataset: { status: s.status } }, at(s.status)))));
}

function blockView(b, them) {
  const parts = [];
  if (b.intim) {
    if (b.both.length) parts.push(section(at('intimBoth'), 'together', h('p', {}, b.both.join(' · '))));
    if (b.soft.length) parts.push(section(at('intimSoft'), 'tryIt', h('p', {}, b.soft.join(' · '))));
  } else {
    if (b.love) {
      const names = (list) => list.map((k) => at('love')[k]).join(' · ') || '—';
      parts.push(section(at('loveTitle'), 'together', h('p', {},
        b.love.shared.length ? [h('b', {}, `${at('loveShared')}: ${names(b.love.shared)}`), h('br')] : null,
        `${at('loveMine')}: ${names(b.love.mine)}`, h('br'), `${them}: ${names(b.love.theirs)}`)));
    }
    for (const kind of KINDS) if (b[kind]?.length) parts.push(section(at(kind), kind, rows(b[kind], kind, them)));
    if (b.support?.length) {
      parts.push(section(at('supportTitle'), 'support', h('ul', { class: 'anketa-res__list' }, ...b.support.map((s) => h('li', {},
        h('span', { class: 'anketa-res__label' }, s.label),
        h('span', { class: 'anketa-res__status', dataset: { status: s.kind } },
          `${at(s.dir, { them })} — ${at(s.kind).toLowerCase()}`))))));
    }
    if (b.exchange?.mine.length) parts.push(section(at('exchangeMine'), 'exchange', exchangeView(b.exchange.mine)));
    if (b.exchange?.theirs.length) parts.push(section(at('exchangeTheirs', { them }), 'exchange', exchangeView(b.exchange.theirs)));
  }
  const c = b.counts || {};
  return h('details', { class: 'help__folder anketa-res__block' },
    h('summary', { class: 'help__folder-summary' }, h('span', { class: 'help__folder-title' }, b.title),
      b.intim ? h('span', { class: 'help__count' }, String(c.together || 0))
        : (c.together || c.tryIt || c.talk) ? h('span', { class: 'help__count' }, at('totals', { a: c.together || 0, b: c.tryIt || 0, c: c.talk || 0 })) : null),
    h('div', { class: 'help__folder-body' }, ...parts));
}

/** Весь итог: строка «совпало · попробовать · обсудить» и блоки. */
export function resultView(result, them) {
  const t = result.totals;
  return h('div', { class: 'anketa-res' },
    h('p', { class: 'anketa-res__totals' },
      h('span', { class: 'anketa-res__num anketa-res__num--together' }, String(t.together), ' ', at('together').toLowerCase()),
      h('span', { class: 'anketa-res__num anketa-res__num--try' }, String(t.tryIt), ' ', at('tryIt').toLowerCase()),
      h('span', { class: 'anketa-res__num anketa-res__num--talk' }, String(t.talk), ' ', at('talk').toLowerCase())),
    ...result.blocks.map((b) => blockView(b, them)));
}
