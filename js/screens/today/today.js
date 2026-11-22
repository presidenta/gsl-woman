import * as meet from '../../meet/meet.js';
import { h, svg, add } from '../../core/dom.js';
import { t, plural, formatDate } from '../../core/i18n.js';
import { dateOfDay, daysBetween, weekOf } from '../../core/dates.js';
import { dayPlan, shapeOfWeek } from '../../program/index.js';
import { morningFor } from '../../program/morning.js';
import { weekSummary } from '../../progress/progress.js';
import * as morningLog from '../../journal/morning-log.js';
import { icons } from '../../ui/icons.js';
import { levelDots } from '../../ui/ring.js';
import { toast } from '../../ui/toast.js';
import { openEntry } from '../entry/entry-sheet.js';
import { heelsFigure } from '../../ui/heels.js';
import * as sound from '../../ui/tick.js';
import { imsgCard, aloudOf } from '../../imsg/imsg-card.js';
import { loveCard } from '../../love/cards.js';
import { waterCard } from '../../water/water-card.js';
import { foldCard } from '../../ui/fold.js';
import { kegelCard } from '../../habits/kegel-card.js';
import { stepsCard } from '../../habits/steps-card.js';
import { state as sectionsOpen, picked as sectionPicked, sectionButtons, sectionBlock, bizCard, womanPlusCard } from '../../sections/sections.js';
import * as sideOf from '../../side/side.js';
import { pulseCard } from '../../pulse/pulse.js';
import { voiceCheck } from '../../voice-check/voice-check.js';
import * as settingsStore from '../../settings/settings.js';
import { usCard } from '../../circles/today-card.js';
import { talkCard, talkDone } from '../../circles/talk.js';
import { thanksCard, thanksDone } from '../../thanks/thanks.js';
import { weekendCard, intimDone } from '../../intim/weekend.js';
import { secretCard } from '../../secret/secret.js';
import { eveningCard } from '../../evening/evening.js';
import { stemCard } from '../../stem/stem.js';
// «В поиске» — карточка дня: шаги недели (search/) тем же списком, что на экране «В поиске»
import * as searchSteps from '../../search/steps.js';
import { st } from '../../search/texts.js';
import { stepsList } from '../search/search.js';
import { showKids } from '../../profile/profile.js';
import * as journal from '../../journal/journal.js';
import { dayScore, pointsOf, taskPoints, pointsLabel } from '../../score/score.js';

