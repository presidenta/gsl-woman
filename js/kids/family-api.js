import * as circles from '../circles/circles.js';

/* Кабинет родителя как «участник семьи» для общих экранов детского кабинета (дела семьи, звёзды, подтверждения):
   те же действия, что у телефона ребёнка (kid-store.js → adapter), только через circles/ — обмен «Семьи». */
export function familyApi(circle) {
  return {
    circle,
    me: circle?.me,
    role: circle?.role,
    items: (kind) => (circle ? circles.items(circle.id, kind) : []),
    put: (kind, id, data) => circles.put(circle.id, kind, id, data),
    drop: (kind, id) => circles.drop(circle.id, kind, id),
    newId: circles.newId,
    name: (id) => circles.memberName(circle, id),
    markSeen: () => circles.markSeen(circle.id),
  };
}
