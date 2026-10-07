/* Requires a Firestore emulator running with firestore.rules on localhost:8088.
   Never contacts the configured live Firebase project. */
const assert = require('node:assert/strict');
const project = 'demo-walky-admin';
const api = `http://127.0.0.1:8088/v1/projects/${project}/databases/(default)/documents`;
const documentName = path => `projects/${project}/databases/(default)/documents/${path}`;
const token = uid => `${Buffer.from(JSON.stringify({ alg: 'none', typ: 'JWT' })).toString('base64url')}.${Buffer.from(JSON.stringify({ aud: project, iss: `https://securetoken.google.com/${project}`, sub: uid, user_id: uid, iat: Math.floor(Date.now() / 1000), exp: Math.floor(Date.now() / 1000) + 3600, firebase: { sign_in_provider: 'password' } })).toString('base64url')}.`;
function value(data) {
  if (data === null) return { nullValue: null };
  if (typeof data === 'boolean') return { booleanValue: data };
  if (typeof data === 'string') return { stringValue: data };
  if (typeof data === 'number') return Number.isInteger(data) ? { integerValue: String(data) } : { doubleValue: data };
  if (Array.isArray(data)) return { arrayValue: { values: data.map(value) } };
  return { mapValue: { fields: Object.fromEntries(Object.entries(data).map(([key, field]) => [key, value(field)])) } };
}
async function request(suffix, identity, body, method = 'POST') {
  const headers = { 'Content-Type': 'application/json' };
  if (identity) headers.Authorization = `Bearer ${identity === 'owner' ? 'owner' : token(identity)}`;
  const response = await fetch(`${api}${suffix}`, { method, headers, body: body ? JSON.stringify(body) : undefined });
  const result = await response.json();
  return { status: response.status, result };
}
async function expectStatus(promise, expected, label) {
  const response = await promise;
  assert.equal(response.status, expected, `${label}: ${JSON.stringify(response.result)}`);
}
function write(path, data, identity, timestamp = true) {
  const operation = { update: { name: documentName(path), fields: value(data).mapValue.fields } };
  if (timestamp) operation.updateTransforms = [{ fieldPath: 'updatedAt', setToServerValue: 'REQUEST_TIME' }];
  return request(':commit', identity, { writes: [operation] });
}
const remove = (path, identity) => request(':commit', identity, { writes: [{ delete: documentName(path) }] });
const read = (path, identity) => request(`/${path}`, identity, null, 'GET');
const news = { title: 'Мэдээ', summary: 'Товч мэдээ', body: 'Дэлгэрэнгүй мэдээ', date: '2026-10-07', published: false, updatedBy: 'admin' };
const route = { name: 'Жим', area: 'Богд', image: 'zurag/bogdGorhi.jpg', difficulty: 'Хялбар', distanceKm: 4, elevationM: 0, timeHr: '1–2', durationHours: 2, season: 'Жилийн турш', status: '', desc: 'Жимийн тайлбар', track: [{ latitude: 47, longitude: 106 }, { latitude: 48, longitude: 106 }], published: true, updatedBy: 'admin' };

