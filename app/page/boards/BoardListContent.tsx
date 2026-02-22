"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { useBoards } from "@/hooks/useBoards";
import { useCreateBoard } from "@/hooks/useCreateBoard";
import { useToggleBoardStar } from "@/hooks/useToggleBoardStar";
import type { BoardMeta } from "@/lib/board/boardMetadata";

type DashboardTab = "all" | "starred";

/** Board list page content. Rendered only when user is authenticated (route handles redirect). */
export function BoardListContent() {
  const router = useRouter();
  const { user, signOut } = useAuth();
  const [tab, setTab] = useState<DashboardTab>("all");
  const { boards, loading: boardsLoading, error: boardsError } = useBoards();
  const { toggleStar, togglingId, error: starError } = useToggleBoardStar(user?.uid);
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
  const starredBoards = boards.filter((b) => b.starredBy?.includes(user.uid) ?? false);

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
          <p className="board_list_welcome">
            Hi, {displayName} — open a board or create a new one.
          </p>

          {boardsError && (
            <div className="board_list_error" role="alert">
              {boardsError.message}
            </div>
          )}
          {starError && (
            <div className="board_list_error" role="alert">
              Star update failed: {starError.message}
            </div>
          )}

          <div className="board_list_tabbar" role="tablist" aria-label="Board view">
            <button
              type="button"
              role="tab"
              aria-selected={tab === "all"}
              aria-controls="board-list-panel"
              id="tab-all"
              className={`board_list_tab ${tab === "all" ? "board_list_tab_active" : ""}`}
              onClick={() => setTab("all")}
            >
              <span className="board_list_tab_icon" aria-hidden>▦</span>
              All boards
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={tab === "starred"}
              aria-controls="board-list-panel"
              id="tab-starred"
              className={`board_list_tab ${tab === "starred" ? "board_list_tab_active" : ""}`}
              onClick={() => setTab("starred")}
            >
              <span className="board_list_tab_icon board_list_tab_icon_star" aria-hidden>★</span>
              Starred
            </button>
          </div>

          {boardsLoading ? (
            <p className="board_list_loading">Loading boards…</p>
          ) : (
            <div
              id="board-list-panel"
              role="tabpanel"
              aria-labelledby={tab === "all" ? "tab-all" : "tab-starred"}
              className="board_list_section"
            >
              {tab === "all" && (
                <ul className="board_list_grid">
                  {boards.map((board) => (
                    <li key={board.id}>
                      <BoardCard
                        board={board}
                        isStarred={(board.starredBy?.includes(user.uid)) ?? false}
                        userId={user.uid}
                        onToggleStar={toggleStar}
                        togglingId={togglingId}
                      />
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
              {tab === "starred" && (
                starredBoards.length > 0 ? (
                  <ul className="board_list_grid">
                    {starredBoards.map((board) => (
                      <li key={board.id}>
                        <BoardCard
                          board={board}
                          isStarred={true}
                          userId={user.uid}
                          onToggleStar={toggleStar}
                          togglingId={togglingId}
                        />
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="board_list_empty">No starred boards. Star a board from All boards to see it here.</p>
                )
              )}
            </div>
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
              <label htmlFor="board-name" className="board_modal_label">
                <span className="board_modal_label_text">Board name</span>
                <input
                  id="board-name"
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Sprint planning"
                  required
                  disabled={creating}
                  autoFocus
                  className="board_modal_input"
                  aria-label="Board name"
                />
              </label>
              {createError && (
                <p role="alert" className="board_modal_error">
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

function BoardCard({
  board,
  isStarred,
  userId,
  onToggleStar,
  togglingId,
}: {
  board: BoardMeta;
  isStarred: boolean;
  userId: string;
  onToggleStar: (boardId: string, currentlyStarred: boolean) => void;
  togglingId: string | null;
}) {
  const isToggling = togglingId === board.id;

  const handleStarClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    onToggleStar(board.id, isStarred);
  };

  return (
    <Link href={`/page/board/${board.id}`} className="board_card">
      <span className="board_card_name">{board.name}</span>
      <button
        type="button"
        className={`board_card_star ${isStarred ? "board_card_star_active" : ""}`}
        onClick={handleStarClick}
        disabled={isToggling}
        aria-label={isStarred ? "Unstar this board" : "Star this board"}
        title={isStarred ? "Unstar" : "Star"}
      >
        <span aria-hidden>★</span>
      </button>
    </Link>
  );
}
