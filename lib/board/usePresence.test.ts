import { renderHook, act } from "@testing-library/react";
import { usePresence } from "./usePresence";
import type { User } from "firebase/auth";

const mockDb = { __mock: true };

const presenceCallbacks: Array<(snapshot: { val: () => unknown }) => void> = [];
const cursorsCallbacks: Array<(snapshot: { val: () => unknown }) => void> = [];

jest.mock("@/lib/firebase/client", () => ({
  getRealtimeDb: () => mockDb,
  auth: null,
  getDb: () => null,
  app: null,
}));

jest.mock("firebase/database", () => ({
  ref: (_db: unknown, path: string) => ({ _path: path }),
  onValue: (_ref: { _path: string }, callback: (snapshot: { val: () => unknown }) => void) => {
    if (_ref._path.startsWith("presence/")) presenceCallbacks.push(callback);
    if (_ref._path.startsWith("cursors/")) cursorsCallbacks.push(callback);
    return () => {
      const i = presenceCallbacks.indexOf(callback);
      if (i !== -1) presenceCallbacks.splice(i, 1);
      const j = cursorsCallbacks.indexOf(callback);
      if (j !== -1) cursorsCallbacks.splice(j, 1);
    };
  },
  set: () => Promise.resolve(),
  update: () => Promise.resolve(),
  onDisconnect: () => ({ remove: () => Promise.resolve() }),
}));

function createMockUser(uid: string, displayName: string): User {
  return { uid, displayName } as User;
}

describe("usePresence", () => {
  beforeEach(() => {
    presenceCallbacks.length = 0;
    cursorsCallbacks.length = 0;
  });

  it("includes second user in otherUsers when presence and cursor are emitted", async () => {
    const user = createMockUser("user1", "Alice");
    const { result } = renderHook(() =>
      usePresence("default", user, { x: 0, y: 0 })
    );

    expect(result.current.otherUsers).toEqual([]);

    await act(() => {
      presenceCallbacks.forEach((cb) =>
        cb({ val: () => ({ user2: { displayName: "Bob", color: "#ff0000" } }) })
      );
      cursorsCallbacks.forEach((cb) =>
        cb({ val: () => ({ user2: { x: 10, y: 20 } }) })
      );
    });

    expect(result.current.otherUsers).toHaveLength(1);
    expect(result.current.otherUsers[0]).toMatchObject({
      id: "user2",
      displayName: "Bob",
      color: "#ff0000",
      cursor: { x: 10, y: 20 },
    });
  });

  it("excludes current user from otherUsers", async () => {
    const user = createMockUser("user1", "Alice");
    const { result } = renderHook(() =>
      usePresence("default", user, { x: 0, y: 0 })
    );

    await act(() => {
      presenceCallbacks.forEach((cb) =>
        cb({
          val: () => ({
            user1: { displayName: "Alice", color: "#00ff00" },
            user2: { displayName: "Bob", color: "#ff0000" },
          }),
        })
      );
      cursorsCallbacks.forEach((cb) =>
        cb({
          val: () => ({
            user1: { x: 1, y: 2 },
            user2: { x: 10, y: 20 },
          }),
        })
      );
    });

    const ids = result.current.otherUsers.map((u) => u.id);
    expect(ids).not.toContain("user1");
    expect(ids).toContain("user2");
    expect(result.current.otherUsers).toHaveLength(1);
    expect(result.current.otherUsers[0]).toMatchObject({
      id: "user2",
      displayName: "Bob",
      cursor: { x: 10, y: 20 },
    });
  });

  it("returns empty otherUsers when boardId is empty", () => {
    const user = createMockUser("user1", "Alice");
    const { result } = renderHook(() =>
      usePresence("", user, { x: 0, y: 0 })
    );
    expect(result.current.otherUsers).toEqual([]);
    expect(presenceCallbacks).toHaveLength(0);
  });

  it("returns empty otherUsers when user is null", () => {
    const { result } = renderHook(() =>
      usePresence("default", null, { x: 0, y: 0 })
    );
    expect(result.current.otherUsers).toEqual([]);
    expect(presenceCallbacks).toHaveLength(0);
  });
});
