/* МАТРИЦА СУДЬБЫ (метод Натальи Ладини) — расчёт. Обозначения Ладини: А — день (слева), Б — месяц (сверху), В — сумма
   цифр года (справа), Г = А+Б+В (снизу), Д = А+Б+В+Г (центр); число больше 22 сводится сложением цифр (26 → 8) —
   владелец 26.11.2026: «26.10 — первая цифра 8, а не 4».
   Род: Ф = А+Б, Ш = Б+В, Ы = В+Г, К = Г+А; к центру: X2 = X+Д, X1 = X+X2, X3 = X2+Д.
   Исправлены ошибки движка Gemini: карта здоровья (Сахасрара А|Б, Аджна А1|Б1, Вишудха А2|Б2, Анахата А3|Б3,
   Манипура Д|Д, Свадхистана В2|Г2, Муладхара В|Г), Небо = Б+Г, Земля = А+В, мужской род Ф+Ы, женский Ш+К. */

export const r22 = (n) => { let x = Math.abs(Math.trunc(n)); while (x > 22) x = String(x).split('').reduce((a, c) => a + Number(c), 0); return x || 22; };
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
  // Диагонали рода (владелец 26.11.2026): отцовская Ф → Ы (слева сверху вниз направо), материнская Ш → К; к центру — как у сторон
  const f = ray(F), g = ray(G), y = ray(Y), k = ray(K);
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
    rays: { a, b, c, d, f, g, y, k },
    lines: {
      father: [F, f.x1, f.x2, E, y.x2, y.x1, Y], fatherSum: male,
      mother: [G, g.x1, g.x2, E, k.x2, k.x1, K], motherSum: female,
    },
    purposes: { sky, earth, personal, male, female, social, spiritual, planetary },
    // Канал любви и денег (нижний правый сектор, между В2 и Г2): точка баланса Х = В2+Г2, Деньги = В2+Х, Любовь = Г2+Х
    loveMoney: (() => { const x = r22(c.x2 + d.x2); return { balance: x, money: r22(c.x2 + x), love: r22(d.x2 + x) }; })(),
    health: { rows, total: { body: sumBody, energy: sumEnergy, total: r22(sumBody + sumEnergy) } },
  };
}

/** Матрица пары (совместимость): точки двух матриц складываются и сводятся; от них — предназначения пары. */
export function pairMatrix(isoA, isoB) {
  const a = matrix(isoA);
  const b = matrix(isoB);
  if (!a || !b) return null;
  const P = Object.fromEntries(Object.keys(a.points).map((k) => [k, r22(a.points[k] + b.points[k])]));
  const sky = r22(P.B + P.D), earth = r22(P.A + P.C), personal = r22(sky + earth);
  const social = r22(r22(P.F + P.Y) + r22(P.G + P.K));
  return { points: P, purposes: { sky, earth, personal, social, spiritual: r22(personal + social) } };
}
