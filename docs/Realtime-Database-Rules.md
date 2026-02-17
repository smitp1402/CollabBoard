# Firebase Realtime Database Rules (Phase 4)

Presence and cursors use paths `presence/default/{userId}` and `cursors/default/{userId}`. For the MVP, any authenticated user can read all presence/cursor data; each user can write only their own node.

Apply the following in **Firebase Console → Realtime Database → Rules** (or merge into your `database.rules.json` if you use the Firebase CLI).

## Recommended rules

The app subscribes to the **parent** paths `presence/default` and `cursors/default` to receive all users. You must allow `.read` on those parent nodes; otherwise the client cannot load the list of other users and cursors will not appear.

```json
{
  "rules": {
    "presence": {
      "default": {
        ".read": "auth != null",
        "$userId": {
          ".write": "auth != null && auth.uid === $userId"
        }
      }
    },
    "cursors": {
      "default": {
        ".read": "auth != null",
        "$userId": {
          ".write": "auth != null && auth.uid === $userId"
        }
      }
    }
  }
}
```

- **Paths:** `presence/default/{userId}` and `cursors/default/{userId}` match [lib/board/usePresence.ts](../lib/board/usePresence.ts) and [lib/board-constants.ts](../lib/board-constants.ts) (`DEFAULT_BOARD_ID = "default"`).
- **Read:** `.read` on `presence/default` and `cursors/default` lets any signed-in user read the full list so everyone sees others’ presence and cursors.
- **Write:** Only the user whose uid matches the path segment can write (own presence, own cursor).

## Enabling Realtime Database

1. In Firebase Console, open **Build → Realtime Database** and create a database if needed.
2. Copy the database URL (e.g. `https://<project>-default-rtdb.<region>.firebaseio.com`).
3. Set `NEXT_PUBLIC_FIREBASE_DATABASE_URL` in `.env.local` to that URL.
