import { h, svg } from '../core/dom.js';
import { t } from '../core/i18n.js';
import { icons } from '../ui/icons.js';
import { segmented, field } from '../ui/controls.js';
import { openSheet, closeSheet } from '../ui/sheet.js';
import { toast } from '../ui/toast.js';
import * as circles from './circles.js';
import * as model from './goals-model.js';

/* ОБЩИЕ ЦЕЛИ на экране «Цели» — вкладки «Пара» и «Семья» (goals-model.js — данные). Карточка цели: название,
   полоса прогресса, раскрашенная по вкладу (женская часть — розовое золото, мужская — золото, ребёнок — шампань);
   у «Шагов» — шаги с галочкой, весом и исполнителем; у «Счётчика» — «n из N» и «+1». «Новая общая цель» — лист с
   выбором вида. */

const tone = (circle, memberId) => {
  const m = circle.members.find((x) => x.id === memberId);
  if (!m) return 'is-both';
  return m.role === 'child' ? 'is-child' : m.side === 'man' ? 'is-man' : 'is-woman';
};

const whoName = (circle, who) => (who === 'both' ? (circle.kind === 'family' ? t('us.goals.all') : t('us.goals.both')) : circles.memberName(circle, who));

function bar(circle, p) {
  return h('div', { class: 'bar cgoal__bar' },
    ...p.parts.map((x) => h('div', { class: `cgoal__part ${tone(circle, x.member)}`, style: { width: `${x.percent}%` } })));
}

function goalCard(circle, g) {
  const p = model.progress(circle.id, g);
  const d = g.data;
  const head = h('div', { class: 'cgoal__head' },
    h('h3', { class: 'cgoal__title' }, d.title),
    h('span', { class: 'cgoal__percent gold-text' }, `${p.percent}%`),
  );
  const del = h('button', { type: 'button', class: 'cgoal__remove', 'aria-label': t('us.goals.remove'), onclick: () => { if (confirm(t('us.goals.remove'))) model.removeGoal(circle, g); } }, svg(icons.trash));
  let body;
  if (d.type === 'counter') {
    body = h('div', { class: 'cgoal__counter' },
      h('span', { class: 'cgoal__count' }, t('us.goals.of', { n: p.count, all: p.target })),
      d.track ? h('span', { class: 'cgoal__track faint' }, t(`us.goals.tracks.${d.track}`)) : null,
      h('span', { class: 'cgoal__period faint' }, d.period === 'week' ? t('us.goals.week') : t('us.goals.forever')),
      h('button', { type: 'button', class: 'btn btn--ghost cgoal__plus', onclick: () => model.plusOne(circle, g) }, t('us.goals.plus')),
    );
  } else {
    body = h('ul', { class: 'cgoal__steps' }, ...(d.steps || []).map((s) => h('li', { class: `cgoal__step${s.done ? ' is-done' : ''}` },
      h('button', {
        type: 'button', class: `goal__mark${s.done ? ' is-done' : ''}`, 'aria-pressed': String(!!s.done), 'aria-label': s.text,
        onclick: () => model.toggleStep(circle, g, s.id),
      }, svg(icons.check)),
      h('span', { class: 'cgoal__step-text' }, s.text),
      h('span', { class: 'cgoal__step-meta' }, `${s.weight}% · ${whoName(circle, s.who)}`),
    )));
  }
  return h('li', { class: `card cgoal${p.percent >= 100 ? ' is-reached' : ''}` },
    head, bar(circle, p), body,
    p.percent >= 100 ? h('p', { class: 'cgoal__reached' }, svg(icons.crown, 'cgoal__crown'), t('us.goals.reached')) : null,
    del,
  );
}

/* — Новая цель — */
function whoSelect(circle, value = 'both') {
  const sel = h('select', { class: 'input select__control', 'aria-label': t('us.goals.who') },
    h('option', { value: 'both', selected: value === 'both' }, whoName(circle, 'both')),
    ...circle.members.map((m) => h('option', { value: m.id, selected: m.id === value }, m.name || '—')));
  return h('div', { class: 'select' }, sel, svg(icons.chevronRight, 'select__chevron'));
}

