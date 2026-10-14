/* Test-only Firebase fixture. Browser checks intercept all Firebase SDK scripts. */
(function () {
  const contentKey = 'walky-test-content';
  const userKey = 'walky-test-user';
  let content = JSON.parse(localStorage.getItem(contentKey) || '{}');
  let user = JSON.parse(localStorage.getItem(userKey) || 'null');
  let nextId = 0;
  const observers = new Set();
  const uploaded = [];
  let uploadFailure = null;
  const writes = () => localStorage.setItem(contentKey, JSON.stringify(content));
  const snapshot = path => ({ id: path.split('/').at(-1), exists: path in content, data: () => content[path] });
  const authorized = () => user && content[`admins/${user.uid}`]?.enabled === true;
  const denied = () => Object.assign(new Error('Permission denied'), { code: 'permission-denied' });
  const auth = {
    get currentUser() { return user; },
    onAuthStateChanged(callback) { observers.add(callback); callback(user); return () => observers.delete(callback); },
    async signInWithPopup() { setUser('admin'); },
    async signOut() { setUser(null); }
  };
  function setUser(uid) {
    user = uid ? { uid, displayName: uid === 'admin' ? 'Админ' : 'Алхагч', email: `${uid}@example.com`, photoURL: 'zurag/emoSandal.jpg' } : null;
    localStorage.setItem(userKey, JSON.stringify(user));
    observers.forEach(callback => callback(user));
  }
  const db = {
    collection(name) {
      const querySnapshot = predicate => ({ docs: Object.keys(content).filter(key => key.startsWith(`${name}/`) && !key.slice(name.length + 1).includes('/') && (!predicate || predicate(content[key]))).map(snapshot), metadata: { fromCache: false } });
      return {
        doc(id = `test-${Date.now()}-${++nextId}`) {
          const path = `${name}/${id}`;
          return {
            id, path,
            async get() {
              if (name === 'admins' && user?.uid !== id) throw denied();
              return snapshot(path);
            },
            collection(child) { return db.collection(`${path}/${child}`); },
            async set(data) {
              if (name === 'admins' || (!name.startsWith('users/') && !authorized())) throw denied();
              content[path] = data; writes();
            },
            async update(data) {
              if (!authorized()) throw denied();
              if (!(path in content)) throw Object.assign(new Error('Missing'), { code: 'not-found' });
              content[path] = { ...content[path], ...data }; writes();
            },
            async delete() { if (!authorized()) throw denied(); delete content[path]; writes(); }
          };
        },
        async get() { if (!authorized()) throw denied(); return querySnapshot(); },
        where(field, operator, value) { return { async get() { return querySnapshot(row => row[field] === value); } }; },
        onSnapshot(options, callback) { callback(querySnapshot()); return () => {}; }
      };
    },
    async runTransaction(callback) {
      const pending = [];
      const result = await callback({ get: reference => reference.get(), set: (reference, data) => pending.push([reference, data]) });
      for (const [reference, data] of pending) await reference.set(data);
      return result;
    }
  };
  const firestore = () => db;
  firestore.FieldValue = { serverTimestamp: () => new Date().toISOString() };
  const firebaseAuth = () => auth;
  firebaseAuth.GoogleAuthProvider = class { setCustomParameters() {} };
  const storage = {
    ref(path) {
      return {
        put(file, metadata) {
          let canceled = false;
          return {
            cancel() { canceled = true; },
            on(event, progress, error, success) {
              progress({ bytesTransferred: 0, totalBytes: file.size });
              setTimeout(() => {
                if (canceled) { error({ code: 'storage/canceled' }); return; }
                if (uploadFailure) { error(uploadFailure); return; }
                if (!authorized()) { error({ code: 'storage/unauthorized' }); return; }
                uploaded.push({ path, name: file.name, metadata });
                progress({ bytesTransferred: file.size, totalBytes: file.size });
                success();
              }, 30);
            }
          };
        },
        async getDownloadURL() { return `https://walky-test-images.example/${path}`; }
      };
    }
  };
  window.firebase = { apps: [{}], firestore, auth: firebaseAuth, storage: () => storage };
  window.__walkyTest = {
    setUser,
    seed(data) { content = { ...content, ...data }; writes(); },
    getContent() { return content; },
    getUploads() { return uploaded; },
    failUploads(error) { uploadFailure = error; },
    clearContent() { content = { 'admins/admin': { enabled: true } }; writes(); }
  };
})();
