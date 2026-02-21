import { getAdminFirestore } from "@/lib/firebase/admin";
import { toFirestoreObject } from "@/lib/board/firestore-board";
import { getBoardState } from "@/lib/ai/getBoardState";
import { toolSchemas, type AIToolCall } from "@/types/ai-types";
import type { BoardObject } from "@/types/board-types";

const DEFAULT_STICKY_WIDTH = 120;
const DEFAULT_STICKY_HEIGHT = 80;
const DEFAULT_STICKY_COLOR = "#FEF3C7";
const SUPPORTED_SHAPES = new Set(["rectangle", "rect", "circle", "line"]);

type BatchLike = {
  set: (ref: unknown, data: Record<string, unknown>) => unknown;
  update: (ref: unknown, data: Record<string, unknown>) => unknown;
  commit: () => Promise<unknown>;
};

type FirestoreWithBatch = {
  doc: (path: string) => unknown;
  batch: () => BatchLike;
};

type ExecuteToolCallsSuccess = {
  success: true;
  data: {
    executed: number;
    createdObjectIds: string[];
    boardState?: BoardObject[];
  };
};

type ExecuteToolCallsFailure = {
  success: false;
  error: {
    code: "VALIDATION_ERROR" | "TOOL_EXECUTION_FAILED";
    message: string;
  };
};

export type ExecuteToolCallsResult =
  | ExecuteToolCallsSuccess
  | ExecuteToolCallsFailure;

function validationError(message: string): ExecuteToolCallsFailure {
  return {
    success: false,
    error: { code: "VALIDATION_ERROR", message },
  };
}

function isColorCapable(obj: BoardObject): boolean {
  return (
    obj.type === "sticky" ||
    obj.type === "rectangle" ||
    obj.type === "circle" ||
    obj.type === "line" ||
    obj.type === "text"
  );
}

function asShapeType(value: unknown): "rectangle" | "circle" | "line" | null {
  const normalized = String(value).toLowerCase();
  if (!SUPPORTED_SHAPES.has(normalized)) return null;
  if (normalized === "rect") return "rectangle";
  return normalized as "rectangle" | "circle" | "line";
}

