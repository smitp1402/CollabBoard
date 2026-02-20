import type { BoardObject } from "@/types/board-types";

export function updateObjectPosition(
  objects: BoardObject[],
  id: string,
  x: number,
  y: number
): BoardObject[] {
  return objects.map((obj) => (obj.id === id ? { ...obj, x, y } : obj));
}

export function updateObjectText(
  objects: BoardObject[],
  id: string,
  text: string
): BoardObject[] {
  return objects.map((obj) =>
    obj.id === id && (obj.type === "sticky" || obj.type === "text") ? { ...obj, text } : obj
  );
}

export function updateObjectColor(
  objects: BoardObject[],
  id: string,
  color: string
): BoardObject[] {
  return objects.map((obj) => (obj.id === id ? { ...obj, color } : obj));
}

export function updateObjectBounds(
  objects: BoardObject[],
  id: string,
  bounds: { x?: number; y?: number; width?: number; height?: number }
): BoardObject[] {
  return objects.map((obj) => {
    if (obj.id !== id) return obj;
    if (obj.type === "connector") return obj;
    return {
      ...obj,
      ...(bounds.x !== undefined && { x: bounds.x }),
      ...(bounds.y !== undefined && { y: bounds.y }),
      ...(bounds.width !== undefined && { width: bounds.width }),
      ...(bounds.height !== undefined && { height: bounds.height }),
    } as BoardObject;
  });
}

export function updateObjectRotation(objects: BoardObject[], id: string, rotation: number): BoardObject[] {
  return objects.map((obj) => {
    if (obj.id !== id) return obj;
    if (obj.type === "connector") return obj;
    return { ...obj, rotation } as BoardObject;
  });
}

export type ObjectUpdate = {
  id: string;
  x?: number;
  y?: number;
  width?: number;
  height?: number;
  rotation?: number;
};

/** Apply multiple updates (bounds and/or rotation) to objects. */
export function applyObjectUpdates(objects: BoardObject[], updates: ObjectUpdate[]): BoardObject[] {
  const byId = new Map(objects.map((o) => [o.id, o]));
  for (const u of updates) {
    const obj = byId.get(u.id);
    if (!obj || obj.type === "connector") continue;
    byId.set(u.id, {
      ...obj,
      ...(u.x !== undefined && { x: u.x }),
      ...(u.y !== undefined && { y: u.y }),
      ...(u.width !== undefined && { width: u.width }),
      ...(u.height !== undefined && { height: u.height }),
      ...(u.rotation !== undefined && { rotation: u.rotation }),
    } as BoardObject);
  }
  return Array.from(byId.values());
}
