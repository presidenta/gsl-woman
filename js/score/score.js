import { plural } from '../core/i18n.js';
import * as morningLog from '../journal/morning-log.js';
import * as waterLog from '../water/water-log.js';
import { kegelLevel, stepsOf, stepsLevel } from '../habits/logs.js';
import * as deeds from './deeds.js';
import * as searchSteps from '../search/steps.js';

/* БАЛЛЫ ДНЯ (владелец 14.11.2026, сборки 56–57): «не просто „выполнено“, а балл — человек сам видит, сколько баллов
   он прожил за день, и анализирует для себя». Баллы — личные: никуда не уходят, ни с кем не сравниваются (проверить
   их нельзя, поэтому и рейтинга на них нет); преувеличит — обманет только себя. Считаются прямо из отметок.

     уровень: Минимум — 1, 100% — 2, Максимум — 3 (утренняя минута, задание дня, Кегель, шаги);
     стакан воды утром и на ночь — по 1;
     «Пять языков любви» и «Я-сообщение» — «Получилось» по 1 (deeds.js);
     «Разговор пары» (7-й день) — «Мы поговорили» 1;
     задание дня — лучший уровень из записей этого дня (созвон — 2).
   «Стержень недели» (у мужчин, вместо «Мудрости недели», 15.11.2026) — «Сделал» 1 (deeds.js).
   «В поиске» (профиль «в поиске») — хоть одно действие отмечено в этот день — 1 (search/steps.js, тот же журнал, что у полосок).

   Как видно (ui/fold.js, points): сделано — стрелка карточки светится золотом, после названия зелёным «+N балл». */

export const POINTS = { min: 1, full: 2, max: 3 };
export const pointsOf = (level) => POINTS[level] || 0;

/** Баллы задания дня: лучший уровень среди записей дня (task / flow), созвон — 2. */
export function taskPoints(entries, day) {
  let best = 0;
  for (const e of entries || []) {
    if (e.day !== day) continue;
    best = Math.max(best, e.kind === 'call' ? POINTS.full : pointsOf(e.level));
  }
  return best;
}

/** Все баллы дня по частям — для шапки и итога. talk — отметка «Мы поговорили» (знает circles/talk.js), thanks — своя «Благодарность недели» (thanks/). */
export function dayScore(iso, day, entries, { talk = false, thanks = false, intim = false, tender = false } = {}) {
  const parts = {
    water: waterLog.isDone(iso) ? 1 : 0,
    minute: pointsOf(morningLog.levelOf(iso)),
    task: taskPoints(entries, day),
    imsg: deeds.isDone(iso, 'imsg') ? 1 : 0,
    love: deeds.isDone(iso, 'love') ? 1 : 0,
    evening: deeds.isDone(iso, 'evening') ? 1 : 0, // «Мы поговорили» — вопрос на вечер (evening/)
    stem: deeds.isDone(iso, 'stem') ? 1 : 0, // «Сделал» — стержень недели у мужчин (stem/)
    talk: talk ? 1 : 0,
    thanks: thanks ? 1 : 0, // «Благодарность недели» — своя запись в паре (thanks/)
    intim: intim ? 1 : 0, // «Сделали» — интим-квест выходного (intim/)
    tender: tender ? 1 : 0, // «Получилось» — ритуал нежности в выходной (tender/)
    kegel: pointsOf(kegelLevel(iso)),
    steps: pointsOf(stepsLevel(stepsOf(iso))),
    night: waterLog.night.isDone(iso) ? 1 : 0,
    search: searchSteps.today(iso) > 0 ? 1 : 0,
  };
  const total = Object.values(parts).reduce((a, b) => a + b, 0);
  return { parts, total };
}

/** «3 балла» на языке приложения. */
export const pointsLabel = (n) => `${n} ${plural(n, 'plural.points')}`;
