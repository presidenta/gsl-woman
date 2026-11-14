import { read } from './core/store.js';

/* ТОЧКА ВХОДА: взрослое приложение (main.js) или детский кабинет (kids/kid-app.js, владелец 14.11.2026).

   Детский — когда на телефоне уже вошёл ребёнок (ключ kid) или пришла ссылка от родителя #kid=КОД. Иначе — всё как
   было: main.js. Взрослый вход и детский хранятся в разных ключах и друг друга не трогают. */

const linked = /(?:^|[#&/])kid=/.test(location.hash);

if (linked || read('kid', null)) {
  const [{ start }, store] = await Promise.all([import('./kids/kid-app.js'), import('./kids/kid-store.js')]);
  const code = store.takeLink() || store.session()?.code || '';
  start(document.getElementById('app'), code);
} else {
  await import('./main.js');
}
