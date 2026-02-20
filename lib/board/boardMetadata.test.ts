import {
  createBoardMeta,
  listBoards,
  ensureDefaultBoard,
  type BoardMeta,
} from "./boardMetadata";

const mockSetDoc = jest.fn();
const mockGetDocs = jest.fn();
const mockGetDoc = jest.fn();
const mockDoc = jest.fn((...args: unknown[]) => ({ path: args.join("/") }));
const mockCollection = jest.fn((...args: unknown[]) => ({ path: args.join("/") }));
const mockTimestamp = { now: jest.fn(() => ({ seconds: 123, nanoseconds: 0 }) as ReturnType<ReturnType<typeof jest.fn>>) };

jest.mock("firebase/firestore", () => ({
  collection: (...args: unknown[]) => mockCollection(...args),
  doc: (...args: unknown[]) => mockDoc(...args),
  getDocs: (...args: unknown[]) => mockGetDocs(...args),
  getDoc: (...args: unknown[]) => mockGetDoc(...args),
  setDoc: (...args: unknown[]) => mockSetDoc(...args),
  serverTimestamp: () => mockTimestamp.now(),
  Timestamp: { now: () => mockTimestamp.now() },
}));

describe("boardMetadata", () => {
  const db = {} as ReturnType<typeof import("@/lib/firebase/client").getDb>;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("createBoardMeta", () => {
    it("writes board document with name, createdBy, createdAt", async () => {
      await createBoardMeta(db, "board-1", "My board", "user-uid");

      expect(mockSetDoc).toHaveBeenCalledTimes(1);
      const [ref, data] = mockSetDoc.mock.calls[0];
      expect(ref).toBeDefined();
      expect(data).toMatchObject({
        name: "My board",
        createdBy: "user-uid",
      });
      expect(data.createdAt).toBeDefined();
    });
  });

  describe("listBoards", () => {
    it("returns empty array when no boards exist", async () => {
      mockGetDocs.mockResolvedValue({ empty: true, forEach: () => {} });

      const list = await listBoards(db);

      expect(list).toEqual([]);
    });

    it("maps board docs to BoardMeta with id, name, createdBy, createdAt", async () => {
      const createdAt = { seconds: 100, nanoseconds: 0 };
      mockGetDocs.mockResolvedValue({
        empty: false,
        forEach: (fn: (doc: { id: string; data: () => Record<string, unknown> }) => void) => {
          fn({ id: "default", data: () => ({ name: "Default board", createdBy: "", createdAt }) });
          fn({ id: "board-2", data: () => ({ name: "Second", createdBy: "u2", createdAt }) });
        },
      });

      const list = await listBoards(db);

      expect(list).toHaveLength(2);
      expect(list[0]).toMatchObject({ id: "default", name: "Default board", createdBy: "" });
      expect(list[1]).toMatchObject({ id: "board-2", name: "Second", createdBy: "u2" });
    });
  });

  describe("ensureDefaultBoard", () => {
    it("creates default board doc when it does not exist", async () => {
      mockGetDoc.mockResolvedValue({ exists: () => false });

      await ensureDefaultBoard(db);

      expect(mockSetDoc).toHaveBeenCalledTimes(1);
      const [ref, data] = mockSetDoc.mock.calls[0];
      expect(data).toMatchObject({
        name: "Default board",
        createdBy: "",
      });
    });

    it("does not write when default board already exists", async () => {
      mockGetDoc.mockResolvedValue({ exists: () => true });

      await ensureDefaultBoard(db);

      expect(mockSetDoc).not.toHaveBeenCalled();
    });
  });
});
