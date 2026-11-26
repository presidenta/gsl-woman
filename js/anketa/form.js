import { h } from '../core/dom.js';
import { at } from './texts.js';

/* ФОРМА «ЕДИНОЙ АНКЕТЫ ПАРТНЁРА» — одна на приложение (screens/anketa/) и страницу гостя (anketa.html, public.js).
   Вопросы — с сервера (planner: gsl/anketa/form-ru.js), здесь только вид. Ответ — { «блок.пункт»: значение }.

   formView(form, opts):
     get(key) / set(key, value) — ответы (value undefined — снять);
     intim: { inline: true, marks(), setMark(key, mark) } — карта прямо в анкете (страница гостя) или
            { inline: false, count, href } — в приложении: карта «Интим 18⁺» уже есть, её отметки и есть ответы;
     love:  { auto: ['touch', 'time'] | null, href } — два главных языка из «Пяти языков любви» (приложение);
     open:  Set ключей раскрытых блоков (переживает перерисовку). */

const TRI = [['+', '+'], ['-', '−'], ['?', '?']];
const LOVE = ['words', 'time', 'gifts', 'service', 'touch'];
const COUNTED = new Set(['tri', 'chores', 'give', 'deal', 'pick', 'multi', 'love', 'date', 'time', 'place']);

/** Кнопки-варианты; нажать выбранное ещё раз — снять. */
function toggles(options, value, onChange, cls = '') {
  let current = value;
  const group = h('div', { class: `segmented anketa-seg ${cls}`.trim(), role: 'radiogroup' });
  const buttons = options.map(([v, label]) => h('button', {
    type: 'button', class: 'segmented__option', role: 'radio',
    onclick: () => { current = current === v ? undefined : v; paint(); onChange(current); },
  }, label));
  const paint = () => buttons.forEach((b, i) => b.setAttribute('aria-checked', String(options[i][0] === current)));
  paint();
  group.append(...buttons);
  return group;
}

/** Несколько вариантов (чипы); limit — сколько можно выбрать. */
function chips(options, value, onChange, limit = Infinity) {
  let current = Array.isArray(value) ? [...value] : [];
  const wrap = h('div', { class: 'anketa-chips' });
  const buttons = options.map(([v, label]) => h('button', {
    type: 'button', class: 'anketa-chip',
    onclick: () => {
      if (current.includes(v)) current = current.filter((x) => x !== v);
      else if (current.length < limit) current = [...current, v];
      else if (limit === 2) current = [current[1], v];
      paint();
      onChange(current.length ? current : undefined);
    },
  }, label));
  const paint = () => buttons.forEach((b, i) => b.setAttribute('aria-pressed', String(current.includes(options[i][0]))));
  paint();
  wrap.append(...buttons);
  return wrap;
}

function input(type, value, onChange, { max = 200, ph = '' } = {}) {
  const el = h('input', { class: 'input anketa-input', type, value: value || '', maxlength: String(max), placeholder: ph });
  // Сразу по вводу, а не только при уходе с поля: ввела город и закрыла приложение — запись была бы потеряна (26.11.2026)
  const save = () => onChange(el.value.trim() || undefined);
  el.addEventListener('input', save);
  el.addEventListener('change', save);
  return el;
}

/** Название страны на языке приложения ('ua' → украинский); браузер не умеет — код страны. */
function countryName(cc, lang) {
  try {
    return new Intl.DisplayNames([lang === 'ua' ? 'uk' : lang || 'ru'], { type: 'region' }).of(cc) || cc;
  } catch {
    return cc;
  }
}

/* ГОРОД РОЖДЕНИЯ (владелец 26.11.2026: «база с готовыми городами, автоподбор при вводе — город, посёлок; для правильного
   расчёта карт»). Подсказки — с сервера (planner src/geo/, GeoNames: СНГ и Балтия — все пункты с сёлами, Европа — от
   500 жителей, мир — от 15 000). Выбрала из списка — в ответе подпись, координаты и часовой пояс; ввела своё — текст.
   opts.geo(q) — подсказки [{ id, name, region, cc, lat, lon, tz }]; нет сети — поле просто принимает текст. */
