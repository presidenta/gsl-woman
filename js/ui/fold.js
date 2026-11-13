import { h, svg } from '../core/dom.js';
import { t } from '../core/i18n.js';
import { read, write } from '../core/store.js';
import { icons } from './icons.js';

/* СВОРАЧИВАЕМАЯ КАРТОЧКА (владелец 13.11.2026: «стрелочка вниз сворачивает весь раздел; свёрнут — стоит только
   стакан, сбоку короткий текст; нажал стрелочку — всё развернулось, выполнил, закрыл»).

   Свёрнута: слева маленький рисунок (стакан, фигура), рядом название и одна строка, справа отметка «сделано» и
   стрелка. Развёрнута: название остаётся шапкой, ниже — весь раздел. Нажатие на шапку раскрывает и сворачивает;
   движение — по высоте, плавно. По умолчанию свёрнута. Что раскрыто — помнит этот телефон (ключ fold): это вид,
   а не данные, на сервер не уходит.

   Рисунок в шапке и в разделе — ОДИН И ТОТ ЖЕ узел: в стакане и фигуре свои id градиентов, две копии на странице
   спутали бы заливки. Карточка сама переносит его — onToggle(open) получает, куда положить: thumb или раздел. */

const KEY = 'fold';

function saved() {
  const s = read(KEY, {});
  return s && typeof s === 'object' ? s : {};
}

export const isOpen = (id) => saved()[id] === true;

function remember(id, open) {
  const s = { ...saved() };
  if (open) s[id] = true;
  else delete s[id];
  write(KEY, s);
}

/**
 * id — что помнить; icon — значок шапки; title, lead — название и строка в свёрнутом виде; status — узел справа
 * (отметка «сделано», идущий счёт); body — содержимое раздела. Вернёт { node, thumb, isOpen() }: thumb — место
 * для рисунка в шапке; onToggle(open) зовётся при каждом раскрытии и сворачивании (и сразу при создании).
 */
export function foldCard({ id, cls = '', icon, title, lead = '', status = null, body = [], onToggle = null }) {
  let open = isOpen(id);
  const thumb = h('span', { class: 'fold__thumb', 'aria-hidden': 'true' });
  const inner = h('div', { class: 'fold__inner' }, ...body);
  const panel = h('div', { class: 'fold__body', id: `fold-${id}` }, inner);
  const head = h('button', { type: 'button', class: 'fold__head', 'aria-controls': `fold-${id}` },
    thumb,
    h('span', { class: 'fold__text' },
      h('span', { class: 'fold__eyebrow' }, svg(icon, 'fold__icon'), h('span', { class: 'caps' }, title)),
      lead ? h('span', { class: 'fold__lead' }, lead) : null,
    ),
    h('span', { class: 'fold__side' },
      status,
      h('span', { class: 'fold__arrow' }, svg(icons.chevronRight, 'fold__chevron')),
    ),
  );
  const node = h('section', { class: `card fold ${cls}`.trim() }, head, panel);

  function apply() {
    node.classList.toggle('is-open', open);
    head.setAttribute('aria-expanded', String(open));
    head.setAttribute('aria-label', `${title}: ${open ? t('fold.close') : t('fold.open')}`);
    inner.inert = !open;
    onToggle?.(open);
  }

  head.addEventListener('click', () => {
    open = !open;
    remember(id, open);
    apply();
  });
  queueMicrotask(apply);
  return { node, thumb, isOpen: () => open };
}
