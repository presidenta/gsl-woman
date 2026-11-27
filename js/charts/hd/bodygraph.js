/* БОДИГРАФ HUMAN DESIGN — рисунок по образцу владельца (27.11.2026: «фигура человека, плавные пути, идеально»):
   силуэт человека; девять центров в классической раскладке; у каждого из 64 ворот — своё место на краю центра;
   канал — плавная «трубка» от ворот к воротам, две половины: Дизайн — красная, Личность — светлая, обе — красная с
   светлым пунктиром, без активации — бледная трубка. Определённые центры — цветом, открытые — тёмные. По бокам —
   планеты Дизайна (слева, красным) и Личности (справа). Всё оформление — атрибутами SVG, без отдельного CSS. */
import { BODIES } from './calc.js';

const NS = 'http://www.w3.org/2000/svg';
const el = (tag, attrs, text) => {
  const n = document.createElementNS(NS, tag);
  for (const [k, v] of Object.entries(attrs)) n.setAttribute(k, v);
  if (text != null) n.textContent = text;
  return n;
};

const PER = '#f3e9d6';
const DES = '#e0483e';
const SYMBOLS = { Sun: '☉', Earth: '⊕', NorthNode: '☊', SouthNode: '☋', Moon: '☽', Mercury: '☿', Venus: '♀', Mars: '♂', Jupiter: '♃', Saturn: '♄', Uranus: '♅', Neptune: '♆', Pluto: '♇' };

// Центры: контур и цвет, когда определён
const CENTERS = {
  Head: { pts: [[200, 28], [240, 100], [160, 100]], fill: '#f2d45c' },
  Ajna: { pts: [[160, 118], [240, 118], [200, 190]], fill: '#6fbf73' },
  Throat: { pts: [[165, 210], [235, 210], [235, 280], [165, 280]], fill: '#5b9bd5' },
  G: { pts: [[200, 286], [244, 330], [200, 374], [156, 330]], fill: '#f2c94c' },
  Heart: { pts: [[256, 350], [310, 378], [258, 398]], fill: '#e8655a' },
  Spleen: { pts: [[60, 380], [115, 420], [60, 460]], fill: '#8bc34a' },
  Sacral: { pts: [[165, 420], [235, 420], [235, 490], [165, 490]], fill: '#ef7d4f' },
  SolarPlexus: { pts: [[340, 380], [340, 460], [285, 420]], fill: '#d9a05b' },
  Root: { pts: [[165, 505], [235, 505], [235, 575], [165, 575]], fill: '#ef8f4f' },
};

// Места 64 ворот (внутри центра, у края, откуда выходит канал)
const GATE = {
  64: [178, 92], 61: [200, 92], 63: [222, 92],
  47: [178, 128], 24: [200, 128], 4: [222, 128], 17: [184, 148], 11: [216, 148], 43: [200, 170],
  62: [182, 218], 23: [200, 218], 56: [218, 218], 16: [173, 236], 20: [173, 256], 35: [227, 232], 12: [227, 246], 45: [227, 262],
  31: [183, 272], 8: [200, 272], 33: [212, 272],
  1: [200, 298], 7: [186, 310], 13: [214, 310], 10: [168, 330], 25: [232, 330], 15: [186, 350], 2: [200, 362], 46: [214, 350],
  21: [266, 362], 51: [264, 377], 26: [268, 390], 40: [292, 378],
  48: [70, 392], 57: [82, 401], 44: [94, 410], 50: [104, 420], 32: [94, 430], 28: [82, 439], 18: [70, 448],
  5: [182, 428], 14: [200, 428], 29: [218, 428], 34: [173, 446], 27: [173, 468], 59: [227, 462], 42: [182, 482], 3: [200, 482], 9: [218, 482],
  36: [330, 392], 22: [318, 401], 37: [306, 410], 6: [296, 420], 49: [306, 430], 55: [318, 439], 30: [330, 448],
  53: [182, 513], 60: [200, 513], 52: [218, 513], 54: [173, 530], 38: [173, 546], 58: [173, 562], 19: [227, 530], 39: [227, 546], 41: [227, 562],
};
export const GATE_CENTER = {};
for (const [c, gates] of Object.entries({
  Head: [64, 61, 63], Ajna: [47, 24, 4, 17, 11, 43], Throat: [62, 23, 56, 16, 20, 35, 12, 45, 31, 8, 33], G: [1, 7, 13, 10, 25, 15, 2, 46],
  Heart: [21, 51, 26, 40], Spleen: [48, 57, 44, 50, 32, 28, 18], Sacral: [5, 14, 29, 34, 27, 59, 42, 3, 9], SolarPlexus: [36, 22, 37, 6, 49, 55, 30],
  Root: [53, 60, 52, 54, 38, 58, 19, 39, 41],
})) gates.forEach((g) => { GATE_CENTER[g] = c; });

// Изгиб длинных каналов (контрольная точка кривой) — чтобы обходили центры плавной дугой
const BEND = {
  '16-48': [95, 270], '20-57': [110, 300], '20-34': [128, 350], '20-10': [150, 295], '45-21': [262, 290], '35-36': [318, 262], '12-22': [296, 282],
  '32-54': [110, 505], '28-38': [92, 525], '18-58': [74, 550], '50-27': [128, 462], '57-34': [125, 440], '57-10': [118, 350], '44-26': [185, 402],
  '10-34': [145, 390], '59-6': [262, 458], '49-19': [292, 505], '55-39': [310, 525], '30-41': [328, 550],
};

