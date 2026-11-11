import { STORAGE_PREFIX } from '../config.js';

/* ХРАНИЛИЩЕ: ключ → значение в localStorage, с подпиской на изменения.

   Почему localStorage, а не IndexedDB: данных мало (настройки и записи за полгода — десятки килобайт),
   а синхронное чтение делает экраны простыми — без ожидания перед каждой отрисовкой. Весь доступ к
   хранению идёт через этот файл: понадобится IndexedDB или сервер — меняется только он.

   localStorage бывает недоступен (приватное окно, запрет сайта, переполнение) и тогда бросает исключение.
   Приложение не должно падать из-за этого: при отказе значения живут в памяти до закрытия страницы. */

const memory = new Map();
const listeners = new Set();

function storage() {
  try {
    const s = globalThis.localStorage;
    if (!s) return null;
    const probe = STORAGE_PREFIX + '__probe';
    s.setItem(probe, '1');
    s.removeItem(probe);
    return s;
  } catch {
    return null;
  }
}

let backend = storage();

/** Прочитать значение; нет или испорчено — fallback. */
export function read(key, fallback = null) {
  const full = STORAGE_PREFIX + key;
  let raw = null;
  if (backend) {
    try {
      raw = backend.getItem(full);
    } catch {
      raw = null;
    }
  }
  if (raw === null && memory.has(full)) raw = memory.get(full);
  if (raw === null) return fallback;
  try {
    return JSON.parse(raw);
  } catch {
    return fallback;
  }
}

/** Записать значение и сообщить подписчикам, какой ключ изменился. */
export function write(key, value) {
  const full = STORAGE_PREFIX + key;
  const raw = JSON.stringify(value);
  memory.set(full, raw);
  if (backend) {
    try {
      backend.setItem(full, raw);
    } catch {
      // Переполнено или запрещено: значение остаётся в памяти, страница работает дальше
    }
  }
  emit(key);
}

/** Удалить один ключ. */
export function remove(key) {
  const full = STORAGE_PREFIX + key;
  memory.delete(full);
  if (backend) {
    try {
      backend.removeItem(full);
    } catch {
      // нечего делать: в памяти уже удалено
    }
  }
  emit(key);
}

/** Стереть всё СВОЁ (только с нашей приставкой — у соседей по адресу свои данные). */
export function clearAll() {
  for (const k of [...memory.keys()]) if (k.startsWith(STORAGE_PREFIX)) memory.delete(k);
  if (backend) {
    try {
      const mine = [];
      for (let i = 0; i < backend.length; i++) {
        const k = backend.key(i);
        if (k && k.startsWith(STORAGE_PREFIX)) mine.push(k);
      }
      mine.forEach((k) => backend.removeItem(k));
    } catch {
      // хранилище недоступно — в памяти уже чисто
    }
  }
  emit('*');
}

/** Подписка на изменения: fn(key). Возвращает отписку. */
export function subscribe(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

function emit(key) {
  listeners.forEach((fn) => {
    try {
      fn(key);
    } catch (err) {
      console.error(err);
    }
  });
}

/** Только для тестов: подменить хранилище (в node его нет). */
export function _useBackend(fake) {
  backend = fake;
  memory.clear();
}
