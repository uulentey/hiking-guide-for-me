/* Optional Firebase layer. The app remains fully usable with local route data. */
(function () {
  const config = window.WALKY_FIREBASE_CONFIG || {};
  const configured = ['apiKey', 'authDomain', 'projectId', 'appId'].every((key) => {
    const value = config[key];
    return typeof value === 'string' && value.length > 0 && !value.includes('YOUR_');
  });
  let db = null;
  let auth = null;
  let access = { ready: false, user: null, isAdmin: false, error: null };
  let accessVersion = 0;
  const accessListeners = new Set();
  const reportAccess = (next) => {
    access = next;
    accessListeners.forEach(callback => callback({ ...access }));
  };
  async function checkAdmin(user) {
    const version = ++accessVersion;
    reportAccess({ ready: false, user, isAdmin: false, error: null });
    if (!db || !user || user.isAnonymous) {
      reportAccess({ ready: true, user, isAdmin: false, error: null });
      return;
    }
    try {
      const snapshot = await db.collection('admins').doc(user.uid).get({ source: 'server' });
      if (version !== accessVersion) return;
      reportAccess({ ready: true, user, isAdmin: snapshot.exists && snapshot.data().enabled === true, error: null });
    } catch (error) {
      if (version === accessVersion) reportAccess({ ready: true, user, isAdmin: false, error });
    }
  }
  function requireAdmin(collection) {
    if (!['routes', 'news'].includes(collection)) throw new Error('Unknown content collection.');
    if (!db || !auth?.currentUser || auth.currentUser.isAnonymous || !access.ready || !access.isAdmin || access.user?.uid !== auth.currentUser.uid) {
      const error = new Error('Admin access is required.');
      error.code = 'permission-denied';
      throw error;
    }
    return auth.currentUser.uid;
  }
  function contentId(id) {
    if (typeof id !== 'string' || !id || id.includes('/') || id === '.' || id === '..') throw new Error('Invalid content ID.');
    return id;
  }
  if (configured && window.firebase) {
    try {
      if (!firebase.apps.length) firebase.initializeApp(config);
      db = firebase.firestore();
      if (firebase.auth) {
        auth = firebase.auth();
        // Let Firebase restore the existing session. Visitors keep their hikes
        // locally until they explicitly sign in; no competing anonymous login.
      }
    }
    catch (error) { console.warn('[walky] Firebase could not start; using local routes.', error); }
  }
  if (auth) auth.onAuthStateChanged(checkAdmin);
  else reportAccess({ ready: true, user: null, isAdmin: false, error: null });
  window.WalkyStore = {
    configured: Boolean(db),
    async loadRoutes() {
      if (!db) return null;
      try { const snapshot = await db.collection('routes').where('published', '==', true).get(); return snapshot.docs.map((doc) => ({ ...doc.data(), id: doc.id })); }
      catch (error) { console.warn('[walky] Could not load Firestore routes; using local routes.', error); return null; }
    },
    async loadNews() {
      if (!db) return [];
      const snapshot = await db.collection('news').where('published', '==', true).get();
      return snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id }))
        .sort((a, b) => String(b.date || '').localeCompare(String(a.date || '')));
    },
    onAdminStateChanged(callback) {
      accessListeners.add(callback);
      callback({ ...access });
      return () => accessListeners.delete(callback);
    },
    refreshAdminAccess() { return checkAdmin(auth?.currentUser || null); },
    async listContent(collection) {
      const uid = requireAdmin(collection);
      const snapshot = await db.collection(collection).get({ source: 'server' });
      if (requireAdmin(collection) !== uid) throw new Error('Account changed.');
      return snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id }));
    },
    async saveContent(collection, id, data) {
      const uid = requireAdmin(collection);
      const fields = window.WalkyContent[collection === 'routes' ? 'route' : 'news'](data);
      const reference = id ? db.collection(collection).doc(contentId(id)) : db.collection(collection).doc();
      const record = { ...fields, updatedAt: firebase.firestore.FieldValue.serverTimestamp(), updatedBy: uid };
      // Updating preserves gallery metadata and cannot recreate a deleted record.
      if (id) await reference.update(record);
      else await reference.set({ ...record, createdAt: firebase.firestore.FieldValue.serverTimestamp() });
      if (requireAdmin(collection) !== uid) throw new Error('Account changed.');
      return { ...fields, id: reference.id };
    },
    async deleteContent(collection, id) {
      const uid = requireAdmin(collection);
      await db.collection(collection).doc(contentId(id)).delete();
      if (requireAdmin(collection) !== uid) throw new Error('Account changed.');
    },
    async importRoutes(routes) {
      const uid = requireAdmin('routes');
      const records = routes.map(route => ({ id: contentId(route.id), fields: window.WalkyContent.route({ ...route, published: true }) }));
      return db.runTransaction(async transaction => {
        if (requireAdmin('routes') !== uid) throw new Error('Account changed.');
        const references = records.map(record => db.collection('routes').doc(record.id));
        const snapshots = await Promise.all(references.map(reference => transaction.get(reference)));
        let count = 0;
        records.forEach((record, index) => {
          if (snapshots[index].exists) return;
          transaction.set(references[index], { ...record.fields, createdAt: firebase.firestore.FieldValue.serverTimestamp(), updatedAt: firebase.firestore.FieldValue.serverTimestamp(), updatedBy: uid });
          count++;
        });`font
        `
        return count;
      });
    },
    watchHikes(uid, onChange, onError) {
      return db.collection('users').doc(uid).collection('savedRoutes')
        .onSnapshot({ includeMetadataChanges: true }, (snapshot) => {
          onChange(snapshot.docs.map((doc) => ({ ...doc.data(), id: doc.id })), snapshot.metadata);
        }, onError);
    },
    async writeHike(uid, routeId, hike) {
      if (!db || auth?.currentUser?.uid !== uid) throw new Error('Account changed.');
      await db.collection('users').doc(uid).collection('savedRoutes').doc(routeId).set({
        saved: hike.status !== 'removed',
        status: hike.status,
        completedAt: hike.completedAt,
        updatedAt: firebase.firestore.FieldValue.serverTimestamp()
      });
    },
    onAuthStateChanged(callback) {
      if (!auth) { callback(null); return () => {}; }
      return auth.onAuthStateChanged(callback);
    },
    async signInWithGoogle() {
      if (!auth) throw new Error('Firebase Web App config is missing.');
      const provider = new firebase.auth.GoogleAuthProvider();
      provider.setCustomParameters({ prompt: 'select_account' });
      return auth.signInWithPopup(provider);
    },
    async signOut() {
      if (!auth) return;
      return auth.signOut();
    }
  };
})();
