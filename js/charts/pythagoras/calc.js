/* КВАДРАТ ПИФАГОРА — расчёт (владелец 26.11.2026: каждое направление — своя папка). Классическая методика:
   1-е рабочее — сумма цифр даты; 2-е — сумма цифр 1-го; 3-е — 1-е минус удвоенная первая цифра дня (рождённым с 2000 —
   1-е плюс 19); 4-е — сумма цифр 3-го. В квадрат идут цифры даты и всех рабочих чисел, нули не считаются.
   Ошибки движка Gemini исправлены: подписи строк/столбцов и правило для рождённых после 2000. */

const sum = (n) => String(Math.abs(n)).split('').reduce((s, c) => s + Number(c), 0);

export const CELLS = { 1: 'Характер, воля', 2: 'Энергия', 3: 'Интерес, познание', 4: 'Здоровье', 5: 'Логика, интуиция', 6: 'Труд', 7: 'Удача', 8: 'Долг', 9: 'Память, ум' };

/** Линии: строки, столбцы, диагонали — названия по классике. */
export const LINES = [
  ['Самооценка', [1, 2, 3]], ['Работа, деньги', [4, 5, 6]], ['Талант', [7, 8, 9]],
  ['Целеустремлённость', [1, 4, 7]], ['Семья', [2, 5, 8]], ['Привычки, стабильность', [3, 6, 9]],
  ['Духовность', [1, 5, 9]], ['Темперамент', [3, 5, 7]],
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
    lines: LINES.map(([name, ds]) => ({ name, digits: ds, total: ds.reduce((s, k) => s + counts[k], 0) })),
  };
}
