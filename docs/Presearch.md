Pre-Search Document — Collaborative Whiteboard with AI
Phase 1: Define Constraints
1. Scale & Load Profile
    • Launch: 5–10 concurrent users, ~20 total testers
    • 6 months: ~1,000–2,000 monthly users, ~25–50 concurrent
    • Traffic: Spiky/bursty around collaborative sessions
    • Realtime: Hard realtime collaboration required (<100 ms object sync, <50 ms cursor)
    • Cold start: Moderate tolerance (~1–2 s initial load acceptable)
2. Budget & Cost Ceiling
    • Development budget: ≤ $20 (mostly AI API usage)
    • Monthly limit: ~≤ $200 for ~1K users
    • Pricing model: Pay-per-use acceptable
    • Tradeoff: Spend money to save development time (managed services over custom infra)
3. Time to Ship
    • MVP timeline: 24 hours
    • Priority: Speed-to-market over long-term architecture
    • Iteration cadence: Daily during sprint, weekly post-launch
4. Compliance & Regulatory Needs
    • HIPAA: Not applicable
    • GDPR: Formal compliance not required for demo scope
    • SOC 2: Not required
    • Data residency: No strict requirement
5. Team & Skill Constraints
    • Team: Solo developer
    • Skills: Next.js, Node.js, Python (FastAPI)
    • Approach: Balanced learning with strong bias toward fast shipping

Phase 2: Architecture Discovery
6. Hosting & Deployment
    • Model: Serverless-first with managed realtime backend
    • CI/CD: Basic lint/test + automatic deploy
    • Scaling: Designed for 5+ concurrent users and burst traffic using managed services
7. Authentication & Authorization
    • Auth: Social login (Google) with optional email/password fallback
    • RBAC: Not required for MVP (all users are editors)
    • Single board; authenticated users open /board
8. Database & Data Layer
    • Type:
        ◦ Document DB (Firestore) → board state & persistence
        ◦ Optional key-value realtime store → cursors/presence
    • Realtime: Required
    • Search/vector: Not needed for MVP
    • Caching: Minimal (client + platform)
    • Read/write: Read-heavy board state; high-frequency cursor writes throttled
9. Backend/API Architecture
    • Structure: Monolith (single Next.js app)
    • API style: REST endpoints (AI command + validation)
    • Queues/jobs: Not required for MVP; synchronous AI execution
10. Frontend Framework & Rendering
    • SEO: Not required
    • Offline/PWA: Not required
    • Rendering: SPA-first (within hybrid Next.js if used) for realtime interactivity
11. Third-Party Integrations
    • Services: Firebase (Auth, Firestore, Realtime DB), AI API
    • Pricing risks: AI token usage and realtime read/write scaling
    • Vendor lock-in: Accepted for MVP to maximize speed

Phase 3: Post-Stack Refinement
12. Security Vulnerabilities
    • Enforce scoped Firestore rules and authenticated access
    • Protect environment keys and rate-limit AI endpoint
    • Avoid unsafe dependencies and public write access
13. File Structure & Organization
    • Single-repo monolith
    • Feature-based structure (features/board, features/auth, etc.)
    • Standard Next.js directories (app, components, lib, types)
14. Naming & Code Style
    • camelCase (variables/functions), PascalCase (components), kebab-case (folders)
    • ESLint + Prettier with auto-formatting
15. Testing Strategy
    • Focus on integration + E2E over heavy unit coverage
    • Tools: lightweight test runner + Playwright-style E2E
    • Coverage target: ~20–30% MVP critical paths
    • Mock Firebase/AI in tests
16. Tooling & Developer Experience
    • VS Code with ESLint, Prettier, Tailwind IntelliSense
    • Firebase CLI + standard Node tooling
    • Debugging via browser DevTools, logs, and Firebase console
    • Avoid heavy enterprise observability for MVP speed

Result:
A serverless, Firebase-backed, SPA-first collaborative whiteboard with AI, optimized for rapid MVP delivery, minimal cost, and reliable realtime sync suitable for the one-week fellowship gate.
