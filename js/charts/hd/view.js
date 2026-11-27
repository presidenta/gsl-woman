import { h } from '../../core/dom.js';
import { bodygraph } from './bodygraph.js'; // рисунок по образцу: силуэт, плавные каналы, планеты по бокам (226)
import { zonedToUtc, chart, composite, PAIR_KINDS, CENTERS, BODIES, CHANNELS } from './calc.js';
import { crossKey } from './crosses.js';
import { TX, crossName } from './texts/index.js'; // тексты на языке приложения (218)
const fold = (title, ...body) => h('details', { class: 'help__folder' }, h('summary', { class: 'help__folder-summary' }, h('span', { class: 'help__folder-title' }, title)), h('div', { class: 'help__folder-body' }, ...body));
const para = (b, t) => (t ? h('p', {}, h('b', {}, b), ' ', t) : null);
const item = (title, ...rows) => h('div', { class: 'chart__item' }, h('p', { class: 'caps' }, title), ...rows);
const row = (n, v) => h('li', {}, h('span', {}, n), h('b', {}, v));
const gateText = (T, g) => (T.gates[g] ? `${T.gates[g][0]} — ${T.gates[g][1]}` : '');
const channelOf = (T, id) => { const [a, b] = id.split('–'); return T.channels[`${a}-${b}`] || T.channels[`${b}-${a}`]; };
const centerList = (T, list) => list.map((c) => T.centers[c].name).join(', ') || '—';

/** Расшифровка карты: тип, авторитет, профиль, определённость, крест (имя из 192), центры, каналы, все ворота. */
function decoding(r, T) {
  const U = T.ui;
  const Ty = T.types[r.type];
  const Au = T.authorities[r.authority];
  const [l1, l2] = r.profile.split('/').map(Number);
  const Pr = T.profiles[r.profile];
  const Df = T.definition[Math.min(r.definition, 4)];
  const An = T.angles[r.angle];
  const cross = crossName(T, crossKey(r.cross[0], r.angle), r.angle);
  // ворота → где стоят: «Солнце Л 8.2» (Личность), «Луна Д 43.4» (Дизайн)
  const at = {};
  for (const [src, mark] of [[r.personality, U.P], [r.design, U.D]]) {
    for (const b of BODIES) (at[src[b].gate] ||= []).push(`${T.bodies[b]} ${mark} ${src[b].gate}.${src[b].line}`);
  }
  return fold(U.decoding,
    h('p', { class: 'faint' }, T.source),
    item(`${U.type}: ${Ty.name}`, para(U.role, Ty.role), para(U.energy, Ty.howEnergyWorks), para(U.strategy, Ty.strategy),
      para(U.signature, Ty.signature), para(U.notSelf, Ty.notSelfTheme), para(U.aura, Ty.aura),
      para(U.withThem, Ty.withThem), para(U.practice, Ty.practicalGuidance)),
    item(`${U.authority}: ${Au.name}`, para(U.feel, Au.feel), para(U.howToDecide, Au.howToDecide), para(U.pitfall, Au.pitfalls)),
    item(`${U.profile} ${r.profile}${Pr ? ` — ${Pr[0]}` : ''}`, Pr ? h('p', {}, Pr[1]) : null,
      para(U.linePersonality, T.lines[l1]), para(U.lineDesign, T.lines[l2])),
    Df ? item(`${U.definition}: ${Df[0]}`, h('p', {}, Df[1])) : null,
    item(`${U.cross}: ${cross || (An ? An[0] : '')}`, h('p', { class: 'faint' }, T.crossNote), An ? para(`${An[0]}.`, An[1]) : null,
      ...[[U.sunP, r.cross[0]], [U.earthP, r.cross[1]], [U.sunD, r.cross[2]], [U.earthD, r.cross[3]]]
        .map(([n, g]) => para(`${n} — ${g}:`, gateText(T, g)))),
    item(U.centers, ...Object.keys(CENTERS).map((c) => {
      const on = r.defined.includes(c);
      const x = T.centers[c];
      return h('div', {}, para(`${x.name} — ${on ? U.isDefined : U.isOpen}:`, `${x.theme} ${on ? x.definedMeaning : x.undefinedMeaning}`),
        on ? null : para(U.question, `«${x.question}»`));
    })),
    r.channels.length ? item(U.channels, h('p', { class: 'faint' }, T.circuitNote),
      ...r.channels.map((id) => { const c = channelOf(T, id); return c ? para(`${id} — ${U.channel} ${c[0]} (${T.circuits[c[1]]}):`, c[2]) : null; })) : null,
    item(U.gates, h('p', { class: 'faint' }, U.gatesNote),
      ...Object.keys(at).map(Number).sort((a, b) => a - b).map((g) => para(`${g} (${at[g].join(', ')}):`, gateText(T, g)))));
}

