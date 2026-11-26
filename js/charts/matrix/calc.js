/* МАТРИЦА СУДЬБЫ (метод Натальи Ладини) — расчёт. Обозначения Ладини: А — день (слева), Б — месяц (сверху), В — сумма
   цифр года (справа), Г = А+Б+В (снизу), Д = А+Б+В+Г (центр); всё сводится к 1…22 (больше 22 — минус 22).
   Род: Ф = А+Б, Ш = Б+В, Ы = В+Г, К = Г+А; к центру: X2 = X+Д, X1 = X+X2, X3 = X2+Д.
   Исправлены ошибки движка Gemini: карта здоровья (Сахасрара А|Б, Аджна А1|Б1, Вишудха А2|Б2, Анахата А3|Б3,
   Манипура Д|Д, Свадхистана В2|Г2, Муладхара В|Г), Небо = Б+Г, Земля = А+В, мужской род Ф+Ы, женский Ш+К. */

export const r22 = (n) => { let x = Math.abs(Math.trunc(n)); while (x > 22) x -= 22; return x || 22; };
const ds = (s) => String(s).split('').reduce((a, c) => a + Number(c), 0);

/** iso «ГГГГ-ММ-ДД» → точки, предназначения, карта здоровья; null — не дата. */
export function matrix(iso) {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso || '');
  if (!m) return null;
  const A = r22(Number(m[3])), B = r22(Number(m[2])), C = r22(ds(m[1]));
  const D = r22(A + B + C), E = r22(A + B + C + D);
  const ray = (x) => { const x2 = r22(x + E); return { x1: r22(x + x2), x2, x3: r22(x2 + E) }; };
  const a = ray(A), b = ray(B), c = ray(C), d = ray(D);
  const F = r22(A + B), G = r22(B + C), Y = r22(C + D), K = r22(D + A);
  const sky = r22(B + D), earth = r22(A + C), personal = r22(sky + earth);
  const male = r22(F + Y), female = r22(G + K), social = r22(male + female);
  const spiritual = r22(personal + social), planetary = r22(social + spiritual);
  const rows = [
    ['Сахасрара', A, B], ['Аджна', a.x1, b.x1], ['Вишудха', a.x2, b.x2], ['Анахата', a.x3, b.x3],
    ['Манипура', E, E], ['Свадхистана', c.x2, d.x2], ['Муладхара', C, D],
  ].map(([name, body, energy]) => ({ name, body, energy, total: r22(body + energy) }));
  const sumBody = r22(rows.reduce((s, r) => s + r.body, 0));
  const sumEnergy = r22(rows.reduce((s, r) => s + r.energy, 0));
  return {
    points: { A, B, C, D, E, F, G, Y, K },
    rays: { a, b, c, d },
    purposes: { sky, earth, personal, male, female, social, spiritual, planetary },
    health: { rows, total: { body: sumBody, energy: sumEnergy, total: r22(sumBody + sumEnergy) } },
  };
}
