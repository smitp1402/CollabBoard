/**
 * @jest-environment node
 */
import {
  buildCommandId,
  commandDocPath,
  commandsCollectionPath,
  createRunningCommand,
  finalizeCommand,
} from "@/lib/ai/commandStore";

const mockGet = jest.fn();
const mockSet = jest.fn();
const mockUpdate = jest.fn();
const mockDoc = jest.fn(() => ({
  get: mockGet,
  set: mockSet,
  update: mockUpdate,
}));

const mockDb = { doc: mockDoc };

describe("commandStore", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockSet.mockResolvedValue(undefined);
    mockUpdate.mockResolvedValue(undefined);
  });

  it("builds deterministic command IDs from idempotency input", () => {
    const first = buildCommandId({
      boardId: "board-1",
      actor: "user-1",
      clientRequestId: "req-1",
      idempotencyKey: "idem-1",
    });
    const second = buildCommandId({
      boardId: "board-1",
      actor: "user-1",
      clientRequestId: "req-1",
      idempotencyKey: "idem-1",
    });
    const different = buildCommandId({
      boardId: "board-1",
      actor: "user-1",
      clientRequestId: "req-2",
      idempotencyKey: "idem-1",
    });

    expect(first).toEqual(second);
    expect(first).toHaveLength(32);
    expect(different).not.toEqual(first);
  });

  it("stores running lifecycle fields when command starts", async () => {
    await createRunningCommand(mockDb, {
      boardId: "board-1",
      commandId: "cmd-1",
      prompt: "Add a sticky",
      actor: "user-1",
      clientRequestId: "req-1",
      idempotencyKey: "idem-1",
    });

    expect(mockDoc).toHaveBeenCalledWith("boards/board-1/ai_commands/cmd-1");
    expect(mockSet).toHaveBeenCalledWith(
      expect.objectContaining({
        prompt: "Add a sticky",
        actor: "user-1",
        status: "running",
        summary: "Running...",
        clientRequestId: "req-1",
        idempotencyKey: "idem-1",
      })
    );
  });

  it("stores final lifecycle fields when command completes", async () => {
    await finalizeCommand(mockDb, {
      boardId: "board-1",
      commandId: "cmd-1",
      status: "completed",
      summary: "Executed 2 step(s).",
    });

    expect(mockDoc).toHaveBeenCalledWith("boards/board-1/ai_commands/cmd-1");
    expect(mockUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        status: "completed",
        summary: "Executed 2 step(s).",
        error: null,
      })
    );
  });

  it("stores error details when command fails", async () => {
    await finalizeCommand(mockDb, {
      boardId: "board-1",
      commandId: "cmd-2",
      status: "failed",
      summary: "Failed after validation.",
      error: "Unknown tool",
    });

    expect(mockUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        status: "failed",
        summary: "Failed after validation.",
        error: "Unknown tool",
      })
    );
  });

  it("returns expected command paths", () => {
    expect(commandsCollectionPath("b-1")).toBe("boards/b-1/ai_commands");
    expect(commandDocPath("b-1", "c-1")).toBe("boards/b-1/ai_commands/c-1");
  });
});
