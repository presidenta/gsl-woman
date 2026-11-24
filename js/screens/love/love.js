import { h, svg, add } from '../../core/dom.js';
import { t, list } from '../../core/i18n.js';
import { icons } from '../../ui/icons.js';
import { toast } from '../../ui/toast.js';
import { KINDS, GROUPS, MAX_PEOPLE, choices, choose, setCount, setPerson, content, resultOf, setResult } from '../../love/love.js';
import * as quiz from '../../love-quiz/quiz.js';
import { GROUP_TEXT, personLabel } from '../../love/cards.js';
import { KIND_ICON } from '../../love/kind-icons.js';

/* ЭКРАН «ПЯТЬ ЯЗЫКОВ ЛЮБВИ» (#/love). Отдельные разделы, по порядку (владелец 13.11.2026: «отдельно мужчина,
   потом дети, потом родители и другие родственники — три разных раздела, отделены»):
     1. «Мой мужчина» — его язык: выбрать или анкета;
     2. «Мои дети» — «Сколько детей», у каждого имя, язык, анкета;
     3. «Родные» — так же: «Папа», «Брат Вася», «Сестра Клава»…;
     4. «Мой язык» — для я-сообщений;
   ниже — что это такое и все пять языков.
   Анкеты (владелец 22.11.2026, вместо прежнего короткого теста) — js/love-quiz/: «Мой язык» — анкета о себе
   (22 вопроса); мужчина, дети и родные — анкета по наблюдению (взрослый; у детей — ребёнок или подросток).
   Анкета живёт только на этом экране, в хранилище — итог («Это язык …»). */

const SELF_URL = 'https://presidenta.github.io/otkrytie-puti/love/'; // анкета о себе на сайте — её можно переслать

function rerender(view, ctx) {
  view.replaceChildren();
  render(view, ctx);
}

/* Экран, который сейчас на месте. Приложение пересобирает экран заново при каждом изменении данных (main.js → draw:
   синхронизация, вход, отметки), и элемент, запомненный при открытии анкеты, к нажатию «Начать» уже снят со
   страницы: анкета рисовала следующий шаг в него — и на экране ничего не происходило (владелец 24.11.2026: «тест
   не нажимается кнопка»). Анкета перерисовывает всегда текущий. */
let onScreen = null;
const redrawCurrent = () => { if (onScreen) rerender(onScreen.view, onScreen.ctx); };

/** Открыть анкету для «Мой мужчина» / «Мой язык» (who) или для человека группы (who = 'children' | 'family', index). */
function openQuiz(view, ctx, c, who, index) {
  const group = GROUPS[who];
  const save = (kind) => {
    if (group) setPerson(who, index, { kind });
    else choose(who, kind);
    toast({ title: t('love.saved') });
    redrawCurrent();
    scrollTo({ top: 0 });
  };
  const named = group ? { name: whoName(who, index) } : {};
  quiz.open({
    mode: who === 'me' ? 'self' : 'observe',
    group: { him: 'adult', family: 'adult', children: null }[who] ?? null, // детям — спросить: ребёнок или подросток
    title: group ? t('love.quiz.title.named', named) : t(`love.quiz.title.${who}`),
    saveText: group ? t('love.save.named', named) : t(`love.save.${who}`),
    selfLink: who === 'me' ? null : { text: t(`love.quiz.selfLink.${who === 'him' ? 'him' : 'other'}`), url: SELF_URL },
    names: Object.fromEntries(KINDS.map((k) => [k, c.kinds[k].name])), // названия языков — как везде в приложении
    lang: ctx.lang,
    saved: resultOf(who, index), // пройдена — открывается её итог (владелец 24.11.2026)
    onResult: (r) => setResult(who, index, r),
    onSave: save,
    redraw: redrawCurrent,
  });
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

const quizButton = (onClick, done) => h('button', { type: 'button', class: 'btn btn--ghost love-who__test', onclick: onClick },
  t(done ? 'love.quiz.result' : 'love.quiz.open'));

/* Итог пройденной анкеты — строкой под человеком: все пять языков в процентах, по убыванию (владелец 24.11.2026:
   «чтобы было видно, какие языки любви в приоритете в процентном соотношении»). */
function resultLine(c, r) {
  if (!r) return null;
  return h('p', { class: 'faint love-result' },
    ...r.ranking.map((x, i) => h('span', { class: i === 0 ? 'love-result__top' : null }, `${c.kinds[x.kind].name} ${x.pct}%`))
      .flatMap((el, i) => (i ? [' · ', el] : [el])));
}

// «Мой мужчина» и «Мой язык» — по отдельной карточке: заголовок, подсказка, язык и анкета
function oneSection(view, ctx, c, who, current) {
  const id = `love-${who}`;
  return h('section', { class: 'card settings__section love-section' },
    h('h2', { class: 'love-section__title' }, t(`love.${who}Section`)),
    h('p', { class: 'card__text faint' }, t(`love.${who}Hint`)),
    // «Мой язык»: зачем его знать — ссылкой, раскрывается по нажатию (владелец 13.11.2026: «коротко и ясно»)
    who === 'me'
      ? h('details', { class: 'love-why' },
        h('summary', { class: 'love-why__link' }, t('love.meWhy')),
        h('ul', { class: 'love-why__list' }, ...list('love.meWhyList').map((x) => h('li', {}, x))),
      )
      : null,
    h('div', { class: 'love-who__row' },
      kindSelect(id, c, current, (k) => choose(who, k), t(`love.who.${who}`)),
      quizButton(() => openQuiz(view, ctx, c, who), resultOf(who)),
    ),
    resultLine(c, resultOf(who)),
  );
}

// Дети и родные: «Сколько», и по строке на каждого — имя, язык, анкета
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
          quizButton(() => openQuiz(view, ctx, c, group, i), person.result),
        ),
        resultLine(c, person.result),
      );
    }),
  );
}

function whoName(who, index) {
  return personLabel(who, choices()[who][index] || { name: '' }, index);
}

export function render(view, ctx) {
  onScreen = { view, ctx };
  const c = content(ctx.lang);
  if (!c) {
    add(view, h('h1', { class: 'screen-title' }, t('love.title')), h('p', { class: 'card__text' }, t('love.empty')));
    return;
  }
  if (quiz.isOpen()) {
    add(view, h('h1', { class: 'screen-title' }, c.title), quiz.node());
    return;
  }
  const mine = choices();
  add(view,
    h('h1', { class: 'screen-title' }, c.title),
    oneSection(view, ctx, c, 'him', mine.him),
    groupSection(view, ctx, c, 'children', mine.children),
    groupSection(view, ctx, c, 'family', mine.family),
    oneSection(view, ctx, c, 'me', mine.me),
    h('section', { class: 'card love-intro' }, h('p', { class: 'card__text' }, c.intro)),
    h('section', { class: 'card' },
      h('h2', { class: 'caps settings__heading' }, t('love.kinds')),
      h('ol', { class: 'love-kinds' },
        ...KINDS.map((k) => h('li', { class: 'love-kinds__item' },
          svg(KIND_ICON[k], 'love-kinds__seal'),
          h('span', { class: 'love-kinds__body' }, h('strong', {}, c.kinds[k].name), h('span', { class: 'dim' }, c.kinds[k].about))))),
    ),
  );
}

/* Ушла с экрана посреди анкеты — при возвращении начнёт обычный вид */
export function onEnter() {
  quiz.close();
}
