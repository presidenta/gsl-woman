import { h, svg } from '../core/dom.js';
import { t, plural } from '../core/i18n.js';
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

/** Кавычки внутри кавычек: «Где кнопка «повторить»?» → «Где кнопка „повторить“?» — по правилам русского письма. */
const quoteInner = (s) => s.replace(/«/g, '„').replace(/»/g, '“');

/**
 * id — что помнить; icon — значок шапки; title, lead — название и строка в свёрнутом виде; teaser — весёлая
 * фраза после названия через тире (карточка дня); keepLead — название видно и в раскрытом виде, крупно (карточка
 * задания: «Магия рук» стоит под подписью, а не в теле под значком); lead — строка или узел; status — узел справа
 * (идущий счёт); points — баллы дня за этот раздел (score/): больше нуля — раздел сделан: стрелка светится золотом,
 * после названия зелёным «+N балл» (владелец 14.11.2026, сборка 57); body — содержимое раздела; above — узел над подписью. Вернёт { node, thumb, isOpen() }: thumb — место
 * для рисунка в шапке; onToggle(open) зовётся при каждом раскрытии и сворачивании (и сразу при создании).
 */
export function foldCard({ id, cls = '', icon, title, teaser = '', lead = '', keepLead = false, status = null, points = 0, body = [], onToggle = null, above = null }) {
  let open = isOpen(id);
  const thumb = h('span', { class: 'fold__thumb', 'aria-hidden': 'true' });
  const inner = h('div', { class: 'fold__inner' }, ...body);
  const panel = h('div', { class: 'fold__body', id: `fold-${id}` }, inner);
  // Шапка — как плашка «В поиске» (владелец 15.11.2026: «столбиком»): слева значок в золотом круге (в свёрнутом
  // виде вместо него — рисунок, если он есть), справа столбиком подпись и название, стрелка справа
  const head = h('button', { type: 'button', class: 'fold__head', 'aria-controls': `fold-${id}` },
    h('span', { class: 'fold__mark', 'aria-hidden': 'true' }, thumb, h('span', { class: 'fold__badge' }, svg(icon, 'fold__icon'))),
    h('span', { class: 'fold__text' },
      // above — узел над подписью (гриф «Совершенно секретно» у главы «Секретных материалов», 22.11.2026)
      above,
      // Баллы — сразу за последним словом названия, в той же строке (владелец 15.11.2026: «далеко от текста»)
      h('span', { class: 'caps fold__title' }, title,
        // «ЗАДАНИЕ ДНЯ — «Это шутка или магия?»» (владелец 15.11.2026): фраза за подписью через тире, в кавычках
        teaser ? h('span', { class: 'fold__teaser' }, ` — «${quoteInner(teaser)}»`) : null,
        points > 0 ? h('span', { class: 'fold__plus' }, ` +${points} ${plural(points, 'plural.points')}`) : null),
      lead ? h('span', { class: `fold__lead${keepLead ? ' fold__lead--keep' : ''}` }, lead) : null,
    ),
    h('span', { class: 'fold__side' },
      status,
      h('span', { class: 'fold__arrow' }, svg(icons.chevronRight, 'fold__chevron')),
    ),
  );
  const node = h('section', { class: `card fold ${cls}${points > 0 ? ' is-done' : ''}`.trim() }, head, panel);

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
