# Firebase Realtime Database Rules (Phase 4)

Presence and cursors use paths `presence/{boardId}/{userId}` and `cursors/{boardId}/{userId}`. Any board id is supported so multiple boards each have their own presence and cursors. Any authenticated user can read presence/cursors for any board; each user can write only their own node.

Apply the following in **Firebase Console → Realtime Database → Rules** (or merge into your `database.rules.json` if you use the Firebase CLI).

## Recommended rules

The app subscribes to **parent** paths `presence/{boardId}` and `cursors/{boardId}` to receive all users on that board. You must allow `.read` on those parent nodes for any `boardId`; otherwise the client cannot load the list of other users and cursors.

```json
{
  "rules": {
    "presence": {
      "$boardId": {
        ".read": "auth != null",
        "$userId": {
          ".write": "auth != null && auth.uid === $userId"
        }
      }
    },
    "cursors": {
      "$boardId": {
        ".read": "auth != null",
        "$userId": {
          ".write": "auth != null && auth.uid === $userId"
        }
      }
    }
  }
}
```

- **Paths:** `presence/{boardId}/{userId}` and `cursors/{boardId}/{userId}` match [hooks/usePresence.ts](../hooks/usePresence.ts). Each board has its own presence and cursor subtree.
- **Read:** `.read` on `presence/$boardId` and `cursors/$boardId` lets any signed-in user read the full list for that board.
- **Write:** Only the user whose uid matches the path segment can write (own presence, own cursor).

## Enabling Realtime Database

1. In Firebase Console, open **Build → Realtime Database** and create a database if needed.
2. Copy the database URL (e.g. `https://<project>-default-rtdb.<region>.firebaseio.com`).
3. Set `NEXT_PUBLIC_FIREBASE_DATABASE_URL` in `.env.local` to that URL.