const mid = (a, b) => [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
const q = (a, c, b) => `M${a[0]},${a[1]} Q${c[0]},${c[1]} ${b[0]},${b[1]}`;

/** r: { personality: {…: {gate}}, design: {…}, defined: [центры] }; opts.cols — столбцы планет (у пары не нужны). */
export function bodygraph(r, CH, T, opts = {}) {
  const cols = opts.cols !== false;
  const W = cols ? 560 : 400;
  const dx = cols ? 80 : 0;
  const svg = el('svg', { viewBox: `0 0 ${W} 590`, class: 'hd__graph', role: 'img', 'aria-label': T.ui.bodygraph,
    style: `display:block;width:100%;max-width:${cols ? 560 : 400}px;margin:12px auto` });
  const g = el('g', { transform: `translate(${dx},0)` });
  svg.append(g);
  const pg = new Set(Object.values(r.personality).map((x) => x.gate));
  const dg = new Set(Object.values(r.design).map((x) => x.gate));

  // силуэт: голова, шея, плечи и туловище
  const body = { fill: 'rgba(255,255,255,.07)', stroke: 'rgba(255,255,255,.12)', 'stroke-width': 1.5 };
  g.append(el('ellipse', { cx: 200, cy: 108, rx: 66, ry: 98, ...body }),
    el('path', { d: 'M176,196 L176,218 C176,232 160,236 120,244 C62,256 26,290 24,350 L24,590 L376,590 L376,350 C374,290 338,256 280,244 C240,236 224,232 224,218 L224,196 Z', ...body }));

  // каналы: сначала бледные трубки, сверху — половины активаций
  const tubes = el('g', {});
  const acts = el('g', {});
  g.append(tubes, acts);
  for (const [a, b] of CH) {
    const A = GATE[a]; const B = GATE[b];
    const C = BEND[`${a}-${b}`] || BEND[`${b}-${a}`] || mid(A, B);
    tubes.append(el('path', { d: q(A, C, B), fill: 'none', stroke: 'rgba(255,255,255,.16)', 'stroke-width': 8, 'stroke-linecap': 'round' }));
    const M = [(A[0] + 2 * C[0] + B[0]) / 4, (A[1] + 2 * C[1] + B[1]) / 4]; // середина кривой
    for (const [gate, d] of [[a, q(A, mid(A, C), M)], [b, q(B, mid(B, C), M)]]) {
      const p = pg.has(gate); const s = dg.has(gate);
      const line = (color, extra = {}) => acts.append(el('path', { d, fill: 'none', stroke: color, 'stroke-width': 5, 'stroke-linecap': 'round', ...extra }));
      if (s) line(DES);
      if (p) line(PER, s ? { 'stroke-dasharray': '5 5', 'stroke-linecap': 'butt' } : {});
    }
  }

  // центры поверх концов каналов
  for (const [name, c] of Object.entries(CENTERS)) {
    const on = r.defined.includes(name);
    g.append(el('polygon', { points: c.pts.map((p) => p.join(',')).join(' '), fill: on ? c.fill : '#1d1a20',
      stroke: on ? 'rgba(0,0,0,.35)' : 'rgba(255,255,255,.4)', 'stroke-width': 1.5, 'stroke-linejoin': 'round' }));
  }

  // номера ворот: активные — золотым кружком
  for (const [gate, [x, y]] of Object.entries(GATE)) {
    const n = Number(gate);
    const active = pg.has(n) || dg.has(n);
    const onCenter = r.defined.includes(GATE_CENTER[n]);
    if (active) g.append(el('circle', { cx: x, cy: y, r: 7.8, fill: pg.has(n) && dg.has(n) ? '#b8325f' : dg.has(n) ? DES : '#d4af37', stroke: '#1a1208', 'stroke-width': 0.8 }));
    g.append(el('text', { x, y: y + 3, 'text-anchor': 'middle', 'font-size': 8.4, 'font-weight': 700, 'font-family': 'Manrope, sans-serif',
      fill: active ? '#fff' : onCenter ? 'rgba(30,20,10,.75)' : 'rgba(255,255,255,.55)' }, gate));
  }

  // столбцы планет: Дизайн слева (красным), Личность справа (светлым)
  if (cols) {
    const col = (src, x, anchor, color, title) => {
      svg.append(el('text', { x, y: 20, 'text-anchor': anchor, 'font-size': 12, 'font-weight': 800, 'letter-spacing': 1, fill: color, 'font-family': 'Manrope, sans-serif' }, title.toUpperCase()));
      BODIES.forEach((b, i) => {
        const a = src[b];
        if (!a) return;
        svg.append(el('text', { x, y: 52 + i * 41, 'text-anchor': anchor, 'font-size': 14, 'font-weight': 700, fill: color, 'font-family': 'Manrope, sans-serif' },
          anchor === 'start' ? `${SYMBOLS[b]} ${a.gate}.${a.line}` : `${a.gate}.${a.line} ${SYMBOLS[b]}`));
      });
    };
    col(r.design, 6, 'start', DES, T.ui.design);
    col(r.personality, W - 6, 'end', PER, T.ui.personality);
  }
  return svg;
}
