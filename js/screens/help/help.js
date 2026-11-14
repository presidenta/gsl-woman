import { h, svg, add } from '../../core/dom.js';
import { t, plural } from '../../core/i18n.js';
import { icons } from '../../ui/icons.js';
import { toast } from '../../ui/toast.js';
import * as help from '../../help/help.js';
import * as rules from '../../help/rules.js';
import * as meet from '../../meet/meet.js';

/* ЭКРАН «ПОМОЩЬ» (#/help, владелец 14.11.2026) — библиотека: сверху «Первое свидание» (переход в «Знакомство»),
   ниже пункты — вопросы для разговора, общие темы для обсуждения, «Правила нашего дома», комплименты.
   - На каждой плашке — сколько внутри: «3 вопроса», «36 вопросов», «10 тем» (unit с сервера, число считается здесь),
     чтобы сразу было видно, коротко это или надолго.
   - Пункт и папки внутри раскрываются по нажатию; у комплиментов папки раскрыты сразу (openFolders), их можно закрыть.
   - Папки с флагами (flags) — как калькулятор в «Знакомстве»: под каждым вопросом «как понимать ответ» и галочки
     зелёных и красных флагов, внизу папки — итог: сколько каких и что делать с этим человеком (meet.verdictOf).
     Галочки нигде не хранятся: отметил, посмотрел подсказку — и всё.
   - «Правила нашего дома» человек ведёт сам: «＋» — дописать, нажать — изменить, крестик — убрать (с вопросом
     «Вы точно хотите удалить?»), help/rules.js. */

const entriesOf = (g) => [...(g.entries || []), ...(g.sections || []).flatMap((s) => s.entries || [])];

/** «3 вопроса», «10 тем» — по unit; без unit или пусто — null. */
function countChip(n, unit) {
  if (!unit || !n) return null;
  return h('span', { class: 'help__count' }, `${n} ${plural(n, `plural.${unit}`)}`);
}

function meetCard(data) {
  return h('a', { class: 'card settings__link help__meet', href: '#/meet' },
    h('span', { class: 'card__icon' }, svg(icons.rings)),
    h('span', { class: 'settings__link-text' }, h('strong', {}, t('help.meetTitle')), h('br'), h('span', { class: 'faint' }, data.meetLead)),
    svg(icons.chevronRight, 'settings__link-chevron'),
  );
}

function readBox(text) {
  return h('p', { class: 'help__read' }, h('span', { class: 'caps help__read-label' }, t('help.read')), ' ', text);
}

/** Галочки флагов под вопросом; onChange — пересчитать итог папки. */
function flagChecks(e, onChange) {
  const row = (color, text) => {
    const box = h('input', { type: 'checkbox', class: 'help__flag-box' });
    box.dataset.color = color;
    box.addEventListener('change', onChange);
    return h('label', { class: `help__flag help__flag--${color}` }, box, h('span', { class: 'help__flag-mark', 'aria-hidden': 'true' }), h('span', {}, text));
  };
  return h('div', { class: 'help__flags' },
    ...(e.green || []).map((x) => row('green', x)),
    ...(e.red || []).map((x) => row('red', x)),
  );
}

function entry(e, onFlag) {
  return h('li', { class: 'help__entry' },
    h('span', { class: 'help__text' }, e.text),
    e.note ? h('span', { class: 'help__note' }, e.note) : null,
    e.read ? readBox(e.read) : null,
    onFlag && (e.green?.length || e.red?.length) ? flagChecks(e, onFlag) : null,
  );
}

function sources(list) {
  if (!list?.length) return null;
  return h('div', { class: 'help__sources' },
    h('p', { class: 'caps help__read-label' }, t('help.sources')),
    h('ul', { class: 'help__source-list' },
      ...list.map((s) => h('li', {},
        s.url ? h('a', { href: s.url, target: '_blank', rel: 'noopener' }, s.text) : s.text,
      )),
    ),
  );
}

/** Раздел внутри папки: заголовок, вступление, вопросы, «как понимать», источники. */
function section(s) {
  return h('section', { class: 'help__section' },
    h('h4', { class: 'help__section-title' }, s.title, countChip(s.entries?.length, 'questions')),
    s.lead ? h('p', { class: 'help__section-lead' }, s.lead) : null,
    s.entries?.length ? h('ol', { class: 'help__list' }, ...s.entries.map((e) => entry(e))) : null,
    s.read ? readBox(s.read) : null,
    sources(s.sources),
  );
}

