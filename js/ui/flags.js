import { h } from '../core/dom.js';
import { t } from '../core/i18n.js';
import { verdictOf } from '../meet/meet.js';

/* ФЛАГИ И ИТОГ — один вид в «Помощи» (папки вопросов) и в «Знакомстве» (три темы), владелец 15.11.2026: «чтобы
   везде было одинаково… не надо по два раза дублировать». Галочка стоит прямо у зелёного или красного сигнала,
   под всеми сигналами — один итог: сколько зелёных и красных и подсказка (meet.verdictOf). Вид —
   styles/components/flags.css. */

/** Строка сигнала с галочкой: color — 'green' | 'red'; value — что сохранить (если сохраняем). */
export function flagRow(color, text, { value = '', onChange } = {}) {
  const box = h('input', { type: 'checkbox', class: 'flag__box', value });
  box.dataset.color = color;
  if (onChange) box.addEventListener('change', onChange);
  return h('label', { class: `flag flag--${color}` }, box, h('span', {}, text));
}

/** Отмеченные галочки внутри root: { green: [value], red: [value] }. */
export function picked(root) {
  const boxes = [...root.querySelectorAll('.flag__box:checked')];
  const of = (color) => boxes.filter((b) => b.dataset.color === color).map((b) => b.value);
  return { green: of('green'), red: of('red') };
}

/** Итог: paint(green, red) — пересчитать; verdicts — слова подсказки своей части (с сервера). */
export function flagTotal(verdicts) {
  const node = h('div', { class: 'flags-total' });
  function paint(green, red) {
    const verdict = verdictOf(Array(green).fill('g'), Array(red).fill('r'));
    node.className = `flags-total${verdict ? ` flags-total--${verdict}` : ''}`;
    node.replaceChildren(
      h('p', { class: 'caps flags-total__title' }, t('help.total')),
      h('p', { class: 'flags-total__counts' },
        h('span', { class: 'flags-total__green' }, `${t('help.greenCount')}: ${green}`), ' · ',
        h('span', { class: 'flags-total__red' }, `${t('help.redCount')}: ${red}`)),
      verdict
        ? h('div', {},
          h('p', { class: 'flags-total__verdict' }, t(`meet.verdict.${verdict}`)),
          verdicts?.[verdict] ? h('p', { class: 'card__text' }, verdicts[verdict]) : null,
          h('p', { class: 'faint' }, t('help.verdictNote')))
        : h('p', { class: 'faint' }, t('help.totalEmpty')),
    );
  }
  paint(0, 0);
  return { node, paint };
}
