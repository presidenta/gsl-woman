import { h, svg } from '../core/dom.js';
import { icons } from '../ui/icons.js';
import { segmented } from '../ui/controls.js';
import { read, writeQuiet } from '../core/store.js';
import { get as settings } from '../settings/settings.js';
import { ct } from './texts.js';
import { points, leanOf, compare, WHO } from './score.js';

/* АНКЕТА «ЧЕК-ЛИСТ: 7 ЧАКР В ПАРЕ» (владелец 22.11.2026: вопросы «ближе к самой книжке», «и для тех, кто в
   отношениях, и кто нет»). Одна анкета — два опросника, разделены цветом: золотой блок «У вас дома» (про пару сейчас) и
   голубой «У родителей» (про семью, где человек вырос). Наверху — «Живём вместе» / «Встречаемся или пока одна»: во
   втором случае золотые блоки прячутся. Итог раздельно: «Как сейчас», «Как было у родителей», «Что повторяется» и
   «Как должно быть» из книги. Тексты и коды подсчёта — с сервера (planner/server/src/gsl/chakra-test/), расчёт —
   score.js. Ответы хранятся на этом устройстве (ключ chakra-test), чтобы анкету можно было проходить по частям.
   Стыковка — одна строка в screens/help/help.js (questionPlates: g.check). */

const KEY = 'chakra-test';
const SIDES = ['now', 'par'];
const ANS = ['M', 'W', 'B', 'N'];

const short = (title) => title.split(' — ')[0]; // «1-я чакра (Муладхара)»
const fill = (s, vars) => String(s || '').replace(/\{(\w+)\}/g, (_, k) => vars[k] ?? '');
const sumOf = (p) => p.man + p.woman + p.pair;

function load(n) {
  const st = read(KEY, null);
  const blank = () => Array.from({ length: n }, () => ({ p1: [], place: [], p2: [] }));
  const ok = st && typeof st === 'object' && SIDES.every((k) => Array.isArray(st[k]) && st[k].length === n);
  // Режим впервые — по профилю отношений из настроек: встречаются или пока одна — только про родителей
  const mode = st?.mode || (['dating', 'single'].includes(settings().profile) ? 'apart' : 'together');
  return ok ? st : { mode, now: blank(), par: blank() };
}

