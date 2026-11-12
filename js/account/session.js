import { read, write, remove } from '../core/store.js';
import { API_BASE } from '../config.js';
import * as access from '../access/access.js';

/* ВХОД АККАУНТОМ «КВАНТА». Своих пользователей и паролей у GSL Woman нет: логин и пароль — те же, что
   в «Кванте» (почта или номер кабинета), сессию выдаёт его сервер. Кабинет выдаёт администратор
   «Кванта», регистрации здесь нет.

   Сессия лежит в хранилище приложения (ключ account). Выход и истёкшая сессия стирают только её —
   записи женщины остаются на телефоне. */

const KEY = 'account';

/** Отказ сервера или сети; code — что именно (network, invalid_credentials, access_expired…). */
export class ApiError extends Error {
  constructor(code, status) {
    super(code);
    this.code = code;
    this.status = status;
  }
}

/** Сессия вошедшей: { token, userId, displayName, accountNo, role } или null. role: admin — администратор «Кванта». */
export function current() {
  return read(KEY, null);
}

/** Запрос к серверу «Кванта». body есть — POST с JSON, нет — GET. */
export async function request(path, { body, token = current()?.token } = {}) {
  let res;
  try {
    res = await fetch(API_BASE + path, {
      method: body === undefined ? 'GET' : 'POST',
      headers: {
        ...(body === undefined ? {} : { 'Content-Type': 'application/json' }),
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: body === undefined ? undefined : JSON.stringify(body),
      cache: 'no-store',
    });
  } catch {
    throw new ApiError('network', 0);
  }
  if (res.status === 204) return null;
  const data = await res.json().catch(() => null);
  if (!res.ok) throw new ApiError(data?.error || 'other', res.status);
  return data;
}

/** Доступ к GSL Woman+ закрыт администратором или вышел его срок (access_expired) — это закрытие
    приложения (../access/), а не конец сессии: войти заново тут не поможет, записи остаются. */
export const isClosed = (err) => err instanceof ApiError && err.code === 'access_expired';

/** Сервер больше не принимает сессию: вышла из аккаунта на другом устройстве или блок — нужен вход. */
export const isExpired = (err) => err instanceof ApiError && (err.status === 401 || err.status === 403) && !isClosed(err);

// Профиль со сроком именно этого приложения (сервер, access/apps.js)
const ME = '/api/me?app=gsl-woman';

/** Вход логином и паролем «Кванта». Имя и номер кабинета берём сразу — для карточки в настройках. */
export async function login(loginName, password) {
  // app — сервер проверяет доступ к GSL Woman+, а не к «Кванту»
  const { token, userId } = await request('/api/session/login', { body: { login: loginName, password, app: 'gsl-woman' }, token: null });
  const me = await request(ME, { token }).catch(() => null);
  if (me && 'accessUntil' in me) access.remember(me.accessUntil);
  const session = { token, userId, displayName: me?.displayName || '', accountNo: me?.accountNo || null, role: me?.role || 'member' };
  write(KEY, session);
  return session;
}

/** Вход без пароля: «Квант» открыл приложение с одноразовым пропуском (#kvant=…). */
export async function redeem(code) {
  const s = await request('/api/woman/redeem', { body: { code }, token: null });
  const session = { token: s.token, userId: s.userId, displayName: s.displayName || '', accountNo: s.accountNo || null };
  write(KEY, session);
  const me = await request(ME, { token: s.token }).catch(() => null);
  if (me && 'accessUntil' in me) access.remember(me.accessUntil);
  return session;
}

/** Имя, роль и срок доступа могли поменять у администратора — сверяем при каждом открытии с сетью.
    Сервер закрыл доступ — приложение закрывается (access.close); прислал срок — запоминаем его. */
export async function refreshProfile() {
  const s = current();
  if (!s) return;
  let me = null;
  try {
    me = await request(ME);
  } catch (err) {
    if (isClosed(err) && current()?.token === s.token) access.close();
    return;
  }
  if (!me || current()?.token !== s.token) return;
  if ('accessUntil' in me) access.remember(me.accessUntil);
  if (me.displayName === s.displayName && me.accountNo === s.accountNo && (me.role || 'member') === s.role) return;
  write(KEY, { ...s, displayName: me.displayName || s.displayName, accountNo: me.accountNo || s.accountNo, role: me.role || 'member' });
}

/** Выйти: сессия закрывается и на сервере (нет сети — всё равно выходим здесь). */
export async function logout() {
  const s = current();
  remove(KEY);
  access.forget();
  if (s) await request('/api/session/logout', { body: {}, token: s.token }).catch(() => {});
}

/** Сервер сессию уже не принимает — просто забыть её здесь. */
export function forget() {
  remove(KEY);
  access.forget();
}
