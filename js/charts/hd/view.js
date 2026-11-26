import { h } from '../../core/dom.js';
import { zonedToUtc, chart, composite, PAIR_KINDS, CENTERS, TYPES, AUTHORITIES, BODIES, BODY_RU, CHANNELS } from './calc.js';
import { HD_SOURCE, HD_TYPE_DB, HD_AUTHORITY_DB, HD_LINE_DB, HD_PROFILE_DB, HD_CENTER_DB, HD_GATES, HD_CHANNELS, CIRCUIT_NOTE,
  HD_DEFINITION_DB, HD_ANGLE_DB, CROSS_NOTE, HD_PAIR_DB } from './texts.js'; // расшифровка по системе Ра Уру Ху (216)
const fold = (title, ...body) => h('details', { class: 'help__folder' }, h('summary', { class: 'help__folder-summary' }, h('span', { class: 'help__folder-title' }, title)), h('div', { class: 'help__folder-body' }, ...body));
const para = (b, t) => (t ? h('p', {}, h('b', {}, b), ' ', t) : null);
const item = (title, ...rows) => h('div', { class: 'chart__item' }, h('p', { class: 'caps' }, title), ...rows);
const gateText = (g) => (HD_GATES[g] ? `${HD_GATES[g][0]} — ${HD_GATES[g][1]}` : '');
const channelOf = (id) => { const [a, b] = id.split('–'); return HD_CHANNELS[`${a}-${b}`] || HD_CHANNELS[`${b}-${a}`]; };

/** Расшифровка карты: тип, авторитет, профиль, определённость, крест, центры, каналы, все ворота. */
function decoding(r) {
  const T = HD_TYPE_DB[r.type] || {};
  const Au = HD_AUTHORITY_DB[r.authority] || {};
  const [l1, l2] = r.profile.split('/').map(Number);
  const Pr = HD_PROFILE_DB[r.profile];
  const Df = HD_DEFINITION_DB[Math.min(r.definition, 4)];
  const An = HD_ANGLE_DB[r.angle];
  // ворота → где стоят: «Солнце Л» (Личность), «Луна Д» (Дизайн)
  const at = {};
  for (const [src, mark] of [[r.personality, 'Л'], [r.design, 'Д']]) {
    for (const b of BODIES) (at[src[b].gate] ||= []).push(`${BODY_RU[b]} ${mark} ${src[b].gate}.${src[b].line}`);
  }
  return fold('Расшифровка',
    h('p', { class: 'faint' }, HD_SOURCE),
    item(`Тип: ${TYPES[r.type]}`, para('Роль:', T.role), para('Энергия:', T.howEnergyWorks), para('Стратегия:', T.strategy),
      para('Подпись (когда живёт по себе):', T.signature), para('Сигнал сбоя:', T.notSelfTheme), para('Аура:', T.aura),
      para('Как с ним общаться:', T.withThem), para('На практике:', T.practicalGuidance)),
    item(`Авторитет: ${AUTHORITIES[r.authority]}`, para('Как ощущается:', Au.feel), para('Как решать:', Au.howToDecide), para('Ловушка:', Au.pitfalls)),
    item(`Профиль ${r.profile}${Pr ? ` — ${Pr.name}` : ''}`, Pr ? h('p', {}, Pr.text) : null,
      para('Личность (как знает себя):', HD_LINE_DB[l1]), para('Дизайн (как его видят, тело):', HD_LINE_DB[l2])),
    Df ? item(`Определённость: ${Df[0]}`, h('p', {}, Df[1])) : null,
    item(`Инкарнационный крест: ${An ? An[0] : ''}`, h('p', { class: 'faint' }, CROSS_NOTE), An ? h('p', {}, An[1]) : null,
      ...[['Солнце Личности', r.cross[0]], ['Земля Личности', r.cross[1]], ['Солнце Дизайна', r.cross[2]], ['Земля Дизайна', r.cross[3]]]
        .map(([n, g]) => para(`${n} — ${g}:`, gateText(g)))),
    item('Центры', ...Object.keys(CENTERS).map((c) => {
      const on = r.defined.includes(c);
      const x = HD_CENTER_DB[c] || {};
      return h('div', {}, para(`${CENTERS[c]} — ${on ? 'определён' : 'открыт'}:`, `${x.theme || ''} ${on ? x.definedMeaning : x.undefinedMeaning}`),
        on ? null : para('Вопрос себе:', `«${x.question}»`));
    })),
    r.channels.length ? item('Каналы', h('p', { class: 'faint' }, CIRCUIT_NOTE),
      ...r.channels.map((id) => { const c = channelOf(id); return para(`${id} — канал ${c ? c[0] : ''} (${c ? c[1] : ''}):`, c ? c[2] : ''); })) : null,
    item('Ворота', h('p', { class: 'faint' }, 'Все активные ворота: где стоит планета (Л — Личность, сознательное; Д — Дизайн, тело) и что они дают.'),
      ...Object.keys(at).map(Number).sort((a, b) => a - b).map((g) => para(`${g} (${at[g].join(', ')}):`, gateText(g)))));
}


