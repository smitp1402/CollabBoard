import { getAdminFirestore } from "@/lib/firebase/admin";
import { toFirestoreObject } from "@/lib/board/firestore-board";
import { getBoardState } from "@/lib/ai/getBoardState";
import { toolSchemas, type AIToolCall } from "@/types/ai-types";
import type { BoardObject } from "@/types/board-types";

const DEFAULT_STICKY_WIDTH = 120;
const DEFAULT_STICKY_HEIGHT = 80;
const DEFAULT_STICKY_COLOR = "#FEF3C7";
const SUPPORTED_SHAPES = new Set(["rectangle", "rect", "circle", "line"]);
const DEFAULT_QUADRANT_WIDTH = 200;
const DEFAULT_QUADRANT_HEIGHT = 150;
const DEFAULT_STAGE_WIDTH = 140;
const DEFAULT_STAGE_HEIGHT = 80;
const DEFAULT_COLUMN_WIDTH = 180;
const DEFAULT_RETRO_HEADER_HEIGHT = 40;
const DEFAULT_GRID_GAP = 20;

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

function isMovable(obj: BoardObject): obj is BoardObject & { x: number; y: number } {
  return obj.type !== "connector";
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
      case "createSWOTTemplate": {
        const ox = Number(toolCall.args.originX);
        const oy = Number(toolCall.args.originY);
        const qw = Number(toolCall.args.quadrantWidth) || DEFAULT_QUADRANT_WIDTH;
        const qh = Number(toolCall.args.quadrantHeight) || DEFAULT_QUADRANT_HEIGHT;
        const labels = ["Strengths", "Weaknesses", "Opportunities", "Threats"];
        for (let i = 0; i < 4; i++) {
          const col = i % 2;
          const row = Math.floor(i / 2);
          const fx = ox + col * qw;
          const fy = oy + row * qh;
          const frameId = crypto.randomUUID();
          const frame: BoardObject = {
            id: frameId,
            type: "frame",
            title: labels[i],
            x: fx,
            y: fy,
            width: qw,
            height: qh,
          };
          batch.set(db.doc(`boards/${boardId}/objects/${frameId}`), toFirestoreObject(frame));
          objectMap.set(frameId, frame);
          createdObjectIds.push(frameId);
          const stickyId = crypto.randomUUID();
          const sticky: BoardObject = {
            id: stickyId,
            type: "sticky",
            text: labels[i],
            x: fx + 10,
            y: fy + 10,
            width: DEFAULT_STICKY_WIDTH,
            height: DEFAULT_STICKY_HEIGHT,
            color: DEFAULT_STICKY_COLOR,
          };
          batch.set(db.doc(`boards/${boardId}/objects/${stickyId}`), toFirestoreObject(sticky));
          objectMap.set(stickyId, sticky);
          createdObjectIds.push(stickyId);
        }
        writeCount += 8;
        break;
      }
      case "createUserJourneyTemplate": {
        const ox = Number(toolCall.args.originX);
        const oy = Number(toolCall.args.originY);
        const count = Number(toolCall.args.stageCount) || 5;
        const sw = DEFAULT_STAGE_WIDTH;
        const sh = DEFAULT_STAGE_HEIGHT;
        const gap = 16;
        for (let i = 0; i < count; i++) {
          const sx = ox + i * (sw + gap);
          const stageId = crypto.randomUUID();
          const stage: BoardObject = {
            id: stageId,
            type: "frame",
            title: `Stage ${i + 1}`,
            x: sx,
            y: oy,
            width: sw,
            height: sh,
          };
          batch.set(db.doc(`boards/${boardId}/objects/${stageId}`), toFirestoreObject(stage));
          objectMap.set(stageId, stage);
          createdObjectIds.push(stageId);
        }
        writeCount += count;
        break;
      }
      case "createRetroTemplate": {
        const ox = Number(toolCall.args.originX);
        const oy = Number(toolCall.args.originY);
        const cw = DEFAULT_COLUMN_WIDTH;
        const headerH = DEFAULT_RETRO_HEADER_HEIGHT;
        const colH = 120;
        const labels = ["Went well", "To improve", "Action items"];
        for (let i = 0; i < 3; i++) {
          const cx = ox + i * cw;
          const frameId = crypto.randomUUID();
          const frame: BoardObject = {
            id: frameId,
            type: "frame",
            title: labels[i],
            x: cx,
            y: oy,
            width: cw,
            height: headerH + colH,
          };
          batch.set(db.doc(`boards/${boardId}/objects/${frameId}`), toFirestoreObject(frame));
          objectMap.set(frameId, frame);
          createdObjectIds.push(frameId);
          const stickyId = crypto.randomUUID();
          const sticky: BoardObject = {
            id: stickyId,
            type: "sticky",
            text: "",
            x: cx + 10,
            y: oy + headerH + 10,
            width: DEFAULT_STICKY_WIDTH,
            height: DEFAULT_STICKY_HEIGHT,
            color: DEFAULT_STICKY_COLOR,
          };
          batch.set(db.doc(`boards/${boardId}/objects/${stickyId}`), toFirestoreObject(sticky));
          objectMap.set(stickyId, sticky);
          createdObjectIds.push(stickyId);
        }
        writeCount += 6;
        break;
      }
      case "arrangeInGrid": {
        const objectIds = toolCall.args.objectIds as string[];
        const originX = Number(toolCall.args.originX ?? 0);
        const originY = Number(toolCall.args.originY ?? 0);
        const columns = Math.max(1, Math.floor(Number(toolCall.args.columns) || 3));
        const gapX = Number(toolCall.args.gapX) ?? DEFAULT_GRID_GAP;
        const gapY = Number(toolCall.args.gapY) ?? DEFAULT_GRID_GAP;
        const movables: { id: string; obj: BoardObject & { x: number; y: number; width: number; height: number } }[] = [];
        for (const id of objectIds) {
          const obj = objectMap.get(id);
          if (!obj) return validationError(`Object not found: ${id}`);
          if (!isMovable(obj)) return validationError(`Cannot arrange connector: ${id}`);
          const o = obj as BoardObject & { width: number; height: number };
          const w = o.width ?? DEFAULT_STICKY_WIDTH;
          const h = o.height ?? DEFAULT_STICKY_HEIGHT;
          movables.push({ id, obj: { ...obj, x: obj.x, y: obj.y, width: w, height: h } as BoardObject & { x: number; y: number; width: number; height: number } });
        }
        const cellWidth = movables.length > 0
          ? Math.max(...movables.map((m) => m.obj.width)) + gapX
          : 0;
        const cellHeight = movables.length > 0
          ? Math.max(...movables.map((m) => m.obj.height)) + gapY
          : 0;
        movables.forEach((m, idx) => {
          const col = idx % columns;
          const row = Math.floor(idx / columns);
          const nx = originX + col * cellWidth;
          const ny = originY + row * cellHeight;
          batch.update(db.doc(`boards/${boardId}/objects/${m.id}`), { x: nx, y: ny });
          objectMap.set(m.id, { ...m.obj, x: nx, y: ny } as BoardObject);
        });
        writeCount += movables.length;
        break;
      }
      case "distributeEvenly": {
        const objectIds = toolCall.args.objectIds as string[];
        const direction = String(toolCall.args.direction) as "horizontal" | "vertical";
        const movables: { id: string; obj: BoardObject & { x: number; y: number; width: number; height: number } }[] = [];
        for (const id of objectIds) {
          const obj = objectMap.get(id);
          if (!obj) return validationError(`Object not found: ${id}`);
          if (!isMovable(obj)) return validationError(`Cannot distribute connector: ${id}`);
          const o = obj as BoardObject & { width?: number; height?: number };
          movables.push({
            id,
            obj: {
              ...obj,
              x: obj.x,
              y: obj.y,
              width: o.width ?? DEFAULT_STICKY_WIDTH,
              height: o.height ?? DEFAULT_STICKY_HEIGHT,
            } as BoardObject & { x: number; y: number; width: number; height: number },
          });
        }
        if (movables.length < 2) {
          return validationError("distributeEvenly requires at least 2 objects.");
        }
        if (direction === "horizontal") {
          movables.sort((a, b) => a.obj.x - b.obj.x);
          const totalWidth = movables.reduce((sum, m) => sum + m.obj.width, 0);
          const span = (movables[movables.length - 1].obj.x + movables[movables.length - 1].obj.width) - movables[0].obj.x;
          const gap = span > totalWidth ? (span - totalWidth) / (movables.length - 1) : 0;
          let cx = movables[0].obj.x;
          for (const m of movables) {
            const nx = Math.round(cx);
            batch.update(db.doc(`boards/${boardId}/objects/${m.id}`), { x: nx });
            objectMap.set(m.id, { ...m.obj, x: nx } as BoardObject);
            cx += m.obj.width + gap;
            writeCount += 1;
          }
        } else {
          movables.sort((a, b) => a.obj.y - b.obj.y);
          const span = (movables[movables.length - 1].obj.y + movables[movables.length - 1].obj.height) - movables[0].obj.y;
          const totalHeight = movables.reduce((sum, m) => sum + m.obj.height, 0);
          const gap = span > totalHeight ? (span - totalHeight) / (movables.length - 1) : 0;
          let cy = movables[0].obj.y;
          for (const m of movables) {
            const ny = Math.round(cy);
            batch.update(db.doc(`boards/${boardId}/objects/${m.id}`), { y: ny });
            objectMap.set(m.id, { ...m.obj, y: ny } as BoardObject);
            cy += m.obj.height + gap;
            writeCount += 1;
          }
        }
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
