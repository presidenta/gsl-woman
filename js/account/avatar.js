import { h, svg } from '../core/dom.js';
import { read, write, remove } from '../core/store.js';
import { t } from '../core/i18n.js';
import { icons } from '../ui/icons.js';
import { toast } from '../ui/toast.js';
import * as media from '../media/photos.js';
import { current } from './session.js';

/* ФОТО ПРОФИЛЯ — своё у GSL Woman, как у спорта своё (владелец про спорт: «это всё-таки разные
   приложения»). Снимок — в js/media/ под номером avatar, ужат до 512 точек; в хранилище — только
   отметка, что фото есть (ключ avatar), чтобы шапка знала об этом сразу, без ожидания базы.
   Нет фото — первая буква имени на золоте. */

const KEY = 'avatar';

export const hasPhoto = () => !!read(KEY, null);

/** Кружок: фото или первая буква. size — класс размера: sm (шапка), lg (настройки). */
export function avatar(size = 'sm') {
  const name = current()?.displayName || '';
  const letter = (name.trim().charAt(0) || '·').toUpperCase();
  const node = h('span', { class: `avatar avatar--${size}`, 'aria-hidden': 'true' }, h('span', { class: 'avatar__letter' }, letter));
  if (hasPhoto()) {
    const img = h('img', { class: 'avatar__img', alt: '', decoding: 'async' });
    const show = (u) => { if (u) { img.src = u; node.append(img); } };
    const cached = media.cachedUrl(media.AVATAR_ID);
    if (cached) show(cached);
    else media.url(media.AVATAR_ID).then(show);
  }
  return node;
}

/** Выбрать фото (камера или галерея) и поставить. */
export function pickPhoto() {
  const input = h('input', { type: 'file', accept: 'image/*', hidden: true });
  input.addEventListener('change', async () => {
    const file = input.files[0];
    input.remove();
    if (!file) return;
    try {
      await media.save(file, { id: media.AVATAR_ID, max: 512 });
      write(KEY, { at: Date.now() });   // перерисует шапку и настройки
    } catch {
      toast({ title: t('photos.failed') });
    }
  });
  document.body.append(input);
  input.click();
}

export async function clearPhoto() {
  await media.remove(media.AVATAR_ID);
  remove(KEY);
}

/** Кто вошёл — для шапки: кружок, имя, «Кабинет № N». Нажатие — в настройки. */
export function identity() {
  const a = current();
  if (!a) return null;
  return h('a', { class: 'identity', href: '#/settings', 'aria-label': t('settings.account') },
    avatar('sm'),
    h('span', { class: 'identity__who' },
      h('span', { class: 'identity__name' }, a.displayName || t('app.name')),
      a.accountNo ? h('span', { class: 'identity__no' }, t('settings.cabinet', { n: a.accountNo })) : null,
    ),
  );
}

/** Карточка «Аккаунт» в настройках: большое фото, имя, кабинет, «Выйти».
    Фотоаппарат на кружке — только пока фото нет (владелец 12.11.2026: значок перекрывал фотографию).
    Фото есть — кружок чистый, нажатие на него меняет фото, а под кабинетом тонкая строка
    «📷 Сменить фото · Убрать», как в кабинетах дорогих сервисов. */
export function accountCard({ onLogout, update = null }) {
  const a = current();
  if (!a) return null;
  const has = hasPhoto();
  const photo = h('button', { type: 'button', class: 'account__photo', 'aria-label': t('photos.profile'), onclick: pickPhoto },
    avatar('lg'),
    has ? null : h('span', { class: 'account__cam' }, svg(icons.camera)),
  );
  const out = h('button', { type: 'button', class: 'icon-btn account__icon', 'aria-label': t('settings.logout'), title: t('settings.logout') }, svg(icons.logout));
  out.addEventListener('click', () => {
    if (!confirm(t('settings.logoutConfirm'))) return;
    onLogout();
  });
  const dropPhoto = has
    ? h('div', { class: 'account__links' },
      h('button', { type: 'button', class: 'account__link account__link--change', onclick: pickPhoto },
        svg(icons.camera, 'account__link-icon'), t('photos.profileChange')),
      h('span', { class: 'account__dot', 'aria-hidden': 'true' }, '·'),
      h('button', { type: 'button', class: 'account__link', onclick: () => clearPhoto() }, t('photos.profileRemoveShort')),
    )
    : h('div', { class: 'account__links' }, h('button', { type: 'button', class: 'account__link', onclick: pickPhoto }, t('photos.profileAdd')));

  return h('section', { class: 'card account' },
    h('div', { class: 'account__glow', 'aria-hidden': 'true' }),
    photo,
    h('div', { class: 'account__who' },
      h('strong', { class: 'account__name' }, a.displayName || '—'),
      a.accountNo ? h('span', { class: 'account__no' }, t('settings.cabinet', { n: a.accountNo })) : null,
    ),
    // Ссылки про фото — своим рядом сетки под именем: тянутся и под значками справа, не переносятся
    dropPhoto,
    // «Обновить» и «Выйти» — два маленьких круглых значка в правом верхнем углу карточки, как в кабинетах дорогих
    // сервисов (владелец 12.11.2026: «маленькие кнопочки: обновить — кружочек, выйти — дверь со стрелочкой»)
    h('div', { class: 'account__actions' }, update, out),
  );
}
