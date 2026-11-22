import { h, svg } from '../core/dom.js';
import { t } from '../core/i18n.js';
import { icons } from '../ui/icons.js';
import { toast } from '../ui/toast.js';

/* АНКЕТЫ «ПЯТЬ ЯЗЫКОВ ЛЮБВИ» (владелец 22.11.2026: старый короткий тест — убрать везде, «эти две новые вставляй, и
   пускай работают на благо проекта»). Две анкеты с сайта otkrytie-puti, тексты — копией (self-*.js, observe-*.js,
   создаёт tools/love-quiz.mjs):
     • «о себе» (mode 'self') — «Мой язык»: 22 вопроса, три ответа по приоритету 1 · 2 · 3, минута на вопрос;
     • «по наблюдению» (mode 'observe') — мужчина / женщина, дети, родные: ребёнок 3–12 (18 вопросов), подросток
       12–18 (16), взрослый (17); без таймера, от одного до трёх ответов или «Не замечал(а)».
   Баллы 3 · 2 · 1; процент — от максимума по отвеченным вопросам. Итог — как на сайте: все пять языков, форма профиля,
   советы; кнопка «Это язык …» сохраняет главный язык (onSave). Языки ответов k = 1…5 → KINDS по порядку.
   Анкета живёт только на экране #/love (screens/love/love.js), в хранилище — только итог через onSave.
   Английского текста анкет нет — английский получает русский (правило PLAN.md: языки без своего текста — русский). */

export const KINDS = ['words', 'time', 'gifts', 'service', 'touch'];
const kindOf = (k) => KINDS[k - 1];
const WEIGHTS = [3, 2, 1];
const PICKS = 3;
const TIME = 60; // секунд на вопрос в анкете о себе — как на сайте
const WARN = 30;
const DANGER = 10;
const ENOUGH = 2 / 3; // отвечено меньше — итог «предварительный»

const PACKS = {
  self: { ru: () => import('./self-ru.js'), ua: () => import('./self-ua.js') },
  observe: { ru: () => import('./observe-ru.js'), ua: () => import('./observe-ua.js') },
};

let run = null; // идёт анкета: см. open()
let tick = null;

const shuffle = (arr) => {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
};

const fill = (str, vars = {}) => String(str || '').replace(/\{(\w+)\}/g, (all, k) => (vars[k] !== undefined ? vars[k] : all));

/** Итог по отметкам. questions — вопросы пакета, picks[i] — номера ответов по приоритету (null — пусто),
    skipped[i] — «не замечал(а)». Вынесено для проверок. */
export function score(questions, picks, skipped = []) {
  const sum = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
  let answered = 0;
  picks.forEach((slots, i) => {
    const got = slots.filter((v) => v !== null && v !== undefined);
    if (skipped[i] || !got.length) return;
    answered += 1;
    slots.forEach((opt, pos) => {
      if (opt === null || opt === undefined) return;
      sum[questions[i].o[opt].k] += WEIGHTS[pos];
    });
  });
  const max = answered * WEIGHTS[0];
  const ranking = Object.keys(sum)
    .map((k) => ({ k: +k, kind: kindOf(+k), n: sum[k], pct: max ? Math.round((sum[k] / max) * 100) : 0 }))
    .sort((a, b) => b.n - a.n || a.k - b.k);
  return { ranking, answered, total: questions.length, max, shape: shapeOf(ranking) };
}

/** Форма профиля по разбросу процентов — как на сайте: ровный, два ведущих, один ведущий. */
export function shapeOf(ranking) {
  const spread = ranking[0].pct - ranking[4].pct;
  const gap = ranking[0].pct - ranking[1].pct;
  if (spread <= 15) return 'flat';
  if (gap <= 10) return 'dual';
  return 'dominant';
}

export const isOpen = () => Boolean(run);

export function close() {
  run = null;
  stopTimer();
}

/** Открыть анкету. opts: mode 'self' | 'observe'; group — 'child' | 'teen' | 'adult' (null — спросить ребёнок или
    подросток); title — шапка; saveText — надпись кнопки сохранения; onSave(kind); lang — язык приложения;
    redraw() — перерисовать экран. Тексты грузятся при первом открытии. */
export async function open(opts) {
  const lang = opts.lang === 'ua' ? 'ua' : 'ru';
  const pack = (await PACKS[opts.mode][lang]()).default;
  stopTimer();
  run = { ...opts, fixedGroup: Boolean(opts.group), pack, stage: 'intro', i: 0, picks: [], order: [], skipped: [], timedOut: [], deadline: 0, result: null };
  opts.redraw();
}

