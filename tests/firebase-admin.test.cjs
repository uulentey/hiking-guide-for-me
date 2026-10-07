const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const content = require('../content-model.js');
const source = fs.readFileSync(path.join(__dirname, '../firebase-service.js'), 'utf8');
const news = { title: 'News', summary: 'Summary', body: 'Body', date: '2026-10-07', published: false };
const settle = () => new Promise(resolve => setImmediate(resolve));

function setup({ configured = true } = {}) {
  const documents = new Map();
  const writes = [];
  const reads = [];
  const delayedRoles = new Map();
  let nextId = 0;
  let authListener;
  const auth = {
    currentUser: null,
    onAuthStateChanged(callback) { authListener = callback; callback(null); return () => {}; }
  };
  const snapshot = key => ({ exists: documents.has(key), data: () => documents.get(key), id: key.split('/').at(-1) });
  const db = {
    collection(name) {
      return {
        doc(id = `auto-${++nextId}`) {
          const key = `${name}/${id}`;
          return {
            id, key,
            get(options) {
              reads.push({ key, options });
              if (delayedRoles.has(key)) return new Promise((resolve, reject) => { delayedRoles.set(key, { resolve, reject }); });
              return Promise.resolve(snapshot(key));
            },
            async set(data) { writes.push({ key, data, method: 'set' }); documents.set(key, data); },
            async update(data) {
              if (!documents.has(key)) throw Object.assign(new Error('Missing'), { code: 'not-found' });
              writes.push({ key, data, method: 'update' }); documents.set(key, { ...documents.get(key), ...data });
            },
            async delete() { writes.push({ key, method: 'delete' }); documents.delete(key); }
          };
        },
        async get(options) {
          reads.push({ key: name, options });
          return { docs: [...documents.keys()].filter(key => key.startsWith(`${name}/`)).map(snapshot) };
        },
        where(field, operator, value) {
          return { async get() { return { docs: [...documents.keys()].filter(key => key.startsWith(`${name}/`) && documents.get(key)[field] === value).map(snapshot) }; } };
        }
      };
    },
    async runTransaction(callback) {
      return callback({ get: reference => Promise.resolve(snapshot(reference.key)), set: (reference, data) => { writes.push({ key: reference.key, data, method: 'transaction' }); documents.set(reference.key, data); } });
    }
  };
  const firestore = () => db;
  firestore.FieldValue = { serverTimestamp: () => 'server-time' };
  const firebase = { apps: [{}], firestore, auth: () => auth };
  const window = { firebase, WalkyContent: content, WALKY_FIREBASE_CONFIG: configured ? { apiKey: 'test', authDomain: 'test', projectId: 'test', appId: 'test' } : {} };
  vm.runInNewContext(source, { window, firebase, console });
  let access;
  window.WalkyStore.onAdminStateChanged(state => { access = state; });
  return {
    store: window.WalkyStore, documents, writes, reads, delayedRoles,
    get access() { return access; },
    login(uid, extra = {}) { auth.currentUser = uid ? { uid, ...extra } : null; authListener(auth.currentUser); }
  };
}

test('visitors, regular accounts and unconfigured clients cannot read drafts or write content', async () => {
  for (const session of [setup(), setup({ configured: false })]) {
    await assert.rejects(session.store.listContent('routes'), { code: 'permission-denied' });
    await assert.rejects(session.store.saveContent('news', null, news), { code: 'permission-denied' });
    await assert.rejects(session.store.deleteContent('news', 'one'), { code: 'permission-denied' });
    await assert.rejects(session.store.importRoutes([]), { code: 'permission-denied' });
    assert.equal(session.writes.length, 0);
  }
  const regular = setup(); regular.login('regular'); await settle();
  assert.equal(regular.access.isAdmin, false);
  await assert.rejects(regular.store.listContent('news'), { code: 'permission-denied' });
  regular.documents.set('admins/regular', { enabled: false });
  await regular.store.refreshAdminAccess();
  assert.equal(regular.access.isAdmin, false);
});

