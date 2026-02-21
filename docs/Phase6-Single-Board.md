# Phase 6 — Single Board (no creation/sharing)

All authenticated users open the same board at `/board` and collaborate. There is no "create board" or "share link" flow.

## 6.1 Single board at `/board`

- **Route:** [app/board/page.tsx](../app/board/page.tsx) renders `BoardPageContent` at `/board`.
- **Board ID:** Board page content uses [DEFAULT_BOARD_ID](../constants/board.ts) (`"default"`) for both `useBoardObjects` and `BoardCanvas`. There is no URL param or route segment for board id.
- **Auth:** Only authenticated users can reach the board; unauthenticated users are redirected to `/`.
- **Test:** [app/board/BoardPage.test.tsx](../app/board/BoardPage.test.tsx) — "uses single shared board (DEFAULT_BOARD_ID) when authenticated" asserts that `useBoardObjects` is called with `DEFAULT_BOARD_ID`.

## 6.2 No create-board or share-link flow

- The app has no UI or route for creating a new board or for share links. Everyone who signs in and goes to `/board` sees the same Firestore board (`boards/default/objects`) and the same RTDB presence/cursors (`presence/default`, `cursors/default`).

## Checkpoint

All auth users open `/board` and see the same board.