/* Новый вопрос или итог — перерисовать и подняться наверх; отметка в вопросе — только перерисовать. */
function show() {
  run.redraw();
  globalThis.scrollTo?.({ top: 0 });
}

const emptySlots = () => new Array(PICKS).fill(null);

function questions() {
  return run.mode === 'self' ? run.pack.questions : run.pack.groups[run.group].questions;
}

function begin() {
  const qs = questions();
  run.stage = 'q';
  run.i = 0;
  run.picks = qs.map(emptySlots);
  run.order = qs.map(() => shuffle([0, 1, 2, 3, 4])); // ответы перемешиваются
  run.skipped = qs.map(() => false);
  run.timedOut = qs.map(() => false);
  armTimer();
  show();
}

function next() {
  if (run.i + 1 < questions().length) {
    run.i += 1;
    armTimer();
  } else {
    stopTimer();
    run.result = score(questions(), run.picks, run.skipped);
    run.stage = 'result';
  }
  show();
}

function back() {
  if (run.i === 0) return;
  run.i -= 1;
  armTimer();
  show();
}

/* — Таймер анкеты «о себе»: минута на вопрос. Время вышло: три ответа — дальше сами, меньше — можно идти с тем,
     что успел(а) отметить. Цифры обновляются на месте, без перерисовки экрана. — */
function armTimer() {
  stopTimer();
  if (run.mode !== 'self') return;
  run.deadline = Date.now() + TIME * 1000;
  tick = setInterval(paintTimer, 250);
}

function stopTimer() {
  if (tick) clearInterval(tick);
  tick = null;
}

function secondsLeft() {
  return Math.max(0, Math.ceil((run.deadline - Date.now()) / 1000));
}

function paintTimer() {
  const box = document.getElementById('lq-timer');
  if (run?.stage !== 'q' || !box) { stopTimer(); return; }
  const left = secondsLeft();
  box.querySelector('.lq-timer__digits').textContent = String(left);
  box.querySelector('.lq-timer__fill').style.width = `${(left / TIME) * 100}%`;
  box.classList.toggle('is-warn', left <= WARN && left > DANGER);
  box.classList.toggle('is-danger', left <= DANGER);
  if (left > 0) return;
  stopTimer();
  const got = run.picks[run.i].filter((v) => v !== null).length;
  if (got === PICKS) { next(); return; }
  run.timedOut[run.i] = true;
  toast({ title: run.pack.ui.toast.timeout });
  run.redraw();
}

/* — Экран вопроса — */
function pick(opt) {
  const slots = run.picks[run.i];
  const at = slots.indexOf(opt);
  if (at !== -1) {
    slots.splice(at, 1); // остальные цифры сдвигаются: 1 · 3 не бывает
    slots.push(null);
  } else {
    const free = slots.indexOf(null);
    if (free === -1) { toast({ title: run.pack.ui.toast.full }); return; }
    slots[free] = opt;
  }
  run.skipped[run.i] = false;
  run.redraw();
}

const timerLevel = (left) => {
  if (left <= DANGER) return ' is-danger';
  if (left <= WARN) return ' is-warn';
  return '';
};

function nextLabel(u, ready, last, got) {
  if (ready) return last ? u.quiz.finish : u.quiz.next;
  return run.mode === 'self' ? fill(u.quiz.pickMore, { n: PICKS - got }) : u.quiz.pickOne;
}

function answerButton(q, opt, slots) {
  const rank = slots.indexOf(opt) + 1;
  return h('button', {
    type: 'button',
    class: rank ? `lq-answer is-rank-${rank}` : 'lq-answer',
    'aria-pressed': String(Boolean(rank)),
    onclick: () => pick(opt),
  }, h('span', { class: 'lq-answer__slot' }, rank ? String(rank) : ''), h('span', { class: 'lq-answer__text' }, q.o[opt].t));
}

function skip() {
  run.picks[run.i] = emptySlots();
  run.skipped[run.i] = true;
  next();
}

