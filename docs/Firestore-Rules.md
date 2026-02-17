# Firestore Security Rules (Phase 3)

Board objects are stored at `boards/{boardId}/objects/{objectId}`. For the MVP, any authenticated user can read and write the single shared board.

Apply the following in **Firebase Console → Firestore Database → Rules** (or merge into your existing `firestore.rules` if you use the Firebase CLI).

## Recommended rules

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Single shared board: any authenticated user can read/write objects
    match /boards/{boardId}/objects/{objectId} {
      allow read, write: if request.auth != null;
    }
  }
}
```

- **Path:** `boards/{boardId}/objects/{objectId}` matches the collection used by [lib/board/useBoardObjects.ts](../lib/board/useBoardObjects.ts) and [lib/board/firestore-board.ts](../lib/board/firestore-board.ts).
- **Auth:** `request.auth != null` ensures only signed-in users can read or write. No per-board or per-document ownership for MVP; last-write-wins.

## Optional: restrict to default board only

If you want to limit access to the single board id used by the app:

```javascript
match /boards/{boardId}/objects/{objectId} {
  allow read, write: if request.auth != null && boardId == 'default';
}
```

Replace `'default'` if your app uses a different `DEFAULT_BOARD_ID` (see [lib/board-constants.ts](../lib/board-constants.ts)).
