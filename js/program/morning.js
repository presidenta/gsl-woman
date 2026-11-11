/* УТРЕННЯЯ МИНУТА ЭНЕРГИИ.

   Владелец 05.11.2026: подъёмы на носки и опускание на пятки с дыханием — каждый день обязательно, «чтобы
   было как привычка»; к ним по дням можно добавлять другое: гудение, сексуальный голос перед выходом,
   потряхивание тела. Поэтому пятки — всегда, а добавка идёт по кругу: день только пятки, потом пятки
   с гудением, с голосом, с потряхиванием, и снова. Тексты — в js/texts (morning.*). */

export const BASE = 'heels';
export const ADDONS = [null, 'hum', 'voice', 'shake'];
export const SECONDS = 60;

/** Что входит в утреннюю минуту дня программы. */
export function morningFor(day) {
  const addon = ADDONS[(Math.max(day, 1) - 1) % ADDONS.length];
  return { base: BASE, addon, seconds: SECONDS };
}
