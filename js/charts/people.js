import { read, write } from '../core/store.js';

/* ЛЮДИ ДЛЯ КАРТ (владелец 26.11.2026): «один раз вносятся данные в программу»; плюс партнёр, партнёры по бизнесу, дети —
   «столько, сколько нужно», расчёты сохраняются. «Я» — из «Единой анкеты партнёра» (данные рождения), остальные — список
   на телефоне (ключ charts-people): { id, name, role, date, time, city: { text, tz } }. */
const KEY = 'charts-people';
export const ROLES = { partner: 'Партнёр', friend: 'Друг', business: 'Партнёр по бизнесу', family: 'Родные', child: 'Ребёнок', other: 'Другое' };
// Разделы людей (владелец 27.11.2026: «пара, друзья, бизнес, родные — как с ними взаимодействовать»)
export const GROUPS = { partner: 'Пара', friend: 'Друзья', business: 'Бизнес', family: 'Родные', child: 'Дети', other: 'Другие' };
/** Как называть совместимость с человеком этой роли: «пары», «в дружбе», «в бизнесе»… */
export const WITH = { partner: 'пары', friend: 'в дружбе', business: 'в бизнесе', family: 'с родными', child: 'с ребёнком', other: 'вместе' };

export const list = () => (Array.isArray(read(KEY, [])) ? read(KEY, []) : []);

export function add(p) {
  const item = { id: `p${Date.now().toString(36)}`, name: String(p.name || '').trim().slice(0, 40) || 'Без имени', role: ROLES[p.role] ? p.role : 'other', date: p.date || '', time: p.time || '', city: p.city || null };
  write(KEY, [...list(), item]);
  return item;
}

export const remove = (id) => write(KEY, list().filter((p) => p.id !== id));

/** Подпись данных над расчётом: «Имя · 26.10.1990 · 14:30 · Киев». */
export function caption(p) {
  const d = /^(\d{4})-(\d{2})-(\d{2})$/.exec(p.date || '');
  const city = p.city && typeof p.city === 'object' ? p.city.text : p.city;
  return `Считаем по данным: ${[p.name, d ? `${d[3]}.${d[2]}.${d[1]}` : 'дата не указана', p.time || null, city || null].filter(Boolean).join(' · ')}`;
}
