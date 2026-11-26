/* HUMAN DESIGN — расчёт (владелец 26.11.2026: каждое направление — своя папка). Схема из движка Gemini (порядок 64 ворот,
   начало круга 302° — 2° Водолея, Дизайн — Солнце на 88° раньше), ошибки исправлены: каналов ровно 36 (убран
   несуществующий 10–25 и дубль 10–34, добавлены 57–34 и 57–10); местное время и город → UTC через часовой пояс (Intl).
   Астрономия — astronomy-engine (MIT, astronomy.js рядом; приходит параметром A). Узлы — средние (как у многих
   программ; у истинного узла линия может отличаться). */

export const ORDER = [41, 19, 13, 49, 30, 55, 37, 63, 22, 36, 25, 17, 21, 51, 42, 3, 27, 24, 2, 23, 8, 20, 16, 35, 45, 12, 15, 52, 39, 53, 62, 56,
  31, 33, 7, 4, 29, 59, 40, 64, 47, 6, 46, 18, 48, 57, 32, 50, 28, 44, 1, 43, 14, 34, 9, 5, 26, 11, 10, 58, 38, 54, 61, 60];

export const CENTERS = { Head: 'Теменной', Ajna: 'Аджна', Throat: 'Горловой', G: 'G-центр', Heart: 'Сердце (Эго)', Sacral: 'Сакральный', Spleen: 'Селезёнка', SolarPlexus: 'Солнечное сплетение', Root: 'Корневой' };
const MOTORS = ['Heart', 'Sacral', 'SolarPlexus', 'Root'];

/** 36 каналов: [ворота, ворота, центр, центр]. */
export const CHANNELS = [
  [64, 47, 'Head', 'Ajna'], [61, 24, 'Head', 'Ajna'], [63, 4, 'Head', 'Ajna'],
  [17, 62, 'Ajna', 'Throat'], [43, 23, 'Ajna', 'Throat'], [11, 56, 'Ajna', 'Throat'],
  [16, 48, 'Throat', 'Spleen'], [20, 57, 'Throat', 'Spleen'], [20, 34, 'Throat', 'Sacral'], [20, 10, 'Throat', 'G'],
  [31, 7, 'Throat', 'G'], [8, 1, 'Throat', 'G'], [33, 13, 'Throat', 'G'], [45, 21, 'Throat', 'Heart'],
  [35, 36, 'Throat', 'SolarPlexus'], [12, 22, 'Throat', 'SolarPlexus'],
  [32, 54, 'Spleen', 'Root'], [28, 38, 'Spleen', 'Root'], [18, 58, 'Spleen', 'Root'], [50, 27, 'Spleen', 'Sacral'],
  [57, 34, 'Spleen', 'Sacral'], [57, 10, 'Spleen', 'G'], [44, 26, 'Spleen', 'Heart'],
  [46, 29, 'G', 'Sacral'], [2, 14, 'G', 'Sacral'], [15, 5, 'G', 'Sacral'], [10, 34, 'G', 'Sacral'], [25, 51, 'G', 'Heart'],
  [59, 6, 'Sacral', 'SolarPlexus'], [42, 53, 'Sacral', 'Root'], [3, 60, 'Sacral', 'Root'], [9, 52, 'Sacral', 'Root'],
  [40, 37, 'Heart', 'SolarPlexus'], [49, 19, 'SolarPlexus', 'Root'], [55, 39, 'SolarPlexus', 'Root'], [30, 41, 'SolarPlexus', 'Root'],
];

export const TYPES = { Generator: 'Генератор', ManifestingGenerator: 'Манифестирующий генератор', Projector: 'Проектор', Manifestor: 'Манифестор', Reflector: 'Рефлектор' };
export const AUTHORITIES = { Emotional: 'Эмоциональный', Sacral: 'Сакральный', Splenic: 'Селезёночный', EgoManifested: 'Эго (манифестированный)', EgoProjected: 'Эго (проецируемый)', SelfProjected: 'Самопроецируемый', Mental: 'Ментальный (окружение)', Lunar: 'Лунный' };
export const BODIES = ['Sun', 'Earth', 'NorthNode', 'SouthNode', 'Moon', 'Mercury', 'Venus', 'Mars', 'Jupiter', 'Saturn', 'Uranus', 'Neptune', 'Pluto'];
export const BODY_RU = { Sun: 'Солнце', Earth: 'Земля', NorthNode: 'Сев. узел', SouthNode: 'Юж. узел', Moon: 'Луна', Mercury: 'Меркурий', Venus: 'Венера', Mars: 'Марс', Jupiter: 'Юпитер', Saturn: 'Сатурн', Uranus: 'Уран', Neptune: 'Нептун', Pluto: 'Плутон' };

const norm = (d) => ((d % 360) + 360) % 360;

/** Долгота → ворота и линия. */
export function gateOf(lon) {
  const off = norm(lon - 302);
  const span = 360 / 64;
  const i = Math.min(63, Math.floor(off / span));
  return { gate: ORDER[i], line: Math.min(6, Math.floor((off - i * span) / (span / 6)) + 1) };
}