/* ЭКРАН «СЕГОДНЯ» — главный. Сверху вниз, в порядке дня:
   1. Шапка дня: «День N» (без «из скольких» и без номера недели — обучение постоянное, владелец 12.11.2026),
      вид дня, название недели и её прогресс.
   2. «Можно наверстать» — если в этой неделе есть пропуски.
   3. Стакан тёплой воды — сразу после пробуждения: человек сам кладёт в него составляющие (js/water/).
   3½. Утренняя минута: выбор 1, 2 или 3 минуты (Минимум / 100% / Максимум), счёт вверх со звуком каждую секунду.
       Показывается, когда открыт раздел «Здоровье» и отмечен пункт «Утренняя минута»; стоит СРАЗУ за стаканом воды.
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

function header(ctx, plan, summary, buttons) {
  // Баллы дня (score/): личные, для себя — сколько баллов прожито сегодня
  const score = dayScore(ctx.todayIso, plan.day, ctx.entries, { talk: talkDone(ctx, plan), thanks: thanksDone(ctx, plan), intim: intimDone(ctx, plan) });
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
    // Кнопки разделов дня: «Отношения», «Здоровье», «Дело» — нажал, открылось; нажал ещё раз, закрылось (js/sections/)
    buttons,
  );
}

function catchUp(ctx, summary) {
  if (!summary.catchUp.length) return null;
  /* Свёрнуто в одну строку (владелец 17.11.2026: «огромное, каждый день видно… нажал — открылось, догнал, если хочет»):
     на виду только «Отстаёшь на N%», дни — по стрелке. */
  return foldCard({
    id: 'catchup',
    cls: 'catchup',
    icon: icons.heart,
    title: t('today.catchTitle'),
    lead: t('today.catchText', {
      percent: summary.lagPercent,
      days: `${summary.lagDays} ${plural(summary.lagDays, 'plural.days')}`,
    }),
    keepLead: true,
    body: [h('div', { class: 'catch-list' },
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
    )],
  }).node;
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
    teaser: plan.teaser,
    // Название и подзаголовок — в шапке под «ЗАДАНИЕ ДНЯ», и в раскрытом виде тоже (владелец 15.11.2026: «Магия рук»
    // под словом «Задание», а не под короной); подзаголовок — своей строкой, курсивом («Тайный ритуал соблазна»)
    lead: h('span', {}, h('span', {}, `«${task.title}»`),
      task.subtitle ? h('span', { class: 'fold__lead-sub task__subtitle' }, task.subtitle) : null),
    keepLead: true,
    points: taskPoints(ctx.entries, plan.day),
    body: [
    plan.intro ? h('p', { class: 'task__intro' }, plan.intro) : null,
    h('p', { class: 'task__text' }, task.text),
    // Что на что заменяем (владелец 14.11.2026: «оставь то, что мы заменяем, чтобы было понятно») — «Телефон → её глаза»
    task.swap ? h('p', { class: 'task__swap' }, h('span', { class: 'caps' }, t('today.swapTitle')), ' ', task.swap) : null,
    task.how?.length
      ? h('div', { class: 'task__block' },
        h('p', { class: 'caps task__block-title' }, t('today.howTitle')),
        h('ol', { class: 'task__how' }, ...task.how.map((step) => h('li', {}, step))),
      )
      : null,
    quoteBlock(task.quote),
    // Задание на голос — микрофон: записать и прослушать себя (js/voice-check/, владелец 17.11.2026)
    task.voice ? voiceCheck(plan.day) : null,
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
    askBlock(task.ask),
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

/* Вопросы для записи (поле ask у задания, flowAsk у дней практики; владелец 21.11.2026: «писать, как она себя ощущает,
   и как мужчины реагируют») — над кнопкой «Записать результат», ответы — в самой записи. */
function askBlock(questions) {
  if (!questions?.length) return null;
  return h('div', { class: 'task__block' },
    h('p', { class: 'caps task__block-title' }, t('today.askTitle')),
    h('ol', { class: 'task__how' }, ...questions.map((q) => h('li', {}, q))));
}

/* Слова автора дословно — с подписью: автор и книга (правило проекта: авторское — дословно, имя — только в подписи). */
function quoteBlock(quotes) {
  if (!quotes?.length) return null;
  return h('div', { class: 'task__block' },
    h('p', { class: 'caps task__block-title' }, t('today.quoteTitle')),
    ...quotes.map((q) => h('figure', { class: 'search-quote' },
      h('blockquote', { class: 'search-quote__text' }, q.text),
      q.source ? h('figcaption', { class: 'search-quote__source' }, `— ${q.source}`) : null)));
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
    teaser: plan.teaser,
    lead: plan.tasks.map((ex) => ex.title).join(' · ') || t('today.flowLead'),
    points: taskPoints(ctx.entries, plan.day),
    body: [
    h('p', { class: 'task__text' }, plan.flow || t('today.flowLead')),
    plan.flow ? h('p', { class: 'card__text' }, t('today.flowLead')) : null,
    // Что сказать в дни практики — как в карточке задания (у недели 5: имя любимого и слова ему)
    plan.flowSay?.length
      ? h('div', { class: 'task__block' },
        h('p', { class: 'caps task__block-title' }, t('today.sayTitle')),
        h('ul', { class: 'task__say' }, ...plan.flowSay.map(sayItem)),
      )
      : null,
    quoteBlock(plan.flowQuote),
    plan.tasks.length
      ? h('div', {},
        h('p', { class: 'caps', style: { margin: 'var(--sp-5) 0 var(--sp-2)' } }, t('today.exercisesLabel')),
        h('ol', { class: 'flow__list' }, ...plan.tasks.map((ex) => h('li', {}, h('strong', {}, ex.title), h('span', { class: 'dim' }, ex.text)))),
      )
      : null,
    askBlock(plan.flowAsk),
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

/* ВЫХОДНОЙ (ритм 3-2-1-1, владелец 17.11.2026: «один день полностью выходной… максимум лёгкое — что-то обсудить»):
   заданий нет, записывать нечего. У пары в этот день — «Разговор пары», если он выпал на седьмой день. */
function restCard(ctx, shape) {
  return h('div', { class: 'stack' },
    h('section', { class: 'card card--soft day-rest' },
      h('div', { class: 'card__eyebrow' }, h('span', { class: 'card__icon' }, svg(icons.sun)), h('span', { class: 'caps' }, t('kinds.rest'))),
      h('h2', { class: 'card__title' }, t('today.restTitle')),
      h('p', { class: 'card__text' }, t('today.restText')),
    ),
    moveCall(ctx, shape),
  );
}

/* Созвон — на 6-й или на 7-й день, выбирает человек (у наставника свои дни): второй из них — выходной. */
function moveCall(ctx, shape) {
  if (!shape.rest) return null;
  return h('button', {
    type: 'button', class: 'btn btn--block day-rest__move',
    onclick: () => { settingsStore.update({ callDay: shape.rest }); ctx.rerender(); },
  }, t('today.callMove', { day: shape.rest }));
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

/* В поиске — вход в раздел «В поиске» прямо с «Сегодня» (владелец 15.11.2026: «не знакомство, а инструкция — что
   делать, пока ищешь»): шаги недели, где искать, как часто встречаться, переписка, как выбирать. «Знакомство» —
   в библиотеке и по ссылке из раздела. Текстов раздела ещё нет (старая программа в памяти) — прежний вход. */
/* «В ПОИСКЕ» на «Сегодня» (профиль «в поиске») — карточка дня, как все (владелец 15.11.2026: «чтобы опять было всё
   в одинаковом дизайне»): подпись, строка, круглая стрелка; раскрывается на месте — шаги недели с «+1» и ссылка на
   весь раздел. Отметила хоть один шаг сегодня — «+1 балл» зелёным у названия (score/: search). */
function meetLink(plan, ctx) {
  if (plan.profile !== 'single') return null;
  const search = meet.content(ctx.lang)?.search;
  if (!search?.steps) {
    return h('a', { class: 'card settings__link today__search', href: '#/meet' },
      h('span', { class: 'card__icon' }, svg(icons.rings)),
      h('span', { class: 'settings__link-text' }, t('meet.title')),
      svg(icons.chevronRight, 'settings__link-chevron'),
    );
  }
  return foldCard({
    id: 'search',
    cls: 'today__search-card',
    icon: icons.rings,
    title: search.title,
    lead: search.card,
    points: searchSteps.today(ctx.todayIso) > 0 ? 1 : 0,
    body: [
      h('p', { class: 'caps search__heading' }, search.steps.title),
      stepsList(search.steps),
      h('a', { class: 'love-card__link', href: '#/search' }, st('open'), svg(icons.chevronRight, 'love-card__chevron')),
    ],
  }).node;
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
  const score = dayScore(ctx.todayIso, plan.day, ctx.entries, { talk: talkDone(ctx, plan), thanks: thanksDone(ctx, plan), intim: intimDone(ctx, plan) });
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
  const shape = shapeOfWeek(weekOf(ctx.day), ctx.lang);
  const summary = weekSummary(weekOf(ctx.day), ctx.entries, ctx.day, shape);
  let main;
  if (plan.kind === 'task') main = taskCard(ctx, plan);
  else if (plan.kind === 'flow') main = flowCard(ctx, plan);
  else if (plan.kind === 'rest') main = restCard(ctx, shape);
  else main = h('div', { class: 'stack' }, callCard(ctx, plan, summary), moveCall(ctx, shape));

  /* Ядро дня всегда на виду: стакан воды утром, задание, итог. Остальное — разделы с кнопками в шапке
     (js/sections/, владелец 17.11.2026: день не перегружать). Карточки закрытого раздела даже не строятся. */
  const open = sectionsOpen(ctx.settings);
  const man = sideOf.get() === 'man';
  const buttons = sectionButtons(ctx, { rel: true, health: true, biz: man ? !!(plan.biz || stemCard(ctx, plan)) : true });

  add(view,
    h('div', { class: 'stack' },
      header(ctx, plan, summary, buttons),
      // Новое от близкого (пара, семья) — сразу на виду; «Срочно» — красным
      usCard(),
      catchUp(ctx, summary),
      // Стакан тёплой воды — сразу после пробуждения (js/water/README.md)
      waterCard(ctx),
      // Утренняя минута — сразу за стаканом воды, как с самого начала (владелец 18.11.2026): она из раздела «Здоровье»
      // (включается там же, по галочке), но стоит в утреннем порядке, а не внизу вместе с Кегелем и шагами
      open.health && sectionPicked('health', 'minute', ctx.settings) ? morningCard(ctx, plan) : null,
      main,
      // «Секретные материалы» — глава книги о чакрах раз в 2 дня, под делом дня (js/secret/, владелец 22.11.2026)
      secretCard(ctx),
      // Замер недели — в день итога: три оценки «что изменилось» (js/pulse/, владелец 17.11.2026)
      pulseCard(ctx, plan),
      // «В поиске» — своя карточка у профиля «В поиске», не пункт раздела и не переключатель (владелец 18.11.2026: «верни
      // отдельным разделом»; до разделов дня 17.11 стояла так же)
      meetLink(plan, ctx),
      // «Отношения»: повтор навыков, «В поиске», «Разговор пары» (день 7), я-сообщение, вопрос на вечер, языки любви
      open.rel ? sectionBlock(ctx, 'rel', [
        // «Я-сообщение вслух» (вечерний вопрос дней 4–6) живёт внутри карточки «Я-сообщение» — одна карточка вместо двух
        { id: 'imsg', build: () => imsgCard(ctx, plan, { aloud: sectionPicked('rel', 'evening', ctx.settings) }) },
        { id: 'evening', build: () => (plan.imsg && sectionPicked('rel', 'imsg', ctx.settings) && aloudOf(ctx, plan) ? null : eveningCard(ctx, plan)) },
        { id: 'love', build: () => loveCard(ctx, plan) },
        { id: 'talk', build: () => talkCard(ctx, plan) },
        // «Благодарность недели» — в паре на 7-й день, за «Разговором пары» (js/thanks/, владелец 19.11.2026)
        { id: 'thanks', build: () => thanksCard(ctx, plan) },
        // «Интим-квест выходного» — 6-й и 7-й день (js/intim/, владелец 21.11.2026)
        { id: 'intim', build: () => weekendCard(ctx, plan) },
        { id: 'repeat', build: () => repeatCard(plan) },
      ]) : null,
      // «Здоровье»: Кегель, шаги, стакан на ночь — человек сам собирает, что показывать (утренняя минута — выше, за стаканом воды)
      open.health ? sectionBlock(ctx, 'health', [
        { id: 'kegel', build: () => kegelCard(ctx) },
        { id: 'steps', build: () => stepsCard(ctx) },
        // Стакан на ночь — в «Здоровье», по выбору (владелец 17.11.2026: «утром — всегда, на ночь — если надо»)
        { id: 'waterNight', build: () => waterCard(ctx, 'night') },
      ]) : null,
      // Третий раздел (у мужской части — «Мужчина⁺»): совет недели по работе и «Стержень недели»
      open.biz ? sectionBlock(ctx, 'biz', man ? [
        { id: 'tip', build: () => bizCard(ctx, plan) },
        { id: 'stem', build: () => stemCard(ctx, plan) },
        // Практики «Мужчина⁺»: йога, тантра, массажи — в разработке, со своим списком (владелец 17.11.2026)
        { id: 'soon', build: () => womanPlusCard(ctx) },
      ] : [{ id: 'soon', build: () => womanPlusCard(ctx) }]) : null,
      recordedToday(ctx, plan),
      // Итог дня — сколько баллов набрано (score/)
      totalCard(ctx, plan),
    ),
  );
}
