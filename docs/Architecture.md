MVP Architecture — Collaborative Whiteboard with AI
1. High-Level System Overview
Architecture style:
Serverless + managed realtime + SPA frontend.
Core principle:
Let managed services handle realtime, auth, and scaling
so you can ship a stable multiplayer MVP in 24 hours.

2. Final Tech Stack (Locked)
Frontend
    • Framework: Next.js (SPA-first usage)
    • Canvas rendering: Konva.js (or Fabric.js equivalent)
    • State sync: Firebase realtime listeners
    • Auth UI: Firebase Auth SDK
Responsibilities
    • Infinite board pan/zoom
    • Sticky notes + shapes rendering
    • Object transforms (move/resize/edit)
    • Multiplayer cursors + presence display
    • Calling AI command endpoint

Backend (Serverless Monolith)
Platform
    • Next.js API routes (serverless functions)
Responsibilities
    • AI command processing endpoint
    • Auth validation
    • Writing AI-generated operations → Firestore
    • Basic rate limiting & logging
No microservices.
No background queue for MVP.

Realtime & Database Layer
Primary database — Board State
    • Firebase Firestore (Document DB)
Stores:
    • boards
    • sticky notes
    • shapes
    • frames
    • connectors
    • text content
    • transforms
Provides:
    • realtime listeners
    • persistence after refresh
    • multi-user sync

Low-latency realtime channel — Presence & Cursors
    • Firebase Realtime Database (Key-value)
Stores:
    • user online status
    • cursor x/y positions
    • disconnect detection (onDisconnect)
Why separate?
    • Cursor updates are high frequency
    • RTDB is cheaper + lower latency than Firestore writes

Authentication
    • Firebase Authentication
Methods:
    • Google login (primary)
    • Email/password fallback
Authorization model:
    • No RBAC for MVP
    • Single shared board; any authenticated user can open /board and edit

AI Layer
Model access
    • LLM API via serverless endpoint
Flow
    1. User enters natural-language command
    2. Frontend → /api/ai-command
    3. LLM returns tool/function calls
    4. Server writes operations → Firestore
    5. Firestore realtime sync updates all users instantly
No embeddings.
No vector DB.
No background jobs.

Deployment & DevOps
Hosting
    • Vercel or Firebase Hosting (either acceptable)
CI/CD
    • Git push → automatic deploy
    • Basic lint/test in pipeline
Cost profile
    • Mostly free tier
    • Small AI token usage only

3. How This Architecture Covers Every MVP Requirement
Canvas & Objects
    • Infinite board → frontend canvas
    • Sticky notes & shapes → Firestore documents
    • Create/move/edit → Firestore realtime writes
Multiplayer Collaboration
    • Real-time sync → Firestore listeners
    • Cursors → Realtime DB streaming
    • Presence → Realtime DB onDisconnect
    • Conflict handling → last-write-wins (acceptable per spec)
    • Persistence → Firestore storage
AI Agent
    • Natural language → serverless AI endpoint
    • Multi-step commands → tool execution + Firestore writes
    • Shared results → Firestore realtime broadcast
Platform Requirements
    • Auth → Firebase Auth
    • 5+ users → managed scaling
    • Public deployment → Vercel/Firebase Hosting

4. Final Architecture Summary (Submission-Ready)
The MVP uses a serverless, SPA-first architecture built with Next.js on the frontend and Firebase for authentication, realtime synchronization, and persistence.
Firestore (document database) stores board state and provides realtime collaboration, while Firebase Realtime Database handles low-latency cursor streaming and presence detection.
A serverless API endpoint integrates an LLM with tool-calling to translate natural-language commands into board operations written to Firestore, instantly synchronized across users.
This architecture minimizes operational complexity, supports 5+ concurrent collaborators, and enables rapid delivery within the one-week timeline.
