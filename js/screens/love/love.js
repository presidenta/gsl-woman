import { h, svg, add } from '../../core/dom.js';
import { t } from '../../core/i18n.js';
import { icons } from '../../ui/icons.js';
import { toast } from '../../ui/toast.js';
import { KINDS, WHO, choices, choose, content, score } from '../../love/love.js';

/* ЭКРАН «ПЯТЬ ЯЗЫКОВ ЛЮБВИ» (#/love): что это такое, чей язык какой (выбрать самой или тестом), все пять
   языков. Тест — по вопросу за раз, пять ответов (по одному на каждый язык, порядок перемешан, чтобы
   ответы одного языка не стояли всегда на одном месте); в конце — главный язык, второй по силе и кнопка
   «Это язык моего мужчины / мой / моего ребёнка». Тест живёт только на этом экране, в хранилище — итог. */

let quiz = null; // { who, i, picks } — идёт тест; null — обычный вид
let result = null; // { who, ranking } — тест пройден, итог на экране

function shuffled(i) {
  // Свой порядок у каждого вопроса, но всегда один и тот же: сдвиг по номеру
  const k = (i * 2 + 1) % KINDS.length;
  return [...KINDS.slice(k), ...KINDS.slice(0, k)];
}

function rerender(view, ctx) {
  view.replaceChildren();
  render(view, ctx);
  scrollTo({ top: 0 });
}

function whoRow(view, ctx, c, who, current) {
  const id = `love-${who}`;
  const select = h('select', { id, class: 'input select__control' },
    h('option', { value: '', selected: !current }, t('love.pickNone')),
    ...KINDS.map((k) => h('option', { value: k, selected: k === current }, c.kinds[k].name)));
  select.addEventListener('change', () => {
    choose(who, select.value);
    toast({ title: t('love.saved') });
  });
  return h('div', { class: 'field love-who' },
    h('label', { class: 'field__label', for: id }, t(`love.who.${who}`)),
    h('div', { class: 'love-who__row' },
      h('div', { class: 'select' }, select, svg(icons.chevronRight, 'select__chevron')),
      h('button', {
        type: 'button',
        class: 'btn btn--ghost love-who__test',
        onclick: () => { quiz = { who, i: 0, picks: [] }; result = null; rerender(view, ctx); },
      }, t('love.test')),
    ),
  );
}

function quizView(view, ctx, c) {
  const list = c.quiz[quiz.who];
  const q = list[quiz.i];
  return h('section', { class: 'card love-quiz' },
    h('div', { class: 'card__eyebrow' },
      h('span', { class: 'card__icon' }, svg(icons.heart)),
      h('span', { class: 'caps' }, t(`love.whoTest.${quiz.who}`)),
    ),
    h('p', { class: 'love-quiz__step faint' }, t('love.question', { n: quiz.i + 1, count: list.length })),
    h('div', { class: 'bar' }, h('div', { class: 'bar__fill', style: { width: `${(quiz.i / list.length) * 100}%` } })),
    h('h2', { class: 'card__title love-quiz__q' }, q.q),
    h('div', { class: 'love-quiz__answers' },
      ...shuffled(quiz.i).map((k) => h('button', {
        type: 'button',
        class: 'love-quiz__answer',
        onclick: () => {
          quiz.picks.push(k);
          quiz.i += 1;
          if (quiz.i >= list.length) {
            result = { who: quiz.who, ranking: score(quiz.picks) };
            quiz = null;
          }
          rerender(view, ctx);
        },
      }, q.a[k])),
    ),
    h('button', { type: 'button', class: 'love-quiz__cancel', onclick: () => { quiz = null; rerender(view, ctx); } }, t('love.cancel')),
  );
}

function resultView(view, ctx, c) {
  const [first, second] = result.ranking;
  const main = c.kinds[first.kind];
  const who = result.who;
  return h('section', { class: 'card card--hero love-result' },
    h('div', { class: 'card__eyebrow' },
      h('span', { class: 'card__icon' }, svg(icons.heart)),
      h('span', { class: 'caps' }, t(`love.whoTest.${who}`)),
    ),
    h('p', { class: 'caps love-result__label' }, t('love.resultTitle')),
    h('h2', { class: 'love-result__name' }, main.name),
    h('p', { class: 'card__text' }, main.about),
    second.count ? h('p', { class: 'card__text faint' }, t('love.resultSecond', { name: c.kinds[second.kind].name })) : null,
    h('div', { class: 'card__actions love-result__actions' },
      h('button', {
        type: 'button',
        class: 'btn btn--gold btn--block',
        onclick: () => { choose(who, first.kind); result = null; toast({ title: t('love.saved') }); rerender(view, ctx); },
      }, t(`love.save.${who}`)),
      h('button', { type: 'button', class: 'btn btn--ghost btn--block', onclick: () => { quiz = { who, i: 0, picks: [] }; result = null; rerender(view, ctx); } }, t('love.again')),
    ),
  );
}

export function render(view, ctx) {
  const c = content(ctx.lang);
  if (!c) {
    add(view, h('h1', { class: 'screen-title' }, t('love.title')), h('p', { class: 'card__text' }, t('love.empty')));
    return;
  }
  if (quiz) {
    add(view, h('h1', { class: 'screen-title' }, c.title), quizView(view, ctx, c));
    return;
  }
  const mine = choices();
  add(view,
    h('h1', { class: 'screen-title' }, c.title),
    result ? resultView(view, ctx, c) : null,
    h('section', { class: 'card love-intro' }, h('p', { class: 'card__text' }, c.intro)),
    h('section', { class: 'card settings__section' },
      h('h2', { class: 'caps settings__heading' }, t('love.choose')),
      h('p', { class: 'card__text faint' }, t('love.chooseHint')),
      ...WHO.map((who) => whoRow(view, ctx, c, who, mine[who])),
    ),
    h('section', { class: 'card' },
      h('h2', { class: 'caps settings__heading' }, t('love.kinds')),
      h('ol', { class: 'love-kinds' },
        ...KINDS.map((k) => h('li', {}, h('strong', {}, c.kinds[k].name), h('span', { class: 'dim' }, c.kinds[k].about)))),
    ),
  );
}

/* Ушла с экрана посреди теста — при возвращении начнёт обычный вид */
export function onEnter() {
  quiz = null;
  result = null;
}
