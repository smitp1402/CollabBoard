# Phase 5 — Persistence & Reconnect

This doc summarizes how Phase 5 (Persistence & Reconnect) is implemented.

## 5.1 Board load on mount

**Implemented in:** [lib/board/useBoardObjects.ts](../lib/board/useBoardObjects.ts)

When `BoardPageContent` mounts with a valid `boardId` (e.g. `DEFAULT_BOARD_ID`), it calls `useBoardObjects(boardId)`. The hook subscribes to Firestore at `boards/{boardId}/objects` via `onSnapshot`. The first snapshot (and all subsequent updates) set local state, so the board state is loaded from Firestore on mount. No separate "load" call is needed; the realtime listener provides the current state.

## 5.2 TDD: Persistence after refresh

**Test in:** [lib/board/useBoardObjects.test.ts](../lib/board/useBoardObjects.test.ts)

- **"reloads board state from Firestore after remount (simulated refresh)"** — Unmounts the hook (simulated tab close), then remounts and delivers a new snapshot. Asserts that the reloaded state matches the snapshot (persisted board state).
- **"handles rapid snapshot updates without crashing and settles to last state"** — Fires many snapshot updates in quick succession; asserts the hook settles to the last state without throwing (stability with 2–3 users / rapid updates).

## 5.3 Close tab → presence/cursor removed

**Implemented in:** [lib/board/usePresence.ts](../lib/board/usePresence.ts) (Phase 4)

On connect, the hook calls `onDisconnect(presenceRef).remove()`. When the client disconnects (close tab, network drop), Firebase removes that user’s node under `presence/default/{userId}`, so other users no longer see them as online.

## 5.4 Reopen → reconnect; board state intact

- **Board state:** When the user reopens the app and navigates to `/board`, `useBoardObjects` runs again and subscribes to Firestore. The listener receives the current snapshot, so the board state is intact (same as 5.1 / 5.2).
- **Presence/cursors:** On mount, `usePresence` runs again: it writes the current user’s presence and subscribes to `presence/default` and `cursors/default`, so the user reappears for others and sees others again.

## 5.5 Rapid object movement / stability

- **Writes:** The canvas writes to Firestore on **drag end** (and create/edit), not on every frame, so rapid drags do not flood Firestore.
- **Reads:** The test "handles rapid snapshot updates without crashing and settles to last state" ensures that many incoming snapshots (e.g. from several users moving objects) are handled and the hook ends in a consistent state.

## Checkpoint

Board survives refresh and disconnect: state loads on mount, remount reloads from Firestore, presence is cleared on disconnect and re-established on reconnect.
