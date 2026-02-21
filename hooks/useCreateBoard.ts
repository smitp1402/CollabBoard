"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { collection, doc } from "firebase/firestore";
import { getDb } from "@/lib/firebase/client";
import { createBoardMeta } from "@/lib/board/boardMetadata";

type UseCreateBoardOptions = {
  userId: string;
};

export function useCreateBoard({ userId }: UseCreateBoardOptions) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [createError, setCreateError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);

  const handleCreate = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      const trimmed = name.trim();
      if (!trimmed) {
        setCreateError("Board name is required.");
        return;
      }
      const db = getDb();
      if (!db) {
        setCreateError("Firestore not configured.");
        return;
      }
      setCreateError(null);
      setCreating(true);
      try {
        const ref = doc(collection(db, "boards"));
        const boardId = ref.id;
        await createBoardMeta(db, boardId, trimmed, userId);
        setShowCreateModal(false);
        setName("");
        router.push(`/page/board/${boardId}`);
      } catch (err) {
        setCreateError(err instanceof Error ? err.message : "Failed to create board.");
        setCreating(false);
      }
    },
    [name, userId, router]
  );

  const closeModal = useCallback(() => {
    if (!creating) {
      setShowCreateModal(false);
      setCreateError(null);
      setName("");
    }
  }, [creating]);

  const openCreateModal = useCallback(() => setShowCreateModal(true), []);

  return {
    name,
    setName,
    createError,
    creating,
    showCreateModal,
    setShowCreateModal,
    handleCreate,
    closeModal,
    openCreateModal,
  };
}
