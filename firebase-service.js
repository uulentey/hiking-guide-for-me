/* Optional Firebase layer. The app remains fully usable with local route data. */
(function () {
  const config = window.WALKY_FIREBASE_CONFIG || {};
  const configured = ['apiKey', 'authDomain', 'projectId', 'appId'].every((key) => {
    const value = config[key];
    return typeof value === 'string' && value.length > 0 && !value.includes('YOUR_');
  });
  let db = null;
  let auth = null;
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
  window.WalkyStore = {
    configured: Boolean(db),
    async loadRoutes() {
      if (!db) return null;
      try { const snapshot = await db.collection('routes').where('published', '==', true).get(); return snapshot.docs.map((doc) => ({ ...doc.data(), id: doc.id })); }
      catch (error) { console.warn('[walky] Could not load Firestore routes; using local routes.', error); return null; }
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
