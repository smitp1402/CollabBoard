import type { BoardObject } from "@/types/board-types";

const DUPLICATE_OFFSET = { x: 20, y: 20 };
const PASTE_OFFSET = { x: 20, y: 20 };

function cloneWithNewId(obj: BoardObject, newId: string, offset: { x: number; y: number }): BoardObject {
  if (obj.type === "connector") {
    return { ...obj, id: newId };
  }
  return {
    ...obj,
    id: newId,
    x: obj.x + offset.x,
    y: obj.y + offset.y,
  } as BoardObject;
}

/** Duplicate objects by id; returns new array with originals plus clones (with new ids and offset). */
export function duplicateObjects(objects: BoardObject[], ids: string[]): { nextObjects: BoardObject[]; newIds: string[] } {
  const idSet = new Set(ids);
  const toDuplicate = objects.filter((o) => idSet.has(o.id));
  const newIds: string[] = [];
  const clones = toDuplicate.map((obj) => {
    const newId = crypto.randomUUID();
    newIds.push(newId);
    return cloneWithNewId(obj, newId, DUPLICATE_OFFSET);
  });
  return { nextObjects: [...objects, ...clones], newIds };
}

/** Return subset of objects by id (for clipboard). */
export function copyObjects(objects: BoardObject[], ids: string[]): BoardObject[] {
  const idSet = new Set(ids);
  return objects.filter((o) => idSet.has(o.id));
}

/** Clone clipboard objects with new ids and offset; returns array to append. */
export function pasteObjects(clipboard: BoardObject[], offset: { x: number; y: number } = PASTE_OFFSET): BoardObject[] {
  return clipboard.map((obj) => cloneWithNewId(obj, crypto.randomUUID(), offset));
}
