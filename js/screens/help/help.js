import { h, svg, add } from '../../core/dom.js';
import { t } from '../../core/i18n.js';
import { icons } from '../../ui/icons.js';
import { toast } from '../../ui/toast.js';
import * as help from '../../help/help.js';
import * as rules from '../../help/rules.js';

/* ЭКРАН «ПОМОЩЬ» (#/help, владелец 14.11.2026) — библиотека: сверху «Первое свидание» (переход в «Знакомство»),
   ниже пункты — вопросы для разговора, общие темы для обсуждения, «Правила нашего дома», комплименты. Пункт
   раскрывается по нажатию; внутри — папки (например, «Три вопроса — когда мало времени», «Карта любви»), тоже
   раскрываются. Под вопросами — «как понимать ответ», у научных вопросов — источники со ссылками.
   «Правила нашего дома» человек ведёт сам: «＋» — дописать, нажать — изменить, «−» — убрать (help/rules.js). */

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

function entry(e) {
  return h('li', { class: 'help__entry' },
    h('span', { class: 'help__text' }, e.text),
    e.note ? h('span', { class: 'help__note' }, e.note) : null,
    e.read ? readBox(e.read) : null,
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
    s.title ? h('h4', { class: 'help__section-title' }, s.title) : null,
    s.lead ? h('p', { class: 'help__section-lead' }, s.lead) : null,
    s.entries?.length ? h('ol', { class: 'help__list' }, ...s.entries.map(entry)) : null,
    s.read ? readBox(s.read) : null,
    sources(s.sources),
  );
}

/** Папка: с заголовком — раскрывается по нажатию; без заголовка — просто список. */
function folder(g) {
  const body = [
    g.lead ? h('p', { class: 'help__section-lead' }, g.lead) : null,
    g.entries?.length ? h('ol', { class: 'help__list' }, ...g.entries.map(entry)) : null,
    ...(g.sections || []).map(section),
    g.read ? readBox(g.read) : null,
    sources(g.sources),
  ];
  if (!g.title) return h('div', { class: 'help__group' }, ...body);
  return h('details', { class: 'help__folder' },
    h('summary', { class: 'help__folder-summary' }, svg(icons.chevronRight, 'help__chevron'), h('span', {}, g.title)),
    h('div', { class: 'help__folder-body' }, ...body),
  );
}

/** «Правила нашего дома»: список человека — нажать, чтобы изменить; «−» — убрать; «＋» — дописать. */
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
    const minus = h('button', { type: 'button', class: 'help__rule-btn', 'aria-label': t('help.rulesRemove'), title: t('help.rulesRemove') }, '−');
    minus.addEventListener('click', () => {
      if (!confirm(t('help.rulesRemoveConfirm'))) return;
      rules.remove(r.id);
      rerender();
    });
    return h('li', { class: 'help__rule' }, text, minus);
  });
  const input = h('input', { class: 'input help__rule-input', placeholder: t('help.rulesPh'), maxlength: String(rules.MAX_TEXT), 'aria-label': t('help.rulesPh') });
  const form = h('form', { class: 'help__rule-add' }, input,
    h('button', { type: 'submit', class: 'help__rule-btn help__rule-btn--add', 'aria-label': t('help.rulesAdd'), title: t('help.rulesAdd') }, '＋'));
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    if (!rules.add(input.value, defaults)) {
      input.focus();
      return;
    }
    toast({ title: t('help.rulesSaved') });
    rerender();
  });
  return [h('ol', { class: 'help__rules' }, ...rows), form];
}

function itemCard(item, ctx) {
  const card = h('details', { class: 'card help__item' },
    h('summary', { class: 'help__summary' },
      h('span', { class: 'help__title' }, item.title),
      item.draft ? h('span', { class: 'chip help__draft' }, t('help.draft')) : null,
      svg(icons.chevronRight, 'help__chevron'),
    ),
    h('p', { class: 'card__text help__lead' }, item.lead),
    ...(item.editable ? rulesBody(item, () => { openRules = true; ctx.rerender(); }) : item.groups.map(folder)),
  );
  // Правила только что изменили — пункт остаётся раскрытым после перерисовки
  if (item.editable && openRules) {
    card.open = true;
    openRules = false;
  }
  return card;
}

let openRules = false;

export function render(view, ctx) {
  const data = help.content(ctx.lang);
  if (!data) {
    add(view, h('h1', { class: 'screen-title' }, t('help.title')), h('p', { class: 'card__text' }, t('help.waiting')));
    return;
  }
  add(view,
    h('h1', { class: 'screen-title' }, data.title),
    h('p', { class: 'help__intro' }, data.intro),
    meetCard(data),
    ...data.items.map((item) => itemCard(item, ctx)),
  );
}
