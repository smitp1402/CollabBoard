/**
 * @jest-environment node
 */
import { executeToolCalls } from "@/lib/ai/tools";
import type { AIToolCall } from "@/types/ai-types";
import type { BoardObject } from "@/types/board-types";

const mockBatchSet = jest.fn();
const mockBatchUpdate = jest.fn();
const mockBatchCommit = jest.fn();
const mockDbDoc = jest.fn((path: string) => ({ path }));

const mockBatch = {
  set: mockBatchSet,
  update: mockBatchUpdate,
  commit: mockBatchCommit,
};

const mockGetBoardState = jest.fn<Promise<BoardObject[]>, [string]>();

jest.mock("@/lib/firebase/admin", () => ({
  getAdminFirestore: () => ({
    batch: () => mockBatch,
    doc: mockDbDoc,
  }),
}));

jest.mock("@/lib/ai/getBoardState", () => ({
  getBoardState: (boardId: string) => mockGetBoardState(boardId),
}));

describe("executeToolCalls", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockBatchCommit.mockResolvedValue(undefined);
    mockGetBoardState.mockResolvedValue([]);
  });

  it("returns validation error for unknown tool", async () => {
    const calls = [{ tool: "unknownTool", args: {} }] as AIToolCall[];

    const result = await executeToolCalls("board-1", calls);

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.code).toBe("VALIDATION_ERROR");
    }
    expect(mockBatchCommit).not.toHaveBeenCalled();
  });

  it("returns validation error for invalid args", async () => {
    const calls = [{ tool: "createStickyNote", args: { text: "x", y: 10 } }] as AIToolCall[];

    const result = await executeToolCalls("board-1", calls);

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.code).toBe("VALIDATION_ERROR");
    }
    expect(mockBatchCommit).not.toHaveBeenCalled();
  });

  it("returns validation error when referenced object does not exist", async () => {
    mockGetBoardState.mockResolvedValueOnce([]);
    const calls = [{ tool: "moveObject", args: { objectId: "missing", x: 1, y: 2 } }] as AIToolCall[];

    const result = await executeToolCalls("board-1", calls);

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.code).toBe("VALIDATION_ERROR");
      expect(result.error.message).toMatch(/not found/i);
    }
    expect(mockBatchCommit).not.toHaveBeenCalled();
  });

  it("does not commit when any later step fails validation", async () => {
    const calls = [
      { tool: "createStickyNote", args: { text: "A", x: 10, y: 20 } },
      { tool: "moveObject", args: { objectId: "missing", x: 50, y: 60 } },
    ] as AIToolCall[];

    const result = await executeToolCalls("board-1", calls);

    expect(result.success).toBe(false);
    expect(mockBatchSet).toHaveBeenCalledTimes(1);
    expect(mockBatchCommit).not.toHaveBeenCalled();
  });

  it("commits once for valid multi-step tool calls", async () => {
    const existing: BoardObject = {
      id: "sticky-1",
      type: "sticky",
      x: 0,
      y: 0,
      width: 120,
      height: 80,
      text: "old",
      color: "#fff",
    };
    mockGetBoardState.mockResolvedValueOnce([existing]);

    const calls = [
      { tool: "createStickyNote", args: { text: "new", x: 5, y: 6, color: "#eee" } },
      { tool: "moveObject", args: { objectId: "sticky-1", x: 20, y: 30 } },
      { tool: "changeColor", args: { objectId: "sticky-1", color: "#111" } },
    ] as AIToolCall[];

    const result = await executeToolCalls("board-1", calls);

    expect(result.success).toBe(true);
    expect(mockBatchSet).toHaveBeenCalledTimes(1);
    expect(mockBatchUpdate).toHaveBeenCalledTimes(2);
    expect(mockBatchCommit).toHaveBeenCalledTimes(1);
  });
});
