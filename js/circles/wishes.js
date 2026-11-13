import { getLang } from '../core/i18n.js';
import * as side from '../side/side.js';
import { addDays } from '../core/dates.js';
import * as circles from './circles.js';
import ru from './catalog/ru.js';
import ua from './catalog/ua.js';
import en from './catalog/en.js';

/* ЖЕЛАНИЯ НА ВЫХОДНЫЕ (владелец 13.11.2026, ТЗ раздел 5). Неделя — календарная; у каждого свои отметки на неделю.
   Отметки — только «Да» и «Возможно» (владелец 13.11.2026: «всё остальное — обсуждать; не выбрал — и всё»), во всех
   разделах. «Для тебя» — что я хочу сделать для тебя. Отметки партнёра видны, совпадения подсвечиваются.

   Записи в контуре пары:
     mark — id «неделя.участник.желание», data { week, wish, mark } — правит только автор;
     wish — своё желание, id «w-…», data { text, mode: want|give, section } — общее. */

const CATALOG = { ru, ua, en };
export const MODES = ['want', 'give'];
/** Обычные разделы — «Да / Возможно»; «Близость» (сборка 44) — отдельно, через я-сообщение: want.close — «буду
    благодарна за…», give.close (+ give.care) — «хочу сделать для тебя»; ключи одинаковые — совпадения крест-накрест. */
export const WANT_SECTIONS = ['rest', 'nature', 'together', 'body', 'fun', 'home', 'care'];
export const GIVE_SECTIONS = ['close'];

/* Что подходит только одному полу: массаж лингама и простаты получает мужчина (делает — женщина), массаж йони —
   женщина (делает — мужчина). Ключ → кому показывать (часть приложения). */
const ONLY = {
  'want.close.lingam': 'man', 'want.close.prostate': 'man', 'want.close.yoni': 'woman',
  'give.close.lingam': 'woman', 'give.close.prostate': 'woman', 'give.close.yoni': 'man',
};
const fits = (key) => !ONLY[key] || ONLY[key] === (side.get() || 'woman');
export const MARKS = ['yes', 'maybe'];
const POSITIVE = new Set(['yes']);
// Отметки сборки 42 («пас», «откликается», «подумаю») — к новым двум; «пас» просто снимается
const LEGACY = { resonates: 'yes', think: 'maybe', no: null };
const normal = (m) => (m in LEGACY ? LEGACY[m] : m);

const catalog = () => CATALOG[getLang()] || CATALOG.ru;
export const sectionsOf = (mode) => (mode === 'give' ? GIVE_SECTIONS : WANT_SECTIONS);
export const marksOf = () => MARKS;

/** Желания раздела: готовые (ключ «режим.раздел.ключ») и свои. */
export function list(circleId, mode, section) {
  const ready = Object.entries(catalog()[mode]?.[section] || {})
    .map(([k, text]) => ({ key: `${mode}.${section}.${k}`, text, own: false, pairKey: `${mode === 'want' ? 'give' : 'want'}.${section}.${k}` }))
    .filter((w) => fits(w.key));
  const own = circles.items(circleId, 'wish')
    .filter((w) => w.data?.mode === mode && w.data?.section === section)
    .sort((a, b) => a.updatedAt.localeCompare(b.updatedAt))
    .map((w) => ({ key: w.id, text: w.data.text, own: true, author: w.author }));
  return [...ready, ...own];
}

/** Желания обычного раздела: «Забота» (сборка 45) — бытовое служение из give.care, остальные — want.<раздел>. */
export const sectionList = (circleId, section) => (section === 'care' ? list(circleId, 'give', 'care') : list(circleId, 'want', section));

const markId = (week, member, key) => `${circles.compact(week)}.${circles.short(member)}.${key}`.slice(0, 64);

/** Отметки недели: { [ключ желания]: { [участник]: отметка } }. */
export function marks(circleId, week) {
  const out = {};
  for (const m of circles.items(circleId, 'mark')) {
    if (m.data?.week !== week) continue;
    // Бытовая забота (give.care) с 45 — обычный раздел «Да / Возможно»: прежнее «хочу сделать» там = «да»
    const care = String(m.data.wish).startsWith('give.care.');
    const mark = m.data.mark === 'give' ? (care ? 'yes' : 'give') : normal(m.data.mark);
    if (mark) (out[m.data.wish] ||= {})[m.author] = mark;
  }
  return out;
}

/** Поставить, сменить или снять (то же ещё раз) свою отметку. */
export function setMark(circle, week, key, mark) {
  const id = markId(week, circle.me, key);
  const had = circles.item(circle.id, 'mark', id);
  if (had && had.data?.mark === mark) circles.drop(circle.id, 'mark', id);
  else circles.put(circle.id, 'mark', id, { week, wish: key, mark });
}

export function addOwn(circle, mode, section, text) {
  const clean = String(text || '').trim().slice(0, 120);
  if (!clean) return null;
  return circles.put(circle.id, 'wish', circles.newId('w'), { text: clean, mode, section });
}

/** Перенести свои отметки с прошлой недели (те, что ещё не стоят). */
export function copyLastWeek(circle, week) {
  const prev = addDays(week, -7);
  const now = marks(circle.id, week);
  for (const m of circles.items(circle.id, 'mark')) {
    if (m.data?.week !== prev || m.author !== circle.me) continue;
    if (now[m.data.wish]?.[circle.me]) continue;
    circles.put(circle.id, 'mark', markId(week, circle.me, m.data.wish), { week, wish: m.data.wish, mark: m.data.mark });
  }
}

/** Совпадение у желания: both — оба «да» («откликается»), soft — «да» и «может быть»; иначе null. */
export function matchOf(byMember, memberIds) {
  if (memberIds.length < 2) return null;
  const [a, b] = memberIds.map((id) => byMember?.[id]);
  if (!a || !b) return null;
  if (POSITIVE.has(a) && POSITIVE.has(b)) return 'both';
  if ((POSITIVE.has(a) && b === 'maybe') || (POSITIVE.has(b) && a === 'maybe')) return 'soft';
  return null;
}

/** Все совпадения «Хочу» и «Близость» за неделю — для итога «вы оба хотите». */
export function matches(circle, week) {
  const ids = circle.members.filter((m) => m.role !== 'child').map((m) => m.id);
  const all = marks(circle.id, week);
  const out = [];
  for (const section of WANT_SECTIONS) {
    for (const w of sectionList(circle.id, section)) {
      const m = matchOf(all[w.key], ids);
      if (m) out.push({ ...w, section, match: m });
    }
  }
  return out.sort((a, b) => (a.match === b.match ? 0 : a.match === 'both' ? -1 : 1));
}