function questionView() {
  const u = run.pack.ui;
  const qs = questions();
  const q = qs[run.i];
  const slots = run.picks[run.i];
  const got = slots.filter((v) => v !== null).length;
  const last = run.i === qs.length - 1;
  const self = run.mode === 'self';
  const ready = self ? got === PICKS || (run.timedOut[run.i] && got > 0) : got > 0;
  const left = self ? secondsLeft() : 0;

  return h('section', { class: 'card lq' },
    head(),
    h('div', { class: 'lq-top' },
      h('p', { class: 'caps lq-top__count' }, fill(u.quiz.counter, { n: run.i + 1, m: qs.length })),
      self
        ? h('div', { id: 'lq-timer', class: `lq-timer${timerLevel(left)}` },
          h('span', { class: 'lq-timer__digits' }, String(left)),
          h('span', { class: 'lq-timer__track' }, h('span', { class: 'lq-timer__fill', style: { width: `${(left / TIME) * 100}%` } })))
        : null,
    ),
    h('div', { class: 'bar' }, h('div', { class: 'bar__fill', style: { width: `${((run.i + 1) / qs.length) * 100}%` } })),
    h('h2', { class: 'card__title lq-q' }, q.q),
    h('div', { class: 'lq-answers' },
      ...run.order[run.i].map((opt) => answerButton(q, opt, slots))),
    h('div', { class: 'card__actions lq-actions' },
      h('button', { type: 'button', class: 'btn btn--gold btn--block', disabled: !ready, onclick: next }, nextLabel(u, ready, last, got)),
      self ? null : h('button', { type: 'button', class: 'btn btn--ghost btn--block', onclick: skip }, u.quiz.skip),
      run.i > 0 ? h('button', { type: 'button', class: 'btn btn--ghost btn--block', onclick: back }, u.quiz.back) : null,
    ),
    closeButton(),
  );
}

/* — Вступление: что за анкета; у детей — ребёнок или подросток — */
function introView() {
  const u = run.pack.ui;
  const self = run.mode === 'self';
  const groups = run.pack.groups;
  const ages = !self && !run.group;
  return h('section', { class: 'card lq' },
    head(),
    self
      ? h('p', { class: 'card__text' }, u.intro.note)
      : h('div', {},
        ...u.intro.why.map((p) => h('p', { class: 'card__text lq-p' }, p)),
        h('p', { class: 'caps lq-sub' }, u.intro.howTitle),
        h('ul', { class: 'lq-list' }, ...u.intro.how.map((x) => h('li', {}, x)))),
    run.selfLink
      ? h('p', { class: 'card__text faint lq-p' }, run.selfLink.text, ' ',
        h('a', { class: 'lq-link', href: run.selfLink.url, target: '_blank', rel: 'noopener' }, run.selfLink.url))
      : null,
    ages
      ? h('div', { class: 'lq-ages' },
        h('p', { class: 'caps lq-sub' }, t('love.quiz.age')),
        ...['child', 'teen'].map((g) => h('button', {
          type: 'button',
          class: 'lq-age',
          onclick: () => { run.group = g; begin(); },
        }, h('strong', {}, groups[g].label), h('span', { class: 'dim' }, groups[g].hint))))
      : h('div', { class: 'card__actions' }, h('button', { type: 'button', class: 'btn btn--gold btn--block', onclick: begin }, t('love.quiz.start'))),
    closeButton(),
    h('p', { class: 'lq-author faint' }, u.intro.author),
  );
}

/* — Итог — */
const list = (arr) => h('ul', { class: 'lq-list' }, ...arr.map((x) => h('li', {}, x)));
const block = (title, ...body) => h('div', { class: 'lq-block' }, h('p', { class: 'caps lq-sub' }, title), ...body);

