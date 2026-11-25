import { h, svg } from '../core/dom.js';
import { icons } from '../ui/icons.js';
import { toast } from '../ui/toast.js';
import { isApp } from '../native/native.js';
import * as push from '../push/push.js';
import { isIOS, standalone, requestOffer, offerIfRequested } from '../install/install.js';
import * as permission from './permission.js';
import { rt } from './texts.js';
import { kick } from './server.js';

/* КРАСНАЯ ПЛАШКА «НАПОМИНАНИЯ СО ЗВУКОМ» на «Сегодня» (владелец 25.11.2026: «напоминания не приходят… чтобы
   бросалось в глаза красным»). Видна, только пока напоминания можно включить одним шагом, а они выключены:
   - iPhone в Safari (сайт без значка на экране «Домой»): там уведомлений нет вовсе — подсказка, как поставить
     значок, кнопка открывает лист «Значок на экран»;
   - разрешение ещё не спрашивали: кнопка «Включить напоминания» (браузер, iPhone со значка). Спросить можно только
     по нажатию — так требует iPhone.
   Разрешили — плашка исчезает. Запретили — молчит: включить можно только в настройках телефона, и об этом говорит
   раздел «Уведомления». В APK для Android напоминания ставит сам телефон (native/) — плашки нет. */

/** Что показать: 'ios' | 'ask' | null. */
export function nudgeKind() {
  if (isApp()) return null;
  if (isIOS() && !standalone() && permission.state() === 'unsupported') return 'ios';
  if (permission.state() === 'default' && push.supported()) return 'ask';
  return null;
}

export function remindNudge(ctx, { onAllowed = kick } = {}) {
  const kind = nudgeKind();
  if (!kind) return null;
  const btn = kind === 'ios'
    ? h('button', { type: 'button', class: 'btn btn--danger btn--block remind-nudge__btn', onclick: () => { requestOffer(); offerIfRequested(); } },
      svg(icons.phoneIcon), rt('iosBtn'))
    : h('button', {
      type: 'button',
      class: 'btn btn--danger btn--block remind-nudge__btn',
      onclick: async () => {
        const answer = await permission.request();
        if (answer === 'granted') {
          toast({ title: rt('toast'), tone: 'alert' });
          await onAllowed?.();
        }
        ctx.rerender();
      },
    }, svg(icons.bell), rt('askBtn'));
  return h('section', { class: 'card remind-nudge', role: 'alert' },
    h('h2', { class: 'remind-nudge__title' }, svg(icons.bell, 'remind-nudge__icon'), rt('title')),
    h('p', { class: 'remind-nudge__text' }, kind === 'ios' ? rt('ios') : rt('ask')),
    btn,
  );
}
