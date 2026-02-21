"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { useBoards } from "@/hooks/useBoards";
import { useCreateBoard } from "@/hooks/useCreateBoard";

/** Board list page content. Rendered only when user is authenticated (route handles redirect). */
export function BoardListContent() {
  const router = useRouter();
  const { user, signOut } = useAuth();
  const { boards, loading: boardsLoading, error: boardsError } = useBoards();
  const {
    name,
    setName,
    createError,
    creating,
    showCreateModal,
    handleCreate,
    closeModal,
    openCreateModal,
  } = useCreateBoard({ userId: user?.uid ?? "" });

  if (!user) return null;

  const displayName = user.displayName || user.email || "You";

  return (
    <div className="app_shell">
      <header className="app_header">
        <Link href="/page/boards" className="app_header_logo">
          ColabBoard
        </Link>
        <span className="app_header_title">Dashboard</span>
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
                <Link href={`/page/board/${board.id}`} className="board_card">
                  {board.name}
                </Link>
              </li>
            ))}
            <li>
              <button
                type="button"
                className="board_card_add"
                onClick={openCreateModal}
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
