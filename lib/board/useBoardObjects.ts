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
          if (prev && (prev.x !== obj.x || prev.y !== obj.y || (prev.type === "sticky" && prev.text !== (obj as Extract<BoardObject, { type: "sticky" }>).text))) {
            const updates: DocumentData = {};
            if (prev.x !== obj.x) updates.x = obj.x;
            if (prev.y !== obj.y) updates.y = obj.y;
            if (obj.type === "sticky" && prev.type === "sticky" && prev.text !== obj.text) updates.text = obj.text;
            if (Object.keys(updates).length > 0) {
              updateDoc(ref, updates).catch((e) => setError(e instanceof Error ? e : new Error(String(e))));
            }
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
