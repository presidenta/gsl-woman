import { h, svg } from '../core/dom.js';
import { icons } from '../ui/icons.js';
import { flagRow } from '../ui/flags.js';
import { ct } from './texts.js';

/* ТЕСТ «ЧЕК-ЛИСТ: 7 ЧАКР В ПАРЕ» (владелец 22.11.2026: «сделай такой чек-лист, где будет сразу с результатами, кто где
   пошёл в перекос… мужчина или женщина»). Признаки — глава книжечки слово в слово (сервер gsl/energy, у каждого
   пункта who: 'man' | 'woman' | 'pair' | 'both'). Человек ставит галочки — внизу сразу итог: у кого больше перекосов,
   и по каждой чакре — сколько признаков у мужчины, у женщины, в паре и чей перекос. Галочки не хранятся (как флаги
   в «Вопросах»). Стыковка — одна строка в screens/help/help.js (questionPlates: g.check). */

const name = (title) => title.split(' — ')[0]; // «1-я чакра (Муладхара)»
const ZERO = () => ({ man: 0, woman: 0, pair: 0, both: 0 });

/** Итог по отметкам: picks — по чакрам { man, woman, pair, both } (число галочек). Вынесено для проверок. */
export function summary(picks) {
  const sum = ZERO();
  picks.forEach((got) => Object.keys(sum).forEach((k) => { sum[k] += got[k] || 0; }));
  const lean = ({ man = 0, woman = 0 }) => (man > woman ? 'man' : woman > man ? 'woman' : man ? 'equal' : null);
  const top = sum.man > sum.woman ? 'man' : sum.woman > sum.man ? 'woman' : sum.man ? 'equal' : null;
  return { sum, top, leans: picks.map(lean) };
}

export function chakraCheck(g) {
  const total = h('div', { class: 'flags-total chakra-total' });
  const chakras = g.sections.map((s) => {
    const rows = s.entries.map((e) => h('div', { class: 'chakra-check__who' },
      h('p', { class: 'help__text chakra-check__label' }, e.text),
      ...(e.sub || []).map((x) => flagRow('red', x, { value: e.who, onChange: paint }))));
    const node = h('details', { class: 'help__folder' },
      h('summary', { class: 'help__folder-summary' }, svg(icons.chevronRight, 'help__chevron'), h('span', { class: 'help__folder-title' }, s.title)),
      h('div', { class: 'help__folder-body' }, ...rows));
    const all = Object.fromEntries(s.entries.map((e) => [e.who, (e.sub || []).length]));
    return { s, node, all };
  });

  function paint() {
    const picks = chakras.map((c) => {
      const got = ZERO();
      for (const b of c.node.querySelectorAll('.flag__box:checked')) got[b.value] += 1;
      return got;
    });
    const { sum, top, leans } = summary(picks);
    const lines = chakras.map((c, i) => {
      const got = picks[i];
      if (!Object.values(got).some(Boolean)) return null;
      const parts = Object.keys(c.all).map((k) => ct('of', { who: ct(`who.${k}`), n: got[k], all: c.all[k] }));
      const lean = leans[i] === 'equal' ? ct('leanEqual') : leans[i] ? ct('lean', { who: ct(`who.${leans[i]}`) }) : '';
      return h('li', {}, h('b', {}, name(c.s.title)), ': ', parts.join(', '), lean ? h('span', { class: 'chakra-total__lean' }, ` — ${lean}`) : null);
    }).filter(Boolean);
    const head = top === 'equal' ? ct('equal', { n: sum.man })
      : top ? ct('most', { who: ct(`who.${top}`), n: sum[top] })
        : ct('most', { who: ct('who.pair'), n: sum.pair + sum.both });
    total.replaceChildren(
      h('p', { class: 'caps flags-total__title' }, ct('total')),
      lines.length
        ? h('div', {},
          h('p', { class: 'flags-total__verdict chakra-total__head' }, head),
          h('ul', { class: 'chakra-total__list' }, ...lines),
          h('p', { class: 'card__text' }, ct('fix')),
          h('a', { class: 'chakra-total__open', href: '#/library' }, ct('open')),
          h('p', { class: 'faint' }, ct('note')))
        : h('p', { class: 'faint' }, ct('empty')));
  }
  paint();

  return [
    g.lead ? h('p', { class: 'help__section-lead' }, g.lead) : null,
    h('p', { class: 'faint help__flags-hint' }, ct('hint')),
    ...chakras.map((c) => c.node),
    total,
  ];
}
