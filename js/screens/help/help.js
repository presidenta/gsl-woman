import { h, svg, add } from '../../core/dom.js';
import { t, plural } from '../../core/i18n.js';
import { icons } from '../../ui/icons.js';
import { toast } from '../../ui/toast.js';
import { plateLink, platePanel } from '../../ui/plate.js';
import { flagRow, flagTotal, picked } from '../../ui/flags.js';
import * as help from '../../help/help.js';
import * as rules from '../../help/rules.js';
import * as meet from '../../meet/meet.js';

/* ЭКРАН «ПОМОЩЬ» (#/help, владелец 14–15.11.2026) — быстрое: первое свидание и вопросы для разговора. С 15.11.2026
   остальные пункты — на экране «Библиотека» (screens/library/), «Красный флаг» — отдельный экран (screens/redflag/);
   их плашки и папки — отсюда (itemPlate, folder). Все пункты — одним видом (ui/plate.js): значок в
   круге, название, число, стрелка («на экране всё в одном стиле, без хаоса»).
   - Сверху «Первое свидание» — переход в «Знакомство».
   - Вопросы для разговора — сразу отдельными плашками по числу вопросов: три → о деле → шесть → Арон (36) →
     Готтманы (13 тем, каждая — своя папка) → как слушать. Короткие — первыми: мало времени — открыл и подсмотрел.
   - Дальше — остальные пункты; внутри — папки (раскрываются по нажатию; у комплиментов раскрыты сразу).
   - Папки с флагами (flags) — как калькулятор в «Знакомстве»: под вопросом «как понимать ответ» и галочки зелёных и
     красных флагов, внизу — итог и подсказка (ui/flags.js — тот же вид, что в «Знакомстве»). Галочки не хранятся.
   - «Правила нашего дома» человек ведёт сам: «＋», нажать — изменить, крестик — убрать (с подтверждением). */

const entriesOf = (g) => [...(g.entries || []), ...(g.sections || []).flatMap((s) => s.entries || [])];
const count = (n, unit) => (unit && n ? `${n} ${plural(n, `plural.${unit}`)}` : null);

// Значок каждого пункта — свой, вид один
const ITEM_ICON = { redline: 'flag', questions: 'chat', her: 'heart', words: 'heart', kpk: 'crown', authors: 'journal', types: 'rings', topics: 'rings', rules: 'home', dates: 'calendar', compliments: 'sparkle' };
// Авторы — каждый своей плашкой (author-glover…, с 80) — значок книги
const iconOf = (key) => icons[ITEM_ICON[key] || (key.startsWith('author-') ? 'journal' : '')] || icons.sparkle;

function readBox(text) {
  return h('p', { class: 'help__read' }, h('span', { class: 'caps help__read-label' }, t('help.read')), ' ', text);
}

/** Галочки флагов под вопросом; onChange — пересчитать итог. */
function flagChecks(e, onChange) {
  return h('div', { class: 'flags' },
    ...(e.green || []).map((x) => flagRow('green', x, { onChange })),
    ...(e.red || []).map((x) => flagRow('red', x, { onChange })));
}

/** Фигура типа («Кто перед тобой», вопросы на свидании): assets/archetypes/, нарезка картинки «Архетипы» (15.11.2026). */
export const figure = (name) => h('img', { class: 'help__figure', src: `./assets/archetypes/${name}.webp`, alt: '', loading: 'lazy', decoding: 'async' });

function entry(e, onFlag) {
  // img — фигура слева; best — лучший выбор («Какой быть — твой выбор»: муза и плюс), выделен золотом
  const cls = `help__entry${e.img ? ' help__entry--figure' : ''}${e.best ? ' help__entry--best' : ''}`;
  const body = [
    h('span', { class: 'help__text' }, e.text),
    e.note ? h('span', { class: 'help__note' }, e.note) : null,
    e.read ? readBox(e.read) : null,
    onFlag && (e.green?.length || e.red?.length) ? flagChecks(e, onFlag) : null,
  ];
  // Фигура в полный рост слева, текст её обтекает (владелец 15.11.2026: «без пустоты и длинных простыней»)
  return h('li', { class: cls }, e.img ? figure(e.img) : null, ...body);
}

