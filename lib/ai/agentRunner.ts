import OpenAI from "openai";
import { getBoardState } from "@/lib/ai/getBoardState";
import { executeToolCalls, type ExecuteToolCallsResult } from "@/lib/ai/tools";
import { toolSchemas, type AIToolCall } from "@/types/ai-types";

const DEFAULT_MODEL = process.env.OPENAI_MODEL ?? "gpt-4o-mini";
const MAX_TOOL_ITERATIONS = 5;

type OpenAIChatLike = {
  chat: {
    completions: {
      create: (input: Record<string, unknown>) => Promise<{
        choices?: Array<{
          message?: {
            content?: string | null;
            tool_calls?: Array<{
              id?: string;
              function?: { name?: string; arguments?: string };
            }>;
          };
        }>;
      }>;
    };
  };
};

export type AgentRunnerInput = {
  boardId: string;
  prompt: string;
  systemInstructions?: string;
  model?: string;
  openaiClient?: OpenAIChatLike;
  getBoardStateFn?: typeof getBoardState;
  executeToolCallFn?: (boardId: string, toolCall: AIToolCall) => Promise<ExecuteToolCallsResult>;
};

export type AgentRunnerResult = {
  status: "completed" | "failed";
  summary: string;
  executed: number;
  error?: string;
};

function getOpenAIClient(): OpenAIChatLike {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error("OPENAI_API_KEY is required.");
  }
  return new OpenAI({ apiKey }) as unknown as OpenAIChatLike;
}

type OpenAIToolParamSchema = {
  properties: Record<
    string,
    { type: string; description?: string; items?: { type: string } }
  >;
  required?: string[];
};

/** OpenAI function parameter schemas (must include properties to avoid "object schema missing properties"). */
const OPENAI_TOOL_PARAMETERS: Record<string, OpenAIToolParamSchema> = {
  createStickyNote: {
    properties: {
      text: { type: "string", description: "Note content" },
      x: { type: "number", description: "X position" },
      y: { type: "number", description: "Y position" },
      color: { type: "string", description: "Optional hex color" },
    },
    required: ["text", "x", "y"],
  },
  createShape: {
    properties: {
      type: { type: "string", description: "rectangle, circle, or line" },
      x: { type: "number" },
      y: { type: "number" },
      width: { type: "number" },
      height: { type: "number" },
      color: { type: "string", description: "Optional hex color" },
    },
    required: ["type", "x", "y", "width", "height"],
  },
  createFrame: {
    properties: {
      title: { type: "string" },
      x: { type: "number" },
      y: { type: "number" },
      width: { type: "number" },
      height: { type: "number" },
    },
    required: ["title", "x", "y", "width", "height"],
  },
  createConnector: {
    properties: {
      fromId: { type: "string", description: "Source object id" },
      toId: { type: "string", description: "Target object id" },
      style: { type: "string", description: "line or arrow" },
    },
    required: ["fromId", "toId"],
  },
  moveObject: {
    properties: {
      objectId: { type: "string" },
      x: { type: "number" },
      y: { type: "number" },
    },
    required: ["objectId", "x", "y"],
  },
  resizeObject: {
    properties: {
      objectId: { type: "string" },
      width: { type: "number" },
      height: { type: "number" },
    },
    required: ["objectId", "width", "height"],
  },
  updateText: {
    properties: {
      objectId: { type: "string" },
      newText: { type: "string" },
    },
    required: ["objectId", "newText"],
  },
  changeColor: {
    properties: {
      objectId: { type: "string" },
      color: { type: "string" },
    },
    required: ["objectId", "color"],
  },
  getBoardState: {
    properties: {},
    required: [],
  },
  createSWOTTemplate: {
    properties: {
      originX: { type: "number", description: "Top-left X of the SWOT area" },
      originY: { type: "number", description: "Top-left Y of the SWOT area" },
      quadrantWidth: { type: "number", description: "Optional width per quadrant" },
      quadrantHeight: { type: "number", description: "Optional height per quadrant" },
    },
    required: ["originX", "originY"],
  },
  createUserJourneyTemplate: {
    properties: {
      originX: { type: "number", description: "Left X of the journey" },
      originY: { type: "number", description: "Top Y of the journey" },
      stageCount: { type: "number", description: "Number of stages (default 5)" },
    },
    required: ["originX", "originY"],
  },
  createRetroTemplate: {
    properties: {
      originX: { type: "number", description: "Left X of the retro board" },
      originY: { type: "number", description: "Top Y of the retro board" },
    },
    required: ["originX", "originY"],
  },
  arrangeInGrid: {
    properties: {
      objectIds: {
        type: "array",
        items: { type: "string" },
        description: "Array of object IDs to arrange",
      },
      originX: { type: "number", description: "Grid top-left X" },
      originY: { type: "number", description: "Grid top-left Y" },
      columns: { type: "number", description: "Number of columns" },
      gapX: { type: "number", description: "Horizontal gap between items" },
      gapY: { type: "number", description: "Vertical gap between items" },
    },
    required: ["objectIds"],
  },
  distributeEvenly: {
    properties: {
      objectIds: {
        type: "array",
        items: { type: "string" },
        description: "Array of object IDs to distribute",
      },
      direction: { type: "string", description: "horizontal or vertical" },
    },
    required: ["objectIds", "direction"],
  },
};

