import { h, svg, add } from '../../core/dom.js';
import { t, plural, formatDate } from '../../core/i18n.js';
import { dateOfDay, daysBetween, weekOf } from '../../core/dates.js';
import { dayPlan } from '../../program/index.js';
import { morningFor } from '../../program/morning.js';
import { weekSummary } from '../../progress/progress.js';
import * as morningLog from '../../journal/morning-log.js';
import { icons } from '../../ui/icons.js';
import { levelDots } from '../../ui/ring.js';
import { toast } from '../../ui/toast.js';
import { openEntry } from '../entry/entry-sheet.js';
import { heelsFigure } from '../../ui/heels.js';
import * as sound from '../../ui/tick.js';
import { imsgCard } from '../../imsg/imsg-card.js';
import { loveCard } from '../../love/cards.js';

/* ЭКРАН «СЕГОДНЯ» — главный. Сверху вниз, в порядке дня:
   1. Шапка дня: «День N» (без «из скольких» и без номера недели — обучение постоянное, владелец 12.11.2026),
      вид дня, название недели и её прогресс.
   2. «Можно наверстать» — если в этой неделе есть пропуски.
   3. Утренняя минута: выбор 1, 2 или 3 минуты (Минимум / 100% / Максимум), счёт вверх со звуком каждую секунду.
   4. Дело дня: задание с уровнями / свободный поток / седьмой день с созвоном и отзывом месяца.
   5. Что уже записано сегодня. */

// Таймер утренней минуты живёт вне отрисовки: экран перерисовывается после каждой записи,
// а идущая минута не должна ни сбрасываться, ни терять отметку «сделано». Таймер сам ставит отметку,
// а рисует через paintMinute — её подменяет каждая новая отрисовка карточки.
// Счёт — вверх (владелец 12.11.2026): 1, 2, 3 … до 60, 120 или 180; каждая цифра — звук и опускание на пятки.
const MINUTE_PICKS = [['min', 1], ['full', 2], ['max', 3]];
// Пятки касаются пола на 64% секундного цикла рисунка (styles/components/heels.css): цикл сдвигается так,
// чтобы касание приходилось ровно на смену цифры и звук
const LANDING = 0.64;
let minuteStart = 0;
let minuteTotal = 0;
let minuteCount = 0;
let minuteTimer = null;
let paintMinute = null;

function runMinute(iso, seconds) {
  sound.unlock();
  minuteStart = Date.now();
  minuteTotal = seconds;
  minuteCount = 0;
  clearInterval(minuteTimer);
  minuteTimer = setInterval(() => {
    const n = Math.min(minuteTotal, Math.floor((Date.now() - minuteStart) / 1000));
    if (n === minuteCount) return;
    minuteCount = n;
    if (n < minuteTotal) {
      sound.tick(n % 10 === 0);
      paintMinute?.();
      return;
    }
    clearInterval(minuteTimer);
    minuteTimer = null;
    minuteTotal = 0;
    sound.finish();
    morningLog.markDone(iso);
    toast({ title: t('morning.done') });
    navigator.vibrate?.(120);
  }, 40);
}

function stopMinute() {
  clearInterval(minuteTimer);
  minuteTimer = null;
  minuteTotal = 0;
  paintMinute?.();
}

function header(plan, summary) {
  return h('section', { class: 'card card--hero today-hero' },
    h('div', { class: 'card__eyebrow' },
      h('span', { class: 'chip chip--solid' }, t('today.dayOf', { day: plan.day })),
    ),
    h('p', { class: 'caps' }, `${t('today.month', { n: plan.month })} · ${plan.monthInfo.title}`),
    h('h1', { class: 'today-hero__title' }, plan.title),
    h('p', { class: 'today-hero__kind' }, svg(icons.sparkle, 'today-hero__kind-icon'), t(`kinds.${plan.kind}`)),
    h('div', { class: 'today-hero__progress' },
      h('div', { class: 'bar' }, h('div', { class: 'bar__fill', style: { width: `${summary.percent}%` } })),
      h('span', { class: 'faint' }, t('today.weekProgress', { done: summary.done })),
    ),
  );
}

