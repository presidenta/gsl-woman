import { test } from 'node:test';
import assert from 'node:assert/strict';
import man from '../js/texts/man/ru.js';
import woman from '../js/texts/woman/ru.js';

/* Красная линия: оценка (владелец 15.11.2026): «любая оценка, что мужчину, что женщину, — красный флаг». Само
   приложение тоже никого не оценивает: ни «молодец», ни «умница», ни «отлично справился». */
const RED = /молод[еэ]ц|молодчин|умниц|умничк|хорош(ий|ая|ее|ой)\s+(мальчик|девочк|мой|моя)|послушн(ый|ая|ой|ую|ым)|отлично\s+справ|правильно\s+сделал|можешь\s+же|на\s+пят[её]рк|на\s+тро[её]чк/i;

function strings(v, out = []) {
  if (typeof v === 'string') out.push(v);
  else if (Array.isArray(v)) v.forEach((x) => strings(x, out));
  else if (v && typeof v === 'object') Object.values(v).forEach((x) => strings(x, out));
  return out;
}

test('тексты приложения обеих частей — без слов-оценок', () => {
  for (const s of strings([man, woman])) assert.ok(!RED.test(s), `оценка: «${s}»`);
});