const TOOL_DESCRIPTIONS: Record<string, string> = {
  createStickyNote:
    "Add a sticky note to the board. If the user does not specify content, use 'New note' or a brief phrase from their message; if they do not specify position, use (100, 100) or place near existing objects. Prefer using defaults over asking the user.",
  createSWOTTemplate:
    "Create a SWOT analysis template with four quadrants (Strengths, Weaknesses, Opportunities, Threats) at the given origin. Use when the user asks for a SWOT template or four-quadrant analysis.",
  createUserJourneyTemplate:
    "Create a user journey template with multiple stages (default 5) in a row. Use when the user asks for a user journey, journey map, or stage template.",
  createRetroTemplate:
    "Create a retrospective template with three columns: Went well, To improve, Action items. Use when the user asks for a retro, retrospective, or start/stop/continue board.",
  arrangeInGrid:
    "Arrange the given objects in a grid layout. Use when the user asks to arrange, grid, or align items in a grid. Object IDs must exist on the board.",
  distributeEvenly:
    "Distribute the given objects evenly in a horizontal or vertical line. Use when the user asks to space evenly, distribute, or align with equal spacing. Requires at least 2 objects.",
};

function buildOpenAITools(): Array<Record<string, unknown>> {
  return Object.entries(toolSchemas).map(([name]) => {
    const params = OPENAI_TOOL_PARAMETERS[name] ?? { properties: {}, required: [] };
    const description = TOOL_DESCRIPTIONS[name] ?? `Execute board tool: ${name}`;
    return {
      type: "function",
      function: {
        name,
        description,
        parameters: {
          type: "object",
          properties: params.properties,
          ...(params.required && params.required.length > 0 ? { required: params.required } : {}),
        },
      },
    };
  });
}

export async function buildPromptMessages(
  boardId: string,
  prompt: string,
  options?: { getBoardStateFn?: typeof getBoardState; systemInstructions?: string }
): Promise<Array<Record<string, string>>> {
  const getBoardStateFn = options?.getBoardStateFn ?? getBoardState;
  const boardState = await getBoardStateFn(boardId);
  const system =
    options?.systemInstructions ??
    `You are an AI board assistant. Only use tools when the user clearly asks for a board action (e.g. add a sticky note, create a frame, move something, edit text, change color). Do not use tools for random text, gibberish, greetings, or unclear requests—reply briefly in plain text and do not call any tools. When in doubt, respond with text only.
When the user asks to add a sticky note (or notes) without saying content or position, use sensible defaults: e.g. text "New note" (or a short phrase from their message), position e.g. (100, 100) or offset from existing objects. Do not ask the user to provide content and position—prefer acting with these defaults.`;
  return [
    { role: "system", content: system },
    {
      role: "user",
      content: JSON.stringify({
        prompt,
        boardId,
        boardState,
        toolSchema: Object.keys(toolSchemas),
      }),
    },
  ];
}