/* Карточка «Human Design»: тип, авторитет, профиль, крест, центры, каналы, активации Личности и Дизайна. Нужны дата, время
   и город с часовым поясом (подсказка города в анкете). Библиотека астрономии (astronomy.js, ~400 КБ) грузится только
   здесь, когда карточку открыли, — запуск приложения не тяжелеет. */
export function hdCard({ date, time, city, caption = null }) {
  const T = TX();
  const U = T.ui;
  const tz = city && typeof city === 'object' ? city.tz : null;
  const head = [h('h2', { class: 'card__title' }, U.title), caption ? h('p', { class: 'chart__src' }, caption) : null];
  if (!date || !time || !tz) {
    return h('section', { class: 'card hd' }, ...head, h('p', { class: 'faint' }, U.needData));
  }
  const body = h('div', {}, h('p', { class: 'faint' }, U.counting));
  import('./astronomy.js').then((A) => {
    const r = chart(A, zonedToUtc(date, time, tz));
    const acts = (src) => h('ul', { class: 'pyth__lines hd__acts' }, ...BODIES.map((b) => row(T.bodies[b], `${src[b].gate}.${src[b].line}`)));
    const cross = crossName(T, crossKey(r.cross[0], r.angle), r.angle);
    body.replaceChildren(
      bodygraph(r, CHANNELS, T),
      h('ul', { class: 'pyth__lines' },
        row(U.type, T.types[r.type].name), row(U.authority, T.authorities[r.authority].name), row(U.profile, T.profiles[r.profile] ? `${r.profile} ${T.profiles[r.profile][0]}` : r.profile), // сразу с названием (владелец 28.11.2026: «1/3 — и название»)
        row(U.cross, `${r.cross[0]}/${r.cross[1]} | ${r.cross[2]}/${r.cross[3]}`)),
      cross ? h('p', { class: 'faint' }, cross) : null,
      h('h3', { class: 'caps mx__cap' }, U.centers),
      h('p', {}, h('b', {}, U.defined), centerList(T, r.defined)),
      h('p', {}, h('b', {}, U.open), centerList(T, r.open)),
      h('h3', { class: 'caps mx__cap' }, U.channels),
      h('p', {}, r.channels.join(' · ') || '—'),
      h('details', { class: 'help__folder' }, h('summary', { class: 'help__folder-summary' }, h('span', { class: 'help__folder-title' }, U.activations)),
        h('div', { class: 'help__folder-body hd__cols' },
          h('div', {}, h('p', { class: 'caps' }, U.personality), acts(r.personality)),
          h('div', {}, h('p', { class: 'caps' }, U.design), acts(r.design)))),
      decoding(r, T));
  }).catch(() => body.replaceChildren(h('p', { class: 'faint' }, U.loadError)));
  return h('section', { class: 'card hd' }, ...head, body);
}

/** Human Design пары: общий бодиграф (светлое — ты, красное — партнёр, полоса — оба), тип пары, виды каналов. */
export function pairHdCard(a, b, caption) {
  const T = TX();
  const U = T.ui;
  const tzOf = (c) => (c && typeof c === 'object' ? c.tz : null);
  const head = [h('h2', { class: 'card__title' }, U.pairTitle), h('p', { class: 'chart__src' }, caption)];
  if (!a.date || !a.time || !tzOf(a.city) || !b.date || !b.time || !tzOf(b.city)) {
    return h('section', { class: 'card hd' }, ...head, h('p', { class: 'faint' }, U.needBoth));
  }
  const body = h('div', {}, h('p', { class: 'faint' }, U.counting));
  import('./astronomy.js').then((A) => {
    const ra = chart(A, zonedToUtc(a.date, a.time, tzOf(a.city)));
    const rb = chart(A, zonedToUtc(b.date, b.time, tzOf(b.city)));
    const c = composite(ra, rb);
    const all = (r) => Object.fromEntries([...Object.values(r.personality), ...Object.values(r.design)].map((x, i) => [i, x]));
    const view = { personality: all(ra), design: all(rb), defined: c.defined, channels: c.channels.map((x) => x.id) };
    body.replaceChildren(
      bodygraph(view, CHANNELS, T, { cols: false }),
      h('p', { class: 'faint' }, U.pairLegend),
      h('ul', { class: 'pyth__lines' }, row(U.pairType, T.types[c.type].name), row(U.you, T.types[ra.type].name), row(U.partner, T.types[rb.type].name)),
      h('p', {}, h('b', {}, U.commonCenters), centerList(T, c.defined)),
      ...Object.keys(PAIR_KINDS).map((k) => {
        const ids = c.channels.filter((x) => x.kind === k).map((x) => x.id);
        return ids.length ? h('div', {}, h('p', {}, h('b', {}, `${T.pairKinds[k][0]}: `), ids.join(' · ')), h('p', { class: 'faint' }, T.pairKinds[k][1])) : null;
      }).filter(Boolean)); // replaceChildren(null) печатает «null» — пустые виды убираем
  }).catch(() => body.replaceChildren(h('p', { class: 'faint' }, U.loadError)));
  return h('section', { class: 'card hd' }, ...head, body);
}
