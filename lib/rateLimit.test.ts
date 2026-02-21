/**
 * @jest-environment node
 */
import {
  checkRateLimit,
  getPerUserLimit,
  getPerBoardLimit,
  rateLimitKey,
} from "@/lib/rateLimit";

describe("rateLimit", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("checkRateLimit", () => {
    it("allows first request", () => {
      const result = checkRateLimit("key1", { windowMs: 60_000, maxRequests: 2 });
      expect(result).toEqual({ allowed: true });
    });

    it("allows requests under limit", () => {
      checkRateLimit("key2", { windowMs: 60_000, maxRequests: 3 });
      const second = checkRateLimit("key2", { windowMs: 60_000, maxRequests: 3 });
      expect(second).toEqual({ allowed: true });
    });

    it("returns allowed: false and retryAfterSeconds when over limit", () => {
      checkRateLimit("key3", { windowMs: 60_000, maxRequests: 1 });
      const second = checkRateLimit("key3", { windowMs: 60_000, maxRequests: 1 });
      expect(second).toEqual({ allowed: false, retryAfterSeconds: expect.any(Number) });
      expect((second as { retryAfterSeconds: number }).retryAfterSeconds).toBeGreaterThan(0);
    });

    it("uses different keys independently", () => {
      checkRateLimit("keyA", { windowMs: 60_000, maxRequests: 1 });
      checkRateLimit("keyA", { windowMs: 60_000, maxRequests: 1 });
      const resultB = checkRateLimit("keyB", { windowMs: 60_000, maxRequests: 1 });
      expect(resultB).toEqual({ allowed: true });
    });
  });

  describe("rateLimitKey", () => {
    it("formats user key", () => {
      expect(rateLimitKey("user", "uid-123")).toBe("ai:user:uid-123");
    });
    it("formats board key", () => {
      expect(rateLimitKey("board", "board-456")).toBe("ai:board:board-456");
    });
  });

  describe("getPerUserLimit / getPerBoardLimit", () => {
    it("returns default when env not set", () => {
      const user = getPerUserLimit();
      const board = getPerBoardLimit();
      expect(user).toBe(30);
      expect(board).toBe(60);
    });
  });
});