function resultView() {
  const r = run.result;
  const u = run.pack.ui.result;
  const self = run.mode === 'self';
  const L = run.pack.langs;
  const name = (k) => run.names?.[kindOf(k)] || L[k].name; // названия языков — как везде в приложении
  const [main, second] = r.ranking;
  const shape = run.pack.shapes[r.shape];
  const tips = self ? null : run.pack.groups[run.group].tips;
  const M = self ? L[main.k] : tips[main.k];
  const S = self ? L[second.k] : tips[second.k];
  const few = !self && r.answered < Math.ceil(r.total * ENOUGH);
  const check = self ? null : run.pack.groups[run.group].check;

  const rowClass = ['lq-bars__row is-top', 'lq-bars__row is-second'];
  const bars = h('div', { class: 'lq-bars' }, ...r.ranking.map((row, i) => h('div', { class: rowClass[i] || 'lq-bars__row' },
    h('span', { class: 'lq-bars__name' }, name(row.k)),
    h('span', { class: 'lq-bars__val' }, `${row.pct}% · ${fill(u.ofPicks, { n: row.n, m: r.max })}`),
    h('span', { class: 'lq-bars__track' }, h('span', { class: 'lq-bars__fill', style: { width: `${row.pct}%` } })))));

  return h('div', { class: 'lq-result' },
    h('section', { class: 'card card--hero lq' },
      head(),
      h('p', { class: 'caps lq-sub' }, u.mainLabel),
      h('div', { class: 'lq-main' }, h('h2', { class: 'lq-main__name' }, name(main.k)), h('span', { class: 'lq-main__pct' }, `${main.pct}%`)),
      h('p', { class: 'faint lq-tagline' }, `${L[main.k].tagline} · ${fill(u.ofPicks, { n: main.n, m: r.max })}`),
      h('p', { class: 'card__text' }, self ? M.desc : M.seen),
      h('div', { class: 'lq-pill' }, h('p', { class: 'caps' }, `${u.shapeTitle} · ${shape.title}`), h('p', { class: 'card__text' }, shape.text)),
      few ? h('div', { class: 'lq-pill is-warn' }, h('p', { class: 'card__text' }, fill(u.fewNote, { n: r.answered, m: r.total }))) : null,
      self ? h('div', { class: 'lq-pill' }, h('p', { class: 'card__text' }, u.mirrorNote)) : null,
      saveActions(main.kind),
    ),
    self
      ? h('section', { class: 'card lq' },
        block(u.criticalTitle, h('p', { class: 'card__text' }, M.critical)),
        block(u.hurtsTitle, h('p', { class: 'card__text' }, M.hurts)),
        block(u.behaveTitle, list(M.behave)),
        block(u.neverTitle, list(M.never)),
        block(u.phraseTitle, h('blockquote', { class: 'lq-phrase' }, M.phrase)),
        block(u.selfTitle, list(M.self)))
      : h('section', { class: 'card lq' },
        block(u.doTitle, list(M.todo)),
        block(u.neverTitle, list(M.never))),
    h('section', { class: 'card lq' },
      block(u.secondLabel,
        h('div', { class: 'lq-main' }, h('h3', { class: 'lq-main__name is-second' }, name(second.k)), h('span', { class: 'lq-main__pct is-second' }, `${second.pct}%`)),
        h('p', { class: 'card__text' }, self ? S.desc : S.seen),
        self ? null : list(S.todo.slice(0, 2))),
      block(u.allLabel, bars, h('p', { class: 'card__text faint lq-p' }, self ? u.tankNote : u.allNote)),
      check ? block(check.title, h('p', { class: 'card__text' }, check.text), check.pairs.length ? h('ol', { class: 'lq-list lq-pairs' }, ...check.pairs.map((x) => h('li', {}, x))) : null) : null,
      // на сайте в этом абзаце есть <b>; приложение вставляет только текст (core/dom.js) — теги снимаются
      self ? block(u.differsTitle, ...u.differsText.map((p) => h('p', { class: 'card__text lq-p' }, p.replace(/<[^>]+>/g, '')))) : null,
    ),
    h('section', { class: 'card lq' }, saveActions(main.kind), closeButton()),
  );
}

function saveActions(kind) {
  return h('div', { class: 'card__actions lq-actions' },
    h('button', {
      type: 'button',
      class: 'btn btn--gold btn--block',
      onclick: () => {
        const done = run.onSave;
        close();
        done(kind);
      },
    }, run.saveText),
    h('button', { type: 'button', class: 'btn btn--ghost btn--block', onclick: retry }, t('love.quiz.retry')),
  );
}

function retry() {
  run.stage = 'intro';
  if (!run.fixedGroup) run.group = null; // у детей — снова спросить: ребёнок или подросток
  show();
}

function head() {
  return h('div', { class: 'card__eyebrow' },
    h('span', { class: 'card__icon' }, svg(icons.heart)),
    h('span', { class: 'caps' }, run.title));
}

function closeButton() {
  return h('button', { type: 'button', class: 'lq-close', onclick: () => { const redraw = run.redraw; close(); redraw(); } }, t('love.quiz.close'));
}

/** Узел анкеты для экрана — что сейчас идёт: вступление, вопрос или итог. */
export function node() {
  if (!run) return null;
  if (run.stage === 'q') return questionView();
  if (run.stage === 'result') return resultView();
  return introView();
}
