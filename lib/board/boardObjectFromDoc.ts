import type { BoardObject } from "@/types/board-types";

/** Pure parser: build BoardObject from document id + plain data. Safe for server (no firebase/firestore import). */

function coerceNumber(val: unknown): number {
  if (typeof val === "number" && !Number.isNaN(val)) return val;
  if (typeof val === "string") return Number(val) || 0;
  return 0;
}

function coerceString(val: unknown): string {
  if (typeof val === "string") return val;
  if (val != null) return String(val);
  return "";
}

export function boardObjectFromDoc(
  id: string,
  data: Record<string, unknown>
): BoardObject | null {
  const type = data.type as string;
  if (type === "connector") {
    const fromId = coerceString(data.fromId);
    const toId = coerceString(data.toId);
    if (!fromId || !toId) return null;
    const style = data.style === "arrow" || data.style === "line" ? data.style : undefined;
    return { id, type: "connector", fromId, toId, ...(style && { style }) };
  }
  const positional =
    type === "sticky" ||
    type === "rectangle" ||
    type === "text" ||
    type === "frame" ||
    type === "circle" ||
    type === "line";
  if (!positional) return null;
  const x = coerceNumber(data.x);
  const y = coerceNumber(data.y);
  const width = coerceNumber(data.width);
  const height = coerceNumber(data.height);
  const rotation = data.rotation != null ? coerceNumber(data.rotation) : undefined;
  const rotationOpt =
    rotation !== undefined && !Number.isNaN(rotation) ? { rotation } : {};

  if (type === "sticky") {
    const color = data.color != null ? coerceString(data.color) : undefined;
    return {
      id,
      type: "sticky",
      x,
      y,
      width,
      height,
      text: coerceString(data.text),
      ...(color !== undefined && { color }),
      ...rotationOpt,
    };
  }
  if (type === "rectangle") {
    const color = data.color != null ? coerceString(data.color) : undefined;
    return {
      id,
      type: "rectangle",
      x,
      y,
      width,
      height,
      ...(color !== undefined && { color }),
      ...rotationOpt,
    };
  }
  if (type === "text") {
    const text = coerceString(data.text);
    const fontSize = data.fontSize != null ? coerceNumber(data.fontSize) : undefined;
    const color = data.color != null ? coerceString(data.color) : undefined;
    const w = data.width != null ? coerceNumber(data.width) : undefined;
    const h = data.height != null ? coerceNumber(data.height) : undefined;
    return {
      id,
      type: "text",
      x,
      y,
      width: w,
      height: h,
      text,
      ...(fontSize !== undefined && { fontSize }),
      ...(color !== undefined && { color }),
      ...rotationOpt,
    };
  }
  if (type === "frame") {
    const title = data.title != null ? coerceString(data.title) : undefined;
    return {
      id,
      type: "frame",
      x,
      y,
      width,
      height,
      ...(title !== undefined && { title }),
      ...rotationOpt,
    };
  }
  if (type === "circle") {
    const color = data.color != null ? coerceString(data.color) : undefined;
    return {
      id,
      type: "circle",
      x,
      y,
      width,
      height,
      ...(color !== undefined && { color }),
      ...rotationOpt,
    };
  }
  if (type === "line") {
    const color = data.color != null ? coerceString(data.color) : undefined;
    return {
      id,
      type: "line",
      x,
      y,
      width,
      height,
      ...(color !== undefined && { color }),
      ...rotationOpt,
    };
  }
  return null;
}