test('admin membership comes from the server; anonymous users cannot inherit admin rights', async () => {
  const session = setup(); session.documents.set('admins/admin', { enabled: true });
  session.login('admin'); await settle();
  assert.equal(session.access.isAdmin, true);
  assert.equal(session.reads[0].options.source, 'server');
  session.login('admin', { isAnonymous: true }); await settle();
  assert.equal(session.access.isAdmin, false);
  await assert.rejects(session.store.saveContent('news', null, news), { code: 'permission-denied' });
});

test('late membership checks and failed membership reads cannot unlock a new account', async () => {
  const session = setup(); session.delayedRoles.set('admins/alice', null);
  session.login('alice');
  const alice = session.delayedRoles.get('admins/alice');
  session.login('bob'); await settle();
  alice.resolve({ exists: true, data: () => ({ enabled: true }) }); await settle();
  assert.equal(session.access.user.uid, 'bob');
  assert.equal(session.access.isAdmin, false);
  session.delayedRoles.set('admins/bob', null);
  const refresh = session.store.refreshAdminAccess();
  session.delayedRoles.get('admins/bob').reject({ code: 'permission-denied' });
  await refresh;
  assert.equal(session.access.isAdmin, false);
  assert.equal(session.access.error.code, 'permission-denied');
});

test('admins create drafts, edit published records while preserving metadata, and delete records', async () => {
  const session = setup(); session.documents.set('admins/admin', { enabled: true });
  session.login('admin'); await settle();
  const saved = await session.store.saveContent('news', null, news);
  assert.equal(session.documents.get(`news/${saved.id}`).published, false);
  assert.equal(session.documents.get(`news/${saved.id}`).updatedBy, 'admin');
  assert.equal(session.documents.get(`news/${saved.id}`).createdAt, 'server-time');
  session.documents.get(`news/${saved.id}`).createdAt = 'original-time';
  await session.store.saveContent('news', saved.id, { ...news, title: 'Edited', published: true });
  assert.equal(session.documents.get(`news/${saved.id}`).createdAt, 'original-time');
  assert.equal((await session.store.loadNews())[0].title, 'Edited');
  assert.equal((await session.store.listContent('news')).length, 1);
  await session.store.deleteContent('news', saved.id);
  assert.equal((await session.store.loadNews()).length, 0);
  await assert.rejects(session.store.saveContent('news', saved.id, news), { code: 'not-found' });
});

test('public queries return published content only, including an authoritative empty collection', async () => {
  const session = setup();
  session.documents.set('news/draft', { ...news, published: false });
  session.documents.set('news/older', { ...news, date: '2026-10-06', published: true });
  session.documents.set('news/newer', { ...news, date: '2026-10-07', published: true });
  assert.deepEqual(Array.from(await session.store.loadNews(), item => item.id), ['newer', 'older']);
  assert.equal((await session.store.loadRoutes()).length, 0);
});

test('signed-out sessions and revoked membership cannot continue admin operations', async () => {
  const session = setup(); session.documents.set('admins/admin', { enabled: true });
  session.login('admin'); await settle();
  session.documents.set('admins/admin', { enabled: false });
  await session.store.refreshAdminAccess();
  await assert.rejects(session.store.saveContent('news', null, news), { code: 'permission-denied' });
  session.login(null);
  await assert.rejects(session.store.deleteContent('news', 'anything'), { code: 'permission-denied' });
});

test('importing defaults is repeatable and preserves an existing route edited by an admin', async () => {
  const session = setup(); session.documents.set('admins/admin', { enabled: true });
  session.login('admin'); await settle();
  const route = { id: 'default', name: 'Жим', area: 'Богд', image: 'zurag/bogdGorhi.jpg', difficulty: 'Хялбар', distanceKm: 4, elevationM: 0, timeHr: '1–2', durationHours: 2, season: 'Жилийн турш', status: '', desc: 'Тайлбар', track: [[0, 0], [1, 1]] };
  assert.equal(await session.store.importRoutes([route]), 1);
  session.documents.get('routes/default').desc = 'Edited description';
  assert.equal(await session.store.importRoutes([route]), 0);
  assert.equal(session.documents.get('routes/default').desc, 'Edited description');
  assert.deepEqual(session.documents.get('routes/default').track, [{ latitude: 0, longitude: 0 }, { latitude: 1, longitude: 1 }]);
});
