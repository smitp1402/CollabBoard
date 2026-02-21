import { z } from "zod";

// --- API contract types ---

export type AICommandStatus = "pending" | "success" | "error";
export type AICommandLifecycleStatus = "running" | "completed" | "failed";

export type AICommandRequest = {
  boardId: string;
  prompt: string;
  clientRequestId: string;
  idempotencyKey?: string;
  selection?: { objectIds: string[] };
  viewport?: { x: number; y: number; scale: number };
};

export type AICommandResponse = {
  data?: {
    commandId: string;
    status: AICommandStatus;
    summary?: string;
  };
  error?: { message: string; code: string };
};

export type AICommandDocument = {
  prompt: string;
  actor: string;
  status: AICommandLifecycleStatus;
  createdAt: Date;
  updatedAt: Date;
  summary: string;
  idempotencyKey: string;
  clientRequestId: string;
  error?: string;
};

/** Base shape for a single tool call (LLM returns tool_calls[]). */
export type AIToolCall = {
  tool: string;
  args: Record<string, unknown>;
};

// --- Request body validation (Zod) ---

const selectionSchema = z.object({
  objectIds: z.array(z.string()),
});

const viewportSchema = z.object({
  x: z.number(),
  y: z.number(),
  scale: z.number(),
});

export const aiCommandRequestSchema = z.object({
  boardId: z.string().min(1, "boardId is required"),
  prompt: z.string().min(1, "prompt is required"),
  clientRequestId: z.string().min(1, "clientRequestId is required"),
  idempotencyKey: z.string().min(1, "idempotencyKey is required").optional(),
  selection: selectionSchema.optional(),
  viewport: viewportSchema.optional(),
});

export type AICommandRequestParsed = z.infer<typeof aiCommandRequestSchema>;

export function lifecycleToApiStatus(status: AICommandLifecycleStatus): AICommandStatus {
  if (status === "running") return "pending";
  if (status === "completed") return "success";
  return "error";
}

// --- Tool argument schemas (Architecture.md §5) ---

export const createStickyNoteSchema = z.object({
  text: z.string(),
  x: z.number(),
  y: z.number(),
  color: z.string().optional(),
});

export const createShapeSchema = z.object({
  type: z.string(),
  x: z.number(),
  y: z.number(),
  width: z.number(),
  height: z.number(),
  color: z.string().optional(),
});

export const createFrameSchema = z.object({
  title: z.string(),
  x: z.number(),
  y: z.number(),
  width: z.number(),
  height: z.number(),
});

export const createConnectorSchema = z.object({
  fromId: z.string(),
  toId: z.string(),
  style: z.enum(["line", "arrow"]).optional(),
});

export const moveObjectSchema = z.object({
  objectId: z.string(),
  x: z.number(),
  y: z.number(),
});

export const resizeObjectSchema = z.object({
  objectId: z.string(),
  width: z.number(),
  height: z.number(),
});

export const updateTextSchema = z.object({
  objectId: z.string(),
  newText: z.string(),
});

export const changeColorSchema = z.object({
  objectId: z.string(),
  color: z.string(),
});

export const getBoardStateSchema = z.object({});

/** Map tool name -> Zod schema for argument validation (used in later phases). */
export const toolSchemas: Record<string, z.ZodType<Record<string, unknown>>> = {
  createStickyNote: createStickyNoteSchema,
  createShape: createShapeSchema,
  createFrame: createFrameSchema,
  createConnector: createConnectorSchema,
  moveObject: moveObjectSchema,
  resizeObject: resizeObjectSchema,
  updateText: updateTextSchema,
  changeColor: changeColorSchema,
  getBoardState: getBoardStateSchema,
};