function placeField(item, key, opts, set) {
  const v = opts.get(key);
  const el = h('input', {
    class: 'input anketa-input', type: 'text', value: typeof v === 'string' ? v : v?.text || '',
    maxlength: '160', placeholder: at('placePh'), autocomplete: 'off',
  });
  const list = h('div', { class: 'anketa-geo', role: 'listbox', hidden: true });
  const where = h('p', { class: 'faint anketa-geo__where' });
  const showWhere = (val) => {
    if (val && typeof val === 'object') where.textContent = `📍 ${val.lat.toFixed(2)}, ${val.lon.toFixed(2)}${val.tz ? ` · ${val.tz}` : ''}`;
    else where.textContent = val && opts.geo ? at('placePick') : '';
  };
  showWhere(v);
  let timer = null;
  let seq = 0;
  const pickPlace = (p, text) => {
    el.value = text;
    const val = { text, id: p.id, lat: p.lat, lon: p.lon, tz: p.tz, cc: p.cc };
    set(val);
    showWhere(val);
    list.hidden = true;
  };
  el.addEventListener('input', () => {
    const q = el.value.trim();
    set(q || undefined);
    showWhere(q || undefined);
    clearTimeout(timer);
    if (!opts.geo || q.length < 2) { list.hidden = true; return; }
    timer = setTimeout(async () => {
      const mine = ++seq;
      let found = [];
      try { found = await opts.geo(q); } catch { found = []; }
      if (mine !== seq) return; // пришёл ответ на старые буквы — уже не нужен
      list.replaceChildren(...found.map((p) => {
        const sub = [p.region, countryName(p.cc, opts.lang)].filter(Boolean).join(', ');
        const text = [p.name, sub].filter(Boolean).join(', ');
        return h('button', { type: 'button', class: 'anketa-geo__item', role: 'option', onclick: () => pickPlace(p, text) },
          h('span', { class: 'anketa-geo__name' }, p.name), sub ? h('span', { class: 'anketa-geo__region' }, sub) : null);
      }));
      list.hidden = !found.length;
    }, 250);
  });
  return h('div', { class: 'anketa-q' }, ...label(item.label), el, list, where,
    opts.geo ? h('p', { class: 'faint anketa-geo__credit' }, at('placeCredit')) : null);
}

const label = (text, hint) => [h('p', { class: 'anketa-q__label' }, text), hint ? h('p', { class: 'faint anketa-q__hint' }, hint) : null];

