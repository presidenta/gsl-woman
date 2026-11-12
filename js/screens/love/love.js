import { h, svg, add } from '../../core/dom.js';
import { t } from '../../core/i18n.js';
import { icons } from '../../ui/icons.js';
import { toast } from '../../ui/toast.js';
import { KINDS, GROUPS, MAX_PEOPLE, choices, choose, setCount, setPerson, content, score } from '../../love/love.js';
import { GROUP_TEXT, personLabel } from '../../love/cards.js';

/* ЭКРАН «ПЯТЬ ЯЗЫКОВ ЛЮБВИ» (#/love). Отдельные разделы, по порядку (владелец 13.11.2026: «отдельно мужчина,
   потом дети, потом родители и другие родственники — три разных раздела, отделены»):
     1. «Мой мужчина» — его язык: выбрать или тест;
     2. «Мои дети» — «Сколько детей», у каждого имя, язык, тест;
     3. «Родители и родные» — так же: «Папа», «Брат Вася», «Сестра Клава»…;
     4. «Мой язык» — для я-сообщений;
   ниже — что это такое и все пять языков.
   Тест — по вопросу за раз, пять ответов (по одному на каждый язык, порядок сдвинут); в конце — главный язык,
   второй по силе и кнопка «Это язык …». Тест живёт только на этом экране, в хранилище — итог. */

let quiz = null; // { who: 'him'|'me'|'children'|'family', index?, i, picks } — идёт тест
let result = null; // { who, index?, ranking } — тест пройден, итог на экране

const QUIZ_OF = { him: 'him', me: 'me', children: GROUPS.children.quiz, family: GROUPS.family.quiz };

function shuffled(i) {
  const k = (i * 2 + 1) % KINDS.length;
  return [...KINDS.slice(k), ...KINDS.slice(0, k)];
}

function rerender(view, ctx) {
  view.replaceChildren();
  render(view, ctx);
  scrollTo({ top: 0 });
}

function startQuiz(view, ctx, who, index) {
  quiz = { who, index, i: 0, picks: [] };
  result = null;
  rerender(view, ctx);
}

function kindSelect(id, c, current, onPick, label) {
  const select = h('select', { id, class: 'input select__control', 'aria-label': label },
    h('option', { value: '', selected: !current }, t('love.pickNone')),
    ...KINDS.map((k) => h('option', { value: k, selected: k === current }, c.kinds[k].name)));
  select.addEventListener('change', () => {
    onPick(select.value);
    toast({ title: t('love.saved') });
  });
  return h('div', { class: 'select' }, select, svg(icons.chevronRight, 'select__chevron'));
}

const testButton = (onClick) => h('button', { type: 'button', class: 'btn btn--ghost love-who__test', onclick: onClick }, t('love.test'));

// «Мой мужчина» и «Мой язык» — по отдельной карточке: заголовок, подсказка, язык и тест
function oneSection(view, ctx, c, who, current) {
  const id = `love-${who}`;
  return h('section', { class: 'card settings__section love-section' },
    h('h2', { class: 'love-section__title' }, t(`love.${who}Section`)),
    h('p', { class: 'card__text faint' }, t(`love.${who}Hint`)),
    h('div', { class: 'love-who__row' },
      kindSelect(id, c, current, (k) => choose(who, k), t(`love.who.${who}`)),
      testButton(() => startQuiz(view, ctx, who)),
    ),
  );
}

// Дети и родные: «Сколько», и по строке на каждого — имя, язык, тест
function groupSection(view, ctx, c, group, people) {
  const tx = GROUP_TEXT[group];
  const count = h('select', { id: `love-${group}-count`, class: 'input select__control' },
    ...Array.from({ length: MAX_PEOPLE + 1 }, (_, n) => h('option', { value: String(n), selected: n === people.length }, String(n))));
  count.addEventListener('change', () => setCount(group, count.value));

  return h('section', { class: 'card settings__section love-section' },
    h('h2', { class: 'love-section__title' }, t(tx.title)),
    h('p', { class: 'card__text faint' }, t(tx.hint)),
    h('div', { class: 'field love-who' },
      h('label', { class: 'field__label', for: `love-${group}-count` }, t(tx.count)),
      h('div', { class: 'select love-kids__count' }, count, svg(icons.chevronRight, 'select__chevron')),
    ),
    ...people.map((person, i) => {
      const id = `love-${group}-name-${i}`;
      const name = h('input', { id, class: 'input', type: 'text', maxlength: '40', value: person.name, placeholder: t(tx.ph), autocomplete: 'off' });
      name.addEventListener('change', () => setPerson(group, i, { name: name.value }));
      return h('div', { class: 'love-kid' },
        h('label', { class: 'field__label', for: id }, t(tx.n, { n: i + 1 })),
        name,
        h('div', { class: 'love-who__row' },
          kindSelect(`love-${group}-${i}`, c, person.kind, (k) => setPerson(group, i, { kind: k }), t(tx.lang)),
          testButton(() => startQuiz(view, ctx, group, i)),
        ),
      );
    }),
  );
}

function whoName(who, index) {
  return personLabel(who, choices()[who][index] || { name: '' }, index);
}

function quizTitle(who, index) {
  return GROUPS[who] ? t('love.whoTest.named', { name: whoName(who, index) }) : t(`love.whoTest.${who}`);
}

function quizView(view, ctx, c) {
  const list = c.quiz[QUIZ_OF[quiz.who]];
  const q = list[quiz.i];
  return h('section', { class: 'card love-quiz' },
    h('div', { class: 'card__eyebrow' },
      h('span', { class: 'card__icon' }, svg(icons.heart)),
      h('span', { class: 'caps' }, quizTitle(quiz.who, quiz.index)),
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
            result = { who: quiz.who, index: quiz.index, ranking: score(quiz.picks) };
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
  const { who, index } = result;
  const saveText = GROUPS[who] ? t('love.save.named', { name: whoName(who, index) }) : t(`love.save.${who}`);
  return h('section', { class: 'card card--hero love-result' },
    h('div', { class: 'card__eyebrow' },
      h('span', { class: 'card__icon' }, svg(icons.heart)),
      h('span', { class: 'caps' }, quizTitle(who, index)),
    ),
    h('p', { class: 'caps love-result__label' }, t('love.resultTitle')),
    h('h2', { class: 'love-result__name' }, main.name),
    h('p', { class: 'card__text' }, main.about),
    second.count ? h('p', { class: 'card__text faint' }, t('love.resultSecond', { name: c.kinds[second.kind].name })) : null,
    h('div', { class: 'card__actions love-result__actions' },
      h('button', {
        type: 'button',
        class: 'btn btn--gold btn--block',
        onclick: () => {
          if (GROUPS[who]) setPerson(who, index, { kind: first.kind });
          else choose(who, first.kind);
          result = null;
          toast({ title: t('love.saved') });
          rerender(view, ctx);
        },
      }, saveText),
      h('button', { type: 'button', class: 'btn btn--ghost btn--block', onclick: () => startQuiz(view, ctx, who, index) }, t('love.again')),
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
    oneSection(view, ctx, c, 'him', mine.him),
    groupSection(view, ctx, c, 'children', mine.children),
    groupSection(view, ctx, c, 'family', mine.family),
    oneSection(view, ctx, c, 'me', mine.me),
    h('section', { class: 'card love-intro' }, h('p', { class: 'card__text' }, c.intro)),
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
