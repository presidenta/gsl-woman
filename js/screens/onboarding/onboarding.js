import { h, svg } from '../../core/dom.js';
import { t } from '../../core/i18n.js';
import { isoDate, isValidIso } from '../../core/dates.js';
import * as settings from '../../settings/settings.js';
import { current as currentAccount } from '../../account/session.js';
import * as permission from '../../reminders/permission.js';
import { field } from '../../ui/controls.js';
import { icons } from '../../ui/icons.js';
import { brand } from '../../ui/brand.js';
import { timeFields } from '../settings/settings.js';

/* ПЕРВЫЙ ВХОД: одна страница без нижней панели — имя, дата старта, время напоминаний. Язык — в настройках.
   «Начать путь» сохраняет всё и тут же просит разрешение на уведомления: окно разрешения браузер
   показывает только в ответ на нажатие, и это самый понятный для женщины момент — она сама начинает. */

export function render(view, { onDone }) {
  const s = settings.get();
  // Имя — из аккаунта «Кванта», первым словом: «как к тебе обращаться», а не полное имя
  const accountName = (currentAccount()?.displayName || '').trim().split(/\s+/)[0] || '';
  const draft = { lang: s.lang, name: s.name || accountName, startDate: s.startDate || isoDate(), times: { ...s.times } };

  const name = field({ label: t('onboarding.nameLabel'), placeholder: t('settings.namePh'), value: draft.name, maxlength: 40, autocomplete: 'given-name' });
  const start = field({ label: t('onboarding.startLabel'), hint: t('settings.startHint'), type: 'date', value: draft.startDate });

  const begin = h('button', { type: 'button', class: 'btn btn--gold btn--block onboarding__begin' }, t('onboarding.begin'), svg(icons.chevronRight));
  begin.addEventListener('click', async () => {
    settings.update({
      onboarded: true,
      lang: draft.lang,
      name: name.control.value.trim(),
      startDate: isValidIso(start.control.value) ? start.control.value : isoDate(),
      times: draft.times,
    });
    if (permission.state() === 'default') await permission.request();
    onDone();
  });

  view.append(
    h('div', { class: 'onboarding' },
      h('div', { class: 'onboarding__mark' }, svg(icons.sparkle)),
      h('p', { class: 'caps onboarding__eyebrow' }, t('onboarding.eyebrow')),
      h('h1', { class: 'onboarding__brand gold-text' }, brand()),
      h('p', { class: 'onboarding__tagline' }, t('app.tagline')),
      h('p', { class: 'onboarding__lead' }, t('onboarding.lead')),

      h('section', { class: 'card onboarding__form' },
        name.node,
        start.node,
        h('div', { class: 'field' },
          h('span', { class: 'field__label' }, t('onboarding.timesLabel')),
          timeFields(draft.times, (slot, value) => { draft.times[slot] = value; }),
          h('p', { class: 'field__hint' }, t('settings.timesHint')),
        ),
      ),
      begin,
    ),
  );
}