/** Один пункт. */
function itemView(item, key, opts, changed) {
  const set = (v) => { opts.set(key, v); changed(); };
  const v = opts.get(key);
  switch (item.type) {
    case 'tri':
      return h('div', { class: 'anketa-q anketa-q--row' }, h('p', { class: 'anketa-q__label' }, item.label), toggles(TRI, v, set, 'anketa-seg--tri'));
    case 'chores':
      return h('div', { class: 'anketa-q' }, ...label(item.label), toggles([...TRI, ['need', at('need')]], v, set));
    case 'give': {
      const cur = { ...(v || {}) };
      const part = (k) => toggles(TRI, cur[k], (x) => { if (x) cur[k] = x; else delete cur[k]; set(Object.keys(cur).length ? { ...cur } : undefined); }, 'anketa-seg--tri');
      return h('div', { class: 'anketa-q' }, ...label(item.label),
        h('div', { class: 'anketa-pairrow' }, h('span', { class: 'anketa-pairrow__name' }, at('give')), part('give')),
        h('div', { class: 'anketa-pairrow' }, h('span', { class: 'anketa-pairrow__name' }, at('want')), part('want')));
    }
    case 'deal': {
      const cur = { ...(v || {}) };
      const follow = h('div', { class: 'anketa-deal__follow' });
      const status = h('p', { class: 'anketa-deal__status' });
      const paint = () => {
        follow.hidden = !cur.want || cur.want === '-';
        const s = cur.want === '+' ? (cur.give === '+' ? 'balance' : cur.give === '-' ? 'skew' : cur.give ? 'attention' : null) : null;
        status.textContent = s ? at(s) : '';
        status.dataset.status = s || '';
      };
      const save = () => { set(Object.keys(cur).length ? { ...cur } : undefined); paint(); };
      const part = (k) => toggles(TRI, cur[k], (x) => { if (x) cur[k] = x; else delete cur[k]; save(); }, 'anketa-seg--tri');
      follow.append(
        h('p', { class: 'anketa-deal__cap' }, at('dealGive')), h('p', { class: 'anketa-deal__text' }, item.give), part('give'),
        h('p', { class: 'anketa-deal__cap' }, at('dealResult')), h('p', { class: 'anketa-deal__text' }, item.result));
      paint();
      return h('div', { class: 'anketa-q anketa-deal' },
        h('p', { class: 'anketa-q__label' }, item.label),
        h('p', { class: 'anketa-deal__cap' }, at('dealWant')), h('p', { class: 'anketa-deal__text' }, item.want), part('want'),
        follow, status);
    }
    case 'pick':
      return h('div', { class: 'anketa-q' }, ...label(item.label),
        item.options.length > 4 || item.options.some(([, l]) => l.length > 40)
          ? toggles(item.options, v, set, 'anketa-seg--list')
          : toggles(item.options, v, set));
    case 'multi':
      return h('div', { class: 'anketa-q' }, ...label(item.label), chips(item.options, v, set));
    case 'love': {
      const auto = opts.love?.auto;
      if (auto?.length) {
        return h('div', { class: 'anketa-q' }, ...label(item.label),
          h('p', { class: 'anketa-love-auto' }, at('loveAuto'), ' ', h('b', {}, auto.map((k) => at('love')[k]).join(' · '))));
      }
      return h('div', { class: 'anketa-q' }, ...label(item.label, opts.love?.href ? null : item.hint),
        h('p', { class: 'faint anketa-q__hint' }, at('loveNone')),
        chips(LOVE.map((k) => [k, at('love')[k]]), v, set, 2),
        opts.love?.href ? h('a', { class: 'link-btn anketa-link', href: opts.love.href }, at('loveOpen')) : null);
    }
    case 'list3': {
      const cur = Array.isArray(v) ? [...v] : ['', '', ''];
      return h('div', { class: 'anketa-q' }, ...label(item.label),
        ...[0, 1, 2].map((i) => input('text', cur[i], (x) => { cur[i] = x || ''; set(cur.some(Boolean) ? [...cur] : undefined); }, { ph: at('list3')[i] })));
    }
    case 'text':
      return h('div', { class: 'anketa-q' }, ...label(item.label), input('text', v, set, { max: item.max || 200 }));
    case 'place':
      return placeField(item, key, opts, set);
    case 'date':
    case 'time':
      return h('div', { class: 'anketa-q anketa-q--row' }, h('p', { class: 'anketa-q__label' }, item.label), input(item.type, v, set));
    default:
      return null;
  }
}

/** Карта желаний прямо в анкете (страница гостя): «Да / Может быть», как в «Интим 18⁺». */
function intimInline(block, intim, changed) {
  return block.sections.map((s) => h('div', { class: 'anketa-intim' },
    h('p', { class: 'caps anketa-intim__title' }, s.title),
    ...s.items.map(([k, text]) => {
      const key = `${s.key}.${k}`;
      return h('div', { class: 'anketa-q anketa-q--row' }, h('p', { class: 'anketa-q__label' }, text),
        toggles([['yes', at('yes')], ['maybe', at('maybe')]], intim.marks()[key], (m) => { intim.setMark(key, m); changed(); }, 'anketa-seg--two'));
    })));
}

