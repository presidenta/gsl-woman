import { h, svg, add } from '../../core/dom.js';
import { t, plural } from '../../core/i18n.js';
import { icons } from '../../ui/icons.js';
import { toast } from '../../ui/toast.js';
import { photo as photoNode, fixed, chapter } from '../../photos/photos.js';
import { platePanel } from '../../ui/plate.js';
import { flagRow, flagTotal, picked } from '../../ui/flags.js';
import * as help from '../../help/help.js';
import * as rules from '../../help/rules.js';
import * as meet from '../../meet/meet.js';
import { LANGS } from '../../config.js';
import { chakraCheck } from '../../chakra-check/check.js';

/* ЭКРАН «ПОМОЩЬ» (#/help, владелец 14–15.11.2026) — быстрое: первое свидание и вопросы для разговора. С 15.11.2026
   остальные пункты — на экране «Тайный архив» (screens/archive/), «Красный флаг» — отдельный экран (screens/redflag/);
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
const ITEM_ICON = { redline: 'flag', questions: 'chat', surveys: 'check', her: 'heart', words: 'heart', kpk: 'crown', authors: 'journal', energy: 'journal', gestalt: 'journal', types: 'rings', topics: 'rings', rules: 'home', dates: 'calendar', compliments: 'wink', notfit: 'flag' };

/* Книжечка «Библиотеки» (energy, сервер gsl/energy/, 22.11.2026) — текст как в книге: list — вид списка ('ul' — точки,
   'plain' — абзацы; иначе номера), sub — вложенный список под пунктом, after — абзац после списка. */
const LIST_CLS = { ul: 'help__list help__list--dots', ol: 'help__list help__list--num', plain: 'help__list help__list--plain' };
const listOf = (g, nodes) => h(g.list === 'ul' || g.list === 'plain' ? 'ul' : 'ol', { class: LIST_CLS[g.list] || 'help__list' }, ...nodes);
const after = (g) => (g.after ? h('p', { class: 'help__section-lead help__after' }, g.after) : null);
// Авторы — каждый своей плашкой (author-glover…, с 80) — значок книги
const RED_FLAG = new Set(['redline', 'notfit']);
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

/** Текст с ключевыми словами золотом (keys — название типа рядом с его фигурой; владелец 15.11.2026: «выдели в самом
    тексте, а подпись под фото — лишняя»). Без регистра; без ключей — просто строка. */
export function highlight(text, keys) {
  if (!keys?.length || !text) return text;
  const esc = keys.filter(Boolean).map((k) => k.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).sort((a, b) => b.length - a.length);
  const rx = new RegExp(`(${esc.join('|')})`, 'gi');
  const out = h('span', {});
  text.split(rx).forEach((part, i) => {
    if (!part) return;
    out.append(i % 2 ? h('b', { class: 'key-word' }, part) : document.createTextNode(part));
  });
  return out;
}

function entry(e, onFlag) {
  // img — фигура слева; best — лучший выбор («Какой быть — твой выбор»: муза и плюс), выделен золотом
  const cls = `help__entry${e.img ? ' help__entry--figure' : ''}${e.best ? ' help__entry--best' : ''}`;
  const body = [
    h('span', { class: 'help__text' }, highlight(e.text, e.keys)),
    e.note ? h('span', { class: 'help__note' }, highlight(e.note, e.keys)) : null,
    e.sub?.length ? h('ul', { class: 'help__sub' }, ...e.sub.map((s) => h('li', {}, s))) : null,
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
    // unit: null — раздел без счётчика (главы книжечки); не указан — «N вопросов», как было
    h('h4', { class: 'help__section-title' }, s.title, s.entries?.length && s.unit !== null ? h('span', { class: 'help__count' }, count(s.entries.length, s.unit || 'questions')) : null),
    s.lead ? h('p', { class: 'help__section-lead' }, s.lead) : null,
    s.entries?.length ? listOf(s, s.entries.map((e) => entry(e))) : null,
    s.read ? readBox(s.read) : null,
    sources(s.sources),
  );
}

