# 24-Hour MVP Checklist

**Goal:** Pass the hard gate with a solid multiplayer whiteboard. TDD for every slice. AI minimal/last.

**Decisions locked:**
- Canvas: **Konva.js**
- AI: **OpenAI GPT — add later** (one basic AI command only if time; realtime first)
- Board flow: **Single shared board**; any authenticated user can open /board and edit in real time
- TDD: **Strict** — write failing test first for each slice
- Shapes (MVP): **Rectangle only**
- Frames & connectors: **Add after 24h**
- Conflict UX: **Silent overwrite** (last-write-wins, no notification)

---

## Phase 1 — Bootstrap & Auth (Hours 0–3)

- [ ] **1.1** Project bootstrap: Next.js app created, Firebase project created
- [ ] **1.2** Firebase enabled: Auth (Google + email), Firestore, Realtime DB
- [ ] **1.3** Firebase SDK added to app; empty repo pushed to GitHub
- [ ] **1.4** *TDD:* Auth — test: unauthenticated user cannot access `/board`
- [ ] **1.5** Firebase Google login (and email fallback); session handling
- [ ] **1.6** Redirect to board page after login; protect board route (auth required)
- [ ] **1.7** *TDD:* Auth — test: authenticated user can open board

**Checkpoint:** Log in and open the board.

---

## Phase 2 — Core Canvas, Local Only (Hours 3–8)

- [ ] **2.1** *TDD:* Canvas — test: board page renders canvas with pan/zoom
- [ ] **2.2** Infinite board with pan and zoom (Konva.js)
- [ ] **2.3** *TDD:* Sticky note — test: create sticky, edit text, appears on canvas
- [ ] **2.4** Sticky notes: create, editable text, (basic color if trivial)
- [ ] **2.5** *TDD:* Shape — test: create rectangle at position, move it
- [ ] **2.6** One shape type: **rectangle** (create, move)
- [ ] **2.7** Create object, drag/move object, edit text (no realtime yet)

**Checkpoint:** Single-user whiteboard works locally.

---

## Phase 3 — Firestore Realtime Object Sync (Hours 8–12) — HARD GATE

- [ ] **3.1** Firestore structure (single board): `boards/default/objects/{objectId}`
- [ ] **3.2** *TDD:* Sync — test: create object in one client → appears in second client (or mock listener)
- [ ] **3.3** On create/move/edit → write to Firestore
- [ ] **3.4** Realtime listener on `boards/default/objects` → render updates
- [ ] **3.5** Manual test: two browsers — move sticky → both update instantly
- [ ] **3.6** Conflict: last-write-wins; silent overwrite (no UX warning)

**Checkpoint:** ✔ Real-time sync between 2 users (MVP pass/fail).

---

## Phase 4 — Cursors & Presence (Hours 12–15)

- [ ] **4.1** Realtime DB paths (single board): `presence/default/{userId}`, `cursors/default/{userId}`
- [ ] **4.2** *TDD:* Presence — test: second user joins → first user sees presence/cursor (or mocked)
- [ ] **4.3** Update cursor position (throttled); `onDisconnect` for offline
- [ ] **4.4** Render: colored cursor + user name label per connected user
- [ ] **4.5** Manual test: two users see each other’s cursors and online status

**Checkpoint:** Two users see cursors and presence.

---

## Phase 5 — Persistence & Reconnect (Hours 15–18)

- [x] **5.1** Board load: on mount, load board state from Firestore (single board)
- [x] **5.2** *TDD:* Persistence — test: after “refresh”, board state reloads from Firestore
- [x] **5.3** Close tab → presence/cursor removed (onDisconnect)
- [x] **5.4** Reopen → reconnect; board state intact
- [x] **5.5** Rapid object movement → no crashes; stable with 2–3 users

**Checkpoint:** Board survives refresh and disconnect.

---

## Phase 6 — Single Board (no creation/sharing)

- [x] **6.1** Single board at `/board`; all authenticated users open `/board` and collaborate
- [x] **6.2** No create-board or share-link flow; everyone uses the same shared board. “New board” 
**Checkpoint:** All auth users open /board and see the same board.

---

## Phase 7 — AI Command (Minimal — only if time) (Hours 18–21)

- [ ] **7.1** *TDD:* AI — test: POST to `/api/ai-command` with “Add sticky note with text X” → object appears in Firestore
- [ ] **7.2** `/api/ai-command` serverless route; call OpenAI with tool schema
- [ ] **7.3** One command: “Add sticky note with text X” → write to Firestore
- [ ] **7.4** All users see AI-created object via existing realtime listener

**Checkpoint:** AI can create one sticky note (satisfies minimal AI gate if required).

---

## Phase 8 — Deploy & Verify (Hours 21–24)

- [ ] **8.1** Deploy to Vercel or Firebase Hosting; set env vars (Firebase, optional OpenAI)
- [ ] **8.2** Login works in production; two users collaborate online
- [ ] **8.3** Run evaluation: 2 users edit simultaneously; refresh mid-edit; rapid movement; disconnect/reconnect
- [ ] **8.4** Optional: 5 users basic test

**Checkpoint:** Public shareable link passes MVP tests.

---

## MVP Gate Checklist (Official)

| Requirement | Phase |
|-------------|--------|
| Infinite board with pan/zoom | 2 |
| Sticky notes with editable text | 2 |
| At least one shape type (rectangle) | 2 |
| Create, move, and edit objects | 2, 3 |
| Real-time sync between 2+ users | 3 |
| Multiplayer cursors with name labels | 4 |
| Presence awareness (who's online) | 4 |
| User authentication | 1 |
| Single board at /board (all auth users) | 6 |
| Deployed and publicly accessible | 8 |
| (Optional) Basic AI command | 7 |

---

## Survival Rules

1. **TDD:** Write failing test first for each slice, then implement.
2. **No UI polish** — ugly but working.
3. **No extra features** — rectangle only; no frames/connectors until after 24h.
4. **Realtime first, AI second** — Phase 3 is the true pass/fail.
5. **Ship early** — deploy by hour 21 so hour 23–24 is verification.