/* Карточка «Human Design»: тип, авторитет, профиль, крест, центры, каналы, активации Личности и Дизайна. Нужны дата, время
   и город с часовым поясом (подсказка города в анкете). Библиотека астрономии (astronomy.js, ~400 КБ) грузится только
   здесь, когда карточку открыли, — запуск приложения не тяжелеет. Бодиграф и трактовки — следующим шагом. */
const NS = 'http://www.w3.org/2000/svg';
function el(tag, attrs, text) { const n = document.createElementNS(NS, tag); for (const [k, v] of Object.entries(attrs)) n.setAttribute(k, v); if (text != null) n.textContent = text; return n; }
// Центры бодиграфа: [x, y, форма]; ▲ — треугольник вершиной вверх, ▼ — вниз, ◀/▶ — вбок, ■ — квадрат, ◆ — ромб
const POS = { Head: [100, 22, 'up'], Ajna: [100, 64, 'down'], Throat: [100, 108, 'sq'], G: [100, 152, 'dia'], Heart: [140, 168, 'up'],
  Spleen: [34, 206, 'right'], Sacral: [100, 216, 'sq'], SolarPlexus: [166, 206, 'left'], Root: [100, 270, 'sq'] };
const SHORT = { Head: 'Темя', Ajna: 'Аджна', Throat: 'Горло', G: 'G', Heart: 'Эго', Spleen: 'Селез.', Sacral: 'Сакрал', SolarPlexus: 'Сплет.', Root: 'Корень' };
function shape([x, y, f], s = 17) {
  const pts = { up: [[x, y - s], [x + s, y + s * 0.8], [x - s, y + s * 0.8]], down: [[x - s, y - s * 0.8], [x + s, y - s * 0.8], [x, y + s]],
    left: [[x + s, y - s], [x + s, y + s], [x - s, y]], right: [[x - s, y - s], [x - s, y + s], [x + s, y]],
    dia: [[x, y - s], [x + s, y], [x, y + s], [x - s, y]], sq: [[x - s, y - s], [x + s, y - s], [x + s, y + s], [x - s, y + s]] }[f];
  return pts.map((p) => p.join(',')).join(' ');
}
/** Бодиграф (владелец 26.11.2026, по образцу): канал — две половины, каждая по своим воротам: Личность — светлая,
    Дизайн — красная, обе — полосой; ворот нет — бледная. Целый канал — обе половины цветные, «висящие» ворота — одна.
    Несколько каналов между одной парой центров разведены; номера ворот — у центров, активные — золотом. */
function bodygraph(r, CH) {
  const svg = el('svg', { viewBox: '0 0 200 300', class: 'hd__body', role: 'img', 'aria-label': 'Бодиграф' });
  const pg = new Set(Object.values(r.personality).map((x) => x.gate));
  const dg = new Set(Object.values(r.design).map((x) => x.gate));
  const pairs = {};
  CH.forEach((c) => { const k = [c[2], c[3]].sort().join(); (pairs[k] ||= []).push(c); });
  const half = (x1, y1, x2, y2, g) => {
    const p = pg.has(g), d = dg.has(g);
    if (!p && !d) { svg.append(el('line', { x1, y1, x2, y2, class: 'hd__off' })); return; }
    if (d) svg.append(el('line', { x1, y1, x2, y2, class: 'hd__des' }));
    if (p) svg.append(el('line', { x1, y1, x2, y2, class: d ? 'hd__per hd__per--both' : 'hd__per' }));
  };
  const labels = [];
  for (const list of Object.values(pairs)) {
    list.forEach(([a, b, c1, c2], i) => {
      const [x1, y1] = POS[c1]; const [x2, y2] = POS[c2];
      const len = Math.hypot(x2 - x1, y2 - y1) || 1;
      const o = (i - (list.length - 1) / 2) * 6;
      const ox = (-(y2 - y1) / len) * o, oy = ((x2 - x1) / len) * o;
      const sx = x1 + ox, sy = y1 + oy, ex = x2 + ox, ey = y2 + oy, mx = (sx + ex) / 2, my = (sy + ey) / 2;
      half(sx, sy, mx, my, a);
      half(mx, my, ex, ey, b);
      // номер ворот — на линии у своего центра
      labels.push([sx + (ex - sx) * 0.24, sy + (ey - sy) * 0.24, a], [sx + (ex - sx) * 0.76, sy + (ey - sy) * 0.76, b]);
    });
  }
  for (const [c, p] of Object.entries(POS)) {
    svg.append(el('polygon', { points: shape(p), class: `hd__c${r.defined.includes(c) ? ' is-on' : ''}` }), el('text', { x: p[0], y: p[1] + 3, class: 'hd__cn' }, SHORT[c]));
  }
  for (const [x, y, g] of labels) {
    const on = pg.has(g) || dg.has(g);
    svg.append(el('text', { x, y: y + 2, class: `hd__g${on ? ' is-on' : ''}` }, String(g)));
  }
  return svg;
}

