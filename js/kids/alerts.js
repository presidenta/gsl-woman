import * as circles from '../circles/circles.js';
import { waiting } from './stars.js';

/* ЧТО ЖДЁТ РЕШЕНИЯ РОДИТЕЛЯ (владелец 14.11.2026: «чтобы родители видели, что что-то красное — надо что-то
   решать»): телефон ребёнка ждёт подтверждения (сервер присылает kidsWaiting в списке семей) и дела детей ждут
   «Получилось». Отсюда — красная точка на «Мы» (main.js) и число на вкладке «Дети» (screens/us/). */
export function kidAlerts(circle = circles.family()) {
  if (!circle || circle.role !== 'parent') return { devices: 0, deeds: 0, total: 0 };
  const kids = new Set(circle.members.filter((m) => m.role === 'child').map((m) => m.id));
  const deeds = waiting(circles.items(circle.id, 'deed'), circles.items(circle.id, 'ok')).filter((d) => kids.has(d.author)).length;
  const devices = Number(circle.kidsWaiting) || 0;
  return { devices, deeds, total: devices + deeds };
}
