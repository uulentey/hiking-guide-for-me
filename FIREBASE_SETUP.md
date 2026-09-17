# Connect Walky to Firebase

The site works with its bundled routes until Firebase is configured. When it is, the explore and home pages read published routes from Firestore; a visitor's saved routes also sync by device.

1. Create a Firebase project and register a **Web app**.
2. In Firebase Console, create a **Cloud Firestore** database.
3. Copy the Web app config into [firebase-config.js](firebase-config.js). Do not put a service-account key in a browser app.
4. Add documents to the `routes` collection with `published: true`. Each document needs: `name`, `image`, `area`, `difficulty`, `distanceKm`, `elevationM`, `timeHr`, `durationHours`, `season`, `status`, `desc`, and `track` (an array of `[latitude, longitude]` pairs).
5. Enable **Google** under Firebase Authentication's sign-in methods. The header's “Нэвтрэх” button opens Google sign-in and then shows the visitor's profile photo, name, email, and sign-out action.
6. Enable **Anonymous** too if you want unsaved visitors to be able to sync saved routes before they choose Google sign-in. Saved routes are stored at `users/{uid}/savedRoutes/{routeId}`.
7. Under **Authentication → Settings → Authorized domains**, add every domain where Walky runs. Add `localhost` for local development and your deployed hostname before publishing. A Google popup that immediately closes normally means this step is missing.

Use Firestore rules like these before launching:

```text
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /routes/{routeId} { allow read: if resource.data.published == true; }
    match /users/{userId}/savedRoutes/{routeId} { allow read, write: if request.auth != null && request.auth.uid == userId; }
  }
}
```

Suggested first route document fields:

```text
published: true
name: "Ягаан сандал"
difficulty: "Хөнгөн - Дунд"
distanceKm: 4
elevationM: 480
timeHr: "1.5–2"
durationHours: 2
track: [[47.838254, 106.890664], [47.861016, 106.903578]]
```
