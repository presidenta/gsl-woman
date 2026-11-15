import { h, svg, add } from '../../core/dom.js';
import { icons } from '../../ui/icons.js';
import { toast } from '../../ui/toast.js';
import * as meet from '../../meet/meet.js';
import { counts, bump } from '../../search/steps.js';
import { st } from '../../search/texts.js';

/* ЭКРАН «В ПОИСКЕ» (#/search, владелец 15.11.2026): действия для тех, кто ищет своего человека.
     1. «Мои шаги этой недели» — отметки: выходы в люди, знакомства, свидания; цель недели, золото — когда цель есть.
     2. Блоки: сначала ты, где искать, ритм недели, переписка, пирамида мужчин (у женщин) или женщина плюс / ноль /
        минус (у мужчин) — уровни с дословными словами автора, признаки надёжного человека, уважение и близость.
        Под каждым блоком — подпись (тренинг или психологи).
     3. Ссылка в «Знакомство» — шпаргалка к встрече и запись после свидания.
   Тексты — с сервера (meet.search), подробно — js/search/README.md. */

function stepsCard(steps) {
  const now = counts();
  const rows = steps.items.map((s) => {
    const num = h('span', { class: 'search-step__num' });
    const row = h('li', { class: 'search-step' });
    const paint = (n) => {
      num.textContent = st('of', { n, goal: s.goal });
      row.classList.toggle('is-done', n >= s.goal);
    };
    const minus = h('button', { type: 'button', class: 'search-step__btn search-step__btn--minus', 'aria-label': st('undo') }, '−');
    const plus = h('button', { type: 'button', class: 'search-step__btn', 'aria-label': st('add') }, '+1');
    minus.addEventListener('click', () => paint(bump(s.key, -1)));
    plus.addEventListener('click', () => {
      const n = bump(s.key, +1);
      paint(n);
      if (n === s.goal) toast({ title: st('done') });
    });
    row.append(
      h('span', { class: 'search-step__text' },
        h('span', { class: 'search-step__title' }, s.title),
        h('span', { class: 'search-step__hint' }, s.hint)),
      num, minus, plus,
    );
    paint(Number(now[s.key]) || 0);
    return row;
  });
  return h('section', { class: 'card card--hero search__card' },
    h('h2', { class: 'caps search__heading' }, steps.title),
    steps.lead ? h('p', { class: 'card__text' }, steps.lead) : null,
    h('ul', { class: 'search-steps' }, ...rows),
  );
}

function levelsList(levels) {
  return h('ol', { class: 'search-levels' }, ...levels.map((x) => h('li', { class: 'search-level' },
    h('span', { class: 'search-level__mark', 'aria-hidden': 'true' }, x.mark),
    h('span', { class: 'search-level__body' },
      h('strong', { class: 'search-level__name' }, x.name),
      h('span', { class: 'search-level__text' }, x.text),
      x.quote ? h('q', { class: 'search-quote' }, x.quote.replace(/^«|»$/g, '')) : null,
    ),
  )));
}

function blockCard(b) {
  return h('section', { class: 'card search__card' },
    h('h2', { class: 'caps search__heading' }, b.title),
    b.lead ? h('p', { class: 'card__text' }, b.lead) : null,
    b.levels ? levelsList(b.levels) : null,
    b.quote ? h('p', { class: 'search-quote search-quote--main' }, b.quote) : null,
    h('ul', { class: 'search__list' }, ...b.items.map((x) => h('li', {}, x))),
    b.author ? h('p', { class: 'search__author faint' }, `— ${b.author}`) : null,
  );
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
