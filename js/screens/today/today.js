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
import { waterCard } from '../../water/water-card.js';
import { foldCard } from '../../ui/fold.js';
import { kegelCard } from '../../habits/kegel-card.js';
import { stepsCard } from '../../habits/steps-card.js';
import { usCard } from '../../circles/today-card.js';
import { talkCard, talkDone } from '../../circles/talk.js';
import { showKids, bizFor } from '../../profile/profile.js';
import * as journal from '../../journal/journal.js';
import { dayScore, pointsOf, taskPoints, pointsLabel } from '../../score/score.js';

/* ЭКРАН «СЕГОДНЯ» — главный. Сверху вниз, в порядке дня:
   1. Шапка дня: «День N» (без «из скольких» и без номера недели — обучение постоянное, владелец 12.11.2026),
      вид дня, название недели и её прогресс.
   2. «Можно наверстать» — если в этой неделе есть пропуски.
   3. Стакан тёплой воды — сразу после пробуждения: человек сам кладёт в него составляющие (js/water/).
   3½. Утренняя минута: выбор 1, 2 или 3 минуты (Минимум / 100% / Максимум), счёт вверх со звуком каждую секунду.
   4. Дело дня: задание с уровнями / свободный поток / седьмой день с созвоном и отзывом месяца.
   5. Что уже записано сегодня.
   6. Привычки дня — Кегель и шаги (js/habits/), в самом конце — стакан воды на ночь (js/water/). */

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
    // Уровень — по длине минуты: 1 мин — Минимум, 2 — 100%, 3 — Максимум (баллы дня, score/)
    const level = MINUTE_PICKS.find(([, m]) => m * 60 === minuteTotal)?.[0] || 'min';
    minuteTotal = 0;
    sound.finish();
    morningLog.markDone(iso, level);
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

