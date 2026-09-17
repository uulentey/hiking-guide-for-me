/* Optional Firebase layer. The app remains fully usable with local route data. */
(function () {
  const config = window.WALKY_FIREBASE_CONFIG || {};
  const configured = ['apiKey', 'authDomain', 'projectId', 'appId'].every((key) => {
    const value = config[key];
    return typeof value === 'string' && value.length > 0 && !value.includes('YOUR_');
  });
  let db = null;
  let auth = null;
  let authReady = Promise.resolve(null);
  if (configured && window.firebase) {
    try {
      if (!firebase.apps.length) firebase.initializeApp(config);
      db = firebase.firestore();
      if (firebase.auth) {
        auth = firebase.auth();
        authReady = auth.currentUser ? Promise.resolve(auth.currentUser) : auth.signInAnonymously().catch((error) => {
          console.warn('[walky] Anonymous sign-in is not enabled; saved routes stay on this device.', error);
          return null;
        });
      }
    }
    catch (error) { console.warn('[walky] Firebase could not start; using local routes.', error); }
  }
  window.WalkyStore = {
    configured: Boolean(db),
    async loadRoutes() {
      if (!db) return null;
      try { const snapshot = await db.collection('routes').where('published', '==', true).get(); return snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() })); }
      catch (error) { console.warn('[walky] Could not load Firestore routes; using local routes.', error); return null; }
    },
    async saveRoute(routeId, saved) {
      if (!db || !auth) return;
      try {
        const user = auth.currentUser || await authReady;
        if (!user) return;
        await db.collection('users').doc(user.uid).collection('savedRoutes').doc(routeId).set({
          saved,
          updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        }, { merge: true });
      } catch (error) { console.warn('[walky] Could not sync saved route.', error); }
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
