import * as circles from '../circles/circles.js';
import * as settings from '../settings/settings.js';
import { isValidIso } from '../core/dates.js';

/* ПАРА ИДЁТ ДЕНЬ В ДЕНЬ (владелец 17.11.2026: «если женщина приглашает мужчину на третий день, у мужчины откроется
   сразу третий день его программы… дополнительные кнопки — лишнее»).

   Начинать можно в любой день. Тот, кто создал пару (первый в ней), задаёт день: его дата старта лежит в паре
   записью pace/start. Второй, войдя в пару, берёт эту дату себе — и у обоих один и тот же день программы,
   зеркальные задания и общий выходной. Свои записи у вошедшего остаются, меняется только счёт дней.
   Первый сменил дату старта — второй идёт следом. Вышли из пары — каждый дальше считает сам.

   Ничего не спрашивает и ничего не показывает: вызывается при каждой сборке экрана (main.js → context). */

const KIND = 'pace';
const ID = 'start';

/** Сверить дату старта с парой. true — дата у этого человека поменялась (экран уже строится с новой). */
export function apply() {
  const pair = circles.pair();
  if (!pair || !circles.isComplete(pair)) return false;
  const leader = pair.members.find((m) => m.role !== 'child');
  const s = settings.get();
  if (!leader || !s.startDate) return false;
  const shared = circles.item(pair.id, KIND, ID)?.data?.startDate;
  if (leader.id === pair.me) {
    if (shared !== s.startDate) circles.put(pair.id, KIND, ID, { startDate: s.startDate });
    return false;
  }
  if (isValidIso(shared) && shared !== s.startDate) {
    settings.update({ startDate: shared });
    return true;
  }
  return false;
}
