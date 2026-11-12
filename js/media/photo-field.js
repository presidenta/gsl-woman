import { h, svg } from '../core/dom.js';
import { t } from '../core/i18n.js';
import { icons } from '../ui/icons.js';
import { toast } from '../ui/toast.js';
import * as photos from './photos.js';
import { openViewer } from './viewer.js';

/* ПОЛЕ «ФОТО» в форме записи: ряд квадратных снимков в золотой рамке и плитка «+».
   Нажатие на «+» открывает выбор телефона — камера или галерея, можно несколько сразу.
   Снимок ужимается и ложится в базу сразу, а в запись попадает только по «Сохранить»; не сохранила —
   лишнее уберёт photos.prune() (main.js). Нажатие на снимок — во весь экран, крестик — убрать из записи.

   photoField({ ids, onChange }) → узел; onChange(ids) — при каждом изменении набора. */

export function photoField({ ids = [], onChange }) {
  let list = [...ids];
  const input = h('input', { type: 'file', accept: 'image/*', multiple: true, hidden: true });
  const grid = h('div', { class: 'photo-grid' });
  const count = h('span', { class: 'photo-field__count' });

  function thumb(id) {
    const img = h('img', { class: 'photo-thumb__img', alt: '', decoding: 'async' });
    const cached = photos.cachedUrl(id);
    if (cached) img.src = cached;
    else photos.url(id).then((u) => { if (u) img.src = u; });
    const open = h('button', {
      type: 'button',
      class: 'photo-thumb__open',
      'aria-label': t('photos.open'),
      onclick: () => openViewer(list, list.indexOf(id)),
    }, img);
    const drop = h('button', {
      type: 'button',
      class: 'photo-thumb__drop',
      'aria-label': t('photos.remove'),
      onclick: () => { list = list.filter((x) => x !== id); paint(); onChange(list); },
    }, svg(icons.close));
    return h('div', { class: 'photo-thumb' }, open, drop);
  }

  function paint() {
    const cells = list.map(thumb);
    if (list.length < photos.MAX_PER_ENTRY) {
      cells.push(h('button', {
        type: 'button',
        class: 'photo-add',
        onclick: () => input.click(),
      }, svg(icons.camera), h('span', {}, t('photos.add'))));
    }
    grid.replaceChildren(...cells);
    count.textContent = list.length ? `${list.length} / ${photos.MAX_PER_ENTRY}` : '';
  }

  input.addEventListener('change', async () => {
    const files = [...input.files].slice(0, photos.MAX_PER_ENTRY - list.length);
    input.value = '';
    if (!files.length) return;
    grid.classList.add('is-busy');
    for (const file of files) {
      try {
        list = [...list, await photos.save(file)];
        paint();
      } catch {
        toast({ title: t('photos.failed') });
      }
    }
    grid.classList.remove('is-busy');
    onChange(list);
  });

  paint();
  return h('div', { class: 'field photo-field' },
    h('div', { class: 'photo-field__head' },
      h('span', { class: 'field__label' }, t('photos.label')),
      count,
    ),
    grid,
    input,
  );
}

/** Ряд маленьких снимков для карточки записи — только посмотреть, без нажатий. */
export function photoStrip(ids = []) {
  if (!ids.length) return null;
  return h('div', { class: 'photo-strip' }, ...ids.slice(0, 4).map((id, i) => {
    const img = h('img', { alt: '', decoding: 'async' });
    const cached = photos.cachedUrl(id);
    if (cached) img.src = cached;
    else photos.url(id).then((u) => { if (u) img.src = u; });
    const more = i === 3 && ids.length > 4 ? h('span', { class: 'photo-strip__more' }, `+${ids.length - 3}`) : null;
    return h('span', { class: 'photo-strip__cell' }, img, more);
  }));
}