/** Сколько отвечено в блоке: [отвечено, всего]. */
function progress(block, opts) {
  if (block.intim) {
    const n = opts.intim.inline ? Object.keys(opts.intim.marks()).length : opts.intim.count || 0;
    return [n, block.sections.reduce((s, x) => s + x.items.length, 0)];
  }
  const items = block.items.filter((i) => COUNTED.has(i.type));
  const done = items.filter((i) => (i.type === 'love' && opts.love?.auto?.length) || opts.get(`${block.key}.${i.key}`) !== undefined).length;
  return [done, items.length];
}

export function formView(form, opts) {
  const open = opts.open || new Set();
  const blockView = (block) => {
    const count = h('span', { class: 'help__count anketa-count' });
    /* «7 из 20»: выбранное — зелёным, всего — как было (владелец 26.11.2026: «чтобы человек понимал, сколько уже выбрал») */
    const paint = () => {
      const [a, b] = progress(block, opts);
      const [before, after] = at('of', { n: '\u0001', m: b }).split('\u0001');
      count.replaceChildren(before, h('b', { class: `anketa-count__n${a > 0 ? ' is-some' : ''}` }, String(a)), after);
      count.classList.toggle('is-done', a >= b && b > 0);
    };
    const changed = () => { paint(); opts.onChange?.(); };
    let body;
    if (block.intim && !opts.intim.inline) {
      body = [h('p', { class: 'help__section-lead' }, at('intimApp', { n: opts.intim.count || 0 })),
        h('a', { class: 'btn btn--ghost btn--small anketa-link', href: opts.intim.href }, at('intimOpen'))];
    } else {
      body = [
        block.lead ? h('p', { class: 'help__section-lead' }, block.lead) : null,
        block.private ? h('p', { class: 'faint anketa-private' }, `🔒 ${at('privateNote')}`) : null,
        ...(block.intim ? intimInline(block, opts.intim, changed) : block.items.map((i) => itemView(i, `${block.key}.${i.key}`, opts, changed))),
        // Личные данные (рождение) — «Сохранить»: пишется и так, по вводу, но кнопка даёт уверенность, что запомнилось
        block.private && opts.save ? h('button', { type: 'button', class: 'btn btn--gold btn--block anketa-save', onclick: () => opts.save() }, at('saveBtn')) : null,
      ];
    }
    paint();
    const node = h('details', { class: `help__folder anketa-block${block.intim ? ' anketa-block--adult' : ''}` },
      h('summary', { class: 'help__folder-summary' }, h('span', { class: 'help__folder-title' }, block.title), count),
      h('div', { class: 'help__folder-body' }, ...body));
    node.open = open.has(block.key);
    node.addEventListener('toggle', () => (node.open ? open.add(block.key) : open.delete(block.key)));
    return node;
  };
  // only — только эти блоки, раскрытыми (данные рождения в настройках «Про меня»); skip — без них (анкета, 26.11.2026)
  if (opts.only) return h('div', { class: 'anketa-form anketa-form--only' }, ...form.blocks.filter((b) => opts.only.includes(b.key)).map((b) => { open.add(b.key); return blockView(b); }));
  const keep = (b) => !(opts.skip || []).includes(b.key);
  const core = form.blocks.filter((b) => b.core && keep(b));
  const extra = form.blocks.filter((b) => !b.core && keep(b));
  return h('div', { class: 'anketa-form' },
    h('p', { class: 'faint anketa-scale' }, ...Object.entries(form.scale).flatMap(([k, v]) => [h('b', {}, k === '-' ? '−' : k), ` — ${v}`, h('br')])),
    h('h2', { class: 'caps plates__heading' }, form.coreTitle || at('core')),
    ...core.map(blockView),
    h('h2', { class: 'caps plates__heading' }, form.extraTitle || at('extra')),
    ...extra.map(blockView));
}
