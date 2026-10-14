# Connect Walky to Firebase

The site works with its bundled routes until Firebase is configured. Home, Explore, the map, My hikes and route details read published routes from Firestore. My hikes supports Saved (all bookmarks), Want to go, and Completed, with completion dates, search and undo for removal.

1. Create a Firebase project and register a **Web app**.
2. In Firebase Console, create a **Cloud Firestore** database.
3. Copy the Web app config into [firebase-config.js](firebase-config.js). Do not put a service-account key in a browser app.
4. Add documents to the `routes` collection with `published: true`. Each document needs: `name`, `image`, `area`, `difficulty`, `distanceKm`, `elevationM`, `timeHr`, `durationHours`, `season`, `status`, `desc`, and `track` (an array of maps with numeric `latitude` and `longitude` fields). Firestore does not support nested arrays; the app converts these maps to coordinate pairs for Leaflet.
5. Enable **Google** under Firebase Authentication's sign-in methods. The header's “Нэвтрэх” button opens Google sign-in and then shows the visitor's profile photo, name, email, and sign-out action.
6. Saved hikes use `users/{uid}/savedRoutes/{routeId}`. Visitors use local device storage; anonymous sign-in is no longer required. After Google sign-in, visitors can explicitly import their device hikes from My hikes. Existing account records take precedence during import.
7. Under **Authentication → Settings → Authorized domains**, add every domain where Walky runs. Add `localhost` for local development and your deployed hostname before publishing. Check the actual auth error if the popup closes; this symptom alone does not identify the cause.

Each hike document contains `saved` (boolean), `status` (`saved`, `planned`, `completed`, or `removed`), `completedAt` (ISO date string or null), and `updatedAt` (server timestamp). Existing documents containing only `saved` remain readable. Removal writes a `removed` record so another device cannot revive an old bookmark. The page's Undo restores its previous status and completion date.

The browser caches hikes separately for each signed-in account and for guests. Pending edits are kept locally and retried after reconnect or using Retry. Read/write failures are shown on My hikes; the UI does not claim cloud sync succeeded if it failed. Device-only storage is not a full offline website or offline map.

## Admin routes and daily news

Open `admin.html`, or use **Удирдлага** in the footer. Approved admins also see this link in their profile menu. Google sign-in alone does not give admin access.

1. Publish the contents of [firestore.rules](firestore.rules) in **Firebase Console → Firestore Database → Rules**. Local code changes do not deploy these rules. These rules include public published content, admin-only content writes, and owner-only saved hikes.
2. Have each intended admin sign in once through Walky. Find their **User UID** under **Authentication → Users**.
3. As the project owner, create a Firestore document at `admins/{USER_UID}` with the boolean field `enabled: true`. Only trusted project owners should create or change membership in Firebase Console. Browser clients cannot create, edit, list or delete admin memberships; users can read only their own membership document.
4. Reopen the admin page or click **Эрхийг дахин шалгах**. The page checks membership with the server and stays locked when that check fails.
5. If the routes collection is empty, use **Анхны жимүүдийг нэмэх** to import the site's five bundled routes. This action only adds missing IDs; it preserves existing edits. Then create or edit routes with **Жим нэмэх** and **Засах**.
6. Use **Өдөр тутмын мэдээ** to create, edit or delete news. Published news appears on the home page, newest date first, with the latest six items and expandable full text.

### Editable route detail sections and image uploads

In the route editor, **АЛХАХААСАА ӨМНӨ** lets admins change the preparation heading and checklist. **ХЭНД ТОХИРОХ ВЭ?** lets them change the audience heading and entries. Write one item per line, with at most 20 items of 200 characters each. Empty lists hide that section. Existing routes without these fields retain the original checklist and suggested audiences until edited.

Select **Нүүр зураг оруулах** to upload a JPG, PNG or WebP image up to 5 MiB. The editor shows a preview and uploads only after clicking Save and passing route validation. Upload failures retain the form; retrying a failed route save in the same editor reuses the completed image upload. A cover upload preserves existing gallery photos. Photos are public website assets even while the route is a draft.

To enable uploads:

1. Enable **Storage** in the Firebase Console for the same project. Confirm the bucket name matches `storageBucket` in `firebase-config.js`.
2. Publish [storage.rules](storage.rules) under **Storage → Rules**. The rules allow only enabled admins to upload supported images to their own `route-images/{uid}/` folder.
3. When Firebase prompts for permission to let Storage rules read Firestore admin membership, enable that connection. See Firebase's [cross-service rules documentation](https://firebase.google.com/docs/storage/security/rules-conditions).
4. Publish the updated [firestore.rules](firestore.rules) as well, so editable route detail fields are validated.

The route-detail page now includes **Миний алхалтууд** and a **Төлөвлөх** button. Clicking it saves the route as `planned`; the button changes to **Төлөвлөсөн**. Clicking it again restores `saved` status. Completed hikes retain their completion status. Guests keep plans on the device; signed-in hikers use the existing account sync and retry flow.

Both forms save drafts by default. Check **Сайтад нийтлэх** to publish, or uncheck it to remove content from public pages while retaining the draft. News dates label and sort posts; they do not schedule future publication. Route edits preserve existing photo gallery metadata. Coordinates use one `latitude, longitude` pair per line and are saved as Firestore maps. Leaving coordinates empty creates a route without a drawn map.

Deleting content requires confirmation. Existing saved hikes keep their route IDs; a deleted/unpublished route appears as unavailable in My hikes. Public route pages, including the map, use the published collection even when it is empty, so deleting the last route does not bring bundled routes back. Bundled routes remain a fallback when Firebase is unavailable.

To revoke access, set `admins/{USER_UID}.enabled` to `false` or delete the membership document. Firestore rules immediately reject subsequent protected operations. The open page updates its access state when the user changes account, reloads, or rechecks their access. No client-side email allowlist or local browser setting grants admin rights.

Content is stored in `routes/{routeId}` and `news/{newsId}`. News fields are `title`, `summary`, `body`, `date` (`YYYY-MM-DD`), and `published`. Admin writes include `updatedBy` and server `updatedAt`; new records also include server `createdAt`. Keep unrelated existing rules if your Firebase project hosts other apps, while ensuring no broad allow rule overrides these access restrictions.

This follows Firebase's document-based [role access guidance](https://firebase.google.com/docs/firestore/solutions/role-based-access).

## Checks

Run the regression checks with `node --test --test-isolation=none tests/*.test.cjs`. Admin adapter tests use a fake Firebase instance, and the saved-hike tests use a fake cloud adapter; they do not write to the live project. For a local browser check, `tests/admin-browser.cjs` and `tests/route-editor-browser.cjs` accept `WALKY_BASE_URL` and uses intercepted Firebase fixtures. It requires Playwright installed and a local HTTP server serving this folder. Browser tests intercept all Firebase SDK requests and use test-only fixtures.

To check the Storage rules, download Firebase's official `cloud-storage-rules-runtime` JAR and run `node tests/storage-rules.cjs /path/to/runtime.jar`. It compiles the real `storage.rules` and evaluates upload, read, delete, format, size, owner-folder, and revoked-membership cases with local admin-document fixtures.

To verify the actual database rules, run the official Firestore emulator with `firestore.rules`, host `127.0.0.1`, port `8088`, and project ID `demo-walky-admin`, then run `node tests/firestore-rules.cjs`. That script is hardcoded to the local demo emulator and checks admin CRUD, published queries, draft privacy, role revocation, prevention of self-promotion, and saved-hike ownership. It never uses the site's live configuration.

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