/** Содержимое папки: вступление, вопросы (с флагами — и итог), разделы, «как понимать», источники. */
export function folderBody(g, verdicts) {
  // анкета «Чек-лист: 7 чакр в паре» (js/chakra-check/) — в «Анкетах» и главой книги, везде одна и та же
  if (g.check) return chakraCheck(g);
  let total = null;
  let list = null;
  const recount = () => {
    const { green, red } = picked(list);
    total.paint(green.length, red.length);
  };
  if (g.flags) total = flagTotal(verdicts);
  list = g.entries?.length ? listOf(g, g.entries.map((e) => entry(e, g.flags ? recount : null))) : null;
  return [
    // by — кто автор, одной строкой («По трактовке Павла Ракова — …»), как у психологов
    g.by && g.by.length > 40 ? h('p', { class: 'help__by' }, g.by) : null,
    g.lead ? h('p', { class: 'help__section-lead' }, g.lead) : null,
    g.flags ? h('p', { class: 'faint help__flags-hint' }, t('help.flagsHint')) : null,
    list,
    after(g),
    total?.node,
    // themes — каждая тема своей папкой с числом вопросов (Готтманы, 13 тем; владелец 15.11.2026)
    // unit: null у раздела — папка без счётчика (чек-лист чакр, 22.11.2026)
    ...(g.sections || []).map((s) => (g.themes ? folder({ ...s, unit: s.unit === null ? null : 'questions' }) : section(s))),
    g.read ? readBox(g.read) : null,
    sources(g.sources),
  ];
}

/** Папка внутри пункта: с заголовком — раскрывается по нажатию; без заголовка — просто список. */
export function folder(g, { open = false, verdicts, photo = null } = {}) {
  const body = folderBody(g, verdicts);
  if (photo) body.unshift(photo); // фото слева, текст папки обтекает (js/photos/)
  const hp = photo ? ' has-photo' : '';
  if (!g.title) return h('div', { class: `help__group${hp}` }, ...body);
  const node = h('details', { class: 'help__folder' },
    h('summary', { class: 'help__folder-summary' },
      svg(icons.chevronRight, 'help__chevron'),
      h('span', { class: 'help__folder-title' }, g.title),
      ((n) => (n ? h('span', { class: 'help__count' }, n) : null))(g.check ? count(g.sections.length, 'chakras') : count(entriesOf(g).length, g.unit))),
    h('div', { class: `help__folder-body${hp}` }, ...body),
  );
  node.open = open;
  return node;
}

