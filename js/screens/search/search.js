import { h, svg, add } from '../../core/dom.js';
import { icons } from '../../ui/icons.js';
import { toast } from '../../ui/toast.js';
import * as meet from '../../meet/meet.js';
import { counts, bump } from '../../search/steps.js';
import { st } from '../../search/texts.js';
import { platePanel } from '../../ui/plate.js';
import { figure, highlight } from '../help/help.js';
import { photoOf } from '../../photos/photos.js';

/* Блоки — плашками со стрелкой, как во всём приложении (владелец 15.11.2026); раскрытые переживают перерисовку. */
const opened = new Set();
const BLOCK_ICON = { self: 'sun', where: 'eye', rhythm: 'week', chat: 'chat', pyramid: 'crown', plus: 'crown', level: 'sparkle', choose: 'check', respect: 'heart' };

/* ЭКРАН «В ПОИСКЕ» (#/search, владелец 15.11.2026): действия для тех, кто ищет своего человека.
     1. «Мои шаги этой недели» — отметки: выходы в люди, знакомства, свидания; цель недели, золото — когда цель есть.
        Цели — минимум / 100% / максимум (владелец 15.11.2026: «чтобы был разгон»): дошёл — отметка золотом.
     2. Блоки: сначала ты, где искать, ритм недели, переписка, пирамида мужчин (у женщин) или женщина плюс / ноль /
        минус (у мужчин) — уровни с дословными словами автора, признаки надёжного человека, уважение и близость.
        Под каждым блоком — подпись (тренинг или психологи).
     3. Ссылка в «Знакомство» — шпаргалка к встрече и запись после свидания.
   Тексты — с сервера (meet.search), подробно — js/search/README.md. */

/** Шаги недели с «+1» / «−» и тремя целями — список; его ставят экран «В поиске» и карточка на «Сегодня». */
export function stepsList(steps) {
  const now = counts();
  const rows = steps.items.map((s) => {
    // Три цели недели: минимум / 100% / максимум (владелец 15.11.2026: «чтобы был разгон»); старые тексты — одна цель
    const goals = [['min', s.min ?? s.goal], ['full', s.full ?? s.goal], ['max', s.max ?? s.goal]];
    const num = h('span', { class: 'search-step__num' });
    const marks = goals.map(([k, v]) => h('span', { class: 'search-step__goal' }, st(k, { n: v })));
    const row = h('li', { class: 'search-step' });
    const levelOf = (n) => goals.filter(([, v]) => n >= v).map(([k]) => k).pop() || null;
    const paint = (n) => {
      num.textContent = String(n);
      goals.forEach(([, v], i) => marks[i].classList.toggle('is-reached', n >= v));
      row.dataset.level = levelOf(n) || '';
    };
    const minus = h('button', { type: 'button', class: 'search-step__btn search-step__btn--minus', 'aria-label': st('undo') }, '−');
    const plus = h('button', { type: 'button', class: 'search-step__btn', 'aria-label': st('add') }, '+1');
    minus.addEventListener('click', () => paint(bump(s.key, -1)));
    plus.addEventListener('click', () => {
      const before = levelOf(Number(counts()[s.key]) || 0);
      const n = bump(s.key, +1);
      paint(n);
      const after = levelOf(n);
      if (after && after !== before) toast({ title: st('reached.' + after) });
    });
    row.append(
      h('span', { class: 'search-step__text' },
        h('span', { class: 'search-step__title' }, s.title),
        h('span', { class: 'search-step__hint' }, s.hint),
        h('span', { class: 'search-step__goals' }, ...marks)),
      num, minus, plus,
    );
    paint(Number(now[s.key]) || 0);
    return row;
  });
  return h('ul', { class: 'search-steps' }, ...rows);
}

function stepsCard(steps) {
  return h('section', { class: 'card card--hero search__card' },
    h('h2', { class: 'caps search__heading' }, steps.title),
    steps.lead ? h('p', { class: 'card__text' }, steps.lead) : null,
    stepsList(steps),
  );
}

/** Слова автора дословно и подпись: автор и книга; keys — название типа золотом в тексте. */
function quoteBox(q) {
  return h('figure', { class: 'search-quote' },
    h('blockquote', { class: 'search-quote__text' }, highlight(q.text, q.keys)),
    q.source ? h('figcaption', { class: 'search-quote__source' }, `— ${q.source}`) : null,
  );
}

function levelsList(levels) {
  return h('ol', { class: 'search-levels' }, ...levels.map((x) => h('li', { class: 'search-level' },
    x.img ? null : h('span', { class: 'search-level__mark', 'aria-hidden': 'true' }, x.mark),
    h('span', { class: 'search-level__body' },
      // Фигура в полный рост слева, название, текст и слова автора её обтекают
      x.img ? h('span', { class: 'search-level__pic' }, figure(x.img), h('span', { class: 'search-level__mark search-level__mark--on', 'aria-hidden': 'true' }, x.mark)) : null,
      h('strong', { class: 'search-level__name' }, x.name),
      h('span', { class: 'search-level__text' }, x.text),
      x.quote ? quoteBox({ text: x.quote, source: x.source, keys: x.keys }) : null,
    ),
  )));
}

// Фото блока на сегодня (js/photos/catalog.js): у его и её части — свои кадры
const blockPhoto = (key) => photoOf(`search.${key}`);

function blockCard(b) {
  const pic = b.levels ? null : blockPhoto(b.key); // у пирамиды и уровней — свои фигуры
  const node = platePanel({
    icon: icons[BLOCK_ICON[b.key]] || icons.sparkle,
    title: b.title,
    lead: b.by || null, // кто автор — строкой под названием («По трактовке Павла Ракова — …»)
    open: opened.has(b.key),
    cls: `search__plate${pic ? ' has-photo' : ''}`,
    body: [
      pic,
      b.lead ? h('p', { class: 'card__text' }, b.lead) : null,
      b.levels ? levelsList(b.levels) : null,
      h('ul', { class: 'search__list' }, ...b.items.map((x) => h('li', {}, x))),
      b.quotes?.length ? h('div', { class: 'search-quotes' },
        b.quotesLead ? h('p', { class: 'caps search-quotes__lead' }, b.quotesLead) : null,
        ...b.quotes.map(quoteBox)) : null,
      b.author ? h('p', { class: 'search__author faint' }, `— ${b.author}`) : null,
    ],
  });
  node.addEventListener('toggle', () => { if (node.open) opened.add(b.key); else opened.delete(b.key); });
  return node;
}

export function render(view, ctx) {
  const data = meet.content(ctx.lang)?.search;
  if (!data) {
    add(view, h('p', { class: 'card__text' }, st('waiting')));
    return;
  }
  add(view,
    h('h1', { class: 'screen-title' }, data.title),
    h('p', { class: 'search__intro' }, data.intro),
    data.steps ? stepsCard(data.steps) : null,
    ...data.blocks.map(blockCard),
    h('a', { class: 'card settings__link search__meet', href: '#/meet' },
      h('span', { class: 'card__icon' }, svg(icons.rings)),
      h('span', { class: 'settings__link-text' }, data.meet),
      svg(icons.chevronRight, 'settings__link-chevron'),
    ),
  );
}
