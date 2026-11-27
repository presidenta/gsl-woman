/* КВАДРАТ ПИФАГОРА — расчёт (владелец 26.11.2026: каждое направление — своя папка). Классическая методика:
   1-е рабочее — сумма цифр даты; 2-е — сумма цифр 1-го; 3-е — 1-е минус удвоенная первая цифра дня (рождённым с 2000 —
   1-е плюс 19); 4-е — сумма цифр 3-го. В квадрат идут цифры даты и всех рабочих чисел, нули не считаются.
   Ошибки движка Gemini исправлены: подписи строк/столбцов и правило для рождённых после 2000. */

const sum = (n) => String(Math.abs(n)).split('').reduce((s, c) => s + Number(c), 0);

/** Русские подписи клеток (для проверок); на экране — texts/*.js → cells. */
export const CELLS = { 1: 'Характер, воля', 2: 'Энергия', 3: 'Порядок, науки', 4: 'Здоровье', 5: 'Логика, интуиция', 6: 'Труд', 7: 'Талант, удача', 8: 'Долг', 9: 'Память, ум' };

/** Линии: строки, столбцы, диагонали — названия по классике; третье — ключ текстов (texts/*.js → lines). */
export const LINES = [
  ['Самооценка', [1, 2, 3], 'self'], ['Работа, деньги', [4, 5, 6], 'money'], ['Талант', [7, 8, 9], 'talent'],
  ['Целеустремлённость', [1, 4, 7], 'goal'], ['Семья', [2, 5, 8], 'family'], ['Привычки, стабильность', [3, 6, 9], 'habits'],
  ['Духовность', [1, 5, 9], 'spirit'], ['Темперамент', [3, 5, 7], 'temper'],
];

/** iso — «ГГГГ-ММ-ДД». Вернёт { work: [w1..w4], counts: {1..9}, cells: {1..9: '111'}, lines: [{ name, digits, total }] } или null. */
export function pythagoras(iso) {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso || '');
  if (!m) return null;
  const [, y, mo, d] = m;
  const digits = `${d}${mo}${y}`.split('').map(Number);
  const w1 = digits.reduce((s, x) => s + x, 0);
  const w2 = sum(w1);
  const w3 = Number(y) >= 2000 ? w1 + 19 : w1 - 2 * Number(d[0] === '0' ? d[1] : d[0]);
  const w4 = sum(w3);
  const all = `${d}${mo}${y}${w1}${w2}${w3}${w4}`;
  const counts = Object.fromEntries([1, 2, 3, 4, 5, 6, 7, 8, 9].map((k) => [k, 0]));
  for (const c of all) if (c >= '1' && c <= '9') counts[c] += 1;
  return {
    work: [w1, w2, w3, w4],
    counts,
    cells: Object.fromEntries(Object.entries(counts).map(([k, n]) => [k, n ? k.repeat(n) : '—'])),
    lines: LINES.map(([name, ds, id]) => ({ id, name, digits: ds, total: ds.reduce((s, k) => s + counts[k], 0) })),
  };
}

/** Квадрат пары (владелец 27.11.2026): цифры двоих складываются — общий квадрат и линии пары. */
/* Уровень цифры у человека для советов «что делать»: low / mid / high (сколько раз цифра встречается). */
const LO = { 1: 2, 2: 1 };
const HI = { 1: 5, 2: 3, 4: 2 };
export const level = (d, n) => (n <= (LO[d] ?? 0) ? 'low' : n >= (HI[d] ?? 3) ? 'high' : 'mid');

/* ПАРА (владелец 27.11.2026): по классике пару НЕ складывают в один квадрат — «111111» у одного и «1» у другого в сумме
   выглядели бы гармонией. Два квадрата сравниваются по каждой цифре:
   void — нет у обоих; comp — есть только у одного (дополняет); both — много у обоих (у единиц 4+, у остальных 2+);
   tilt — разница 2 и больше (один тянет); even — примерно поровну. Сумма цифр — только «общий ресурс» (counts/cells/lines). */
const BOTH = { 1: 4 };
export function pairStatus(d, a, b) {
  if (!a && !b) return 'void';
  if (!a || !b) return 'comp';
  if (a >= (BOTH[d] ?? 2) && b >= (BOTH[d] ?? 2)) return 'both';
  if (Math.abs(a - b) >= 2) return 'tilt';
  return 'even';
}

export function pairPythagoras(isoA, isoB) {
  const a = pythagoras(isoA);
  const b = pythagoras(isoB);
  if (!a || !b) return null;
  const counts = Object.fromEntries(Object.keys(a.counts).map((k) => [k, a.counts[k] + b.counts[k]]));
  return {
    a, b,
    compare: [1, 2, 3, 4, 5, 6, 7, 8, 9].map((d) => ({ digit: d, a: a.counts[d], b: b.counts[d], status: pairStatus(d, a.counts[d], b.counts[d]) })),
    counts,
    cells: Object.fromEntries(Object.entries(counts).map(([k, n]) => [k, n ? k.repeat(n) : '—'])),
    lines: LINES.map(([name, ds, id]) => ({ id, name, digits: ds, total: ds.reduce((s, k) => s + counts[k], 0) })),
  };
}