function openCreate(circle) {
  let kind = 'steps';
  const title = field({ label: t('us.goals.title'), maxlength: '120', placeholder: t('us.goals.titlePh') });
  const stepsBox = h('div', { class: 'cgoal-form__steps' });
  const addStep = () => {
    const text = h('input', { class: 'input', maxlength: '120', placeholder: t('us.goals.stepPh'), 'aria-label': t('us.goals.step') });
    const weight = h('input', { class: 'input cgoal-form__weight', type: 'number', min: '0', max: '100', inputmode: 'numeric', placeholder: t('us.goals.weight'), 'aria-label': t('us.goals.weight') });
    stepsBox.append(h('div', { class: 'cgoal-form__step' }, text, weight, whoSelect(circle)));
  };
  addStep();
  addStep();
  const stepsPart = h('div', {},
    h('p', { class: 'field__hint' }, t('us.goals.stepsHint')),
    stepsBox,
    h('button', { type: 'button', class: 'btn btn--ghost btn--block', onclick: addStep }, svg(icons.plus), t('us.goals.addStep')),
  );
  const target = field({ label: t('us.goals.target'), type: 'number', min: '1', max: '1000', inputmode: 'numeric', value: '14' });
  const track = h('select', { class: 'input select__control', 'aria-label': t('us.goals.track') },
    h('option', { value: '' }, t('us.goals.manual')),
    ...model.TRACKS.map((k) => h('option', { value: k }, t(`us.goals.tracks.${k}`))));
  const period = h('select', { class: 'input select__control', 'aria-label': t('us.goals.period') },
    h('option', { value: 'week' }, t('us.goals.week')), h('option', { value: 'forever' }, t('us.goals.forever')));
  const counterPart = h('div', { hidden: true },
    h('p', { class: 'field__hint' }, t('us.goals.counterHint')),
    target.node,
    h('div', { class: 'field' }, h('span', { class: 'field__label' }, t('us.goals.track')), h('div', { class: 'select' }, track, svg(icons.chevronRight, 'select__chevron'))),
    h('div', { class: 'field' }, h('span', { class: 'field__label' }, t('us.goals.period')), h('div', { class: 'select' }, period, svg(icons.chevronRight, 'select__chevron'))),
  );
  const kindPick = segmented({
    label: t('us.goals.kind'),
    options: [{ value: 'steps', label: t('us.goals.steps') }, { value: 'counter', label: t('us.goals.counter') }],
    value: kind,
    onChange: (v) => { kind = v; stepsPart.hidden = v !== 'steps'; counterPart.hidden = v !== 'counter'; },
  });
  const save = h('button', { type: 'button', class: 'btn btn--gold btn--block' }, t('us.goals.create'));
  save.addEventListener('click', () => {
    const steps = [...stepsBox.children].map((row) => {
      const [text, weight] = row.querySelectorAll('input');
      return { text: text.value, weight: weight.value, who: row.querySelector('select').value };
    }).filter((s) => s.text.trim());
    const sum = steps.reduce((a, s) => a + (Number(s.weight) || 0), 0);
    const made = model.create(circle, { title: title.control.value, type: kind, steps, target: target.control.value, track: track.value || null, period: period.value });
    if (!made) { title.control.focus(); return; }
    closeSheet();
    if (kind === 'steps' && steps.length && sum !== 100) toast({ title: t('us.goals.normalized', { sum }) });
  });
  openSheet({ title: t('us.goals.new'), content: h('div', { class: 'stack' }, title.node, kindPick, stepsPart, counterPart, save) });
}

/** Вкладка «Пара» или «Семья» на экране «Цели». */
export function circleGoals(kind) {
  const circle = kind === 'pair' ? circles.pair() : circles.family();
  if (!circle || !circles.isComplete(circle)) {
    return h('div', { class: 'card empty' },
      h('div', { class: 'goals__emblem' }, svg(icons.rings)),
      h('p', {}, t('us.goals.needCircle')),
      h('a', { class: 'btn btn--gold btn--quiet btn--block', href: '#/us' }, t('us.open')),
    );
  }
  const list = model.goalsOf(circle.id);
  return h('div', { class: 'stack' },
    h('button', { type: 'button', class: 'btn btn--gold btn--block', onclick: () => openCreate(circle) }, svg(icons.plus), t('us.goals.new')),
    list.length ? h('ul', { class: 'goals__list' }, ...list.map((g) => goalCard(circle, g))) : h('p', { class: 'card__text faint' }, t('us.goals.empty')),
  );
}
