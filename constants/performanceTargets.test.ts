import {
  PERF_TARGET_FPS,
  PERF_TARGET_OBJECT_SYNC_MS,
  PERF_TARGET_CURSOR_SYNC_MS,
  PERF_TARGET_OBJECT_COUNT,
  PERF_TARGET_CONCURRENT_USERS,
} from "./performanceTargets";

describe("performanceTargets", () => {
  it("exports FPS target of 60", () => {
    expect(PERF_TARGET_FPS).toBe(60);
  });

  it("exports object sync latency target of 100ms", () => {
    expect(PERF_TARGET_OBJECT_SYNC_MS).toBe(100);
  });

  it("exports cursor sync latency target of 50ms", () => {
    expect(PERF_TARGET_CURSOR_SYNC_MS).toBe(50);
  });

  it("exports object capacity target of 500", () => {
    expect(PERF_TARGET_OBJECT_COUNT).toBe(500);
  });

  it("exports concurrent users target of 5", () => {
    expect(PERF_TARGET_CONCURRENT_USERS).toBe(5);
  });
});