function catchUp(ctx, summary) {
  if (!summary.catchUp.length) return null;
  return h('section', { class: 'card card--soft' },
    h('div', { class: 'card__eyebrow' }, h('span', { class: 'card__icon' }, svg(icons.heart)), h('span', { class: 'caps' }, t('today.catchTitle'))),
    h('p', { class: 'card__text' }, t('today.catchText', {
      percent: summary.lagPercent,
      days: `${summary.lagDays} ${plural(summary.lagDays, 'plural.days')}`,
    })),
    h('div', { class: 'catch-list' },
      ...summary.catchUp.map((day) => {
        const p = dayPlan(day, ctx.lang);
        return h('button', {
          type: 'button',
          class: 'choice',
          onclick: () => openEntry({ day, kind: p.kind, exercises: p.tasks, levels: p.task?.levels }),
        },
          h('span', { class: 'choice__text' },
            h('span', { class: 'faint' }, t('today.catchDay', { day: p.dayInWeek, date: formatDate(dateOfDay(ctx.settings.startDate, day)) })),
            h('br'),
            p.kind === 'task' ? p.task.title : t(`kinds.${p.kind}`),
          ),
          svg(icons.plus, 'catch-list__plus'),
        );
      }),
    ),
  );
}

function morningCard(ctx, plan) {
  const m = morningFor(plan.day);
  const done = morningLog.isDone(ctx.todayIso);
  const title = m.addon ? `${t('morning.heels.title')} ${t(`morning.addon.${m.addon}.title`)}` : t('morning.heels.title');

  const count = h('span', { class: 'minute__count' });
  const unit = h('span', { class: 'faint minute__unit' });
  const fill = h('div', { class: 'bar__fill', style: { width: '0%' } });
  // Живая подсказка ритма: подъём на носки на 2–3 см и опускание на пятки с выдохом — раз в секунду; счёт — справа
  const dial = h('div', { class: 'minute__dial' }, count, unit);
  const figure = heelsFigure({ aside: dial });

  // Три кнопки вместо одной (владелец): Минимум — 1 минута, 100% — 2, Максимум — 3
  const picks = h('div', { class: 'minute__picks' },
    ...MINUTE_PICKS.map(([level, min]) => h('button', {
      type: 'button',
      class: 'minute__pick',
      onclick: () => { runMinute(ctx.todayIso, min * 60); paint(); },
    },
    h('span', { class: 'minute__pick-level' }, t(`levels.${level}`)),
    h('span', { class: 'minute__pick-time' }, t('morning.mins', { n: min })))),
  );
  const runningRow = h('div', { class: 'minute__running' },
    h('span', { class: 'minute__status' }, t('morning.running')),
    h('button', { type: 'button', class: 'minute__stop', onclick: stopMinute }, t('morning.stop')),
  );

  function paint() {
    const running = minuteTotal > 0;
    count.textContent = running ? String(minuteCount) : '1–3';
    unit.textContent = running ? t('morning.of', { n: minuteTotal }) : t('morning.min');
    dial.classList.toggle('is-running', running);
    fill.style.width = running ? `${(minuteCount / minuteTotal) * 100}%` : morningLog.isDone(ctx.todayIso) ? '100%' : '0%';
    picks.hidden = running;
    runningRow.hidden = !running;
    figure.setRunning(running, (((Date.now() - minuteStart) / 1000) + LANDING) % 1);
  }

  paintMinute = paint;
  paint();

  return h('section', { class: 'card minute' },
    h('div', { class: 'card__eyebrow' },
      h('span', { class: 'card__icon' }, svg(icons.sun)),
      h('span', { class: 'caps' }, t('morning.title')),
      h('span', { class: 'spacer' }),
      done ? h('span', { class: 'chip' }, svg(icons.check, 'chip__icon'), t('morning.done')) : null,
    ),
    // Текст — на всю ширину (владелец, сборка 19): таймер перенесён в панель с фигурой
    h('h2', { class: 'card__title' }, title),
    h('p', { class: 'card__text' }, t('morning.heels.text')),
    m.addon ? h('p', { class: 'card__text' }, t(`morning.addon.${m.addon}.text`)) : null,
    figure.node,
    h('div', { class: 'bar minute__bar' }, fill),
    h('div', { class: 'card__actions' }, picks, runningRow),
    waterBlock(m.water),
  );
}

/* Стакан тёплой воды после минуты (владелец 13.11.2026) — пожелание, а не задание: без отметки и записи. Вариант дня
   — из program/morning.js, бережная подсказка (мёд, зубы, желудок, лекарства) — мелко внизу. */
