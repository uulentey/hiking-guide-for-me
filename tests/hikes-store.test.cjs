const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const source = fs.readFileSync(path.join(__dirname, '../hikes-store.js'), 'utf8');

function setup({ storage = new Map(), blocked = false } = {}) {
  let authCallback;
  let watcher;
  const writes = [];
  const events = {};
  const navigator = { onLine: true };
  const localStorage = {
    getItem: (key) => { if (blocked) throw Error('Storage disabled'); return storage.get(key) ?? null; },
    setItem: (key, value) => { if (blocked) throw Error('Storage disabled'); storage.set(key, value); }
  };
  const window = {
    addEventListener(name, callback) { events[name] = callback; },
    WalkyStore: {
      onAuthStateChanged(callback) { authCallback = callback; },
      watchHikes(uid, success, error) { watcher = { uid, success, error }; return () => {}; },
      writeHike(uid, id, data) {
        return new Promise((resolve, reject) => writes.push({ uid, id, data, resolve, reject }));
      }
    }
  };
  vm.runInNewContext(source, { window, navigator, localStorage, structuredClone, console: { warn() {} } });
  return {
    api: window.WalkyHikes, storage, writes, events, navigator,
    auth: (user = null) => authCallback(user),
    remote: (rows, metadata = { fromCache: false }) => watcher.success(rows, metadata),
    failRead: () => watcher.error({ code: 'permission-denied' }),
    getWatcher: () => watcher
  };
}
const settle = async () => { await new Promise((resolve) => setImmediate(resolve)); };

test('legacy bookmarks migrate once; planned and completed hikes survive reload', () => {
  const storage = new Map([['walky:saved-routes', JSON.stringify(['trail-one', 'trail-two'])]]);
  const session = setup({ storage }); session.auth();
  assert.equal(session.api.getState().items['trail-one'].status, 'saved');
  session.api.setStatus('trail-one', 'planned');
  session.api.setStatus('trail-two', 'completed');
  const date = session.api.getState().items['trail-two'].completedAt;
  const reload = setup({ storage }); reload.auth();
  assert.equal(reload.api.getState().items['trail-one'].status, 'planned');
  assert.equal(reload.api.getState().items['trail-two'].completedAt, date);
  assert.equal(reload.writes.length, 0);
});

test('removal persists and undo restores the original completion date', () => {
  const session = setup(); session.auth(); session.api.setStatus('trail', 'completed');
  const original = session.api.getState().items.trail;
  session.api.setStatus('trail', 'removed');
  const reload = setup({ storage: session.storage }); reload.auth();
  assert.equal(reload.api.getState().items.trail.status, 'removed');
  session.api.restore('trail', original);
  assert.equal(session.api.getState().items.trail.completedAt, original.completedAt);
});

test('cloud reads restore legacy and new hikes without writing them back', () => {
  const session = setup(); session.auth({ uid: 'alice' });
  assert.equal(session.api.getState().ready, false);
  session.remote([{ id: 'legacy', saved: true }, { id: 'new', saved: true, status: 'completed', completedAt: '2026-09-20' }]);
  assert.equal(session.api.getState().items.legacy.status, 'saved');
  assert.equal(session.api.getState().items.new.status, 'completed');
  assert.equal(session.api.getState().sync, 'synced');
  assert.equal(session.writes.length, 0);
});

test('guest collection imports only by request and never overwrites account hikes', async () => {
  const session = setup(); session.auth();
  session.api.setStatus('shared', 'saved'); session.api.setStatus('guest-only', 'planned');
  session.auth({ uid: 'alice' }); session.remote([{ id: 'shared', status: 'completed' }]);
  assert.equal(session.api.getState().items['guest-only'], undefined);
  assert.equal(session.writes.length, 0);
  session.api.importGuest();
  assert.equal(session.api.getState().items.shared.status, 'completed');
  assert.equal(session.writes.length, 1);
  assert.equal(session.writes[0].uid, 'alice');
  session.writes[0].resolve(); await settle();
  assert.equal(session.api.getState().sync, 'synced');
  session.auth();
  assert.equal(session.api.getState().items.shared.status, 'saved');
});

