# Phase 5 — Persistence & Reconnect

This doc summarizes how Phase 5 (Persistence & Reconnect) is implemented.

## Requirements coverage

| Requirement | Covered | Where |
|-------------|---------|--------|
| **Cursors** — Multiplayer cursors with names, real-time movement | ✓ | Phase 4: [usePresence.ts](../hooks/usePresence.ts) (throttled cursor writes to RTDB), [BoardCanvas.tsx](../components/canvas/BoardCanvas.tsx) (cursor layer + name labels). See also 5.3, 5.4. |
| **Sync** — Object creation/modification appears instantly for all users | ✓ | [useBoardObjects.ts](../lib/board/useBoardObjects.ts): Firestore `onSnapshot` on `boards/{boardId}/objects`; writes via `setObjects` → setDoc/updateDoc/deleteDoc (5.1). |
| **Presence** — Clear indication of who's currently on the board | ✓ | Phase 4: [usePresence.ts](../hooks/usePresence.ts) (presence at `presence/{boardId}/{userId}`); board UI shows “Online” and other users’ cursors with names (5.3, 5.4). |
| **Conflicts** — Handle simultaneous edits (last-write-wins, document approach) | ✓ | Section 5.6 below; Firestore field-level merge; silent overwrite. |
| **Resilience** — Graceful disconnect/reconnect handling | ✓ | 5.3: `onDisconnect` removes presence/cursor. 5.4: Reopen → re-subscribe to Firestore + RTDB; board state and presence/cursors restored. |
| **Persistence** — Board state survives all users leaving and returning | ✓ | Board state lives in Firestore (not RTDB). All users can leave; on return, `useBoardObjects` subscribes and loads current snapshot (5.1, 5.2). |

## 5.1 Board load on mount

**Implemented in:** [lib/board/useBoardObjects.ts](../lib/board/useBoardObjects.ts)

When `BoardPageContent` mounts with a valid `boardId` (e.g. `DEFAULT_BOARD_ID`), it calls `useBoardObjects(boardId)`. The hook subscribes to Firestore at `boards/{boardId}/objects` via `onSnapshot`. The first snapshot (and all subsequent updates) set local state, so the board state is loaded from Firestore on mount. No separate "load" call is needed; the realtime listener provides the current state.

## 5.2 TDD: Persistence after refresh

**Test in:** [lib/board/useBoardObjects.test.ts](../lib/board/useBoardObjects.test.ts)

- **"reloads board state from Firestore after remount (simulated refresh)"** — Unmounts the hook (simulated tab close), then remounts and delivers a new snapshot. Asserts that the reloaded state matches the snapshot (persisted board state).
- **"handles rapid snapshot updates without crashing and settles to last state"** — Fires many snapshot updates in quick succession; asserts the hook settles to the last state without throwing (stability with 2–3 users / rapid updates).

## 5.3 Close tab → presence/cursor removed

**Implemented in:** [hooks/usePresence.ts](../hooks/usePresence.ts) (Phase 4)

On connect, the hook calls `onDisconnect(presenceRef).remove()`. When the client disconnects (close tab, network drop), Firebase removes that user’s node under `presence/default/{userId}`, so other users no longer see them as online.

## 5.4 Reopen → reconnect; board state intact

- **Board state:** When the user reopens the app and navigates to `/board`, `useBoardObjects` runs again and subscribes to Firestore. The listener receives the current snapshot, so the board state is intact (same as 5.1 / 5.2).
- **Presence/cursors:** On mount, `usePresence` runs again: it writes the current user’s presence and subscribes to `presence/default` and `cursors/default`, so the user reappears for others and sees others again.

## 5.5 Rapid object movement / stability

- **Writes:** The canvas writes to Firestore on **drag end** (and create/edit), not on every frame, so rapid drags do not flood Firestore.
- **Reads:** The test "handles rapid snapshot updates without crashing and settles to last state" ensures that many incoming snapshots (e.g. from several users moving objects) are handled and the hook ends in a consistent state.

## 5.6 Conflicts — simultaneous edits (last-write-wins)

**Approach:** Last-write-wins; no conflict UI or merge notifications.

- **Mechanism:** Firestore is the single source of truth. Each client applies local edits via `setObjects()` which sends `setDoc` (new objects) or `updateDoc` (changed fields only). Firestore merges `updateDoc` at **field level**: if User A updates `x,y` and User B updates `text` on the same object, the document ends up with A’s position and B’s text; if both update the same field (e.g. both move the same sticky), the last write to that field wins.
- **Convergence:** Every client subscribes with `onSnapshot` and replaces local state with `snapshotToObjects(snapshot)`, so all clients converge to the same view after the next snapshot.
- **UX:** Silent overwrite — no conflict dialogs or warnings (acceptable per MVP spec).
- **Coverage:** Same flow handles two users editing different objects, the same object (different or same fields), and rapid movement; the rapid-snapshot test in `useBoardObjects.test.ts` asserts stability under many quick updates.

## Checkpoint

Board survives refresh and disconnect: state loads on mount, remount reloads from Firestore, presence is cleared on disconnect and re-established on reconnect.
