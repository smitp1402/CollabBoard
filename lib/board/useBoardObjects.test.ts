import { renderHook, act } from "@testing-library/react";
import { useBoardObjects } from "./useBoardObjects";

let snapshotCallback: ((snapshot: unknown) => void) | null = null;

jest.mock("@/lib/firebase/client", () => ({
  getDb: () => ({}),
  auth: null,
  getRealtimeDb: () => null,
  app: null,
}));

jest.mock("firebase/firestore", () => ({
  collection: () => ({
    onSnapshot: (callback: (snapshot: unknown) => void) => {
      snapshotCallback = callback;
      return () => {
        snapshotCallback = null;
      };
    },
  }),
  doc: () => ({}),
  onSnapshot: (_ref: unknown, callback: (snapshot: unknown) => void) => {
    snapshotCallback = callback;
    return () => {
      snapshotCallback = null;
    };
  },
  setDoc: () => Promise.resolve(),
  updateDoc: () => Promise.resolve(),
  deleteDoc: () => Promise.resolve(),
}));

function createMockSnapshot(docs: { id: string; data: () => Record<string, unknown> }[]) {
  return {
    forEach: (fn: (doc: { id: string; data: () => Record<string, unknown> }) => void) => {
      docs.forEach(fn);
    },
  };
}

describe("useBoardObjects", () => {
  beforeEach(() => {
    snapshotCallback = null;
  });

  it("updates objects when listener receives a snapshot", async () => {
    const { result } = renderHook(() => useBoardObjects("default"));

    expect(result.current.objects).toEqual([]);
    expect(result.current.loading).toBe(true);

    await act(() => {
      const snapshot = createMockSnapshot([
        {
          id: "sticky-1",
          data: () => ({
            type: "sticky",
            x: 10,
            y: 20,
            width: 120,
            height: 80,
            text: "Hello",
          }),
        },
      ]);
      snapshotCallback?.(snapshot);
    });

    expect(result.current.loading).toBe(false);
    expect(result.current.objects).toHaveLength(1);
    expect(result.current.objects[0]).toMatchObject({
      id: "sticky-1",
      type: "sticky",
      x: 10,
      y: 20,
      width: 120,
      height: 80,
      text: "Hello",
    });
  });
});
