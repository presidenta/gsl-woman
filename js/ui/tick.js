/* ЗВУК СЧЁТА утренней минуты (владелец, 12.11.2026: «чтобы был реально звук… с каждой цифрой человек должен
   опуститься на пятки»). Синтез в браузере (Web Audio) — без файлов, работает без сети. Телефон пускает звук
   только после нажатия, поэтому unlock() зовётся из кнопки старта.

   tick()        — мягкий короткий звон на каждую секунду;
   tick(true)    — каждая десятая секунда, чуть выше и ярче: слышно, сколько прошло;
   finish()      — два звона в конце: время вышло. */

let audio = null;

export function unlock() {
  try {
    audio ||= new (window.AudioContext || window.webkitAudioContext)();
    audio.resume?.();
  } catch {
    audio = null;
  }
}

function bell(freq, at, peak, length) {
  const o = audio.createOscillator();
  const g = audio.createGain();
  o.type = 'sine';
  o.frequency.setValueAtTime(freq, at);
  g.gain.setValueAtTime(0.0001, at);
  g.gain.exponentialRampToValueAtTime(peak, at + 0.008);
  g.gain.exponentialRampToValueAtTime(0.0001, at + length);
  o.connect(g).connect(audio.destination);
  o.start(at);
  o.stop(at + length + 0.05);
}

export function tick(strong = false) {
  if (!audio) return;
  try {
    bell(strong ? 880 : 620, audio.currentTime, strong ? 0.32 : 0.2, strong ? 0.35 : 0.16);
  } catch { /* звук — украшение: сбой не мешает счёту */ }
}

export function finish() {
  if (!audio) return;
  try {
    const now = audio.currentTime;
    bell(660, now, 0.3, 0.9);
    bell(990, now + 0.18, 0.26, 1.1);
  } catch { /* то же */ }
}
