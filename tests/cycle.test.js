// Календарь цикла: когда у мужчины пульсирует кружок с датой (владелец 17.11.2026).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { careToday } from '../js/cycle/cycle.js';

// Два отмеченных цикла по 28 дней: месячные 1–5 сентября и 29 сентября — 3 октября. Следующие ожидаются с 27 октября.
const days = ['2026-09-01', '2026-09-02', '2026-09-03', '2026-09-04', '2026-09-05',
  '2026-09-29', '2026-09-30', '2026-10-01', '2026-10-02', '2026-10-03'];

test('её отмеченный день — «period», ожидаемый — «soon»', () => {
  assert.equal(careToday(days, null, '2026-10-01'), 'period');
  assert.equal(careToday(days, null, '2026-10-27'), 'soon');
  assert.equal(careToday(days, null, '2026-10-31'), 'soon');
});

test('за один-два дня до ожидаемых — «near», раньше и после — обычный день', () => {
  assert.equal(careToday(days, null, '2026-10-25'), 'near');
  assert.equal(careToday(days, null, '2026-10-26'), 'near');
  assert.equal(careToday(days, null, '2026-10-24'), null);
  assert.equal(careToday(days, null, '2026-11-05'), null);
});

test('без отметок — обычный день', () => {
  assert.equal(careToday([], null, '2026-10-27'), null);
});

test('мужчина без пары отмечает её дни сам: они в календаре, отметки — на его телефоне', async () => {
  const { clearAll, write, read } = await import('../js/core/store.js');
  const side = await import('../js/side/side.js');
  const { _shown } = await import('../js/cycle/cycle.js');
  clearAll();
  side._use('man');
  write('cycle-her', { days, cycle: null });
  assert.deepEqual(_shown().days, days);
  assert.deepEqual(read('cycle', {}), {});
  side._use('woman');
  assert.deepEqual(_shown().days, []);
  clearAll();
});

test('окно «90 дней»: 45 дней до и 45 после сегодня; история и статистика года', async () => {
  const { windowRange, cycleHistory, yearStats } = await import('../js/cycle/cycle.js');
  assert.deepEqual(windowRange('2026-11-17'), { from: '2026-10-03', to: '2027-01-01' });
  const h = cycleHistory(days);
  assert.deepEqual(h.map((c) => [c.start, c.len, c.cycle]), [['2026-09-01', 5, 28], ['2026-09-29', 5, null]]);
  const y = yearStats(days, 2026);
  assert.equal(y.count, 2);
  assert.equal(y.cycle, 28);
  assert.equal(y.len, 5);
  assert.equal(yearStats(days, 2025).count, 0);
});

// Потенциальная овуляция (владелец 25.11.2026): формула Огино — Кнауса — с (короткий цикл − 18)-го по
// (длинный цикл − 11)-й день цикла; вероятный день — (цикл − 14)-й.
test('овуляция: при цикле 28 — окно с 10-го по 17-й день (8 дней), вероятный — 14-й; прошедший цикл по факту', async () => {
  const { ovulation, nextOvulation } = await import('../js/cycle/cycle.js');
  const ov = ovulation(days);
  const win = (from, n) => [...Array(n)].map((_, i) => { const d = new Date(`${from}T12:00:00Z`); d.setUTCDate(d.getUTCDate() + i); return d.toISOString().slice(0, 10); });
  // Прошедший (1.09): 10–17.09, вероятный 14.09; текущий (29.09): 8–15.10, вероятный 12.10; следующий (27.10): 5–12.11
  for (const d of win('2026-09-10', 8)) assert.ok(ov.around.has(d) || ov.peak.has(d), d);
  for (const d of ['2026-09-14', '2026-10-12', '2026-11-09']) assert.ok(ov.peak.has(d), d);
  for (const d of win('2026-10-08', 8)) assert.ok(ov.around.has(d) || ov.peak.has(d), d);
  for (const d of ['2026-09-09', '2026-09-18', '2026-10-07', '2026-10-16']) assert.ok(!ov.around.has(d) && !ov.peak.has(d), d);
  assert.ok(!ov.around.has('2026-10-12'), 'вероятный день — только сердечком-контуром');
  assert.deepEqual(nextOvulation(days, null, '2026-10-15'), { from: '2026-10-08', to: '2026-10-15', peak: '2026-10-12' });
  assert.equal(nextOvulation(days, null, '2026-10-16').peak, '2026-11-09');
});

test('овуляция пересчитывается со своей длиной цикла; без отметок — пусто', async () => {
  const { ovulation, nextOvulation } = await import('../js/cycle/cycle.js');
  // Своя длина 32, по отметкам 28: окно — с (28 − 18) по (32 − 11) день = 8–19.10, вероятный — 18-й день = 16.10;
  // прошедший цикл остаётся по факту (14.09)
  const w = nextOvulation(days, 32, '2026-10-01');
  assert.deepEqual(w, { from: '2026-10-08', to: '2026-10-19', peak: '2026-10-16' });
  assert.ok(ovulation(days, 32).peak.has('2026-09-14'));
  assert.equal(ovulation([]).peak.size, 0);
  assert.equal(nextOvulation([], null, '2026-10-01'), null);
});