export async function runAgentCommand(input: AgentRunnerInput): Promise<AgentRunnerResult> {
  const client = input.openaiClient ?? getOpenAIClient();
  const executeToolCallFn =
    input.executeToolCallFn ??
    (async (boardId: string, toolCall: AIToolCall) => executeToolCalls(boardId, [toolCall]));
  const initialMessages = await buildPromptMessages(input.boardId, input.prompt, {
    getBoardStateFn: input.getBoardStateFn,
    systemInstructions: input.systemInstructions,
  });
  const messages: Array<Record<string, unknown>> = initialMessages;
  const tools = buildOpenAITools();
  let executed = 0;
  const steps: string[] = [];

  function describeStep(tool: string, args: Record<string, unknown>): string {
    if (tool === "createStickyNote") return `Created sticky note "${String(args.text ?? "").slice(0, 30)}"`;
    if (tool === "createShape") return `Created ${String(args.type ?? "shape")}`;
    if (tool === "createFrame") return `Created frame "${String(args.title ?? "").slice(0, 30)}"`;
    if (tool === "createConnector") return "Created connector";
    if (tool === "moveObject") return "Moved object";
    if (tool === "resizeObject") return "Resized object";
    if (tool === "updateText") return "Updated text";
    if (tool === "changeColor") return "Changed color";
    if (tool === "createSWOTTemplate") return "Created SWOT template";
    if (tool === "createUserJourneyTemplate") return "Created user journey template";
    if (tool === "createRetroTemplate") return "Created retro template";
    if (tool === "arrangeInGrid") {
      const ids = Array.isArray(args.objectIds) ? args.objectIds.length : 0;
      return `Arranged ${ids} object(s) in grid`;
    }
    if (tool === "distributeEvenly") return `Distributed evenly (${String(args.direction ?? "")})`;
    if (tool === "getBoardState") return "Read board state";
    return tool;
  }

  for (let iteration = 0; iteration < MAX_TOOL_ITERATIONS; iteration += 1) {
    const completion = await client.chat.completions.create({
      model: input.model ?? DEFAULT_MODEL,
      messages,
      tools,
      tool_choice: "auto",
    });
    const message = completion.choices?.[0]?.message;
    const toolCalls = message?.tool_calls ?? [];

    if (toolCalls.length === 0) {
      const summary =
        message?.content?.trim() ||
        (steps.length > 0 ? steps.join("; ") : `Executed ${executed} tool call(s).`);
      return {
        status: "completed",
        summary,
        executed,
      };
    }

    const toolResults: Array<{ toolCallId: string; content: string }> = [];

    for (const toolCall of toolCalls) {
      const name = toolCall.function?.name;
      if (!name || !toolSchemas[name]) {
        return {
          status: "failed",
          summary: "Failed to execute AI command.",
          executed,
          error: `Unknown tool: ${name ?? "undefined"}`,
        };
      }

      let parsedArgs: unknown;
      try {
        parsedArgs = JSON.parse(toolCall.function?.arguments ?? "{}");
      } catch {
        return {
          status: "failed",
          summary: "Failed to execute AI command.",
          executed,
          error: `Invalid tool arguments for ${name}.`,
        };
      }

      const validated = toolSchemas[name].safeParse(parsedArgs);
      if (!validated.success) {
        return {
          status: "failed",
          summary: "Failed to execute AI command.",
          executed,
          error: `Invalid tool arguments for ${name}.`,
        };
      }

      const result = await executeToolCallFn(input.boardId, {
        tool: name,
        args: validated.data,
      });
      if (!result.success) {
        return {
          status: "failed",
          summary: "Failed to execute AI command.",
          executed,
          error: result.error.message,
        };
      }
      executed += 1;
      steps.push(describeStep(name, validated.data));
      const toolCallId = toolCall.id ?? `call_${executed}`;
      toolResults.push({
        toolCallId,
        content: JSON.stringify(result.data),
      });
    }

    messages.push({
      role: "assistant",
      content: message?.content ?? null,
      tool_calls: toolCalls.map((tc, i) => ({
        id: tc.id ?? `call_${i}`,
        type: "function" as const,
        function: {
          name: tc.function?.name ?? "",
          arguments: tc.function?.arguments ?? "{}",
        },
      })),
    });
    for (const { toolCallId, content } of toolResults) {
      messages.push({
        role: "tool",
        content,
        tool_call_id: toolCallId,
      });
    }
  }

  return {
    status: "failed",
    summary: "Failed to execute AI command.",
    executed,
    error: "Tool-calling loop exceeded iteration limit.",
  };
}
