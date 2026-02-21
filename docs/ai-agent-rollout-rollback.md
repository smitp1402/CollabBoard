# AI Agent Rollout and Rollback

## Feature flag

- **Env var:** `AI_AGENT_ENABLED`
- **Behavior:** When set to `"false"` or `"0"`, `POST /api/ai/commands` returns **503** with body `{ error: { code: "FEATURE_DISABLED", message: "AI commands are temporarily disabled." } }`. Auth and idempotency are not run (fail fast).
- **Default:** If unset or any other value (e.g. `"true"`), the feature is enabled.

## Staged rollout

1. **Internal:** Deploy with `AI_AGENT_ENABLED=true` and use only on internal/test boards. Confirm commands complete and board updates sync in realtime.
2. **Limited users:** Optionally restrict by allowlist (e.g. env list of UIDs or board IDs) if you add that check in the route; otherwise rely on rate limits and monitoring.
3. **Full:** Set `AI_AGENT_ENABLED=true` (or leave unset) for production. Monitor structured logs (`event: "ai_command"`) for status, latency, and failureReason.

## Rollback

1. Set `AI_AGENT_ENABLED=false` (or `0`) in the deployment environment.
2. Redeploy (or restart) so the API route reads the new env.
3. **Validation:** Call `POST /api/ai/commands` with a valid auth token and body; expect **503** and no command creation or runner execution. The AI panel will show an error when the API returns 503; users can be informed that AI commands are temporarily unavailable.

No data migration is required for rollback; existing `ai_commands` documents in Firestore remain for history.

## Rate limits (optional tuning)

- `AI_COMMANDS_PER_USER_PER_MINUTE` — default 30.
- `AI_COMMANDS_PER_BOARD_PER_MINUTE` — default 60.

When exceeded, the API returns **429** with `Retry-After` and a RATE_LIMITED error body. Adjust in `.env` or deployment config if needed during or after rollout.
