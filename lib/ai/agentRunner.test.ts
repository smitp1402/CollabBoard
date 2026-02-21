/**
 * @jest-environment node
 */
import { buildPromptMessages, runAgentCommand } from "@/lib/ai/agentRunner";
import type { BoardObject } from "@/types/board-types";

describe("agentRunner", () => {
  it("builds prompt payload with system instructions, user prompt, board state, and tool schema", async () => {
    const boardState: BoardObject[] = [
      {
        id: "sticky-1",
        type: "sticky",
        text: "hello",
        x: 10,
        y: 20,
        width: 120,
        height: 80,
      },
    ];

    const messages = await buildPromptMessages("board-1", "Summarize board", {
      systemInstructions: "System test instructions",
      getBoardStateFn: async () => boardState,
    });

    expect(messages[0]).toEqual({
      role: "system",
      content: "System test instructions",
    });
    expect(messages[1].role).toBe("user");
    expect(messages[1].content).toContain("\"prompt\":\"Summarize board\"");
    expect(messages[1].content).toContain("\"boardState\"");
    expect(messages[1].content).toContain("\"toolSchema\"");
  });

  it("executes allowed tool calls sequentially and returns completion summary", async () => {
    const create = jest
      .fn()
      .mockResolvedValueOnce({
        choices: [
          {
            message: {
              tool_calls: [
                {
                  function: {
                    name: "createStickyNote",
                    arguments: JSON.stringify({ text: "A", x: 1, y: 2 }),
                  },
                },
                {
                  function: {
                    name: "createFrame",
                    arguments: JSON.stringify({
                      title: "F",
                      x: 10,
                      y: 10,
                      width: 200,
                      height: 100,
                    }),
                  },
                },
              ],
            },
          },
        ],
      })
      .mockResolvedValueOnce({
        choices: [{ message: { content: "Done from model." } }],
      });

    const executeToolCallFn = jest
      .fn()
      .mockResolvedValue({ success: true, data: { executed: 1, createdObjectIds: [] } });

    const result = await runAgentCommand({
      boardId: "board-1",
      prompt: "Add artifacts",
      openaiClient: { chat: { completions: { create } } },
      getBoardStateFn: async () => [],
      executeToolCallFn,
    });

    expect(result.status).toBe("completed");
    expect(result.executed).toBe(2);
    expect(result.summary).toBe("Done from model.");
    expect(executeToolCallFn).toHaveBeenNthCalledWith(1, "board-1", {
      tool: "createStickyNote",
      args: { text: "A", x: 1, y: 2 },
    });
    expect(executeToolCallFn).toHaveBeenNthCalledWith(2, "board-1", {
      tool: "createFrame",
      args: { title: "F", x: 10, y: 10, width: 200, height: 100 },
    });
  });

  it("uses step list as summary when LLM returns no content", async () => {
    const create = jest
      .fn()
      .mockResolvedValueOnce({
        choices: [
          {
            message: {
              tool_calls: [
                {
                  function: {
                    name: "createStickyNote",
                    arguments: JSON.stringify({ text: "Note", x: 0, y: 0 }),
                  },
                },
              ],
            },
          },
        ],
      })
      .mockResolvedValueOnce({
        choices: [{ message: { content: null } }],
      });

    const executeToolCallFn = jest
      .fn()
      .mockResolvedValue({ success: true, data: { executed: 1, createdObjectIds: [] } });

    const result = await runAgentCommand({
      boardId: "board-1",
      prompt: "Add a note",
      openaiClient: { chat: { completions: { create } } },
      getBoardStateFn: async () => [],
      executeToolCallFn,
    });

    expect(result.status).toBe("completed");
    expect(result.summary).toMatch(/Created sticky note/);
  });

  it("rejects unknown tool calls and returns failed status", async () => {
    const create = jest.fn().mockResolvedValue({
      choices: [
        {
          message: {
            tool_calls: [
              {
                function: {
                  name: "dropDatabase",
                  arguments: "{}",
                },
              },
            ],
          },
        },
      ],
    });
    const executeToolCallFn = jest.fn();

    const result = await runAgentCommand({
      boardId: "board-1",
      prompt: "Break things",
      openaiClient: { chat: { completions: { create } } },
      getBoardStateFn: async () => [],
      executeToolCallFn,
    });

    expect(result.status).toBe("failed");
    expect(result.error).toMatch(/Unknown tool/i);
    expect(executeToolCallFn).not.toHaveBeenCalled();
  });
});
