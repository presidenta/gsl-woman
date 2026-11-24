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

// Потенциальная овуляция (владелец 24.11.2026): за 14 дней до следующих месячных, три дня — ожидаемый и по дню рядом.
test('овуляция: у прошедшего цикла — за 14 дней до настоящих следующих, у текущего и будущих — по длине цикла', async () => {
  const { ovulation, nextOvulation } = await import('../js/cycle/cycle.js');
  const ov = ovulation(days);
  // 29.09 − 14 = 15.09 (прошедший); 29.09 + 28 − 14 = 13.10 (текущий); дальше каждые 28 дней
  for (const d of ['2026-09-15', '2026-10-13', '2026-11-10', '2026-12-08']) assert.ok(ov.peak.has(d), d);
  for (const d of ['2026-10-12', '2026-10-14']) assert.ok(ov.around.has(d), d);
  assert.ok(!ov.peak.has('2026-10-12') && !ov.around.has('2026-10-11'));
  // Ближайшая: пока окно 12–14.10 не прошло — 13.10, потом — 10.11
  assert.equal(nextOvulation(days, null, '2026-10-14'), '2026-10-13');
  assert.equal(nextOvulation(days, null, '2026-10-15'), '2026-11-10');
});

test('овуляция пересчитывается со своей длиной цикла; без отметок — пусто', async () => {
  const { ovulation, nextOvulation } = await import('../js/cycle/cycle.js');
  // Цикл 32: 29.09 + 32 − 14 = 17.10; прошедшая (по настоящим отметкам) остаётся 15.09
  const ov = ovulation(days, 32);
  assert.ok(ov.peak.has('2026-10-17') && ov.peak.has('2026-09-15') && !ov.peak.has('2026-10-13'));
  assert.equal(ovulation([]).peak.size, 0);
  assert.equal(nextOvulation([], null, '2026-10-01'), null);
});