function sources(list) {
  if (!list?.length) return null;
  return h('div', { class: 'help__sources' },
    h('p', { class: 'caps help__read-label' }, t('help.sources')),
    h('ul', { class: 'help__source-list' }, ...list.map((s) => h('li', {}, s.url ? h('a', { href: s.url, target: '_blank', rel: 'noopener' }, s.text) : s.text))),
  );
}

function section(s) {
  return h('section', { class: 'help__section' },
    h('h4', { class: 'help__section-title' }, s.title, s.entries?.length ? h('span', { class: 'help__count' }, count(s.entries.length, 'questions')) : null),
    s.lead ? h('p', { class: 'help__section-lead' }, s.lead) : null,
    s.entries?.length ? h('ol', { class: 'help__list' }, ...s.entries.map((e) => entry(e))) : null,
    s.read ? readBox(s.read) : null,
    sources(s.sources),
  );
}

/** Содержимое папки: вступление, вопросы (с флагами — и итог), разделы, «как понимать», источники. */
export function folderBody(g, verdicts) {
  let total = null;
  let list = null;
  const recount = () => {
    const { green, red } = picked(list);
    total.paint(green.length, red.length);
  };
  if (g.flags) total = flagTotal(verdicts);
  list = g.entries?.length ? h('ol', { class: 'help__list' }, ...g.entries.map((e) => entry(e, g.flags ? recount : null))) : null;
  return [
    // by — кто автор, одной строкой («По трактовке Павла Ракова — …»), как у психологов
    g.by && g.by.length > 40 ? h('p', { class: 'help__by' }, g.by) : null,
    g.lead ? h('p', { class: 'help__section-lead' }, g.lead) : null,
    g.flags ? h('p', { class: 'faint help__flags-hint' }, t('help.flagsHint')) : null,
    list,
    total?.node,
    // themes — каждая тема своей папкой с числом вопросов (Готтманы, 13 тем; владелец 15.11.2026)
    ...(g.sections || []).map((s) => (g.themes ? folder({ ...s, unit: 'questions' }) : section(s))),
    g.read ? readBox(g.read) : null,
    sources(g.sources),
  ];
}

/** Папка внутри пункта: с заголовком — раскрывается по нажатию; без заголовка — просто список. */
export function folder(g, { open = false, verdicts } = {}) {
  const body = folderBody(g, verdicts);
  if (!g.title) return h('div', { class: 'help__group' }, ...body);
  const node = h('details', { class: 'help__folder' },
    h('summary', { class: 'help__folder-summary' },
      svg(icons.chevronRight, 'help__chevron'),
      h('span', { class: 'help__folder-title' }, g.title),
      count(entriesOf(g).length, g.unit) ? h('span', { class: 'help__count' }, count(entriesOf(g).length, g.unit)) : null),
    h('div', { class: 'help__folder-body' }, ...body),
  );
  node.open = open;
  return node;
}

/** «Правила нашего дома»: нажать — изменить; крестик — убрать (с подтверждением); «＋» — дописать. */
function rulesBody(item, rerender) {
  const defaults = item.groups.flatMap((g) => g.entries || []).map((e) => e.text);
  const rows = rules.list(defaults).map((r) => {
    const text = h('button', { type: 'button', class: 'help__rule-text', title: t('help.rulesEdit') }, r.text);
    text.addEventListener('click', () => {
      const input = h('input', { class: 'input help__rule-input', value: r.text, maxlength: String(rules.MAX_TEXT) });
      const done = () => { rules.update(r.id, input.value); rerender(); };
      input.addEventListener('keydown', (e) => { if (e.key === 'Enter') done(); });
      input.addEventListener('blur', done);
      text.replaceWith(input);
      input.focus();
    });
    const cross = h('button', { type: 'button', class: 'help__rule-x', 'aria-label': t('help.rulesRemove'), title: t('help.rulesRemove') }, svg(icons.close));
    cross.addEventListener('click', () => {
      // Случайное касание правило не стирает: только после «Да» (владелец 14.11.2026)
      if (!confirm(t('help.rulesRemoveConfirm', { rule: r.text }))) return;
      rules.remove(r.id);
      rerender();
    });
    return h('li', { class: 'help__rule' }, text, cross);
  });
  const input = h('input', { class: 'input help__rule-input', placeholder: t('help.rulesPh'), maxlength: String(rules.MAX_TEXT), 'aria-label': t('help.rulesPh') });
  const form = h('form', { class: 'help__rule-add' }, input,
    h('button', { type: 'submit', class: 'help__rule-btn help__rule-btn--add', 'aria-label': t('help.rulesAdd'), title: t('help.rulesAdd') }, svg(icons.plus)));
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    if (!rules.add(input.value, defaults)) { input.focus(); return; }
    toast({ title: t('help.rulesSaved') });
    rerender();
  });
  return { nodes: [h('ol', { class: 'help__rules' }, ...rows), form], count: rows.length };
}

