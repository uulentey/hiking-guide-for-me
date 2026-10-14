const test = require('node:test');
const assert = require('node:assert/strict');
const { guidance } = require('../route-content.js');
const content = require('../content-model.js');

test('legacy routes retain the preparation checklist and appropriate audience defaults', () => {
  const result = guidance({ distanceKm: 4, difficulty: 'Хялбар', timeHr: '1–2' });
  assert.deepEqual(result.preparation, ['Ундны ус', 'Хөлд эвтэйхэн гутал', 'Дулаан хувцас', 'Цэнэгтэй утас', 'Өөрт хэрэгтэй эм']);
  assert.ok(result.audience.includes('Богино алхалт хайж байгаа хүмүүст'));
  assert.ok(result.audience.includes('Алхаж эхэлж байгаа хүмүүст'));
  assert.ok(guidance({ timeHr: '6–8' }).audience.includes('Удаан алхах дуртай хүмүүст'));
});

test('custom route sections replace defaults, and empty lists hide unwanted guidance', () => {
  const result = guidance({ preparationTitle: 'Тусгай бэлтгэл', preparation: ['Таяг'], audienceTitle: 'Тохирох алхагчид', audience: ['Дадлага туршлагатай хүмүүст'] });
  assert.deepEqual(result, { preparationTitle: 'Тусгай бэлтгэл', preparation: ['Таяг'], audienceTitle: 'Тохирох алхагчид', audience: ['Дадлага туршлагатай хүмүүст'] });
  assert.deepEqual(guidance({ preparation: [], audience: [] }).preparation, []);
  assert.deepEqual(guidance({ preparation: [], audience: [] }).audience, []);
  assert.deepEqual(guidance({ preparation: [{ malicious: true }, 'Ус'] }).preparation, ['Ус']);
});

test('uploads accept supported raster images within the limit, excluding empty and oversized files', () => {
  for (const type of ['image/jpeg', 'image/png', 'image/webp']) assert.equal(content.imageFile({ type, size: 5 * 1024 * 1024 }).type, type);
  for (const file of [null, { type: 'image/svg+xml', size: 200 }, { type: 'image/png', size: 0 }, { type: 'image/png', size: 5 * 1024 * 1024 + 1 }]) {
    assert.throws(() => content.imageFile(file), { code: 'content/invalid' });
  }
});