function waterBlock(kind) {
  return h('div', { class: 'water' },
    h('div', { class: 'water__head' },
      h('span', { class: 'water__icon' }, svg(icons.cup)),
      h('div', {},
        h('p', { class: 'water__title' }, t('morning.water.title')),
        h('p', { class: 'water__lead' }, t('morning.water.lead')),
      ),
    ),
    h('div', { class: 'water__today' },
      h('span', { class: 'caps water__label' }, t('morning.water.today')),
      h('strong', { class: 'water__kind' }, t(`morning.water.kinds.${kind}.title`)),
      h('p', { class: 'water__text' }, t(`morning.water.kinds.${kind}.text`)),
    ),
    h('p', { class: 'faint water__care' }, t('morning.water.care')),
  );
}

function taskCard(plan) {
  const { task } = plan;
  return h('section', { class: 'card task' },
    h('div', { class: 'card__eyebrow' }, h('span', { class: 'card__icon' }, svg(icons.crown)), h('span', { class: 'caps' }, t('today.taskLabel'))),
    plan.intro ? h('p', { class: 'task__intro' }, plan.intro) : null,
    h('h2', { class: 'task__title' }, `«${task.title}»`),
    // Подзаголовок — своей строкой под названием, другим начертанием (владелец: «Магия рук» / «Тайный ритуал соблазна»)
    task.subtitle ? h('p', { class: 'task__subtitle' }, task.subtitle) : null,
    h('p', { class: 'task__text' }, task.text),
    task.how?.length
      ? h('div', { class: 'task__block' },
        h('p', { class: 'caps task__block-title' }, t('today.howTitle')),
        h('ol', { class: 'task__how' }, ...task.how.map((step) => h('li', {}, step))),
      )
      : null,
    h('ul', { class: 'task__levels' },
      ...['min', 'full', 'max'].map((l, i) =>
        h('li', {},
          h('span', { class: 'level-dots', 'aria-hidden': 'true' }, ...[0, 1, 2].map((d) => h('i', { class: d <= i ? 'on' : '' }))),
          h('strong', {}, t(`levels.${l}`)),
          h('span', { class: 'dim' }, task.levels?.[l] || t(`levels.hint.${l}`)),
        ),
      ),
    ),
    task.say?.length
      ? h('div', { class: 'task__block' },
        h('p', { class: 'caps task__block-title' }, t('today.sayTitle')),
        task.say.some((s) => s.kpk) ? h('p', { class: 'task__kpk-hint' }, t('today.kpkHint')) : null,
        h('ul', { class: 'task__say' }, ...task.say.map(sayItem)),
      )
      : null,
    h('div', { class: 'card__actions' },
      h('button', {
        type: 'button',
        class: 'btn btn--gold btn--block',
        onclick: () => openEntry({ day: plan.day, kind: 'task', levels: task.levels }),
      }, svg(icons.plus), t('today.record')),
    ),
  );
}

/* Фраза: просто слова — или по формуле «комплимент — программа — комплимент» (kpk): три части строками,
   у каждой своя подпись, чтобы женщина видела, как строится фраза, и училась собирать свои. */
function sayItem(s) {
  if (s.kpk?.length === 3) {
    const tags = [t('today.kpkCompliment'), t('today.kpkProgram'), t('today.kpkCompliment')];
    return h('li', { class: 'say say--kpk' },
      h('span', { class: 'say__label' }, s.label),
      h('ol', { class: 'kpk' }, ...s.kpk.map((part, i) => h('li', { class: `kpk__part kpk__part--${i === 1 ? 'program' : 'compliment'}` },
        h('span', { class: 'kpk__tag' }, tags[i]),
        h('q', { class: 'say__text' }, part),
      ))),
    );
  }
  return h('li', { class: 'say' },
    h('span', { class: 'say__label' }, s.label),
    h('q', { class: 'say__text' }, s.text),
  );
}

function flowCard(plan) {
  return h('section', { class: 'card task' },
    h('div', { class: 'card__eyebrow' }, h('span', { class: 'card__icon' }, svg(icons.sparkle)), h('span', { class: 'caps' }, t('kinds.flow'))),
    h('p', { class: 'task__text' }, plan.flow || t('today.flowLead')),
    plan.flow ? h('p', { class: 'card__text' }, t('today.flowLead')) : null,
    plan.tasks.length
      ? h('div', {},
        h('p', { class: 'caps', style: { margin: 'var(--sp-5) 0 var(--sp-2)' } }, t('today.exercisesLabel')),
        h('ol', { class: 'flow__list' }, ...plan.tasks.map((ex) => h('li', {}, h('strong', {}, ex.title), h('span', { class: 'dim' }, ex.text)))),
      )
      : null,
    h('div', { class: 'card__actions' },
      h('button', {
        type: 'button',
        class: 'btn btn--gold btn--block',
        onclick: () => openEntry({ day: plan.day, kind: 'flow', exercises: plan.tasks }),
      }, svg(icons.plus), t('today.record')),
    ),
  );
}

