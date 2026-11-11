import { h } from '../core/dom.js';

/* КОЛЬЦО НЕДЕЛИ: семь долей по кругу — дни 1–7. Сделанный день — розовое золото (Максимум — светлее
   и с сиянием), пропущенный — тёмная слива, сегодняшний — золотая обводка, будущий — едва видный.
   Владелец 04.11.2026 склонялся к колесу, как в колесе жизни «Кванта»: это оно. */

const NS = 'http://www.w3.org/2000/svg';
const GAP_DEG = 6;

function el(name, attrs) {
  const node = document.createElementNS(NS, name);
  for (const [k, v] of Object.entries(attrs)) node.setAttribute(k, String(v));
  return node;
}

function arc(cx, cy, r, from, to) {
  const rad = (deg) => ((deg - 90) * Math.PI) / 180;
  const x1 = cx + r * Math.cos(rad(from));
  const y1 = cy + r * Math.sin(rad(from));
  const x2 = cx + r * Math.cos(rad(to));
  const y2 = cy + r * Math.sin(rad(to));
  const large = to - from > 180 ? 1 : 0;
  return `M ${x1.toFixed(2)} ${y1.toFixed(2)} A ${r} ${r} 0 ${large} 1 ${x2.toFixed(2)} ${y2.toFixed(2)}`;
}

function colorFor(d) {
  if (d.status === 'done') return d.level === 'max' ? 'var(--c-done-max)' : 'var(--c-done)';
  if (d.status === 'missed') return 'var(--c-missed)';
  return 'var(--c-future)';
}

/**
 * days — [{ status, level }] из progress.weekSummary; value/label — подпись в центре.
 * small — маленькое кольцо для списков.
 */
export function weekRing({ days, value, label, small = false }) {
  const size = 200;
  const c = size / 2;
  const r = small ? 82 : 86;
  const stroke = small ? 20 : 14;
  const svgNode = el('svg', { viewBox: `0 0 ${size} ${size}`, role: 'img', 'aria-label': `${value} ${label || ''}`.trim() });

  const defs = el('defs', {});
  const glow = el('filter', { id: 'ringGlow', x: '-30%', y: '-30%', width: '160%', height: '160%' });
  glow.append(el('feGaussianBlur', { stdDeviation: '3.5', result: 'b' }));
  const merge = el('feMerge', {});
  merge.append(el('feMergeNode', { in: 'b' }), el('feMergeNode', { in: 'SourceGraphic' }));
  glow.append(merge);
  defs.append(glow);
  svgNode.append(defs);

  const step = 360 / days.length;
  days.forEach((d, i) => {
    const from = i * step + GAP_DEG / 2;
    const to = (i + 1) * step - GAP_DEG / 2;
    const path = el('path', {
      d: arc(c, c, r, from, to),
      fill: 'none',
      stroke: colorFor(d),
      'stroke-width': stroke,
      'stroke-linecap': 'round',
    });
    if (d.status === 'done' && d.level === 'max') path.setAttribute('filter', 'url(#ringGlow)');
    svgNode.append(path);
    if (d.status === 'today') {
      svgNode.append(el('path', {
        d: arc(c, c, r, from, to),
        fill: 'none',
        stroke: 'var(--c-gold)',
        'stroke-width': 2,
        'stroke-dasharray': '3 4',
      }));
    }
  });

  return h('div', { class: small ? 'ring ring--small' : 'ring' },
    svgNode,
    h('div', { class: 'ring__center' },
      h('div', { class: 'ring__value gold-text' }, value),
      label && !small ? h('div', { class: 'ring__label' }, label) : null,
    ),
  );
}

/** Одна, две или три точки — уровень выполнения. */
export function levelDots(level) {
  const n = { min: 1, full: 2, max: 3 }[level] || 0;
  return h('span', { class: 'level-dots', 'aria-hidden': 'true' },
    ...[0, 1, 2].map((i) => h('i', { class: i < n ? 'on' : '' })),
  );
}
