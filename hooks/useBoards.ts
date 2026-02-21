"use client";

import { useState, useEffect } from "react";
import { collection, onSnapshot, type QuerySnapshot, type DocumentData } from "firebase/firestore";
import { getDb } from "@/lib/firebase/client";
import { snapshotToBoardMetaList, ensureDefaultBoard, type BoardMeta } from "@/lib/board/boardMetadata";

export function useBoards(): {
  boards: BoardMeta[];
  loading: boolean;
  error: Error | null;
} {
  const [boards, setBoards] = useState<BoardMeta[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    const db = getDb();
    if (!db) {
      setError(new Error("Firestore not configured."));
      setLoading(false);
      return;
    }
    setError(null);
    let mounted = true;
    let unsubscribe: (() => void) | null = null;

    ensureDefaultBoard(db).then(() => {
      if (!mounted) return;
      unsubscribe = onSnapshot(
        collection(db, "boards"),
        (snapshot: QuerySnapshot<DocumentData>) => {
          if (!mounted) return;
          setBoards(snapshotToBoardMetaList(snapshot));
          setLoading(false);
          setError(null);
        },
        (err) => {
          if (!mounted) return;
          setError(err instanceof Error ? err : new Error(String(err)));
          setLoading(false);
        }
      );
    }).catch((err) => {
      if (mounted) {
        setError(err instanceof Error ? err : new Error(String(err)));
        setLoading(false);
      }
    });

    return () => {
      mounted = false;
      if (unsubscribe) unsubscribe();
    };
  }, []);

  return { boards, loading, error };
}