export function hdCard({ date, time, city, caption = null }) {
  const tz = city && typeof city === 'object' ? city.tz : null;
  const head = [h('h2', { class: 'card__title' }, 'Human Design'), caption ? h('p', { class: 'chart__src' }, caption) : null];
  if (!date || !time || !tz) {
    return h('section', { class: 'card hd' }, ...head, h('p', { class: 'faint' }, 'Для расчёта нужны дата, время и город рождения (город — выбери из подсказки).'));
  }
  const body = h('div', {}, h('p', { class: 'faint' }, 'Считаем…'));
  import('./astronomy.js').then((A) => {
    const r = chart(A, zonedToUtc(date, time, tz));
    const row = (n, v) => h('li', {}, h('span', {}, n), h('b', {}, v));
    const acts = (src) => h('ul', { class: 'pyth__lines hd__acts' }, ...BODIES.map((b) => row(BODY_RU[b], `${src[b].gate}.${src[b].line}`)));
    body.replaceChildren(
      bodygraph(r, CHANNELS),
      h('ul', { class: 'pyth__lines' },
        row('Тип', TYPES[r.type]), row('Авторитет', AUTHORITIES[r.authority]), row('Профиль', r.profile),
        row('Инкарнационный крест', r.cross.join(' / '))),
      h('h3', { class: 'caps mx__cap' }, 'Центры'),
      h('p', {}, h('b', {}, 'Определённые: '), r.defined.map((c) => CENTERS[c]).join(', ') || '—'),
      h('p', {}, h('b', {}, 'Открытые: '), r.open.map((c) => CENTERS[c]).join(', ') || '—'),
      h('h3', { class: 'caps mx__cap' }, 'Каналы'),
      h('p', {}, r.channels.join(' · ') || '—'),
      h('details', { class: 'help__folder' }, h('summary', { class: 'help__folder-summary' }, h('span', { class: 'help__folder-title' }, 'Активации: Личность и Дизайн')),
        h('div', { class: 'help__folder-body hd__cols' },
          h('div', {}, h('p', { class: 'caps' }, 'Личность'), acts(r.personality)),
          h('div', {}, h('p', { class: 'caps' }, 'Дизайн'), acts(r.design)))),
      decoding(r));
  }).catch(() => body.replaceChildren(h('p', { class: 'faint' }, 'Не получилось загрузить расчёт — открой ещё раз.')));
  return h('section', { class: 'card hd' }, ...head, body);
}

/** Human Design пары: общий бодиграф (светлое — ты, красное — партнёр, полоса — оба), тип пары, виды каналов. */
export function pairHdCard(a, b, caption) {
  const tzOf = (c) => (c && typeof c === 'object' ? c.tz : null);
  const head = [h('h2', { class: 'card__title' }, 'Human Design пары'), h('p', { class: 'chart__src' }, caption)];
  if (!a.date || !a.time || !tzOf(a.city) || !b.date || !b.time || !tzOf(b.city)) {
    return h('section', { class: 'card hd' }, ...head, h('p', { class: 'faint' }, 'Нужны дата, время и город рождения обоих.'));
  }
  const body = h('div', {}, h('p', { class: 'faint' }, 'Считаем…'));
  import('./astronomy.js').then((A) => {
    const ra = chart(A, zonedToUtc(a.date, a.time, tzOf(a.city)));
    const rb = chart(A, zonedToUtc(b.date, b.time, tzOf(b.city)));
    const c = composite(ra, rb);
    const all = (r) => Object.fromEntries([...Object.values(r.personality), ...Object.values(r.design)].map((x, i) => [i, x]));
    const view = { personality: all(ra), design: all(rb), defined: c.defined, channels: c.channels.map((x) => x.id) };
    const row = (n, v) => h('li', {}, h('span', {}, n), h('b', {}, v));
    body.replaceChildren(
      bodygraph(view, CHANNELS),
      h('p', { class: 'faint' }, 'Светлое — ты, красное — партнёр, светлое с красным — оба.'),
      h('ul', { class: 'pyth__lines' }, row('Тип пары', TYPES[c.type]), row('Ты', TYPES[ra.type]), row('Партнёр', TYPES[rb.type])),
      h('p', {}, h('b', {}, 'Общие определённые центры: '), c.defined.map((x) => CENTERS[x]).join(', ') || '—'),
      ...Object.entries(PAIR_KINDS).map(([k, label]) => {
        const ids = c.channels.filter((x) => x.kind === k).map((x) => x.id);
        return ids.length ? h('div', {}, h('p', {}, h('b', {}, `${label}: `), ids.join(' · ')), h('p', { class: 'faint' }, HD_PAIR_DB[k])) : null;
      }).filter(Boolean)); // replaceChildren(null) печатает «null» — пустые виды убираем
  }).catch(() => body.replaceChildren(h('p', { class: 'faint' }, 'Не получилось загрузить расчёт — открой ещё раз.')));
  return h('section', { class: 'card hd' }, ...head, body);
}
