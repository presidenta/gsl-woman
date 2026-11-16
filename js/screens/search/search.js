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
     1. «Мои действия на 7 дней» — переписка, выходы в люди, знакомства, свидания: полоска-батарея с целями
        мин / 100% / макс (владелец 15–16.11.2026: «чтобы был разгон», «как аккумулятор в телефоне»).
     2. Блоки: сначала ты, где искать, ритм недели, переписка, пирамида мужчин (у женщин) или женщина плюс / ноль /
        минус (у мужчин) — уровни с дословными словами автора, признаки надёжного человека, уважение и близость.
        Под каждым блоком — подпись (тренинг или психологи).
     3. Ссылка в «Знакомство» — шпаргалка к встрече и запись после свидания.
   Тексты — с сервера (meet.search), подробно — js/search/README.md. */

/* «МОИ ДЕЙСТВИЯ НА 7 ДНЕЙ» (утверждённый эскиз владельца 16.11.2026) — одно поле, без рамок у каждого действия:
     название и число зелёным; справа над «+» — кружок со стрелкой: «что считается» (пояснение раскрывается под
     названием); полоска-батарея: одно действие — одно деление, «−» слева, «+» справа; отметки мин / 100% / макс
     подписаны всегда (100% — над полоской, мин и макс — под ней), дошёл — отметка и подпись зелёные; после максимума
     полоска идёт дальше пунктиром — «можно больше». Счёт — 7 дней от дня старта (search/steps.js). */
const aboutOpen = new Set(); // раскрытые пояснения переживают перерисовку (каждое «+» перерисовывает экран)

function actRow(s, n) {
  // Три цели: минимум / 100% / максимум; старые тексты — одна цель
  const min = s.min ?? s.goal;
  const full = s.full ?? s.goal;
  const max = s.max ?? s.goal;
  const total = Math.max(max + Math.max(2, Math.ceil(max * 0.25)), n + 1); // деления до максимума и «можно больше»
  const at = (v) => ({ left: `${(v / total) * 100}%` });
  const levelOf = (x) => [['min', min], ['full', full], ['max', max]].filter(([, v]) => x >= v).map(([k]) => k).pop() || null;

  const segs = Array.from({ length: total }, (_, i) =>
    h('span', { class: `act__seg${i >= max ? ' act__seg--more' : ''}${i < n ? ' is-on' : ''}` }));
  const marks = [min, full, max].map((v) => h('span', { class: `act__mark${n >= v ? ' is-hit' : ''}`, style: at(v) }));
  const label = (key, v) => h('span', { class: `act__lab act__lab--${key}${n >= v ? ' is-hit' : ''}`, style: at(v) }, st(key, { n: v }));

  const open = aboutOpen.has(s.key);
  const about = h('p', { class: 'act__about', id: `act-about-${s.key}`, hidden: !open }, s.hint);
  const info = h('button', {
    type: 'button',
    class: `act__btn act__btn--info${open ? ' is-open' : ''}`,
    'aria-expanded': String(open),
    'aria-controls': `act-about-${s.key}`,
    'aria-label': st('about'),
  }, svg(icons.chevronRight, 'act__chev'));
  info.addEventListener('click', () => {
    const now = !aboutOpen.has(s.key);
    if (now) aboutOpen.add(s.key); else aboutOpen.delete(s.key);
    about.hidden = !now;
    info.classList.toggle('is-open', now);
    info.setAttribute('aria-expanded', String(now));
  });

  const minus = h('button', { type: 'button', class: 'act__btn act__btn--minus', 'aria-label': st('undo') }, '−');
  const plus = h('button', { type: 'button', class: 'act__btn act__btn--plus', 'aria-label': st('add') }, '+');
  minus.addEventListener('click', () => bump(s.key, -1));
  plus.addEventListener('click', () => {
    const before = levelOf(n);
    const after = levelOf(bump(s.key, +1));
    if (after && after !== before) toast({ title: st('reached.' + after) });
  });

  return h('div', { class: 'act' },
    h('p', { class: 'act__name' }, s.title, ' ', h('b', { class: 'act__n' }, String(n))),
    info,
    about,
    h('div', { class: 'act__labels act__labels--top' }, label('full', full)),
    minus,
    h('div', { class: 'act__track', role: 'img', 'aria-label': `${s.title}: ${n}` }, ...segs, ...marks),
    plus,
    h('div', { class: 'act__labels' }, label('min', min), label('max', max)),
  );
}

/** «Мои действия на 7 дней» — список; его ставят экран «В поиске» и карточка на «Сегодня». */
export function stepsList(steps) {
  const now = counts();
  return h('div', { class: 'acts' }, ...steps.items.map((s) => actRow(s, Number(now[s.key]) || 0)));
}

function stepsCard(steps) {
  return h('section', { class: 'card card--hero search__card' },
    h('h2', { class: 'caps search__heading' }, steps.title),
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