export function chakraCheck(g) {
  const L = g.labels;
  const R = L.result;
  const st = load(g.sections.length);
  const save = () => writeQuiet(KEY, st);
  const root = h('div', { class: `chakra-test${st.mode === 'apart' ? ' is-apart' : ''}` });
  const total = h('div', { class: 'flags-total chakra-total' });

  /** Строка одного опросника: подпись блока, вопрос, ответы (и продолжение — у жилья). */
  function row(side, label, text, options, value, onChange, extra) {
    return h('div', { class: `ct-row ct-row--${side}` },
      h('span', { class: 'ct-row__label' }, label),
      h('p', { class: 'help__text ct-row__text' }, text),
      segmented({ options, value, onChange, label: text }),
      extra || null);
  }

  /** Вопрос части 1 («Кто…»): у жилья — сначала чья территория, потом кто решал / оплачивал. */
  function whoQuestion(ci, q, j) {
    const opts = (side) => ANS.filter((k) => k in q.score).map((k) => ({ value: k, label: k === 'N' && q.score.never ? L.ans[side].never : L.ans[side][k] }));
    const rows = SIDES.map((side) => {
      const got = st[side][ci];
      const set = (k) => (v) => { got[k][j] = v; save(); paint(); };
      if (!q.score.home) return row(side, L[side], q[side], opts(side), got.p1[j], set('p1'));
      const follow = h('div', { class: 'ct-follow' });
      const drawFollow = () => {
        const place = got.place[j];
        const text = place ? (place === 'rent' ? q.rent : q.own)[side] : '';
        follow.replaceChildren(...(place ? [h('p', { class: 'help__text ct-row__text' }, text), segmented({ options: opts(side), value: got.p1[j], onChange: set('p1'), label: text })] : []));
      };
      drawFollow();
      const places = g.places.map((p, i) => ({ value: p, label: L.place[side][i] }));
      return row(side, L[side], q[side], places, got.place[j], (v) => { got.place[j] = v; save(); drawFollow(); paint(); }, follow);
    });
    return h('div', { class: 'ct-q' }, h('p', { class: 'ct-q__title' }, `${j + 1}. ${q.t}`), ...rows);
  }

  /** Вопрос части 2 («Да · Нет»): подписи блоков — «О тебе» / «О маме» и т. п. */
  function yesQuestion(ci, s, q, k) {
    const yn = [{ value: 'yes', label: L.ans.yes }, { value: 'no', label: L.ans.no }];
    const rows = SIDES.map((side) => {
      const got = st[side][ci];
      const v = got.p2[k] === true ? 'yes' : got.p2[k] === false ? 'no' : null;
      return row(side, L.about[side][s.p2.who], q[side], yn, v, (x) => { got.p2[k] = x === 'yes'; save(); paint(); });
    });
    return h('div', { class: 'ct-q' }, h('p', { class: 'ct-q__title' }, `${s.p1.length + k + 1}.`), ...rows);
  }

  const folders = g.sections.map((s, ci) => h('details', { class: 'help__folder' },
    h('summary', { class: 'help__folder-summary' }, svg(icons.chevronRight, 'help__chevron'), h('span', { class: 'help__folder-title' }, s.title)),
    h('div', { class: 'help__folder-body' },
      h('p', { class: 'caps ct-part' }, L.part1),
      ...s.p1.map((q, j) => whoQuestion(ci, q, j)),
      h('p', { class: 'caps ct-part' }, `${L.part2}. ${L.about.now[s.p2.who]} · ${L.about.par[s.p2.who]}`),
      ...s.p2.items.map((q, k) => yesQuestion(ci, s, q, k)))));

  const mode = segmented({
    options: [{ value: 'together', label: L.together }, { value: 'apart', label: L.apart }],
    value: st.mode,
    label: L.mode,
    onChange: (v) => { st.mode = v; save(); root.classList.toggle('is-apart', v === 'apart'); paint(); },
  });

  /** Блок итога одного опросника: где больше всего напряжения, у кого перекос, что в балансе, по чакрам. */
  function block(side, leans, pts) {
    const who = (k) => R.who[side][k];
    const done = g.sections.map((s, i) => ({ s, i, lean: leans[i], p: pts[i] })).filter((x) => x.lean);
    if (!done.length) return null;
    const top = done.reduce((a, b) => (sumOf(b.p) > sumOf(a.p) ? b : a));
    const heads = sumOf(top.p) ? [fill(R.most, { chakra: top.s.title })] : [];
    for (const k of WHO) {
      const list = done.filter((x) => x.lean.includes(k)).map((x) => x.i + 1);
      if (list.length) heads.push(fill(R.count, { who: who(k), list: list.join(', ') }));
    }
    const calm = done.filter((x) => !x.lean.length).map((x) => x.i + 1);
    if (calm.length) heads.push(fill(R.calm, { list: calm.join(', ') }));
    return h('div', { class: `ct-block ct-block--${side}` },
      h('p', { class: 'caps ct-block__title' }, R[side]),
      ...heads.map((t) => h('p', { class: 'flags-total__verdict ct-block__head' }, t)),
      h('ul', { class: 'chakra-total__list' }, ...done.map((x) => h('li', {},
        h('b', {}, short(x.s.title)), ': ',
        x.lean.length ? h('span', { class: 'chakra-total__lean' }, fill(R.lean, { who: x.lean.map(who).join(', ') })) : R.balance))));
  }

  /** «Что повторяется» — по чакрам, где отвечены обе строки. */
  function repeats(now, par) {
    const lines = g.sections.map((s, i) => {
      const c = compare(now[i], par[i]);
      if (!c) return null;
      const text = c.kind === 'repeat' ? c.who.map((k) => (k === 'pair' ? R.repeatPair : k === 'woman' ? R.repeatWoman : R.repeatMan)).join('. ')
        : c.kind === 'swap' ? fill(R.swap, { par: c.par.map((k) => R.who.par[k]).join(', '), now: c.now.map((k) => R.who.now[k]).join(', ') })
          : R[c.kind];
      return h('li', {}, h('b', {}, short(s.title)), ': ', text);
    }).filter(Boolean);
    return lines.length ? h('div', { class: 'ct-block ct-block--repeat' }, h('p', { class: 'caps ct-block__title' }, R.repeat), h('ul', { class: 'chakra-total__list' }, ...lines)) : null;
  }

  function paint() {
    const apart = st.mode === 'apart';
    const pts = Object.fromEntries(SIDES.map((side) => [side, g.sections.map((s, i) => points(s, st[side][i]))]));
    const leans = Object.fromEntries(SIDES.map((side) => [side, pts[side].map((p) => (apart && side === 'now' ? null : leanOf(p, g.threshold)))]));
    const blocks = [block('now', leans.now, pts.now), block('par', leans.par, pts.par), repeats(leans.now, leans.par)].filter(Boolean);
    const off = g.sections.filter((s, i) => leans.now[i]?.length || leans.par[i]?.length);
    const should = off.length ? h('div', { class: 'ct-block ct-block--should' },
      h('p', { class: 'caps ct-block__title' }, R.should),
      h('ul', { class: 'chakra-total__list' }, ...off.map((s) => h('li', {}, h('b', {}, short(s.title)), ': ', s.should)))) : null;
    total.replaceChildren(
      h('p', { class: 'caps flags-total__title' }, ct('total')),
      blocks.length
        ? h('div', {}, ...blocks, should, h('p', { class: 'card__text' }, ct('fix')), h('a', { class: 'chakra-total__open', href: '#/library' }, ct('open')), h('p', { class: 'faint' }, ct('note')))
        : h('p', { class: 'faint' }, ct('empty')));
  }
  paint();

  root.append(
    ...(g.lead ? [h('p', { class: 'help__section-lead' }, g.lead)] : []),
    h('div', { class: 'ct-mode' }, h('p', { class: 'help__text ct-mode__label' }, L.mode), mode),
    ...folders,
    total);
  return [root];
}