(async () => {
  await expectStatus(write('admins/admin', { enabled: true }, 'owner', false), 200, 'Owner provisions admin');
  await expectStatus(write('admins/regular', { enabled: false }, 'owner', false), 200, 'Owner provisions regular account');
  await expectStatus(read('admins/admin', 'admin'), 200, 'Own membership readable');
  await expectStatus(read('admins/admin', 'regular'), 403, 'Other memberships private');
  await expectStatus(request('/admins', 'admin', null, 'GET'), 403, 'Admin membership listing forbidden');
  await expectStatus(write('admins/regular', { enabled: true }, 'regular', false), 403, 'Self promotion forbidden');
  await expectStatus(write('admins/other', { enabled: true }, 'admin', false), 403, 'Admins cannot grant roles');
  await expectStatus(remove('admins/admin', 'admin'), 403, 'Admins cannot delete roles');

  await expectStatus(write('news/draft', news, 'admin'), 200, 'Admin creates draft');
  await expectStatus(read('news/draft', 'admin'), 200, 'Admin reads draft');
  await expectStatus(read('news/draft'), 403, 'Guests cannot read draft');
  await expectStatus(read('news/draft', 'regular'), 403, 'Regular accounts cannot read draft');
  for (const identity of [null, 'regular', 'unknown']) {
    await expectStatus(write('news/blocked', { ...news, updatedBy: identity || 'guest' }, identity), 403, 'Unauthorized news creation');
    await expectStatus(write('routes/blocked', { ...route, updatedBy: identity || 'guest' }, identity), 403, 'Unauthorized route creation');
    await expectStatus(remove('news/draft', identity), 403, 'Unauthorized deletion');
  }
  await expectStatus(write('news/public', { ...news, published: true }, 'admin'), 200, 'Admin publishes news');
  await expectStatus(read('news/public'), 200, 'Published news public');
  await expectStatus(request('/news', 'regular', null, 'GET'), 403, 'Unfiltered public query denied');
  await expectStatus(request('/news', 'admin', null, 'GET'), 200, 'Admin reads all news');
  const query = await request(':runQuery', null, { structuredQuery: { from: [{ collectionId: 'news' }], where: { fieldFilter: { field: { fieldPath: 'published' }, op: 'EQUAL', value: { booleanValue: true } } } } });
  assert.equal(query.status, 200, JSON.stringify(query.result));
  assert.deepEqual(query.result.filter(row => row.document).map(row => row.document.name.split('/').at(-1)), ['public']);

  await expectStatus(write('routes/valid', route, 'admin'), 200, 'Admin creates route');
  await expectStatus(write('routes/valid', { ...route, desc: 'Шинэ тайлбар' }, 'admin'), 200, 'Admin edits route');
  await expectStatus(read('routes/valid'), 200, 'Published route public');
  await expectStatus(write('routes/invalid', { ...route, distanceKm: -4 }, 'admin'), 403, 'Invalid route rejected');
  await expectStatus(write('news/invalid', { ...news, title: '' }, 'admin'), 403, 'Invalid news rejected');
  await expectStatus(write('news/invalid-author', { ...news, updatedBy: 'regular' }, 'admin'), 403, 'Forged author rejected');
  await expectStatus(write('news/no-timestamp', news, 'admin', false), 403, 'Server timestamp required');
  await expectStatus(write('news/public', { ...news, published: false }, 'admin'), 200, 'Admin unpublishes news');
  await expectStatus(read('news/public'), 403, 'Unpublished news private');
  await expectStatus(remove('news/public', 'admin'), 200, 'Admin deletes news');
  await expectStatus(remove('routes/valid', 'admin'), 200, 'Admin deletes route');

  const hike = { saved: true, status: 'completed', completedAt: '2026-10-07' };
  await expectStatus(write('users/regular/savedRoutes/trail', hike, 'regular'), 200, 'Owner writes own hike');
  await expectStatus(read('users/regular/savedRoutes/trail', 'regular'), 200, 'Owner reads own hike');
  await expectStatus(read('users/regular/savedRoutes/trail', 'admin'), 403, 'Admin cannot read another user hike');
  await expectStatus(write('users/regular/savedRoutes/trail', hike, 'admin'), 403, 'Admin cannot edit another user hike');
  await expectStatus(write('admins/admin', { enabled: false }, 'owner', false), 200, 'Owner revokes admin');
  await expectStatus(write('news/revoked', news, 'admin'), 403, 'Revoked admin cannot write');
  await expectStatus(read('news/draft', 'admin'), 403, 'Revoked admin cannot read draft');
  console.log('Firestore emulator checks passed: role privacy, self-promotion prevention, public queries, route/news CRUD, validation, revocation and saved-hike ownership.');
})().catch(error => { console.error(error); process.exitCode = 1; });