/** «Правила нашего дома»: нажать — изменить; крестик — убрать (с подтверждением); «＋» — дописать. */
function rulesBody(item, rerender) {
  const textsOf = (it) => (it?.groups || []).flatMap((g) => g.entries || []).map((e) => e.text);
  const defaults = textsOf(item);
  // Правила с сервера на всех языках — узнать их в списке, заполненном на другом языке (help/rules.js, 21.11.2026)
  const known = LANGS.map((l) => textsOf(help.content(l)?.items.find((i) => i.key === item.key))).filter((l) => l.length);
  const rows = rules.list(defaults, known).map((r) => {
    const text = h('button', { type: 'button', class: 'help__rule-text', title: t('help.rulesEdit') }, r.text);
    text.addEventListener('click', () => {
      const input = h('input', { class: 'input help__rule-input', value: r.text, maxlength: String(rules.MAX_TEXT) });
      const done = () => { rules.update(r.id, input.value, defaults, known); rerender(); };
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
    if (!rules.add(input.value, defaults, known)) { input.focus(); return; }
    toast({ title: t('help.rulesSaved') });
    rerender();
  });
  return { nodes: [h('ol', { class: 'help__rules' }, ...rows), form], count: rows.length };
}

// Какие плашки раскрыты — переживают перерисовку экрана (правила, отметки флагов)
const opened = new Set();
function remember(node, id) {
  node.dataset.plate = id; // по нему своя кнопка находит плашку («Архетипы» → types, 239)
  if (opened.has(id)) node.open = true;
  node.addEventListener('toggle', () => (node.open ? opened.add(id) : opened.delete(id)));
  return node;
}

/** Вопросы для разговора — сразу отдельными плашками, по числу вопросов (короткие первыми). scene — только папки своего
    раздела ('date' — первое свидание, 'pair' — для пары; сервер gsl/help/scenes.js); фото — по месту папки в общем ряду. */
function questionPlates(item, verdicts, scene = null) {
  return [
    h('h2', { class: 'caps plates__heading' }, item.title),
    ...item.groups.map((g, i) => (scene && g.scene && g.scene !== scene ? null : remember(platePanel({
      cls: 'has-photo',
      icon: icons.chat,
      title: g.title,
      author: g.author, // «Павел Раков — Темы-„опознаватели“…»
      lead: g.by, // кто автор подборки — прямо на плашке (владелец 15.11.2026)
      chip: g.themes ? count(g.sections.length, g.themeUnit || 'topics') : count(entriesOf(g).length, g.unit),
      // Постоянное фото плашки (js/photos/catalog.js → FIXED.questions): пирамиды, «JSL», игры — по порядку
      body: [photoNode(fixed('questions', i)), ...folderBody(g, verdicts)],
    }), `q${i}`))).filter(Boolean),
  ];
}

/** Открыть плашку при следующей отрисовке и показать её («Моя кнопка», 239–240: архетипы, правила дома, анкеты…).
    Зовут из onEnter — до отрисовки, поэтому плашку ищем, когда экран уже построен. */
export function openPlate(id) {
  opened.add(id);
  setTimeout(() => document.querySelector(`[data-plate="${CSS.escape(id)}"]`)?.scrollIntoView({ block: 'start' }), 0);
}

/** Раздел «Вопросов» из адреса: #/help?date или #/help?pair (плашки «Артефактов»); без него — оба раздела. */
const sceneOf = () => ({ date: 'date', pair: 'pair' })[location.hash.split('?')[1]] || null;

export function itemPlate(item, ctx, verdicts, { photo = null, before = [], extra = [], extraCount = 0 } = {}) {
  const rulesPart = item.editable ? rulesBody(item, () => { opened.add(item.key); ctx.rerender(); }) : null;
  // «Анкеты» — счёт по анкетам; остальное — по записям
  const n = extraCount + (rulesPart ? rulesPart.count : item.groups.every((g) => g.check) ? item.groups.length : item.groups.filter((g) => g.unit === item.unit).reduce((s, g) => s + entriesOf(g).length, 0));
  return remember(platePanel({
    icon: iconOf(item.key),
    // Красный флаг в кружке — у запретов: «Красный флаг» (владелец 15.11.2026) и «Когда задание не подходит» — когда
    // задание делать нельзя (владелец 21.11.2026: «это тоже один из красных флагов, закрась флажок красным»)
    cls: `${RED_FLAG.has(item.key) ? 'plate--red' : ''}${photo ? ' has-photo' : ''}`.trim(),
    title: item.title,
    stamp: item.stamp, // гриф «Совершенно секретно» (книжечка о чакрах)
    author: item.author, // авторы и «Павел Раков — Кто перед тобой?»: имя другим цветом
    // byline — кто автор, прямо на плашке («Кто перед тобой»: «По трактовке Павла Ракова — …», 15.11.2026)
    lead: item.byline || null,
    chip: count(n, item.unit),
    body: [
      photo,
      h('p', { class: 'card__text help__lead' }, item.lead),
      // Главы книжечки — со своим фото (photos/catalog.js → CHAPTERS, у него и у неё — разные); у прочих — без фото
      ...before, // «Анкеты»: «Единая анкета партнёра» — первой (screens/goals/, 26.11.2026)
      ...(rulesPart ? rulesPart.nodes : item.groups.map((g, i) => folder(g, { open: !!item.openFolders, verdicts, photo: photoNode(chapter(item.key, i)) }))),
      // «Правила нашего дома»: под списком — светофор границ, бланк «3 ⇄ 3», памятка (сервер gsl/help/agreements-ru.js, 26.11.2026)
      ...(rulesPart && item.folders ? item.folders.map((g) => folder(g)) : []),
      ...extra, // «Анкеты»: ссылка на «Пять языков любви» (screens/goals/)
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
  // С 177 — два раздела (владелец 23.11.2026): «Вопросы: первое свидание» и «Вопросы для пары»; адрес без раздела
  // (старые ссылки) — оба, каждый под своим заголовком
  const scene = sceneOf();
  const part = (s) => (questions ? questionPlates(questions, verdicts, s).slice(1) : []);
  add(view,
    h('h1', { class: 'screen-title' }, scene ? t(`help.${scene}Title`) : t('help.title')),
    h('p', { class: 'help__intro' }, scene ? t(`help.${scene}Lead`) : t('help.intro')),
    ...(scene ? part(scene) : ['date', 'pair'].flatMap((s) => [h('h2', { class: 'caps plates__heading' }, t(`help.${s}Title`)), ...part(s)])),
  );
}
