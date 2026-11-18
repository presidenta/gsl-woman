import { isOpen } from '../ui/sheet.js';

/* РАБОТНИК И ОБНОВЛЕНИЯ.

   Работник (sw.js) кладёт всё приложение в кэш — так оно открывается без интернета. Новая выкладка
   меняет номер в version.js; при открытии и при каждом возвращении в приложение браузер сверяет sw.js,
   и новая версия встаёт сама. Страницу перезагружаем, только когда женщина ничего не пишет: открыт
   лист записи — ждём, пока закроет, чтобы не потерять набранное. */

const UPDATED_FLAG = 'gsl-woman:just-updated';

export function register({ onUpdated }) {
  if (!('serviceWorker' in navigator)) return;
  // Работник живёт только на https и на localhost — на file:// и голом http браузер его не пустит
  if (!isSecureContext) return;

  try {
    if (sessionStorage.getItem(UPDATED_FLAG)) {
      sessionStorage.removeItem(UPDATED_FLAG);
      onUpdated?.();
    }
  } catch {
    // нет sessionStorage — просто без сообщения «обновлено»
  }

  const hadController = !!navigator.serviceWorker.controller;
  navigator.serviceWorker.register('./sw.js').then((reg) => {
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') reg.update().catch(() => {});
    });
  }).catch((err) => console.warn('Работник не встал:', err));

  // Первая установка тоже меняет controller — это не обновление, перезагружать незачем
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (!hadController) return;
    const reload = () => {
      try {
        sessionStorage.setItem(UPDATED_FLAG, '1');
      } catch {
        // без отметки: обновится молча
      }
      location.reload();
    };
    if (isOpen()) addEventListener('sheet-closed', reload, { once: true });
    else reload();
  });
}

/* «Обновить» в настройках (владелец 12.11.2026: «одно действие — чтобы подтягивало новую версию»; 13.11.2026: «пиши,
   какая именно у меня версия»). Номер версии спрашиваем у сайта напрямую (version.js?fresh — мимо офлайн-копии,
   sw.js его не кэширует) и сравниваем с тем, что работает сейчас. Затем просим браузер проверить работника:
   новый есть — он встаёт сам (skipWaiting), срабатывает controllerchange выше, страница перезагружается.
   Вернёт { result, mine, site }: result — 'updating' (ставится), 'latest' (уже последняя), 'newer' (на сайте
   новее, но раздача сайта ещё отдаёт прежние файлы — через пару минут), 'offline' (сайт недоступен). */
export async function checkNow() {
  const mine = String(globalThis.GSL_VERSION || '');
  let site = null;
  try {
    const res = await fetch(`./version.js?fresh=${Date.now()}`, { cache: 'no-store' });
    site = ((await res.text()).match(/GSL_VERSION\s*=\s*'([^']+)'/) || [])[1] || null;
  } catch {
    return { result: 'offline', mine, site };
  }
  if (!('serviceWorker' in navigator) || !isSecureContext) return { result: site && site !== mine ? 'newer' : 'latest', mine, site };
  const reg = await navigator.serviceWorker.getRegistration();
  try {
    await reg?.update();
  } catch {
    // работник не проверился — решаем по номеру ниже
  }
  if (reg && (reg.installing || reg.waiting)) return { result: 'updating', mine, site };
  return { result: site && site !== mine ? 'newer' : 'latest', mine, site };
}
