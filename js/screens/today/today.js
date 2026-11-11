import { h, svg } from '../../core/dom.js';
import { t, plural, formatDate } from '../../core/i18n.js';
import { PROGRAM_DAYS, TASK_DAYS } from '../../config.js';
import { dateOfDay, daysBetween, weekOf } from '../../core/dates.js';
import { dayPlan } from '../../program/index.js';
import { morningFor } from '../../program/morning.js';
import { weekSummary } from '../../progress/progress.js';
import * as morningLog from '../../journal/morning-log.js';
import { icons } from '../../ui/icons.js';
import { levelDots } from '../../ui/ring.js';
import { toast } from '../../ui/toast.js';
import { openEntry } from '../entry/entry-sheet.js';

/* ЭКРАН «СЕГОДНЯ» — главный. Сверху вниз, в порядке дня:
   1. Шапка дня: день из 168, неделя, вид дня, название недели и её прогресс.
   2. «Можно наверстать» — если в этой неделе есть пропуски.
   3. Утренняя минута с таймером на 60 секунд.
   4. Дело дня: задание с уровнями / свободный поток / седьмой день с созвоном и отзывом месяца.
   5. Что уже записано сегодня. */

// Таймер утренней минуты живёт вне отрисовки: экран перерисовывается после каждой записи,
// а идущая минута не должна ни сбрасываться, ни терять отметку «сделано». Таймер сам ставит отметку,
// а рисует через paintMinute — её подменяет каждая новая отрисовка карточки.
let minuteEndsAt = 0;
let minuteTimer = null;
let paintMinute = null;

function runMinute(iso, seconds) {
  minuteEndsAt = Date.now() + seconds * 1000;
  clearInterval(minuteTimer);
  minuteTimer = setInterval(() => {
    paintMinute?.();
    if (Date.now() < minuteEndsAt) return;
    clearInterval(minuteTimer);
    minuteTimer = null;
    minuteEndsAt = 0;
    morningLog.markDone(iso);
    toast({ title: t('morning.done') });
    navigator.vibrate?.(120);
  }, 250);
}

function header(plan, summary) {
  return h('section', { class: 'card card--hero today-hero' },
    h('div', { class: 'card__eyebrow' },
      h('span', { class: 'chip chip--solid' }, t('today.dayOf', { day: plan.day, total: PROGRAM_DAYS })),
      h('span', { class: 'chip' }, t('today.week', { n: plan.week })),
    ),
    h('p', { class: 'caps' }, `${t('today.month', { n: plan.month })} · ${plan.monthInfo.title}`),
    h('h1', { class: 'today-hero__title' }, plan.title),
    h('p', { class: 'today-hero__kind' }, svg(icons.sparkle, 'today-hero__kind-icon'), t(`kinds.${plan.kind}`)),
    h('div', { class: 'today-hero__progress' },
      h('div', { class: 'bar' }, h('div', { class: 'bar__fill', style: { width: `${summary.percent}%` } })),
      h('span', { class: 'faint' }, t('today.weekProgress', { done: summary.done, total: TASK_DAYS })),
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

  const count = h('span', { class: 'minute__count' }, '60');
  const fill = h('div', { class: 'bar__fill', style: { width: '0%' } });
  const button = h('button', { type: 'button', class: 'btn btn--block ' + (done ? 'btn--ghost' : 'btn--gold btn--quiet') });

  function paint() {
    const left = Math.max(0, Math.ceil((minuteEndsAt - Date.now()) / 1000));
    const running = left > 0;
    count.textContent = String(running ? left : m.seconds);
    fill.style.width = running ? `${((m.seconds - left) / m.seconds) * 100}%` : morningLog.isDone(ctx.todayIso) ? '100%' : '0%';
    button.disabled = running;
    button.textContent = running ? t('morning.running') : morningLog.isDone(ctx.todayIso) ? t('morning.again') : t('morning.start');
  }

  button.addEventListener('click', () => {
    runMinute(ctx.todayIso, m.seconds);
    paint();
  });
  paintMinute = paint;
  paint();

  return h('section', { class: 'card minute' },
    h('div', { class: 'card__eyebrow' },
      h('span', { class: 'card__icon' }, svg(icons.sun)),
      h('span', { class: 'caps' }, t('morning.title')),
      h('span', { class: 'spacer' }),
      done ? h('span', { class: 'chip' }, svg(icons.check, 'chip__icon'), t('morning.done')) : null,
    ),
    h('div', { class: 'minute__row' },
      h('div', {},
        h('h2', { class: 'card__title' }, title),
        h('p', { class: 'card__text' }, t('morning.heels.text')),
        m.addon ? h('p', { class: 'card__text' }, t(`morning.addon.${m.addon}.text`)) : null,
      ),
      h('div', { class: 'minute__dial' }, count, h('span', { class: 'faint minute__unit' }, t('morning.sec'))),
    ),
    h('div', { class: 'bar minute__bar' }, fill),
    h('div', { class: 'card__actions' }, button),
  );
}

function taskCard(plan) {
  const { task } = plan;
  return h('section', { class: 'card task' },
    h('div', { class: 'card__eyebrow' }, h('span', { class: 'card__icon' }, svg(icons.crown)), h('span', { class: 'caps' }, t('today.taskLabel'))),
    plan.intro ? h('p', { class: 'task__intro' }, plan.intro) : null,
    h('h2', { class: 'task__title' }, `«${task.title}»`),
    h('p', { class: 'task__text' }, task.text),
    h('ul', { class: 'task__levels' },
      ...['min', 'full', 'max'].map((l, i) =>
        h('li', {},
          h('span', { class: 'level-dots', 'aria-hidden': 'true' }, ...[0, 1, 2].map((d) => h('i', { class: d <= i ? 'on' : '' }))),
          h('strong', {}, t(`levels.${l}`)),
          h('span', { class: 'dim' }, task.levels?.[l] || t(`levels.hint.${l}`)),
        ),
      ),
    ),
    h('div', { class: 'card__actions' },
      h('button', {
        type: 'button',
        class: 'btn btn--gold btn--block',
        onclick: () => openEntry({ day: plan.day, kind: 'task', levels: task.levels }),
      }, svg(icons.plus), t('today.record')),
    ),
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
    view.append(outside(ctx));
    return;
  }
  const summary = weekSummary(weekOf(ctx.day), ctx.entries, ctx.day);
  let main;
  if (plan.kind === 'task') main = taskCard(plan);
  else if (plan.kind === 'flow') main = flowCard(plan);
  else main = callCard(plan, summary);

  view.append(
    h('div', { class: 'stack' },
      header(plan, summary),
      catchUp(ctx, summary),
      morningCard(ctx, plan),
      main,
      recordedToday(ctx, plan),
    ),
  );
}
