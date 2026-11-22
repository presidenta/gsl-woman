// Анкеты «Пять языков любви» (js/love-quiz/, владелец 22.11.2026: вместо короткого теста — анкета о себе на 22 вопроса
// и анкета по наблюдению за ребёнка, подростка или взрослого).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { score, shapeOf, KINDS } from '../js/love-quiz/quiz.js';
import selfRu from '../js/love-quiz/self-ru.js';
import selfUa from '../js/love-quiz/self-ua.js';
import observeRu from '../js/love-quiz/observe-ru.js';
import observeUa from '../js/love-quiz/observe-ua.js';
import selfEn from '../js/love-quiz/self-en.js';
import observeEn from '../js/love-quiz/observe-en.js';

const qs = (ks) => ks.map((row) => ({ q: 'q', o: row.map((k) => ({ t: 't', k })) }));

test('подсчёт: 1 место — 3 балла, 2 — 2, 3 — 1; процент от максимума по отвеченным', () => {
  const questions = qs([[1, 2, 3, 4, 5], [1, 2, 3, 4, 5]]);
  const r = score(questions, [[0, 1, 2], [0, 4, null]]);
  assert.equal(r.answered, 2);
  assert.equal(r.max, 6);
  assert.deepEqual(r.ranking.map((x) => [x.kind, x.n]), [['words', 6], ['time', 2], ['touch', 2], ['gifts', 1], ['service', 0]]);
  assert.equal(r.ranking[0].pct, 100);
});

test('«не замечал(а)» и пустой вопрос в подсчёт не идут; ничего не отвечено — нули без деления на ноль', () => {
  const questions = qs([[1, 2, 3, 4, 5], [5, 4, 3, 2, 1], [1, 2, 3, 4, 5]]);
  const r = score(questions, [[4, null, null], [0, 1, 2], [null, null, null]], [false, true, false]);
  assert.equal(r.answered, 1);
  assert.equal(r.total, 3);
  assert.equal(r.ranking[0].kind, 'touch');
  const none = score(questions, [[null, null, null], [null, null, null], [null, null, null]]);
  assert.equal(none.max, 0);
  assert.ok(none.ranking.every((x) => x.pct === 0));
});

test('форма профиля: ровный, два ведущих, один ведущий — как на сайте', () => {
  const rank = (pcts) => pcts.map((pct, i) => ({ k: i + 1, pct }));
  assert.equal(shapeOf(rank([40, 35, 30, 28, 26])), 'flat');
  assert.equal(shapeOf(rank([60, 55, 20, 10, 5])), 'dual');
  assert.equal(shapeOf(rank([80, 40, 20, 10, 5])), 'dominant');
});

test('анкета о себе: 22 вопроса, в каждом пять ответов — по одному на язык; ru и ua устроены одинаково', () => {
  assert.equal(selfRu.questions.length, 22);
  assert.equal(selfUa.questions.length, 22);
  selfRu.questions.forEach((q, i) => {
    assert.deepEqual(q.o.map((o) => o.k).sort(), [1, 2, 3, 4, 5], `вопрос ${i + 1}`);
    assert.deepEqual(selfUa.questions[i].o.map((o) => o.k), q.o.map((o) => o.k), `ua, вопрос ${i + 1}`);
  });
  for (const k of [1, 2, 3, 4, 5]) {
    for (const f of ['name', 'tagline', 'desc', 'critical', 'phrase', 'hurts']) assert.ok(selfUa.langs[k][f], `ua, язык ${k}: ${f}`);
    for (const f of ['behave', 'never', 'self']) assert.ok(selfRu.langs[k][f].length && selfUa.langs[k][f].length, `язык ${k}: ${f}`);
  }
  assert.equal(KINDS.length, 5);
});

