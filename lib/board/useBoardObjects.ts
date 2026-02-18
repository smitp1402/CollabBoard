"use client";

import { useState, useEffect, useCallback } from "react";
import {
  collection,
  doc,
  onSnapshot,
  setDoc,
  updateDoc,
  deleteDoc,
  type Firestore,
  type QuerySnapshot,
  type DocumentData,
} from "firebase/firestore";
import { getDb } from "@/lib/firebase/client";
import type { BoardObject } from "@/lib/board-types";
import {
  snapshotToObjects,
  toFirestoreObject,
} from "./firestore-board";

export function useBoardObjects(boardId: string): {
  objects: BoardObject[];
  setObjects: (next: BoardObject[]) => void;
  loading: boolean;
  error: Error | null;
} {
  const [objects, setObjectsState] = useState<BoardObject[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    const db = getDb();
    if (!boardId) {
      setLoading(false);
      return;
    }
    if (!db) {
      setError(new Error("Firestore not configured. Add NEXT_PUBLIC_FIREBASE_* env vars and ensure Firestore is enabled."));
      setLoading(false);
      return;
    }
    setError(null);
    const colRef = collection(db, "boards", boardId, "objects");
    const unsubscribe = onSnapshot(
      colRef,
      (snapshot: QuerySnapshot<DocumentData>) => {
        setObjectsState(snapshotToObjects(snapshot));
        setLoading(false);
        setError(null);
      },
      (err) => {
        setError(err instanceof Error ? err : new Error(String(err)));
        setLoading(false);
      }
    );
    return () => unsubscribe();
  }, [boardId]);

  const setObjects = useCallback(
    (next: BoardObject[]) => {
      const db = getDb();
      if (!boardId) return;

      if (!db) {
        setObjectsState(next);
        return;
      }

      const currentIds = new Set(objects.map((o) => o.id));
      const nextIds = new Set(next.map((o) => o.id));
      const currentMap = new Map(objects.map((o) => [o.id, o]));

      for (const obj of next) {
        const ref = doc(db, "boards", boardId, "objects", obj.id);
        if (!currentIds.has(obj.id)) {
          setDoc(ref, toFirestoreObject(obj)).catch((e) => setError(e instanceof Error ? e : new Error(String(e))));
        } else {
          const prev = currentMap.get(obj.id);
          if (!prev || prev.type !== obj.type) continue;
          const updates: DocumentData = {};
          if (obj.type !== "connector") {
            if ((prev as { x: number }).x !== (obj as { x: number }).x) updates.x = (obj as { x: number }).x;
            if ((prev as { y: number }).y !== (obj as { y: number }).y) updates.y = (obj as { y: number }).y;
            const p = prev as Extract<BoardObject, { type: "sticky" | "rectangle" | "text" | "frame" | "circle" | "line" }>;
            const o = obj as Extract<BoardObject, { type: "sticky" | "rectangle" | "text" | "frame" | "circle" | "line" }>;
            if (p.width !== o.width) updates.width = o.width;
            if (p.height !== o.height) updates.height = o.height;
            if (p.rotation !== o.rotation) updates.rotation = o.rotation;
            if (obj.type === "sticky" && prev.type === "sticky") {
              if (prev.text !== obj.text) updates.text = obj.text;
              if (prev.color !== obj.color) updates.color = obj.color;
            }
            if (obj.type === "text" && prev.type === "text") {
              if (prev.text !== obj.text) updates.text = obj.text;
              if (prev.fontSize !== obj.fontSize) updates.fontSize = obj.fontSize;
              if (prev.color !== obj.color) updates.color = obj.color;
              if (prev.width !== obj.width) updates.width = obj.width;
              if (prev.height !== obj.height) updates.height = obj.height;
            }
            if (obj.type === "frame" && prev.type === "frame" && prev.title !== obj.title) updates.title = obj.title;
          } else {
            const cp = prev as Extract<BoardObject, { type: "connector" }>;
            const co = obj as Extract<BoardObject, { type: "connector" }>;
            if (cp.fromId !== co.fromId) updates.fromId = co.fromId;
            if (cp.toId !== co.toId) updates.toId = co.toId;
            if (cp.style !== co.style) updates.style = co.style;
          }
          if (Object.keys(updates).length > 0) {
            updateDoc(ref, updates).catch((e) => setError(e instanceof Error ? e : new Error(String(e))));
          }
        }
      }
      for (const id of currentIds) {
        if (!nextIds.has(id)) {
          deleteDoc(doc(db, "boards", boardId, "objects", id)).catch((e) => setError(e instanceof Error ? e : new Error(String(e))));
        }
      }
    },
    [boardId, objects]
  );

  return { objects, setObjects, loading, error };
}
