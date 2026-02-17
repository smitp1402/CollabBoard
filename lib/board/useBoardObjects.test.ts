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

  it("reloads board state from Firestore after remount (simulated refresh)", async () => {
    const initialSnapshot = createMockSnapshot([
      {
        id: "obj-1",
        data: () => ({ type: "sticky", x: 0, y: 0, width: 120, height: 80, text: "First" }),
      },
    ]);

    const { result, unmount } = renderHook(() => useBoardObjects("default"));

    await act(() => {
      snapshotCallback?.(initialSnapshot);
    });

    expect(result.current.objects).toHaveLength(1);
    expect(result.current.objects[0].text).toBe("First");

    unmount();

    const afterRefreshSnapshot = createMockSnapshot([
      {
        id: "obj-1",
        data: () => ({ type: "sticky", x: 0, y: 0, width: 120, height: 80, text: "First" }),
      },
      {
        id: "obj-2",
        data: () => ({ type: "rectangle", x: 100, y: 100, width: 80, height: 60 }),
      },
    ]);

    const { result: result2 } = renderHook(() => useBoardObjects("default"));

    expect(result2.current.loading).toBe(true);

    await act(() => {
      snapshotCallback?.(afterRefreshSnapshot);
    });

    expect(result2.current.loading).toBe(false);
    expect(result2.current.objects).toHaveLength(2);
    expect(result2.current.objects[0]).toMatchObject({ id: "obj-1", text: "First" });
    expect(result2.current.objects[1]).toMatchObject({ id: "obj-2", type: "rectangle", x: 100, y: 100 });
  });

  it("handles rapid snapshot updates without crashing and settles to last state", async () => {
    const { result } = renderHook(() => useBoardObjects("default"));

    await act(() => {
      for (let i = 0; i < 10; i++) {
        snapshotCallback?.(
          createMockSnapshot([
            {
              id: "sticky-1",
              data: () => ({ type: "sticky", x: i * 10, y: 20, width: 120, height: 80, text: `Step ${i}` }),
            },
          ])
        );
      }
    });

    expect(result.current.objects).toHaveLength(1);
    expect(result.current.objects[0]).toMatchObject({ id: "sticky-1", x: 90, text: "Step 9" });
  });
});
