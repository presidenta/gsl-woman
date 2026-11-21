import { read, write } from '../core/store.js';

/* ПРАВИЛА НАШЕГО ДОМА (владелец 14.11.2026): отдельный пункт «Помощи», итог обсуждений пары. Список начинается с
   правил с сервера (help → rules), дальше человек ведёт его сам: «＋» — дописать, нажать на правило — изменить,
   «−» — убрать. Хранится на телефоне (ключ houserules) и в копии на сервере (sync/, вид houserules).
   seeded — список уже заполнен правилами с сервера: если человек убрал все, они не вернутся сами.

   ЯЗЫК (владелец 21.11.2026: «нет перевода» — у него на украинском правила стояли по-русски). Правило с сервера,
   которое человек не менял, помнит свой номер (def) и показывается на языке интерфейса; изменённое и своё — как
   написано. Списки, заполненные до этого, узнаются по тексту на любом из языков (known) — без записи на телефон:
   чтение здесь идёт из отрисовки, а запись из отрисовки однажды уже закрутила экран (сборка 128). */

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

/** Номер правила с сервера: свой def или текст, совпавший с правилом на одном из языков (known — списки языков). */
function defOf(r, known) {
  if (Number.isInteger(r.def)) return r.def;
  for (const list of known) {
    const i = list.indexOf(r.text);
    if (i >= 0) return i;
  }
  return -1;
}

/** Правило на языке интерфейса: правило с сервера — из defaults, своё — как написано. */
function shown(r, defaults, known) {
  const i = defOf(r, known);
  return i >= 0 && defaults[i] ? { ...r, text: defaults[i] } : r;
}

/** Правила дома; в первый раз — из правил с сервера. defaults — тексты на языке интерфейса, known — на всех языках. */
export function list(defaults = [], known = []) {
  const s = state();
  if (s.seeded) return s.items.map((r) => shown(r, defaults, known));
  const items = defaults.map(clean).filter(Boolean).slice(0, MAX_RULES).map((text, def) => ({ id: newId(), text, def }));
  if (items.length) save(items);
  return items;
}

/** Дописать правило; пустое или сверх меры — null. */
export function add(text, defaults = [], known = []) {
  const value = clean(text);
  const items = list(defaults, known);
  if (!value || items.length >= MAX_RULES) return null;
  const rule = { id: newId(), text: value };
  save([...state().items, rule]);
  return rule;
}

/** Изменить правило; пустой текст или тот же, что на экране, — правило остаётся прежним (и на всех языках). */
export function update(id, text, defaults = [], known = []) {
  const value = clean(text);
  if (!value) return;
  const items = state().items;
  const r = items.find((x) => x.id === id);
  if (!r || shown(r, defaults, known).text === value) return;
  save(items.map((x) => {
    if (x.id !== id) return x;
    const { def, ...own } = x; // изменил — теперь это его слова, язык их не переводит
    return { ...own, text: value };
  }));
}

export function remove(id) {
  save(state().items.filter((r) => r.id !== id));
}
