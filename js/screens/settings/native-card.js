import { h, svg } from '../../core/dom.js';
import { t } from '../../core/i18n.js';
import { SLOTS } from '../../config.js';
import { icons } from '../../ui/icons.js';
import { toast } from '../../ui/toast.js';
import { switchRow } from '../../ui/controls.js';
import * as settings from '../../settings/settings.js';
import { isApp, call, APK_URL } from '../../native/native.js';

/* НАСТРОЙКИ → «ВИДЖЕТ И БУДИЛЬНИК» (владелец 13.11.2026). В приложении для Android:
   - что разрешено телефоном — уведомления, точные будильники, будильник поверх экрана — и кнопка «Включить» там,
     где выключено (ведёт прямо на нужный экран настроек телефона);
   - для утра, обеда и вечера — «будильником на весь экран» или обычным уведомлением;
   - «Добавить виджет на экран».
   В браузере — чем хорошо приложение и ссылка на него. */

function statusRow(ok, title, onFix) {
  return h('div', { class: 'native-row' },
    h('span', { class: `native-row__mark${ok ? ' is-ok' : ''}` }, ok ? svg(icons.check) : '!'),
    h('span', { class: 'native-row__title' }, title),
    ok ? null : h('button', { type: 'button', class: 'native-row__fix', onclick: onFix }, t('native.enable')),
  );
}

export function nativeCard() {
  const card = h('section', { class: 'card settings__section native-card' },
    h('h2', { class: 'caps settings__heading' }, t('native.title')));

  if (!isApp()) {
    card.append(
      h('p', { class: 'card__text' }, t('native.webText')),
      h('a', { class: 'btn btn--gold btn--block native-card__get', href: APK_URL }, t('native.get')),
      h('p', { class: 'faint native-card__hint' }, t('native.getHint')),
    );
    return card;
  }

  const s = settings.get();
  const alarms = { morning: true, noon: false, evening: false, ...(s.alarms || {}) };
  const statusBox = h('div', { class: 'native-status' }, h('p', { class: 'faint' }, '…'));
  const widgetBtn = h('button', { type: 'button', class: 'btn btn--gold btn--block' }, svg(icons.plus), t('native.addWidget'));
  const widgetHint = h('p', { class: 'faint native-card__hint' }, t('native.widgetHint'));

  async function paint() {
    const st = (await call('status')) || {};
    statusBox.replaceChildren(
      statusRow(!!st.notifications, t('native.notifications'), async () => {
        const r = await call('requestNotifications');
        if (!r?.granted) await call('openSettings', { what: 'notifications' });
        setTimeout(paint, 800);
      }),
      statusRow(!!st.exact, t('native.exact'), () => call('openSettings', { what: 'exact' })),
      statusRow(!!st.fullScreen, t('native.fullScreen'), () => call('openSettings', { what: 'fullScreen' })),
    );
    if (st.widgets) widgetHint.textContent = t('native.widgetPlaced', { n: st.widgets });
  }

  widgetBtn.addEventListener('click', async () => {
    const r = await call('pinWidget');
    if (!r?.requested) toast({ title: t('native.widgetManual'), ms: 9000 });
  });

  // Вернулась из настроек телефона — обновить отметки
  document.addEventListener('visibilitychange', () => document.visibilityState === 'visible' && card.isConnected && paint());
  paint();

  card.append(
    h('p', { class: 'card__text' }, t('native.appText')),
    statusBox,
    h('h3', { class: 'native-card__sub' }, t('native.alarmTitle')),
    h('p', { class: 'faint native-card__hint' }, t('native.alarmHint')),
    ...SLOTS.map((slot) => switchRow({
      title: `${t(`settings.${slot}`)} · ${s.times[slot]}`,
      hint: t('native.alarmRow'),
      checked: !!alarms[slot],
      onChange: (on) => settings.update({ alarms: { ...alarms, [slot]: on } }),
    })),
    h('h3', { class: 'native-card__sub' }, t('native.widgetTitle')),
    widgetBtn,
    widgetHint,
  );
  return card;
}
