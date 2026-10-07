const test = require('node:test');
const assert = require('node:assert/strict');
const content = require('../content-model.js');
const route = {
  name: 'Жим', area: 'Богд хан уул', image: 'zurag/bogdGorhi.jpg', difficulty: 'Хялбар',
  distanceKm: '4', elevationM: '0', timeHr: '1–2', durationHours: '2', season: 'Жилийн турш',
  status: '', desc: 'Жимийн мэдээлэл', track: '47.83, 106.89\n47.86, 106.90', published: false
};
const news = { title: 'Шинэ мэдээ', summary: 'Товч агуулга', body: 'Дэлгэрэнгүй', date: '2026-10-07', published: true };

test('route forms produce numeric statistics and Firestore-compatible coordinate maps', () => {
  const value = content.route({ ...route, name: '  Жим  ', updatedBy: 'attacker' });
  assert.equal(value.name, 'Жим');
  assert.equal(value.distanceKm, 4);
  assert.equal(value.elevationM, 0);
  assert.deepEqual(value.track, [{ latitude: 47.83, longitude: 106.89 }, { latitude: 47.86, longitude: 106.90 }]);
  assert.equal(value.updatedBy, undefined);
  assert.equal(value.published, false);
  assert.deepEqual(content.route({ ...route, track: '' }).track, []);
  assert.deepEqual(content.route({ ...route, track: [[0, 0], [90, 180]] }).track, [{ latitude: 0, longitude: 0 }, { latitude: 90, longitude: 180 }]);
});

test('malformed statistics, images and tracks cannot be submitted', () => {
  for (const distanceKm of ['', ' ', false, -1, Infinity, 'four']) {
    assert.throws(() => content.route({ ...route, distanceKm }), { code: 'content/invalid' });
  }
  for (const image of ['javascript:alert(1)', 'http://example.com/a.jpg', 'zurag/../secret.jpg', 'https://user:password@example.com/a.jpg']) {
    assert.throws(() => content.route({ ...route, image }), { code: 'content/invalid' });
  }
  for (const track of ['91, 106\n47, 106', '47, 181\n47, 106', '47, \n47, 106', '47,106,5\n48,106', '47,106', [{}], [[0, 0, 5], [1, 1]]]) {
    assert.throws(() => content.route({ ...route, track }), { code: 'content/invalid' });
  }
});

test('news requires valid calendar dates, content and an explicit publication choice', () => {
  assert.equal(content.news(news).date, '2026-10-07');
  assert.equal(content.news({ ...news, date: '2024-02-29' }).date, '2024-02-29');
  for (const date of ['2026-02-29', '2026-02-30', '2026-13-01', '07/10/2026', '']) {
    assert.throws(() => content.news({ ...news, date }), { code: 'content/invalid' });
  }
  assert.throws(() => content.news({ ...news, published: 'true' }), { code: 'content/invalid' });
  assert.throws(() => content.news({ ...news, title: ' ' }), { code: 'content/invalid' });
  assert.throws(() => content.news({ ...news, body: 'a'.repeat(12001) }), { code: 'content/invalid' });
});
