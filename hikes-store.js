/* Account-scoped collections, local guest storage and a retryable sync outbox. */
(function () {
  const PREFIX = 'walky:hikes:v1:';
  const statuses = ['saved', 'planned', 'completed', 'removed'];
  const listeners = new Set();
  let user = null;
  let scope = 'guest';
  let cache = { items: {}, pending: {} };
  let ready = false;
  let storageFailed = false;
  let sync = 'loading';
  let generation = 0;
  let stopWatch = () => {};
  let inFlight = new Set();

  const validId = (id) => typeof id === 'string' && /^[\w-]{1,150}$/.test(id) && !['__proto__', 'constructor', 'prototype'].includes(id);
  function normalize(data) {
    if (!data || typeof data !== 'object') return null;
    const status = statuses.includes(data.status) ? data.status : data.saved === true ? 'saved' : 'removed';
    return {
      status,
      completedAt: status === 'completed' && typeof data.completedAt === 'string' ? data.completedAt : null
    };
  }
  function read(account) {
    try {
      const raw = JSON.parse(localStorage.getItem(PREFIX + account) || '{}');
      const items = Object.fromEntries(Object.entries(raw.items || {}).filter(([id, data]) => validId(id) && normalize(data))
        .map(([id, data]) => [id, normalize(data)]));
      const pending = Object.fromEntries(Object.entries(raw.pending || {}).filter(([id, token]) => validId(id) && items[id] && typeof token === 'string'));
      return { items, pending };
    } catch { return { items: {}, pending: {} }; }
  }
  function persist() {
    try { localStorage.setItem(PREFIX + scope, JSON.stringify(cache)); storageFailed = false; }
    catch { storageFailed = true; }
  }
  function snapshot() {
    return { user, ready, sync, storageFailed, items: structuredClone(cache.items),
      guestCount: user ? Object.entries(read('guest').items).filter(([id, hike]) => hike.status !== 'removed' && !cache.items[id]).length : 0 };
  }
  function notify() { const state = snapshot(); listeners.forEach((listener) => listener(state)); }
  function syncState() {
    if (!user) return 'local';
    if (!navigator.onLine) return 'offline';
    return Object.keys(cache.pending).length ? 'syncing' : 'synced';
  }

  // Migrate the original device bookmarks exactly once, without assigning
  // another visitor's bookmarks to a Google account.
  function migrateGuest() {
    try {
      if (localStorage.getItem(PREFIX + 'guest')) return;
      const legacy = JSON.parse(localStorage.getItem('walky:saved-routes') || '[]');
      if (!Array.isArray(legacy)) return;
      const items = Object.fromEntries(legacy.filter(validId).map((id) => [id, { status: 'saved', completedAt: null }]));
      localStorage.setItem(PREFIX + 'guest', JSON.stringify({ items, pending: {} }));
    } catch { storageFailed = true; }
  }

  function flush() {
    if (!user || !ready || !navigator.onLine) return;
    const currentGeneration = generation;
    const uid = user.uid;
    Object.entries(cache.pending).forEach(([id, token]) => {
      if (inFlight.has(id)) return;
      inFlight.add(id);
      const hike = { ...cache.items[id] };
      window.WalkyStore.writeHike(uid, id, hike).then(() => {
        if (currentGeneration !== generation) return;
        inFlight.delete(id);
        if (cache.pending[id] === token) delete cache.pending[id];
        persist();
        sync = syncState();
        notify();
        if (cache.pending[id]) flush(); // A newer edit arrived during the write.
      }).catch((error) => {
        if (currentGeneration !== generation) return;
        inFlight.delete(id);
        sync = 'error';
        console.warn('[walky] Hikes remain on this device; cloud sync failed.', error.code || error.message);
        notify();
      });
    });
  }

  function watch() {
    stopWatch();
    if (!user) return;
    const currentGeneration = generation;
    stopWatch = window.WalkyStore.watchHikes(user.uid, (rows, metadata) => {
      if (currentGeneration !== generation) return;
      const remote = Object.fromEntries(rows.filter((row) => validId(row.id)).map((row) => [row.id, normalize(row)]));
      // A cache-only snapshot can be incomplete. Only a server snapshot replaces
      // cached records, and never replace an edit still waiting to be uploaded.
      const items = metadata.fromCache ? { ...cache.items, ...remote } : remote;
      Object.keys(cache.pending).forEach((id) => { items[id] = cache.items[id]; });
      cache.items = items;
      ready = true;
      persist();
      sync = metadata.fromCache ? (navigator.onLine ? 'connecting' : 'offline') : syncState();
      notify();
      flush();
    }, (error) => {
      if (currentGeneration !== generation) return;
      ready = true;
      sync = 'error';
      console.warn('[walky] Could not read cloud hikes.', error.code || error.message);
      notify();
    });
  }

  function changeUser(nextUser) {
    generation += 1;
    stopWatch();
    stopWatch = () => {};
    inFlight = new Set();
    user = nextUser && !nextUser.isAnonymous ? nextUser : null;
    scope = user ? user.uid : 'guest';
    cache = read(scope);
    ready = !user;
    sync = user ? 'loading' : 'local';
    notify();
    watch();
  }

  function setStatus(id, status, completedAt) {
    if (!ready || !validId(id) || !statuses.includes(status)) return false;
    cache.items[id] = { status, completedAt: status === 'completed'
      ? completedAt || cache.items[id]?.completedAt || new Date().toISOString() : null };
    if (user) cache.pending[id] = `${Date.now()}-${Math.random()}`;
    persist();
    sync = syncState();
    notify();
    flush();
    return true;
  }

  window.WalkyHikes = {
    getState: snapshot,
    subscribe(listener) { listeners.add(listener); listener(snapshot()); return () => listeners.delete(listener); },
    setStatus,
    restore(id, hike) { return setStatus(id, hike.status, hike.completedAt); },
    retry() { sync = 'connecting'; notify(); watch(); flush(); },
    importGuest() {
      if (!user || !ready) return;
      Object.entries(read('guest').items).forEach(([id, hike]) => {
        if (hike.status !== 'removed' && !cache.items[id]) {
          cache.items[id] = hike;
          cache.pending[id] = `${Date.now()}-${Math.random()}`;
        }
      });
      persist(); sync = syncState(); notify(); flush();
    }
  };

  migrateGuest();
  if (window.WalkyStore) window.WalkyStore.onAuthStateChanged(changeUser);
  else changeUser(null);
  window.addEventListener('online', () => { if (user) { watch(); flush(); } });
  window.addEventListener('offline', () => { sync = syncState(); notify(); });
  window.addEventListener('storage', (event) => {
    if (event.key === PREFIX + scope) {
      const latest = read(scope);
      // Preserve edits in flight in this tab when another tab updates its cache.
      Object.keys(cache.pending).forEach((id) => {
        latest.items[id] = cache.items[id]; latest.pending[id] = cache.pending[id];
      });
      cache = latest; notify(); flush();
    }
  });
})();