/** Местные дата («ГГГГ-ММ-ДД»), время («ЧЧ:ММ») в часовом поясе tz (IANA) → Date (UTC). Летнее время прошлых лет — из
    базы поясов самого браузера (Intl). */
export function zonedToUtc(date, time, tz) {
  const [y, mo, d] = date.split('-').map(Number);
  const [hh, mm] = time.split(':').map(Number);
  const want = Date.UTC(y, mo - 1, d, hh, mm);
  const fmt = new Intl.DateTimeFormat('en-US', { timeZone: tz, hourCycle: 'h23', year: 'numeric', month: 'numeric', day: 'numeric', hour: 'numeric', minute: 'numeric' });
  const asUtc = (t) => { const p = Object.fromEntries(fmt.formatToParts(new Date(t)).map((x) => [x.type, Number(x.value)])); return Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute); };
  let t = want - (asUtc(want) - want);
  t = want - (asUtc(t) - t); // второй шаг — на границе перевода часов
  return new Date(t);
}

function longitudes(A, date) {
  const time = A.MakeTime(date);
  const lon = (b) => norm(A.Ecliptic(A.GeoVector(b, time, true)).elon);
  const sun = lon(A.Body.Sun);
  const node = norm(125.0445222 - 0.0529539222 * time.tt);
  const out = { Sun: sun, Earth: norm(sun + 180), NorthNode: node, SouthNode: norm(node + 180) };
  for (const b of ['Moon', 'Mercury', 'Venus', 'Mars', 'Jupiter', 'Saturn', 'Uranus', 'Neptune', 'Pluto']) out[b] = lon(A.Body[b]);
  return out;
}

/** Момент Дизайна: Солнце на 88° раньше (поиск делением отрезка 80–96 дней до рождения). */
function designDate(A, birth) {
  const sunAt = (ms) => norm(A.Ecliptic(A.GeoVector(A.Body.Sun, A.MakeTime(new Date(ms)), true)).elon);
  const target = norm(sunAt(birth.getTime()) - 88);
  let lo = birth.getTime() - 96 * 864e5;
  let hi = birth.getTime() - 80 * 864e5;
  for (let i = 0; i < 50; i++) {
    const mid = (lo + hi) / 2;
    if (norm(sunAt(mid) - target) > 180) lo = mid; else hi = mid;
  }
  return new Date((lo + hi) / 2);
}

function connected(adj, from, to) {
  const seen = new Set([from]);
  const queue = [from];
  while (queue.length) {
    const c = queue.shift();
    if (c === to) return true;
    for (const n of adj[c] || []) if (!seen.has(n)) { seen.add(n); queue.push(n); }
  }
  return false;
}

/** Карта: birth — Date (UTC); A — astronomy-engine. */
export function chart(A, birth) {
  const design = designDate(A, birth);
  const act = (date) => Object.fromEntries(Object.entries(longitudes(A, date)).map(([b, l]) => [b, gateOf(l)]));
  const personality = act(birth);
  const des = act(design);
  const gates = new Set([...Object.values(personality), ...Object.values(des)].map((x) => x.gate));
  const channels = CHANNELS.filter(([a, b]) => gates.has(a) && gates.has(b));
  const defined = new Set(channels.flatMap(([, , c1, c2]) => [c1, c2]));
  const adj = {};
  for (const [, , c1, c2] of channels) { (adj[c1] ||= []).push(c2); (adj[c2] ||= []).push(c1); }
  const motorToThroat = MOTORS.some((m) => defined.has(m) && connected(adj, m, 'Throat'));
  const type = !defined.size ? 'Reflector' : defined.has('Sacral') ? (motorToThroat ? 'ManifestingGenerator' : 'Generator') : motorToThroat ? 'Manifestor' : 'Projector';
  let authority = 'Mental';
  if (type === 'Reflector') authority = 'Lunar';
  else if (defined.has('SolarPlexus')) authority = 'Emotional';
  else if (defined.has('Sacral')) authority = 'Sacral';
  else if (defined.has('Spleen')) authority = 'Splenic';
  else if (defined.has('Heart')) authority = connected(adj, 'Heart', 'Throat') ? 'EgoManifested' : 'EgoProjected';
  else if (defined.has('G') && connected(adj, 'G', 'Throat')) authority = 'SelfProjected';
  return {
    designUtc: design.toISOString(),
    personality,
    design: des,
    type,
    authority,
    profile: `${personality.Sun.line}/${des.Sun.line}`,
    cross: [personality.Sun.gate, personality.Earth.gate, des.Sun.gate, des.Earth.gate],
    channels: channels.map(([a, b]) => `${a}–${b}`),
    defined: Object.keys(CENTERS).filter((c) => defined.has(c)),
    open: Object.keys(CENTERS).filter((c) => !defined.has(c)),
  };
}