/** Итог папки с флагами — как в «Знакомстве»: сколько зелёных и красных и подсказка, что делать. */
function totalBox(verdicts) {
  const box = h('div', { class: 'help__total' });
  function paint(green, red) {
    const verdict = meet.verdictOf(Array(green).fill('g'), Array(red).fill('r'));
    box.className = `help__total${verdict ? ` help__total--${verdict}` : ''}`;
    box.replaceChildren(
      h('p', { class: 'caps help__total-title' }, t('help.total')),
      h('p', { class: 'help__total-counts' },
        h('span', { class: 'help__total-green' }, `${t('help.greenCount')}: ${green}`),
        ' · ',
        h('span', { class: 'help__total-red' }, `${t('help.redCount')}: ${red}`),
      ),
      verdict
        ? h('div', {},
          h('p', { class: 'help__total-verdict' }, t(`meet.verdict.${verdict}`)),
          verdicts?.[verdict] ? h('p', { class: 'card__text' }, verdicts[verdict]) : null,
          h('p', { class: 'faint' }, t('help.verdictNote')),
        )
        : h('p', { class: 'faint' }, t('help.totalEmpty')),
    );
  }
  paint(0, 0);
  return { node: box, paint };
}

/** Папка: с заголовком — раскрывается по нажатию; без заголовка — просто список. */
function folder(g, { open = false, verdicts } = {}) {
  let total = null;
  let list = null;
  const recount = () => {
    const checked = [...list.querySelectorAll('.help__flag-box:checked')];
    total.paint(checked.filter((b) => b.dataset.color === 'green').length, checked.filter((b) => b.dataset.color === 'red').length);
  };
  if (g.flags) total = totalBox(verdicts);
  list = g.entries?.length ? h('ol', { class: 'help__list' }, ...g.entries.map((e) => entry(e, g.flags ? recount : null))) : null;
  const body = [
    g.lead ? h('p', { class: 'help__section-lead' }, g.lead) : null,
    g.flags ? h('p', { class: 'faint help__flags-hint' }, t('help.flagsHint')) : null,
    list,
    total?.node,
    ...(g.sections || []).map(section),
    g.read ? readBox(g.read) : null,
    sources(g.sources),
  ];
  if (!g.title) return h('div', { class: 'help__group' }, ...body);
  const node = h('details', { class: 'help__folder' },
    h('summary', { class: 'help__folder-summary' },
      svg(icons.chevronRight, 'help__chevron'),
      h('span', { class: 'help__folder-title' }, g.title),
      countChip(entriesOf(g).length, g.unit),
    ),
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
      const done = () => {
        rules.update(r.id, input.value);
        rerender();
      };
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
    if (!rules.add(input.value, defaults)) {
      input.focus();
      return;
    }
    toast({ title: t('help.rulesSaved') });
    rerender();
  });
  return { nodes: [h('ol', { class: 'help__rules' }, ...rows), form], count: rows.length };
}

let openRules = false;

function itemCard(item, ctx, verdicts) {
  const rulesPart = item.editable ? rulesBody(item, () => { openRules = true; ctx.rerender(); }) : null;
  const count = rulesPart
    ? rulesPart.count
    : item.groups.filter((g) => g.unit === item.unit).reduce((n, g) => n + entriesOf(g).length, 0);
  const card = h('details', { class: 'card help__item' },
    h('summary', { class: 'help__summary' },
      h('span', { class: 'help__title' }, item.title),
      countChip(count, item.unit),
      item.draft ? h('span', { class: 'chip help__draft' }, t('help.draft')) : null,
      svg(icons.chevronRight, 'help__chevron'),
    ),
    h('p', { class: 'card__text help__lead' }, item.lead),
    ...(rulesPart ? rulesPart.nodes : item.groups.map((g) => folder(g, { open: !!item.openFolders, verdicts }))),
  );
  // Правила только что изменили — пункт остаётся раскрытым после перерисовки
  if (rulesPart && openRules) {
    card.open = true;
    openRules = false;
  }
  return card;
}

export function render(view, ctx) {
  const data = help.content(ctx.lang);
  if (!data) {
    add(view, h('h1', { class: 'screen-title' }, t('help.title')), h('p', { class: 'card__text' }, t('help.waiting')));
    return;
  }
  // Подсказки итога — те же, что в «Знакомстве» (у каждой части свои слова)
  const verdicts = meet.content(ctx.lang)?.verdicts || null;
  add(view,
    h('h1', { class: 'screen-title' }, data.title),
    h('p', { class: 'help__intro' }, data.intro),
    meetCard(data),
    ...data.items.map((item) => itemCard(item, ctx, verdicts)),
  );
}