export async function executeToolCalls(
  boardId: string,
  toolCalls: AIToolCall[]
): Promise<ExecuteToolCallsResult> {
  const parsedCalls: AIToolCall[] = [];
  for (const toolCall of toolCalls) {
    const schema = toolSchemas[toolCall.tool];
    if (!schema) return validationError(`Unknown tool: ${toolCall.tool}`);
    const parsed = schema.safeParse(toolCall.args);
    if (!parsed.success) {
      const message = parsed.error.flatten().formErrors[0] ?? `Invalid args for ${toolCall.tool}.`;
      return validationError(message);
    }
    parsedCalls.push({ tool: toolCall.tool, args: parsed.data });
  }

  const initialBoardState = await getBoardState(boardId);
  const objectMap = new Map(initialBoardState.map((obj) => [obj.id, obj]));
  const createdObjectIds: string[] = [];
  let includeBoardState = false;
  let writeCount = 0;

  const db = getAdminFirestore() as unknown as FirestoreWithBatch;
  const batch = db.batch();

  for (const toolCall of parsedCalls) {
    switch (toolCall.tool) {
      case "getBoardState": {
        includeBoardState = true;
        break;
      }
      case "createStickyNote": {
        const id = crypto.randomUUID();
        const object: BoardObject = {
          id,
          type: "sticky",
          text: String(toolCall.args.text),
          x: Number(toolCall.args.x),
          y: Number(toolCall.args.y),
          width: DEFAULT_STICKY_WIDTH,
          height: DEFAULT_STICKY_HEIGHT,
          color: (toolCall.args.color as string | undefined) ?? DEFAULT_STICKY_COLOR,
        };
        batch.set(db.doc(`boards/${boardId}/objects/${id}`), toFirestoreObject(object));
        objectMap.set(id, object);
        createdObjectIds.push(id);
        writeCount += 1;
        break;
      }
      case "createShape": {
        const shapeType = asShapeType(toolCall.args.type);
        if (!shapeType) {
          return validationError("createShape.type must be rectangle, circle, or line.");
        }
        const id = crypto.randomUUID();
        const object: BoardObject = {
          id,
          type: shapeType,
          x: Number(toolCall.args.x),
          y: Number(toolCall.args.y),
          width: Number(toolCall.args.width),
          height: Number(toolCall.args.height),
          ...(toolCall.args.color ? { color: String(toolCall.args.color) } : {}),
        };
        batch.set(db.doc(`boards/${boardId}/objects/${id}`), toFirestoreObject(object));
        objectMap.set(id, object);
        createdObjectIds.push(id);
        writeCount += 1;
        break;
      }
      case "createFrame": {
        const id = crypto.randomUUID();
        const object: BoardObject = {
          id,
          type: "frame",
          title: String(toolCall.args.title),
          x: Number(toolCall.args.x),
          y: Number(toolCall.args.y),
          width: Number(toolCall.args.width),
          height: Number(toolCall.args.height),
        };
        batch.set(db.doc(`boards/${boardId}/objects/${id}`), toFirestoreObject(object));
        objectMap.set(id, object);
        createdObjectIds.push(id);
        writeCount += 1;
        break;
      }
      case "createConnector": {
        const fromId = String(toolCall.args.fromId);
        const toId = String(toolCall.args.toId);
        if (!objectMap.has(fromId) || !objectMap.has(toId)) {
          return validationError("createConnector endpoints must exist on the board.");
        }
        const id = crypto.randomUUID();
        const object: BoardObject = {
          id,
          type: "connector",
          fromId,
          toId,
          ...(toolCall.args.style ? { style: toolCall.args.style as "line" | "arrow" } : {}),
        };
        batch.set(db.doc(`boards/${boardId}/objects/${id}`), toFirestoreObject(object));
        objectMap.set(id, object);
        createdObjectIds.push(id);
        writeCount += 1;
        break;
      }
      case "moveObject": {
        const objectId = String(toolCall.args.objectId);
        const existing = objectMap.get(objectId);
        if (!existing) return validationError(`Object not found: ${objectId}`);
        if (existing.type === "connector") {
          return validationError("Cannot move a connector with moveObject.");
        }
        const x = Number(toolCall.args.x);
        const y = Number(toolCall.args.y);
        batch.update(db.doc(`boards/${boardId}/objects/${objectId}`), { x, y });
        objectMap.set(objectId, { ...existing, x, y } as BoardObject);
        writeCount += 1;
        break;
      }
      case "resizeObject": {
        const objectId = String(toolCall.args.objectId);
        const existing = objectMap.get(objectId);
        if (!existing) return validationError(`Object not found: ${objectId}`);
        if (existing.type === "connector") {
          return validationError("Cannot resize a connector.");
        }
        const width = Number(toolCall.args.width);
        const height = Number(toolCall.args.height);
        batch.update(db.doc(`boards/${boardId}/objects/${objectId}`), { width, height });
        objectMap.set(objectId, { ...existing, width, height } as BoardObject);
        writeCount += 1;
        break;
      }
      case "updateText": {
        const objectId = String(toolCall.args.objectId);
        const existing = objectMap.get(objectId);
        if (!existing) return validationError(`Object not found: ${objectId}`);
        if (existing.type !== "sticky" && existing.type !== "text") {
          return validationError("updateText is only allowed for sticky and text objects.");
        }
        const text = String(toolCall.args.newText);
        batch.update(db.doc(`boards/${boardId}/objects/${objectId}`), { text });
        objectMap.set(objectId, { ...existing, text } as BoardObject);
        writeCount += 1;
        break;
      }
      case "changeColor": {
        const objectId = String(toolCall.args.objectId);
        const existing = objectMap.get(objectId);
        if (!existing) return validationError(`Object not found: ${objectId}`);
        if (!isColorCapable(existing)) {
          return validationError("changeColor is not supported for this object type.");
        }
        const color = String(toolCall.args.color);
        batch.update(db.doc(`boards/${boardId}/objects/${objectId}`), { color });
        objectMap.set(objectId, { ...existing, color } as BoardObject);
        writeCount += 1;
        break;
      }
      default: {
        return validationError(`Unknown tool: ${toolCall.tool}`);
      }
    }
  }

  if (writeCount > 0) {
    try {
      await batch.commit();
    } catch (error) {
      return {
        success: false,
        error: {
          code: "TOOL_EXECUTION_FAILED",
          message: error instanceof Error ? error.message : "Tool execution failed.",
        },
      };
    }
  }

  return {
    success: true,
    data: {
      executed: parsedCalls.length,
      createdObjectIds,
      ...(includeBoardState ? { boardState: Array.from(objectMap.values()) } : {}),
    },
  };
}
