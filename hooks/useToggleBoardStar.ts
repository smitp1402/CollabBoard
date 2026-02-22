"use client";

import { useState, useCallback } from "react";
import { getDb } from "@/lib/firebase/client";
import { updateBoardStar } from "@/lib/board/boardMetadata";

export function useToggleBoardStar(userId: string | undefined): {
  toggleStar: (boardId: string, currentlyStarred: boolean) => Promise<void>;
  togglingId: string | null;
  error: Error | null;
} {
  const [togglingId, setTogglingId] = useState<string | null>(null);
  const [error, setError] = useState<Error | null>(null);

  const toggleStar = useCallback(
    async (boardId: string, currentlyStarred: boolean) => {
      if (!userId) return;
      const db = getDb();
      if (!db) {
        setError(new Error("Firestore not configured."));
        return;
      }
      setError(null);
      setTogglingId(boardId);
      try {
        await updateBoardStar(db, boardId, userId, !currentlyStarred);
      } catch (e) {
        setError(e instanceof Error ? e : new Error(String(e)));
      } finally {
        setTogglingId(null);
      }
    },
    [userId]
  );

  return { toggleStar, togglingId, error };
}
