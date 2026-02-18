/** Board object types for canvas and Firestore sync. Rotation in degrees (0–360). */
export type BoardObject =
  | {
      id: string;
      type: "sticky";
      x: number;
      y: number;
      width: number;
      height: number;
      text: string;
      color?: string;
      rotation?: number;
    }
  | {
      id: string;
      type: "rectangle";
      x: number;
      y: number;
      width: number;
      height: number;
      color?: string;
      rotation?: number;
    }
  | {
      id: string;
      type: "text";
      x: number;
      y: number;
      width?: number;
      height?: number;
      text: string;
      fontSize?: number;
      color?: string;
      rotation?: number;
    }
  | {
      id: string;
      type: "frame";
      x: number;
      y: number;
      width: number;
      height: number;
      title?: string;
      rotation?: number;
    }
  | {
      id: string;
      type: "connector";
      fromId: string;
      toId: string;
      style?: "line" | "arrow";
    };

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

export function isConnector(obj: BoardObject): obj is Extract<BoardObject, { type: "connector" }> {
  return obj.type === "connector";
}

/** True if the object has position and dimensions (for bounds / transform). */
export function hasBounds(
  obj: BoardObject
): obj is Extract<BoardObject, { type: "sticky" | "rectangle" | "text" | "frame" }> {
  return obj.type === "sticky" || obj.type === "rectangle" || obj.type === "text" || obj.type === "frame";
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