test('late callbacks from another account cannot leak records or finish the new account writes', async () => {
  const session = setup(); session.auth({ uid: 'alice' }); session.remote([]);
  const aliceWatcher = session.getWatcher();
  session.api.setStatus('alice-trail', 'planned');
  session.auth({ uid: 'bob' }); session.remote([{ id: 'bob-trail', status: 'saved' }]);
  aliceWatcher.success([{ id: 'alice-private', status: 'completed' }], { fromCache: false });
  session.writes[0].resolve(); await settle();
  assert.equal(session.api.getState().items['alice-trail'], undefined);
  assert.equal(session.api.getState().items['alice-private'], undefined);
  assert.equal(session.api.getState().items['bob-trail'].status, 'saved');
  session.auth();
  assert.equal(Object.keys(session.api.getState().items).length, 0);
});

test('rapid edits serialize and an old acknowledgement cannot discard the latest edit', async () => {
  const session = setup(); session.auth({ uid: 'alice' }); session.remote([]);
  session.api.setStatus('trail', 'planned');
  session.api.setStatus('trail', 'completed');
  assert.equal(session.writes.length, 1);
  session.remote([{ id: 'trail', status: 'planned' }]);
  assert.equal(session.api.getState().items.trail.status, 'completed');
  session.writes[0].resolve(); await settle();
  assert.equal(session.writes.length, 2);
  assert.equal(session.writes[1].data.status, 'completed');
  session.writes[1].resolve(); await settle();
  assert.equal(session.api.getState().sync, 'synced');
});

test('failed writes remain pending across refresh and retry without reviving removed hikes', async () => {
  const session = setup(); session.auth({ uid: 'alice' }); session.remote([{ id: 'trail', saved: true }]);
  session.api.setStatus('trail', 'removed');
  session.writes[0].reject({ code: 'permission-denied' }); await settle();
  assert.equal(session.api.getState().sync, 'error');
  const reload = setup({ storage: session.storage }); reload.auth({ uid: 'alice' });
  reload.remote([{ id: 'trail', saved: true }]);
  assert.equal(reload.api.getState().items.trail.status, 'removed');
  assert.equal(reload.writes[0].data.status, 'removed');
  reload.writes[0].resolve(); await settle();
  assert.equal(reload.api.getState().sync, 'synced');
});

test('offline edits queue locally and flush after reconnect', () => {
  const session = setup(); session.auth({ uid: 'alice' }); session.remote([]);
  session.navigator.onLine = false; session.events.offline();
  session.api.setStatus('trail', 'planned');
  assert.equal(session.writes.length, 0); assert.equal(session.api.getState().sync, 'offline');
  session.navigator.onLine = true; session.events.online(); session.remote([]);
  assert.equal(session.writes.length, 1); assert.equal(session.writes[0].data.status, 'planned');
});

test('incomplete cache snapshots do not erase the account cache; server snapshots may', () => {
  const session = setup(); session.auth({ uid: 'alice' }); session.remote([{ id: 'trail', status: 'planned' }]);
  session.remote([], { fromCache: true });
  assert.equal(session.api.getState().items.trail.status, 'planned');
  session.remote([]);
  assert.equal(session.api.getState().items.trail, undefined);
});

test('permission denied reads stay actionable, malformed storage and unavailable storage do not crash', () => {
  const session = setup(); session.auth({ uid: 'alice' }); session.failRead();
  assert.equal(session.api.getState().ready, true); assert.equal(session.api.getState().sync, 'error');
  const corrupt = setup({ storage: new Map([['walky:hikes:v1:guest', '{broken']]) }); corrupt.auth();
  assert.equal(Object.keys(corrupt.api.getState().items).length, 0);
  const blocked = setup({ blocked: true }); blocked.auth(); blocked.api.setStatus('trail', 'saved');
  assert.equal(blocked.api.getState().storageFailed, true);
  assert.equal(blocked.api.getState().items.trail.status, 'saved');
});
