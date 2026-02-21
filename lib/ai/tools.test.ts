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

  it("createSWOTTemplate creates 4 frames and 4 stickies and commits", async () => {
    const calls = [
      { tool: "createSWOTTemplate", args: { originX: 0, originY: 0 } },
    ] as AIToolCall[];

    const result = await executeToolCalls("board-1", calls);

    expect(result.success).toBe(true);
    expect(mockBatchSet).toHaveBeenCalledTimes(8);
    expect(mockBatchCommit).toHaveBeenCalledTimes(1);
    if (result.success) expect(result.data.createdObjectIds.length).toBe(8);
  });

  it("createUserJourneyTemplate creates 5 stages", async () => {
    const calls = [
      { tool: "createUserJourneyTemplate", args: { originX: 0, originY: 0, stageCount: 5 } },
    ] as AIToolCall[];

    const result = await executeToolCalls("board-1", calls);

    expect(result.success).toBe(true);
    expect(mockBatchSet).toHaveBeenCalledTimes(5);
    if (result.success) expect(result.data.createdObjectIds.length).toBe(5);
  });

  it("createRetroTemplate creates 3 columns with frames and stickies", async () => {
    const calls = [
      { tool: "createRetroTemplate", args: { originX: 0, originY: 0 } },
    ] as AIToolCall[];

    const result = await executeToolCalls("board-1", calls);

    expect(result.success).toBe(true);
    expect(mockBatchSet).toHaveBeenCalledTimes(6);
    if (result.success) expect(result.data.createdObjectIds.length).toBe(6);
  });

  it("arrangeInGrid updates positions for given object IDs", async () => {
    const objs: BoardObject[] = [
      { id: "a", type: "sticky", x: 0, y: 0, width: 100, height: 80, text: "A", color: "#fff" },
      { id: "b", type: "sticky", x: 10, y: 10, width: 100, height: 80, text: "B", color: "#fff" },
    ];
    mockGetBoardState.mockResolvedValueOnce(objs);

    const calls = [
      { tool: "arrangeInGrid", args: { objectIds: ["a", "b"], originX: 0, originY: 0, columns: 2 } },
    ] as AIToolCall[];

    const result = await executeToolCalls("board-1", calls);

    expect(result.success).toBe(true);
    expect(mockBatchUpdate).toHaveBeenCalledTimes(2);
    expect(mockBatchCommit).toHaveBeenCalledTimes(1);
  });

  it("arrangeInGrid returns validation error when object not found", async () => {
    mockGetBoardState.mockResolvedValueOnce([]);

    const calls = [
      { tool: "arrangeInGrid", args: { objectIds: ["missing"], originX: 0, originY: 0 } },
    ] as AIToolCall[];

    const result = await executeToolCalls("board-1", calls);

    expect(result.success).toBe(false);
    if (!result.success) expect(result.error.message).toMatch(/not found/i);
  });

  it("distributeEvenly returns validation error for fewer than 2 objects", async () => {
    mockGetBoardState.mockResolvedValueOnce([
      { id: "a", type: "sticky", x: 0, y: 0, width: 100, height: 80, text: "A", color: "#fff" },
    ]);

    const calls = [
      { tool: "distributeEvenly", args: { objectIds: ["a"], direction: "horizontal" } },
    ] as AIToolCall[];

    const result = await executeToolCalls("board-1", calls);

    expect(result.success).toBe(false);
    if (!result.success) expect(result.error.message).toMatch(/at least 2/i);
  });

  it("distributeEvenly updates positions for 2 objects horizontally", async () => {
    const objs: BoardObject[] = [
      { id: "a", type: "sticky", x: 0, y: 0, width: 100, height: 80, text: "A", color: "#fff" },
      { id: "b", type: "sticky", x: 200, y: 0, width: 100, height: 80, text: "B", color: "#fff" },
    ];
    mockGetBoardState.mockResolvedValueOnce(objs);

    const calls = [
      { tool: "distributeEvenly", args: { objectIds: ["a", "b"], direction: "horizontal" } },
    ] as AIToolCall[];

    const result = await executeToolCalls("board-1", calls);

    expect(result.success).toBe(true);
    expect(mockBatchUpdate).toHaveBeenCalledTimes(2);
    expect(mockBatchCommit).toHaveBeenCalledTimes(1);
  });
});
