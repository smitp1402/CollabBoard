import type { DocumentData, QuerySnapshot } from "firebase/firestore";
import type { BoardObject } from "@/types/board-types";

/** Firestore path for a board's objects collection */
export function objectsCollectionPath(boardId: string): string {
  return `boards/${boardId}/objects`;
}

function withRotation<T extends Record<string, unknown>>(obj: BoardObject, base: T): T & DocumentData {
  if (obj.type === "connector") return base as T & DocumentData;
  const rot = (obj as Extract<BoardObject, { type: "sticky" | "rectangle" | "text" | "frame" }>).rotation;
  return { ...base, ...(rot != null && !Number.isNaN(rot) && { rotation: rot }) } as T & DocumentData;
}

/** Convert BoardObject to Firestore document data (no id in body; use doc id) */
export function toFirestoreObject(obj: BoardObject): DocumentData {
  if (obj.type === "connector") {
    return {
      type: "connector",
      fromId: obj.fromId,
      toId: obj.toId,
      ...(obj.style != null && { style: obj.style }),
    };
  }
  const base = {
    type: obj.type,
    x: obj.x,
    y: obj.y,
    width: obj.width,
    height: obj.height,
  } as DocumentData;
  if (obj.type === "sticky") {
    return withRotation(obj, {
      ...base,
      text: obj.text,
      ...(obj.color != null && { color: obj.color }),
    });
  }
  if (obj.type === "rectangle") {
    return withRotation(obj, { ...base, ...(obj.color != null && { color: obj.color }) });
  }
  if (obj.type === "text") {
    return withRotation(obj, {
      ...base,
      text: obj.text,
      ...(obj.width != null && { width: obj.width }),
      ...(obj.height != null && { height: obj.height }),
      ...(obj.fontSize != null && { fontSize: obj.fontSize }),
      ...(obj.color != null && { color: obj.color }),
    });
  }
  if (obj.type === "frame") {
    return withRotation(obj, {
      ...base,
      ...(obj.title != null && { title: obj.title }),
    });
  }
  return base;
}

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

/** Build BoardObject from Firestore document id + data */
export function fromFirestoreDoc(id: string, data: DocumentData): BoardObject | null {
  const type = data.type as string;
  if (type === "connector") {
    const fromId = coerceString(data.fromId);
    const toId = coerceString(data.toId);
    if (!fromId || !toId) return null;
    const style = data.style === "arrow" || data.style === "line" ? data.style : undefined;
    return { id, type: "connector", fromId, toId, ...(style && { style }) };
  }
  if (type !== "sticky" && type !== "rectangle" && type !== "text" && type !== "frame") return null;
  const x = coerceNumber(data.x);
  const y = coerceNumber(data.y);
  const width = coerceNumber(data.width);
  const height = coerceNumber(data.height);
  const rotation = data.rotation != null ? coerceNumber(data.rotation) : undefined;
  const rotationOpt = rotation !== undefined && !Number.isNaN(rotation) ? { rotation } : {};
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
  return null;
}

/** Map Firestore QuerySnapshot to BoardObject[] */
export function snapshotToObjects(snapshot: QuerySnapshot<DocumentData>): BoardObject[] {
  const result: BoardObject[] = [];
  snapshot.forEach((doc) => {
    const obj = fromFirestoreDoc(doc.id, doc.data());
    if (obj) result.push(obj);
  });
  return result;
}
