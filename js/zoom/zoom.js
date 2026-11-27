import { h, svg } from '../core/dom.js';
import { icons } from '../ui/icons.js';
import { t } from '../core/i18n.js';

/* КАРТИНКА НА ВЕСЬ ЭКРАН С УВЕЛИЧЕНИЕМ (общий модуль с 235; до этого жил в квесте): openZoom(node) — node это <img>
   или <svg> (рисунок матрицы). Два пальца — растянуть (до 4 раз), один — двигать увеличенную, двойное касание —
   увеличить или вернуть; колёсико мыши — тоже. Закрывается крестиком, Esc или касанием мимо картинки.
   В окне приложения масштаб страницы выключен, поэтому мелкое (цифры на круге возрастов) читают здесь. */
const MAX_SCALE = 4;

export function openZoom(node, hintText = t('quest.zoomHint')) {
  const before = document.activeElement;
  const img = node;
  img.classList.add('zoom__img');
  const close = h('button', { type: 'button', class: 'zoom__close', 'aria-label': t('common.close') }, svg(icons.close));
  const hint = h('p', { class: 'zoom__hint' }, hintText);
  const root = h('div', { class: 'zoom', role: 'dialog', 'aria-modal': 'true', tabindex: '-1' }, img, close, hint);

  let scale = 1, x = 0, y = 0;
  const pts = new Map();
  let start = null;
  let lastTap = 0;

  const clampPan = () => {
    const r = img.getBoundingClientRect();
    const w = r.width / scale, hgt = r.height / scale;
    const maxX = Math.max(0, (w * scale - window.innerWidth) / 2 + 24);
    const maxY = Math.max(0, (hgt * scale - window.innerHeight) / 2 + 24);
    x = Math.max(-maxX, Math.min(maxX, x));
    y = Math.max(-maxY, Math.min(maxY, y));
  };
  const apply = () => {
    if (scale <= 1.01) { scale = 1; x = 0; y = 0; } else clampPan();
    img.style.transform = `translate(${x}px, ${y}px) scale(${scale})`;
    hint.hidden = scale > 1;
  };
  const zoomTo = (next) => { scale = Math.max(1, Math.min(MAX_SCALE, next)); apply(); };
  const dist = () => { const [a, b] = [...pts.values()]; return Math.hypot(a.x - b.x, a.y - b.y); };

  img.addEventListener('pointerdown', (e) => {
    img.setPointerCapture(e.pointerId);
    pts.set(e.pointerId, { x: e.clientX, y: e.clientY });
    start = pts.size === 2 ? { d: dist(), scale } : { px: e.clientX, py: e.clientY, x, y };
    if (pts.size === 1) {
      const now = Date.now();
      if (now - lastTap < 300) zoomTo(scale > 1 ? 1 : 2.5);
      lastTap = now;
    }
  });
  img.addEventListener('pointermove', (e) => {
    if (!pts.has(e.pointerId)) return;
    pts.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pts.size === 2 && start?.d) zoomTo(start.scale * (dist() / start.d));
    else if (pts.size === 1 && scale > 1 && start?.px !== undefined) {
      x = start.x + (e.clientX - start.px);
      y = start.y + (e.clientY - start.py);
      apply();
    }
  });
  const lift = (e) => {
    pts.delete(e.pointerId);
    const p = [...pts.values()][0];
    start = p ? { px: p.x, py: p.y, x, y } : null;
  };
  img.addEventListener('pointerup', lift);
  img.addEventListener('pointercancel', lift);
  root.addEventListener('wheel', (e) => { e.preventDefault(); zoomTo(scale * (e.deltaY < 0 ? 1.15 : 1 / 1.15)); }, { passive: false });

  function shut() {
    document.removeEventListener('keydown', onKey);
    root.remove();
    before?.focus?.();
  }
  const onKey = (e) => { if (e.key === 'Escape') shut(); };
  close.addEventListener('click', shut);
  root.addEventListener('click', (e) => { if (e.target === root) shut(); });
  document.addEventListener('keydown', onKey);

  document.body.append(root);
  root.focus();
  apply();
}