function header(ctx, plan, summary) {
  // Баллы дня (score/): личные, для себя — сколько баллов прожито сегодня
  const score = dayScore(ctx.todayIso, plan.day, ctx.entries, { talk: talkDone(ctx, plan) });
  return h('section', { class: 'card card--hero today-hero' },
    h('div', { class: 'card__eyebrow today-hero__top' },
      h('span', { class: 'chip chip--solid' }, t('today.dayOf', { day: plan.day })),
      h('span', { class: 'chip today-hero__score', title: t('score.hint') }, svg(icons.check, 'chip__icon'), t('score.today', { points: pointsLabel(score.total) })),
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

  const status = h('span', { class: 'minute__fold-status' });

  function paint() {
    const running = minuteTotal > 0;
    count.textContent = running ? String(minuteCount) : '1–3';
    unit.textContent = running ? t('morning.of', { n: minuteTotal }) : t('morning.min');
    dial.classList.toggle('is-running', running);
    fill.style.width = running ? `${(minuteCount / minuteTotal) * 100}%` : morningLog.isDone(ctx.todayIso) ? '100%' : '0%';
    picks.hidden = running;
    runningRow.hidden = !running;
    figure.setRunning(running, (((Date.now() - minuteStart) / 1000) + LANDING) % 1);
    // Шапка свёрнутой карточки: идёт — счёт, сделана — золотая галочка
    if (running) status.replaceChildren(h('span', { class: 'minute__fold-count' }, `${minuteCount} / ${minuteTotal}`));
    else status.replaceChildren('');
  }

  paintMinute = paint;
  paint();

  // Сворачивается стрелкой, как стакан (владелец 13.11.2026): свёрнута — маленькая фигура и одна строка
  const figureArt = figure.art;
  const fold = foldCard({
    id: 'minute',
    cls: 'minute',
    icon: icons.sun,
    title: t('morning.title'),
    lead: t('morning.short'),
    status,
    points: pointsOf(morningLog.levelOf(ctx.todayIso)),
    body: [
      // Текст — на всю ширину (владелец, сборка 19): таймер перенесён в панель с фигурой
      h('h2', { class: 'card__title' }, title),
      h('p', { class: 'card__text' }, t('morning.heels.text')),
      m.addon ? h('p', { class: 'card__text' }, t(`morning.addon.${m.addon}.text`)) : null,
      figure.node,
      h('div', { class: 'bar minute__bar' }, fill),
      h('div', { class: 'card__actions' }, picks, runningRow),
    ],
    // Одна фигура: свёрнута — в шапке, раскрыта — на своём месте
    onToggle: (open) => (open ? figure.node.prepend(figureArt) : fold.thumb.append(figureArt)),
  });
  return fold.node;
}


/* Отметка задания дня прямо в карточке (владелец 14.11.2026): «человек отмечает, что сделал — Минимум, 100% или
   Максимум, — и ему насчитываются баллы». Нажатие — запись дня с этим уровнем (есть запись — меняется её уровень);
   подробная запись с реакцией и фото — кнопкой «Записать результат», как раньше. */
function markLevels(ctx, plan, kind) {
  const own = ctx.entries.filter((e) => e.day === plan.day && e.kind === kind);
  const best = own.reduce((m, e) => Math.max(m, pointsOf(e.level)), 0);
  const mark = (level) => {
    if (own.length) journal.update(own[0].id, { level });
    else journal.add({ day: plan.day, kind, level });
    toast({ title: t('today.marked', { points: pointsLabel(pointsOf(level)) }) });
  };
  return h('div', { class: 'task__block task__mark' },
    h('p', { class: 'caps task__block-title' }, t('today.markTitle')),
    h('div', { class: 'minute__picks' },
      ...['min', 'full', 'max'].map((l) => h('button', {
        type: 'button',
        class: pointsOf(l) === best ? 'minute__pick is-on' : 'minute__pick',
        'aria-pressed': String(pointsOf(l) === best),
        onclick: () => mark(l),
      },
      h('span', { class: 'minute__pick-level' }, t('levels.' + l)),
      h('span', { class: 'minute__pick-time' }, '+' + pointsOf(l)))),
    ),
  );
}

/* Каждая карточка дня сворачивается стрелкой (владелец 14.11.2026: «очень длинная простыня — всё сворачиваем,
   чтобы можно было промотать»): свёрнута — значок, название и одна строка, справа баллы и стрелка. */
function taskCard(ctx, plan) {
  const { task } = plan;
  // plan.profile — профиль отношений (profile/): от него зависят слова задания и строка для детей
  return foldCard({
    id: 'task',
    cls: 'task',
    icon: icons.crown,
    title: t('today.taskLabel'),
    lead: '«' + task.title + '»',
    points: taskPoints(ctx.entries, plan.day),
    body: [
    plan.intro ? h('p', { class: 'task__intro' }, plan.intro) : null,
    h('h2', { class: 'task__title' }, `«${task.title}»`),
    // Подзаголовок — своей строкой под названием, другим начертанием (владелец: «Магия рук» / «Тайный ритуал соблазна»)
    task.subtitle ? h('p', { class: 'task__subtitle' }, task.subtitle) : null,
    h('p', { class: 'task__text' }, task.text),
    // Что на что заменяем (владелец 14.11.2026: «оставь то, что мы заменяем, чтобы было понятно») — «Телефон → её глаза»
    task.swap ? h('p', { class: 'task__swap' }, h('span', { class: 'caps' }, t('today.swapTitle')), ' ', task.swap) : null,
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
    // Строка для детей — у семьи под одной крышей и только если дети добавлены (profile/showKids)
    showKids(task, plan.profile)
      ? h('div', { class: 'task__block task__kids' },
        h('p', { class: 'caps task__block-title' }, t('today.kidsTitle')),
        h('p', { class: 'card__text' }, task.kids),
      )
      : null,
    task.say?.length
      ? h('div', { class: 'task__block' },
        h('p', { class: 'caps task__block-title' }, t('today.sayTitle')),
        task.say.some((s) => s.kpk) ? h('p', { class: 'task__kpk-hint' }, t('today.kpkHint')) : null,
        h('ul', { class: 'task__say' }, ...task.say.map(sayItem)),
      )
      : null,
    markLevels(ctx, plan, 'task'),
    h('div', { class: 'card__actions' },
      h('button', {
        type: 'button',
        class: 'btn btn--gold btn--block',
        onclick: () => openEntry({ day: plan.day, kind: 'task', levels: task.levels }),
      }, svg(icons.plus), t('today.record')),
    ),
    ],
  }).node;
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

function flowCard(ctx, plan) {
  return foldCard({
    id: 'task',
    cls: 'task',
    icon: icons.sparkle,
    title: t('kinds.flow'),
    lead: plan.tasks.map((ex) => ex.title).join(' · ') || t('today.flowLead'),
    points: taskPoints(ctx.entries, plan.day),
    body: [
    h('p', { class: 'task__text' }, plan.flow || t('today.flowLead')),
    plan.flow ? h('p', { class: 'card__text' }, t('today.flowLead')) : null,
    plan.tasks.length
      ? h('div', {},
        h('p', { class: 'caps', style: { margin: 'var(--sp-5) 0 var(--sp-2)' } }, t('today.exercisesLabel')),
        h('ol', { class: 'flow__list' }, ...plan.tasks.map((ex) => h('li', {}, h('strong', {}, ex.title), h('span', { class: 'dim' }, ex.text)))),
      )
      : null,
    markLevels(ctx, plan, 'flow'),
    h('div', { class: 'card__actions' },
      h('button', {
        type: 'button',
        class: 'btn btn--gold btn--block',
        onclick: () => openEntry({ day: plan.day, kind: 'flow', exercises: plan.tasks }),
      }, svg(icons.plus), t('today.record')),
    ),
    ],
  }).node;
}

/* Повтор по графику (program/repeats.js, владелец 15.11.2026): в дни практики — навыки прошлых недель, к которым
   пора вернуться (главные — раз в месяц, важные — раз в два, остальные — раз в три). Не больше трёх в день. */
function repeatCard(plan) {
  if (!plan.repeats?.length) return null;
  return foldCard({
    id: 'repeat',
    cls: 'repeat',
    icon: icons.refresh,
    title: t('repeat.title'),
    lead: plan.repeats.map((r) => r.task.title).join(' · '),
    body: [
      h('p', { class: 'card__text' }, t('repeat.lead')),
      h('ul', { class: 'repeat__list' }, ...plan.repeats.map((r) => h('li', { class: 'repeat__item' },
        h('div', { class: 'repeat__head' },
          h('strong', { class: 'repeat__title' }, r.task.title),
          h('span', { class: 'repeat__tier' }, t(`repeat.tier.${r.tier}`)),
        ),
        h('p', { class: 'card__text' }, r.task.text),
        h('p', { class: 'faint repeat__from' }, t('repeat.from', { week: r.fromWeek })),
      ))),
    ],
  }).node;
}

function callCard(ctx, plan, summary) {
  return h('div', { class: 'stack' },
    foldCard({
      id: 'task',
      cls: 'call',
      icon: icons.phone,
      title: t('kinds.call'),
      lead: t('today.callTitle'),
      points: taskPoints(ctx.entries, plan.day),
      body: [
      h('h2', { class: 'card__title' }, t('today.callTitle')),
      h('p', { class: 'task__text' }, plan.call),
      h('p', { class: 'card__text' }, t('today.callLead')),
      h('div', { class: 'card__actions' },
        summary.callDone
          ? h('span', { class: 'chip' }, svg(icons.check, 'chip__icon'), t('today.callDone'))
          : h('button', { type: 'button', class: 'btn btn--gold btn--block', onclick: () => openEntry({ day: plan.day, kind: 'call' }) }, t('today.callMark')),
      ),
      ],
    }).node,
    plan.review
      ? h('section', { class: 'card card--soft' },
        h('div', { class: 'card__eyebrow' }, h('span', { class: 'card__icon' }, svg(icons.mic)), h('span', { class: 'caps' }, t('today.reviewTitle'))),
        h('p', { class: 'card__text' }, t('today.reviewText')),
      )
      : null,
  );
}

/* «Мудрость недели» (было «Подсказка по делам», «Совет недели по работе»; у мужчин, week.biz; владелец 14.11.2026:
   «по бизнесу — одна лёгкая подсказка, стабильно»; «это как напутствие, наверху, без оценки»). Седьмой день — отдых. */
function bizCard(plan) {
  const text = bizFor(plan.biz, plan.dayInWeek);
  if (!text) return null;
  return foldCard({
    id: 'biz',
    cls: 'biz',
    icon: icons.goals,
    title: t('today.bizTitle'),
    lead: plan.biz.title,
    body: [
      h('p', { class: 'card__title biz__title' }, plan.biz.title),
      h('p', { class: 'card__text' }, text),
    ],
  }).node;
}

/* В поиске — вход в «Знакомство» прямо с «Сегодня»: советы, вопросы и запись после свидания. */
function meetLink(plan) {
  if (plan.profile !== 'single') return null;
  return h('a', { class: 'card settings__link', href: '#/meet' },
    h('span', { class: 'card__icon' }, svg(icons.rings)),
    h('span', { class: 'settings__link-text' }, t('meet.title')),
    svg(icons.chevronRight, 'settings__link-chevron'),
  );
}

function recordedToday(ctx, plan) {
  const own = ctx.entries.filter((e) => e.day === plan.day);
  if (!own.length) return null;
  return foldCard({
    id: 'recorded',
    icon: icons.journal,
    title: t('today.recordedToday'),
    lead: t('today.recordedLead', { n: own.length }),
    body: [
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
    ],
  }).node;
}

/* Итог дня внизу (владелец 14.11.2026): «итого набрано баллов за день — человек видит, сколько набрал». */
function totalCard(ctx, plan) {
  const score = dayScore(ctx.todayIso, plan.day, ctx.entries, { talk: talkDone(ctx, plan) });
  return h('section', { class: 'card card--soft day-total' },
    h('p', { class: 'caps day-total__title' }, t('score.totalTitle')),
    h('p', { class: 'day-total__value' }, pointsLabel(score.total)),
    h('p', { class: 'faint day-total__hint' }, t('score.hint')),
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
  if (plan.kind === 'task') main = taskCard(ctx, plan);
  else if (plan.kind === 'flow') main = flowCard(ctx, plan);
  else main = callCard(ctx, plan, summary);

  add(view,
    h('div', { class: 'stack' },
      header(ctx, plan, summary),
      // Новое от близкого (пара, семья) — сразу на виду; «Срочно» — красным
      usCard(),
      catchUp(ctx, summary),
      // «Мудрость недели» (у мужчин) — напутствие на день, над стаканом; баллов за неё нет (владелец 14.11.2026)
      bizCard(plan),
      // Сначала стакан тёплой воды — сразу после пробуждения, потом утренняя минута (js/water/README.md)
      waterCard(ctx),
      morningCard(ctx, plan),
      main,
      repeatCard(plan),
      meetLink(plan),
      // Седьмой день — «Разговор пары» (circles/talk.js)
      talkCard(ctx, plan),
      imsgCard(ctx, plan),
      loveCard(ctx, plan),
      recordedToday(ctx, plan),
      // Привычки дня — в конце (владелец 13.11.2026): утром — вода и минута, Кегель и шаги — в течение дня
      kegelCard(ctx),
      stepsCard(ctx),
      // Стакан воды на ночь — последним, перед сном (сборка 43, js/water/: вид night)
      waterCard(ctx, 'night'),
      // Итог дня — сколько баллов набрано (score/)
      totalCard(ctx, plan),
    ),
  );
}
