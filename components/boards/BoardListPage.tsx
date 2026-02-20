"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { collection, doc } from "firebase/firestore";
import { useAuth } from "@/lib/auth/AuthContext";
import { useBoards } from "@/lib/board/useBoards";
import { createBoardMeta } from "@/lib/board/boardMetadata";
import { getDb } from "@/lib/firebase/client";

export function BoardListPage() {
  const router = useRouter();
  const { user, loading: authLoading, signOut } = useAuth();
  const { boards, loading: boardsLoading, error: boardsError } = useBoards();
  const [name, setName] = useState("");
  const [createError, setCreateError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);

  if (authLoading) {
    return (
      <div className="landing_loading">
        <div className="landing_loading_dot" />
        <span>Loading…</span>
      </div>
    );
  }
  if (!user) {
    router.push("/");
    return null;
  }

  const handleCreate = async (e: React.FormEvent) => {
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
      await createBoardMeta(db, boardId, trimmed, user.uid);
      setShowCreateModal(false);
      setName("");
      router.push(`/board/${boardId}`);
    } catch (err) {
      setCreateError(err instanceof Error ? err.message : "Failed to create board.");
      setCreating(false);
    }
  };

  const closeModal = () => {
    if (!creating) {
      setShowCreateModal(false);
      setCreateError(null);
      setName("");
    }
  };

  const displayName = user.displayName || user.email || "You";

  return (
    <div className="app_shell">
      <header className="app_header">
        <Link href="/" className="app_header_logo">
          ColabBoard
        </Link>
        <span className="app_header_title">Boards</span>
        <div className="app_header_spacer" />
        <span className="app_header_user" title={displayName}>
          {displayName}
        </span>
        <button type="button" className="app_btn_ghost" onClick={() => signOut().then(() => router.push("/"))}>
          Sign out
        </button>
      </header>

      <main className="board_list_main">
        <div className="board_list_card">
          <h2 className="board_list_heading">All boards</h2>

          {boardsError && (
            <div style={{ padding: "var(--space-2)", background: "rgba(239, 68, 68, 0.15)", color: "#fca5a5", fontSize: "0.875rem", marginBottom: "var(--space-2)", borderRadius: "var(--radius-md)" }}>
              {boardsError.message}
            </div>
          )}

          {boardsLoading ? (
            <p style={{ color: "rgba(255, 255, 255, 0.6)", fontSize: "0.875rem" }}>Loading boards…</p>
          ) : (
            <ul className="board_list_grid">
            {boards.map((board) => (
              <li key={board.id}>
                <Link href={`/board/${board.id}`} className="board_card">
                  {board.name}
                </Link>
              </li>
            ))}
            <li>
              <button
                type="button"
                className="board_card_add"
                onClick={() => setShowCreateModal(true)}
                aria-label="Create new board"
              >
                <span className="board_card_add_icon" aria-hidden>+</span>
                New board
              </button>
            </li>
          </ul>
        )}
        </div>
      </main>

      {showCreateModal && (
        <div
          className="board_modal_overlay"
          onClick={(e) => e.target === e.currentTarget && closeModal()}
          role="dialog"
          aria-modal="true"
          aria-labelledby="create-board-title"
        >
          <div className="board_modal_content" onClick={(e) => e.stopPropagation()}>
            <h3 id="create-board-title" className="board_modal_title">Create board</h3>
            <form onSubmit={handleCreate}>
              <label htmlFor="board-name" style={{ display: "block", marginBottom: "var(--space-2)" }}>
                <span style={{ display: "block", fontSize: "0.875rem", marginBottom: "var(--space-1)", color: "var(--color-text-muted)" }}>
                  Board name
                </span>
                <input
                  id="board-name"
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Sprint planning"
                  required
                  disabled={creating}
                  autoFocus
                  style={{
                    width: "100%",
                    padding: "var(--space-2)",
                    fontSize: "0.9375rem",
                    border: "1px solid var(--color-border)",
                    borderRadius: "var(--radius-md)",
                  }}
                  aria-label="Board name"
                />
              </label>
              {createError && (
                <p role="alert" style={{ marginTop: "var(--space-1)", fontSize: "0.875rem", color: "#b91c1c" }}>
                  {createError}
                </p>
              )}
              <div className="board_modal_actions">
                <button type="button" className="app_btn_ghost" onClick={closeModal} disabled={creating}>
                  Cancel
                </button>
                <button type="submit" className="btn_primary" disabled={creating}>
                  {creating ? "Creating…" : "Create board"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
