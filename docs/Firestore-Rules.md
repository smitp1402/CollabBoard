# Firestore Security Rules (Phase 3)

Board metadata is stored at `boards/{boardId}` (name, createdBy, createdAt). Board objects are at `boards/{boardId}/objects/{objectId}`. Any authenticated user can list all boards, create boards, and read/write objects on any board.

Apply the following in **Firebase Console → Firestore Database → Rules** (or merge into your existing `firestore.rules` if you use the Firebase CLI).

## Recommended rules

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Board metadata: list and create for any authenticated user
    match /boards/{boardId} {
      allow read, create: if request.auth != null;
      allow update, delete: if request.auth != null;
    }
    // Board objects: any authenticated user can read/write
    match /boards/{boardId}/objects/{objectId} {
      allow read, write: if request.auth != null;
    }
  }
}
```

- **Board metadata:** `boards/{boardId}` is used by [lib/board/boardMetadata.ts](../lib/board/boardMetadata.ts) for listing and creating boards. Any signed-in user can read (to list) and create new boards.
- **Path:** `boards/{boardId}/objects/{objectId}` matches [lib/board/useBoardObjects.ts](../lib/board/useBoardObjects.ts) and [lib/board/firestore-board.ts](../lib/board/firestore-board.ts).
- **Auth:** `request.auth != null` ensures only signed-in users can read or write. No per-board or per-document ownership for MVP; last-write-wins.

## Optional: restrict to default board only

If you want to limit access to the single board id used by the app:

```javascript
match /boards/{boardId}/objects/{objectId} {
  allow read, write: if request.auth != null && boardId == 'default';
}
```

Replace `'default'` if your app uses a different `DEFAULT_BOARD_ID` (see [constants/board.ts](../constants/board.ts)).
