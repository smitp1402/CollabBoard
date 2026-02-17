This assumes the stack we finalized:
    • Next.js (SPA)
    • Firebase Auth
    • Firestore (board objects realtime)
    • Realtime DB (cursors & presence)
    • Serverless AI endpoint
    • Konva/Fabric canvas
No extra features. Only hard-gate MVP.

24-Hour MVP Execution Plan
Hour 0–1 — Project bootstrap (no overthinking)
Goal: Running app + Firebase connected.
Do only:
    • Create Next.js app
    • Create Firebase project
    • Enable:
        ◦ Auth (Google + email)
        ◦ Firestore
        ◦ Realtime DB
    • Add Firebase SDK to app
    • Push empty repo to GitHub
Checkpoint:
You can run the app and connect to Firebase.
➡️ If this takes >1 hr, you are over-configuring.

Hour 1–3 — Authentication (must be fast)
Goal: User can log in and reach /board.
Implement:
    • Firebase Google login button
    • Simple session handling
    • Redirect to board page after login
    • Protect board route (auth required)
UI can be ugly. Don’t style.
Checkpoint:
You can log in and open the board.

Hour 3–8 — Core whiteboard canvas (MOST CRITICAL)
Goal: Local whiteboard works before realtime.
Build:
    • Canvas with pan + zoom
    • Render:
        ◦ Sticky note
        ◦ One shape (rectangle)
    • Allow:
        ◦ Create object
        ◦ Drag/move object
        ◦ Edit text
Do NOT add realtime yet.
Checkpoint:
Single-user whiteboard fully usable.
➡️ If this fails, realtime won’t save you.

Hour 8–12 — Firestore realtime object sync (HARD GATE)
Goal: Two browsers sync board objects.
Implement:
    • Firestore collection (single shared board):
      boards/default/objects/{objectId}
    • On create/move/edit → write to Firestore
    • Add realtime listener to render updates
    • Test:
        ◦ Open two browsers
        ◦ Move sticky → both update instantly
Checkpoint (CRITICAL):
✔ Real-time sync between 2 users
➡️ This is the true MVP pass/fail.

Hour 12–15 — Cursors & presence (Realtime DB)
Goal: See other users live.
Implement:
    • Realtime DB paths (single board):
      presence/default/{userId}
      cursors/default/{userId}
    • Update cursor position (throttled)
    • Use onDisconnect for offline detection
    • Render:
        ◦ colored cursor
        ◦ user name label
Checkpoint:
Two users see each other’s cursors + online status.

Hour 15–18 — Persistence, reconnect, and stability
Goal: Board survives refresh & disconnect.
Test and fix:
    • Refresh browser → board reloads from Firestore (single board)
    • Close tab → presence disappears
    • Reopen → reconnect works
    • Rapid object movement → no crashes
Checkpoint:
System feels stable with 2–3 users.

Hour 18–21 — AI command endpoint (basic only)
Goal: One working AI command.
Build:
    • /api/ai-command serverless route
    • Send prompt → LLM with tool schema
    • Support one command first:
        ◦ “Add sticky note with text X”
    • Write result → Firestore
    • Verify:
        ◦ All users see AI-created object instantly
Checkpoint:
AI can create a sticky note successfully.
➡️ This satisfies AI MVP presence.

Hour 21–23 — Deploy publicly (REQUIRED)
Goal: Public working URL.
Do:
    • Deploy to Vercel or Firebase Hosting
    • Set environment variables
    • Test:
        ◦ Login works in production
        ◦ Two users collaborate online
        ◦ AI command works live
Checkpoint:
You have a shareable link that passes MVP tests.

Hour 23–24 — Final MVP verification (gate test)
Run the official evaluation scenarios:
    • 2 users edit simultaneously
    • Refresh mid-edit → state persists
    • Rapid sticky movement → sync stable
    • Disconnect/reconnect works
    • 5 users basic test (optional but ideal)
If all pass:
🎉 You cleared the 24-hour MVP gate.

Critical survival rules for these 24 hours
1. No UI polishing
Ugly but working wins.
2. No extra features
Only spec items matter.
3. Realtime first, AI second
Broken sync = project fail.
Simple AI = acceptable.
4. Ship early
Deploy by hour 21, not 24.
