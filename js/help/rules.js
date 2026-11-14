import { read, write } from '../core/store.js';

/* ПРАВИЛА НАШЕГО ДОМА (владелец 14.11.2026): отдельный пункт «Помощи», итог обсуждений пары. Список начинается с
   правил с сервера (help → rules), дальше человек ведёт его сам: «＋» — дописать, нажать на правило — изменить,
   «−» — убрать. Хранится на телефоне (ключ houserules) и в копии на сервере (sync/, вид houserules).
   seeded — список уже заполнен правилами с сервера: если человек убрал все, они не вернутся сами. */

const KEY = 'houserules';
export const MAX_RULES = 40;
export const MAX_TEXT = 200;

const newId = () => 'r' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
const clean = (s) => String(s || '').trim().slice(0, MAX_TEXT);

function state() {
  const s = read(KEY, null);
  const items = Array.isArray(s?.items) ? s.items.filter((r) => r && typeof r.id === 'string' && typeof r.text === 'string') : [];
  return { seeded: !!s?.seeded, items };
}

const save = (items) => write(KEY, { seeded: true, items });

/** Правила дома; в первый раз — из правил с сервера (defaults — тексты). */
export function list(defaults = []) {
  const s = state();
  if (s.seeded) return s.items;
  const items = defaults.map(clean).filter(Boolean).slice(0, MAX_RULES).map((text) => ({ id: newId(), text }));
  if (items.length) save(items);
  return items;
}

/** Дописать правило; пустое или сверх меры — null. */
export function add(text, defaults = []) {
  const value = clean(text);
  const items = list(defaults);
  if (!value || items.length >= MAX_RULES) return null;
  const rule = { id: newId(), text: value };
  save([...items, rule]);
  return rule;
}

/** Изменить правило; пустой текст — правило остаётся прежним. */
export function update(id, text) {
  const value = clean(text);
  if (!value) return;
  save(state().items.map((r) => (r.id === id ? { ...r, text: value } : r)));
}

export function remove(id) {
  save(state().items.filter((r) => r.id !== id));
}
