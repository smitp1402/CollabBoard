/**
 * In-memory rate limiter for AI commands. Use per-user and/or per-board keys.
 * For multi-instance deployments, replace with a shared store (e.g. Firestore, Redis).
 */

type WindowEntry = { count: number; resetAt: number };

const store = new Map<string, WindowEntry>();

const DEFAULT_WINDOW_MS = 60_000; // 1 minute
const DEFAULT_PER_USER = 30;
const DEFAULT_PER_BOARD = 60;

function getLimit(envKey: string, defaultVal: number): number {
  const raw = process.env[envKey];
  if (raw == null || raw === "") return defaultVal;
  const n = parseInt(raw, 10);
  return Number.isNaN(n) || n < 1 ? defaultVal : n;
}

export type RateLimitResult =
  | { allowed: true }
  | { allowed: false; retryAfterSeconds: number };

/**
 * Check and consume one request for the given key. Window is sliding or fixed
 * per key; we use a simple fixed window (reset after windowMs from first request).
 */
export function checkRateLimit(
  key: string,
  options?: {
    windowMs?: number;
    maxRequests?: number;
  }
): RateLimitResult {
  const windowMs = options?.windowMs ?? DEFAULT_WINDOW_MS;
  const maxRequests = options?.maxRequests ?? 30;
  const now = Date.now();
  const entry = store.get(key);

  if (!entry) {
    store.set(key, { count: 1, resetAt: now + windowMs });
    return { allowed: true };
  }

  if (now >= entry.resetAt) {
    store.set(key, { count: 1, resetAt: now + windowMs });
    return { allowed: true };
  }

  if (entry.count >= maxRequests) {
    const retryAfterSeconds = Math.ceil((entry.resetAt - now) / 1000);
    return { allowed: false, retryAfterSeconds };
  }

  entry.count += 1;
  return { allowed: true };
}

export function getPerUserLimit(): number {
  return getLimit("AI_COMMANDS_PER_USER_PER_MINUTE", DEFAULT_PER_USER);
}

export function getPerBoardLimit(): number {
  return getLimit("AI_COMMANDS_PER_BOARD_PER_MINUTE", DEFAULT_PER_BOARD);
}

export function rateLimitKey(type: "user" | "board", id: string): string {
  return `ai:${type}:${id}`;
}