test('анкета по наблюдению: ребёнок 18, подросток 16, взрослый 17; ru и ua одинаковы; советы и проверка у каждой группы', () => {
  const sizes = { child: 18, teen: 16, adult: 17 };
  for (const [g, n] of Object.entries(sizes)) {
    const ru = observeRu.groups[g];
    const ua = observeUa.groups[g];
    assert.equal(ru.questions.length, n, g);
    assert.equal(ua.questions.length, n, `ua ${g}`);
    ru.questions.forEach((q, i) => {
      assert.deepEqual(q.o.map((o) => o.k).sort(), [1, 2, 3, 4, 5], `${g}, вопрос ${i + 1}`);
      assert.deepEqual(ua.questions[i].o.map((o) => o.k), q.o.map((o) => o.k), `ua ${g}, вопрос ${i + 1}`);
    });
    for (const k of [1, 2, 3, 4, 5]) {
      for (const pack of [ru, ua]) {
        assert.ok(pack.tips[k].seen && pack.tips[k].todo.length && pack.tips[k].never.length, `${g}, язык ${k}`);
      }
    }
    assert.equal(ua.check.pairs.length, ru.check.pairs.length, `${g}: пары выбора`);
  }
  assert.equal(observeRu.groups.child.check.pairs.length, 10, 'детям — 10 пар «одно из двух»');
});

test('надписи интерфейса анкет — одни ключи на ru и ua', () => {
  const keys = (o, pre = '') => Object.entries(o).flatMap(([k, v]) => (v && typeof v === 'object' && !Array.isArray(v) ? keys(v, `${pre}${k}.`) : [`${pre}${k}`])).sort();
  assert.deepEqual(keys(selfUa.ui), keys(selfRu.ui));
  assert.deepEqual(keys(observeUa.ui), keys(observeRu.ui));
});

test('без оценок («Красный флаг»): ни «молодец», ни «умница» в анкетах', () => {
  const all = JSON.stringify([selfRu, selfUa, observeRu, observeUa]);
  assert.ok(!/молодец|молодець|умниц|хорош(ий|ая) (мальчик|девочка)|на пятёрку/i.test(all));
});

test('английские анкеты устроены как русские: те же вопросы, языки ответов, советы, надписи', () => {
  const keys = (o, pre = '') => Object.entries(o).flatMap(([k, v]) => (v && typeof v === 'object' && !Array.isArray(v) ? keys(v, `${pre}${k}.`) : [`${pre}${k}`])).sort();
  assert.deepEqual(keys(selfEn.ui), keys(selfRu.ui));
  assert.deepEqual(keys(observeEn.ui), keys(observeRu.ui));
  assert.equal(selfEn.questions.length, selfRu.questions.length);
  selfRu.questions.forEach((q, i) => assert.deepEqual(selfEn.questions[i].o.map((o) => o.k), q.o.map((o) => o.k), `вопрос ${i + 1}`));
  for (const k of [1, 2, 3, 4, 5]) {
    for (const f of ['name', 'tagline', 'desc', 'critical', 'phrase', 'hurts']) assert.ok(selfEn.langs[k][f], `en, язык ${k}: ${f}`);
    for (const f of ['behave', 'never', 'self']) assert.equal(selfEn.langs[k][f].length, selfRu.langs[k][f].length, `en, язык ${k}: ${f}`);
  }
  for (const g of ['child', 'teen', 'adult']) {
    const ru = observeRu.groups[g];
    const en = observeEn.groups[g];
    assert.equal(en.questions.length, ru.questions.length, g);
    ru.questions.forEach((q, i) => assert.deepEqual(en.questions[i].o.map((o) => o.k), q.o.map((o) => o.k), `${g}, вопрос ${i + 1}`));
    for (const k of [1, 2, 3, 4, 5]) assert.ok(en.tips[k].seen && en.tips[k].todo.length && en.tips[k].never.length, `${g}, язык ${k}`);
    assert.equal(en.check.pairs.length, ru.check.pairs.length, `${g}: пары выбора`);
  }
});

test('английские анкеты — без русских букв и без оценок', () => {
  const all = JSON.stringify([selfEn.ui, selfEn.langs, selfEn.shapes, selfEn.questions, observeEn.ui, observeEn.langs, observeEn.shapes, observeEn.groups]);
  assert.ok(!/[а-яёіїєґ]/i.test(all));
  assert.ok(!/well done|good (boy|girl)/i.test(all));
});
