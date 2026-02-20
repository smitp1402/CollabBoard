import type { BoardObject } from "@/types/board-types";

export function isSticky(obj: BoardObject): obj is Extract<BoardObject, { type: "sticky" }> {
  return obj.type === "sticky";
}

export function isRectangle(obj: BoardObject): obj is Extract<BoardObject, { type: "rectangle" }> {
  return obj.type === "rectangle";
}

export function isText(obj: BoardObject): obj is Extract<BoardObject, { type: "text" }> {
  return obj.type === "text";
}

export function isFrame(obj: BoardObject): obj is Extract<BoardObject, { type: "frame" }> {
  return obj.type === "frame";
}

export function isCircle(obj: BoardObject): obj is Extract<BoardObject, { type: "circle" }> {
  return obj.type === "circle";
}

export function isLine(obj: BoardObject): obj is Extract<BoardObject, { type: "line" }> {
  return obj.type === "line";
}

export function isConnector(obj: BoardObject): obj is Extract<BoardObject, { type: "connector" }> {
  return obj.type === "connector";
}

/** True if the object has position and dimensions (for bounds / transform). */
export function hasBounds(
  obj: BoardObject
): obj is Extract<BoardObject, { type: "sticky" | "rectangle" | "text" | "frame" | "circle" | "line" }> {
  return obj.type === "sticky" || obj.type === "rectangle" || obj.type === "text" || obj.type === "frame" || obj.type === "circle" || obj.type === "line";
}

/** Axis-aligned bounds for objects that have bounds (ignores rotation for selection). */
export function getObjectBounds(obj: BoardObject): { x: number; y: number; width: number; height: number } | null {
  if (obj.type === "connector") return null;
  const w = obj.width ?? 100;
  const h = obj.height ?? 40;
  return { x: obj.x, y: obj.y, width: w, height: h };
}

/** Check if two axis-aligned rects intersect. */
export function rectsIntersect(
  a: { x: number; y: number; width: number; height: number },
  b: { x: number; y: number; width: number; height: number }
): boolean {
  return a.x < b.x + b.width && a.x + a.width > b.x && a.y < b.y + b.height && a.y + a.height > b.y;
}
