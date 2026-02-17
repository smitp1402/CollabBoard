import type { DocumentData, QuerySnapshot } from "firebase/firestore";
import type { BoardObject } from "@/lib/board-types";

/** Firestore path for a board's objects collection */
export function objectsCollectionPath(boardId: string): string {
  return `boards/${boardId}/objects`;
}

/** Convert BoardObject to Firestore document data (no id in body; use doc id) */
export function toFirestoreObject(obj: BoardObject): DocumentData {
  const base = {
    type: obj.type,
    x: obj.x,
    y: obj.y,
    width: obj.width,
    height: obj.height,
  };
  if (obj.type === "sticky") {
    return { ...base, text: obj.text, ...(obj.color != null && { color: obj.color }) };
  }
  return { ...base, ...(obj.color != null && { color: obj.color }) };
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
  const type = data.type === "sticky" || data.type === "rectangle" ? data.type : null;
  if (!type) return null;
  const x = coerceNumber(data.x);
  const y = coerceNumber(data.y);
  const width = coerceNumber(data.width);
  const height = coerceNumber(data.height);
  const color = data.color != null ? coerceString(data.color) : undefined;
  if (type === "sticky") {
    return {
      id,
      type: "sticky",
      x,
      y,
      width,
      height,
      text: coerceString(data.text),
      ...(color !== undefined && { color }),
    };
  }
  return {
    id,
    type: "rectangle",
    x,
    y,
    width,
    height,
    ...(color !== undefined && { color }),
  };
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
