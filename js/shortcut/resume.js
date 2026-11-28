import { read, writeQuiet } from '../core/store.js';

/* «ПРОДОЛЖИТЬ С ТОГО ЖЕ МЕСТА» (владелец 28.11.2026: «идея просто суперовая — открывается там, где остановился»).
   Запоминается последний раздел, который человек смотрел (кроме «Сегодня» и настроек): адрес, какие плашки и главы
   открыты (по порядку на странице) и докуда пролистано. Кнопка возвращает всё это: раздел, открытые главы, место.
   Хранится на этом телефоне тихо (writeQuiet) — без перерисовки экрана на каждое пролистывание. */
const KEY = 'resume';
const SKIP = new Set(['today', 'settings']);
let pending = null; // место, которое нужно вернуть после ближайшей отрисовки
let route = null; // раздел на экране сейчас; null — не запоминаем

export const place = () => read(KEY, null);
const view = () => document.getElementById('view');
const opened = () => [...(view()?.querySelectorAll('details') || [])].flatMap((d, i) => (d.open ? [i] : []));

function save(patch) {
  if (!route) return;
  const prev = place();
  const same = prev?.hash === location.hash;
  writeQuiet(KEY, { hash: location.hash, open: same ? prev.open : [], y: same ? prev.y : 0, ...patch });
}

let started = false;
/** Слушать раз и навсегда: раскрыл/свернул главу — запомнить, пролистал — запомнить место (не чаще раза в 0,4 с). */
function start() {
  if (started) return;
  started = true;
  // toggle не всплывает — ловим на перехвате; плашки вне экрана (шапка, листы) не считаются
  document.addEventListener('toggle', (e) => { if (view()?.contains(e.target)) save({ open: opened() }); }, true);
  let timer = 0;
  addEventListener('scroll', () => { clearTimeout(timer); timer = setTimeout(() => save({ y: Math.round(scrollY) }), 400); }, { passive: true });
}

/** После перехода на экран (не после каждой перерисовки): вернуть место, если его ждут, иначе — запомнить новый раздел. */
export function entered(name) {
  start();
  route = SKIP.has(name) ? null : name;
  if (pending?.hash === location.hash) {
    const p = pending;
    pending = null;
    // Экран уже нарисован (зовут после отрисовки). Открываем по порядку: раскрытая плашка может принести свои главы —
    // их номера идут следом
    for (const i of p.open || []) { const d = view()?.querySelectorAll('details')[i]; if (d) d.open = true; }
    const back = () => scrollTo({ top: p.y || 0 });
    back();
    setTimeout(back, 350); // картинки догрузились и сдвинули страницу — ещё раз на то же место
    return;
  }
  pending = null;
  if (route) save({});
}

/** Нажали «Продолжить»: false — запомненного места ещё нет. */
export function go() {
  const p = place();
  if (!p?.hash) return false;
  pending = p;
  if (location.hash === p.hash) entered(p.hash.replace(/^#\/?/, '').split('?')[0]);
  else location.hash = p.hash;
  return true;
}
