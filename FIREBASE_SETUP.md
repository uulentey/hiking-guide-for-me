# Connect Walky to Firebase

The site works with its bundled routes until Firebase is configured. Home, Explore, My hikes and route details read published routes from Firestore. My hikes supports Saved (all bookmarks), Want to go, and Completed, with completion dates, search and undo for removal.

1. Create a Firebase project and register a **Web app**.
2. In Firebase Console, create a **Cloud Firestore** database.
3. Copy the Web app config into [firebase-config.js](firebase-config.js). Do not put a service-account key in a browser app.
4. Add documents to the `routes` collection with `published: true`. Each document needs: `name`, `image`, `area`, `difficulty`, `distanceKm`, `elevationM`, `timeHr`, `durationHours`, `season`, `status`, `desc`, and `track` (an array of maps with numeric `latitude` and `longitude` fields). Firestore does not support nested arrays; the app converts these maps to coordinate pairs for Leaflet.
5. Enable **Google** under Firebase Authentication's sign-in methods. The header's “Нэвтрэх” button opens Google sign-in and then shows the visitor's profile photo, name, email, and sign-out action.
6. Saved hikes use `users/{uid}/savedRoutes/{routeId}`. Visitors use local device storage; anonymous sign-in is no longer required. After Google sign-in, visitors can explicitly import their device hikes from My hikes. Existing account records take precedence during import.
7. Under **Authentication → Settings → Authorized domains**, add every domain where Walky runs. Add `localhost` for local development and your deployed hostname before publishing. Check the actual auth error if the popup closes; this symptom alone does not identify the cause.

Each hike document contains `saved` (boolean), `status` (`saved`, `planned`, `completed`, or `removed`), `completedAt` (ISO date string or null), and `updatedAt` (server timestamp). Existing documents containing only `saved` remain readable. Removal writes a `removed` record so another device cannot revive an old bookmark. The page's Undo restores its previous status and completion date.

The browser caches hikes separately for each signed-in account and for guests. Pending edits are kept locally and retried after reconnect or using Retry. Read/write failures are shown on My hikes; the UI does not claim cloud sync succeeded if it failed. Device-only storage is not a full offline website or offline map.

Publish the rules below in Firebase Console → Firestore Database → Rules if equivalent owner-only rules are not already deployed. Local code changes do not deploy Firebase rules. The new `firestore.rules` file contains the same rules. Cloud sync requires these permissions.

Use Firestore rules like these before launching:

```text
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /routes/{routeId} { allow read: if resource.data.published == true; }
    match /users/{userId}/savedRoutes/{routeId} {
      allow read: if request.auth != null && request.auth.uid == userId;
      allow create, update: if request.auth != null && request.auth.uid == userId
        && request.resource.data.keys().hasOnly(['saved', 'status', 'completedAt', 'updatedAt'])
        && request.resource.data.status in ['saved', 'planned', 'completed', 'removed']
        && request.resource.data.saved == (request.resource.data.status != 'removed')
        && (request.resource.data.completedAt == null || request.resource.data.completedAt is string)
        && request.resource.data.updatedAt == request.time;
    }
  }
}
```

Run the storage regression checks with `node tests/hikes-store.test.cjs`. They use a fake cloud adapter and never write to your live Firebase project. A live cross-device check still requires Google sign-in and deployed Firestore rules: save a hike, change its status, then open My hikes with the same account in another browser.

Suggested first route document fields:

```text
published: true
name: "Ягаан сандал"
difficulty: "Хөнгөн - Дунд"
distanceKm: 4
elevationM: 480
timeHr: "1.5–2"
durationHours: 2
track: [{latitude: 47.838254, longitude: 106.890664}, {latitude: 47.861016, longitude: 106.903578}]
```
