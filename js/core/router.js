/* МАРШРУТЫ: #/today, #/week, #/journal, #/path, #/settings.

   Адрес через решётку работает на GitHub Pages без настроек сервера и из уведомления: нажатие на
   напоминание открывает нужный экран по его target («#/today»). Системная «назад» на телефоне
   возвращает на прошлый экран сама — история браузера ведётся по решётке. */

const routes = new Map();
let current = null;
let onChange = () => {};

export function define(name, screen) {
  routes.set(name, screen);
}

export function routeName() {
  const name = (location.hash.replace(/^#\/?/, '').split('?')[0] || 'today').trim();
  return routes.has(name) ? name : 'today';
}

export function go(name) {
  const target = `#/${name}`;
  if (location.hash === target) onChange(routeName());
  else location.hash = target;
}

export function currentRoute() {
  return current;
}

/** Запустить: fn(name, screen) зовётся при каждом переходе. */
export function start(fn) {
  onChange = (name) => {
    current = name;
    fn(name, routes.get(name));
  };
  addEventListener('hashchange', () => onChange(routeName()));
  onChange(routeName());
}
