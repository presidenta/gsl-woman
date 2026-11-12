import { read, write, remove } from '../core/store.js';
import { API_BASE } from '../config.js';

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

/** Сессия вошедшей: { token, userId, displayName, accountNo } или null. */
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

/** Сервер больше не пускает: вышла из аккаунта на другом устройстве, блок, срок кабинета (401) или
    нет доступа к этому направлению (403 — когда администратор начнёт выдавать доступ отдельно). */
export const isExpired = (err) => err instanceof ApiError && (err.status === 401 || err.status === 403);

/** Вход логином и паролем «Кванта». Имя и номер кабинета берём сразу — для карточки в настройках. */
export async function login(loginName, password) {
  const { token, userId } = await request('/api/session/login', { body: { login: loginName, password }, token: null });
  const me = await request('/api/me', { token }).catch(() => null);
  const session = { token, userId, displayName: me?.displayName || '', accountNo: me?.accountNo || null };
  write(KEY, session);
  return session;
}

/** Вход без пароля: «Квант» открыл приложение с одноразовым пропуском (#kvant=…). */
export async function redeem(code) {
  const s = await request('/api/woman/redeem', { body: { code }, token: null });
  const session = { token: s.token, userId: s.userId, displayName: s.displayName || '', accountNo: s.accountNo || null };
  write(KEY, session);
  return session;
}

/** Имя могли поправить у администратора — сверяем при каждом открытии с сетью. */
export async function refreshProfile() {
  const s = current();
  if (!s) return;
  const me = await request('/api/me').catch(() => null);
  if (!me || current()?.token !== s.token) return;
  if (me.displayName === s.displayName && me.accountNo === s.accountNo) return;
  write(KEY, { ...s, displayName: me.displayName || s.displayName, accountNo: me.accountNo || s.accountNo });
}

/** Выйти: сессия закрывается и на сервере (нет сети — всё равно выходим здесь). */
export async function logout() {
  const s = current();
  remove(KEY);
  if (s) await request('/api/session/logout', { body: {}, token: s.token }).catch(() => {});
}

/** Сервер сессию уже не принимает — просто забыть её здесь. */
export function forget() {
  remove(KEY);
}