function callCard(plan, summary) {
  return h('div', {},
    h('section', { class: 'card card--hero call' },
      h('div', { class: 'card__eyebrow' }, h('span', { class: 'card__icon' }, svg(icons.phone)), h('span', { class: 'caps' }, t('kinds.call'))),
      h('h2', { class: 'card__title' }, t('today.callTitle')),
      h('p', { class: 'task__text' }, plan.call),
      h('p', { class: 'card__text' }, t('today.callLead')),
      h('div', { class: 'card__actions' },
        summary.callDone
          ? h('span', { class: 'chip' }, svg(icons.check, 'chip__icon'), t('today.callDone'))
          : h('button', { type: 'button', class: 'btn btn--gold btn--block', onclick: () => openEntry({ day: plan.day, kind: 'call' }) }, t('today.callMark')),
      ),
    ),
    plan.review
      ? h('section', { class: 'card card--soft' },
        h('div', { class: 'card__eyebrow' }, h('span', { class: 'card__icon' }, svg(icons.mic)), h('span', { class: 'caps' }, t('today.reviewTitle'))),
        h('p', { class: 'card__text' }, t('today.reviewText')),
      )
      : null,
  );
}

function recordedToday(ctx, plan) {
  const own = ctx.entries.filter((e) => e.day === plan.day);
  if (!own.length) return null;
  return h('section', { class: 'card' },
    h('div', { class: 'card__eyebrow' }, h('span', { class: 'caps' }, t('today.recordedToday'))),
    h('div', { class: 'choice-list' },
      ...own.map((e) => h('button', {
        type: 'button',
        class: 'choice',
        onclick: () => openEntry({ day: e.day, kind: e.kind, exercises: plan.tasks, levels: plan.task?.levels, entry: e }),
      },
        e.kind === 'call' ? svg(icons.check) : levelDots(e.level),
        h('span', { class: 'choice__text' },
          e.kind === 'flow' && Number.isInteger(e.exercise) && plan.tasks[e.exercise] ? plan.tasks[e.exercise].title : e.worked || t(`kinds.${e.kind}`),
        ),
      )),
    ),
    plan.kind !== 'call'
      ? h('button', {
        type: 'button',
        class: 'link-btn',
        onclick: () => openEntry({ day: plan.day, kind: plan.kind, exercises: plan.tasks, levels: plan.task?.levels }),
      }, t('today.recordMore'))
      : null,
  );
}

function outside(ctx) {
  if (ctx.day < 1) {
    const left = daysBetween(ctx.todayIso, ctx.settings.startDate);
    return h('section', { class: 'card card--hero today-hero' },
      h('p', { class: 'caps' }, t('app.tagline')),
      h('h1', { class: 'today-hero__title' }, t('today.beforeTitle')),
      h('p', { class: 'card__text' }, t('today.beforeText', {
        date: formatDate(ctx.settings.startDate),
        left: `${left} ${plural(left, 'plural.days')}`,
      })),
    );
  }
  return h('section', { class: 'card card--hero today-hero' },
    h('div', { class: 'card__eyebrow' }, h('span', { class: 'card__icon' }, svg(icons.crown))),
    h('h1', { class: 'today-hero__title gold-text' }, t('today.afterTitle')),
    h('p', { class: 'card__text' }, t('today.afterText')),
  );
}

export function render(view, ctx) {
  const plan = dayPlan(ctx.day, ctx.lang);
  if (!plan) {
    add(view, outside(ctx));
    return;
  }
  const summary = weekSummary(weekOf(ctx.day), ctx.entries, ctx.day);
  let main;
  if (plan.kind === 'task') main = taskCard(plan);
  else if (plan.kind === 'flow') main = flowCard(plan);
  else main = callCard(plan, summary);

  add(view,
    h('div', { class: 'stack' },
      header(plan, summary),
      catchUp(ctx, summary),
      morningCard(ctx, plan),
      main,
      imsgCard(ctx, plan),
      loveCard(ctx, plan),
      recordedToday(ctx, plan),
    ),
  );
}