// Какие плашки раскрыты — переживают перерисовку экрана (правила, отметки флагов)
const opened = new Set();
function remember(node, id) {
  if (opened.has(id)) node.open = true;
  node.addEventListener('toggle', () => (node.open ? opened.add(id) : opened.delete(id)));
  return node;
}

/** Вопросы для разговора — сразу отдельными плашками, по числу вопросов (короткие первыми). */
function questionPlates(item, verdicts) {
  return [
    h('h2', { class: 'caps plates__heading' }, item.title),
    ...item.groups.map((g, i) => remember(platePanel({
      icon: icons.chat,
      title: g.title,
      lead: g.by, // кто автор подборки — прямо на плашке (владелец 15.11.2026)
      chip: g.themes ? count(g.sections.length, 'topics') : count(entriesOf(g).length, g.unit),
      body: folderBody(g, verdicts),
    }), `q${i}`)),
  ];
}

export function itemPlate(item, ctx, verdicts) {
  const rulesPart = item.editable ? rulesBody(item, () => { opened.add(item.key); ctx.rerender(); }) : null;
  const n = rulesPart ? rulesPart.count : item.groups.filter((g) => g.unit === item.unit).reduce((s, g) => s + entriesOf(g).length, 0);
  return remember(platePanel({
    icon: iconOf(item.key),
    // «Красный флаг» — единственная красная плашка: это запрет, а не совет (владелец 15.11.2026)
    cls: item.key === 'redline' ? 'plate--red' : '',
    title: item.title,
    // byline — кто автор, прямо на плашке («Кто перед тобой»: «По трактовке Павла Ракова — …», 15.11.2026)
    lead: item.byline || null,
    chip: count(n, item.unit),
    body: [
      h('p', { class: 'card__text help__lead' }, item.lead),
      ...(rulesPart ? rulesPart.nodes : item.groups.map((g) => folder(g, { open: !!item.openFolders, verdicts }))),
    ],
  }), item.key);
}

export function render(view, ctx) {
  const data = help.content(ctx.lang);
  if (!data) {
    add(view, h('h1', { class: 'screen-title' }, t('help.title')), h('p', { class: 'card__text' }, t('help.waiting')));
    return;
  }
  // Подсказки итога — те же, что в «Знакомстве» (у каждой части свои слова)
  const verdicts = meet.content(ctx.lang)?.verdicts || null;
  const questions = data.items.find((i) => i.key === 'questions');
  // «Помощь» — только быстрое: первое свидание и вопросы для разговора. Остальное — в «Библиотеке» (library/),
  // «Красный флаг» — отдельным разделом (redflag/) (владелец 15.11.2026: «библиотека — это уже другое, это не помощь»)
  // С 76 — «Вопросы» (бывшая «Помощь»): только вопросы; «Первое свидание» и «Комплименты» — свои плашки в «Артефактах»
  add(view,
    h('h1', { class: 'screen-title' }, t('help.title')),
    h('p', { class: 'help__intro' }, t('help.intro')),
    ...(questions ? questionPlates(questions, verdicts).slice(1) : []),
  );
}
