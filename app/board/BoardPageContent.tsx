"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { ref, remove } from "firebase/database";
import { useAuth } from "@/lib/auth/AuthContext";
import { BoardCanvas } from "@/components/board/BoardCanvas";
import { useBoardObjects } from "@/lib/board/useBoardObjects";
import { DEFAULT_BOARD_ID } from "@/lib/board-constants";
import { getRealtimeDb } from "@/lib/firebase/client";
import type { PresenceUser } from "@/lib/board/usePresence";

function getInitial(name: string): string {
  const trimmed = name.trim();
  if (!trimmed) return "?";
  const parts = trimmed.split(/\s+/);
  if (parts.length >= 2) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase().slice(0, 2);
  return trimmed.slice(0, 2).toUpperCase();
}

export function BoardPageContent() {
  const router = useRouter();
  const { user, loading, signOut } = useAuth();
  const { objects, setObjects, loading: boardLoading, error: boardError } = useBoardObjects(user ? DEFAULT_BOARD_ID : "");
  const [otherUsers, setOtherUsers] = useState<PresenceUser[]>([]);
  const [presenceError, setPresenceError] = useState<Error | null>(null);
  const [onlineOpen, setOnlineOpen] = useState(false);
  const onlineRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (loading) return;
    if (!user) {
      router.push("/");
    }
  }, [user, loading, router]);

  useEffect(() => {
    if (!onlineOpen) return;
    const handleClick = (e: MouseEvent) => {
      if (onlineRef.current && !onlineRef.current.contains(e.target as Node)) setOnlineOpen(false);
    };
    document.addEventListener("click", handleClick);
    return () => document.removeEventListener("click", handleClick);
  }, [onlineOpen]);

  if (loading) {
    return <div className="loading_root">Loading…</div>;
  }
  if (!user) return null;

  const handleSignOut = async () => {
    const db = getRealtimeDb();
    if (db && user) {
      const presenceRef = ref(db, `presence/${DEFAULT_BOARD_ID}/${user.uid}`);
      const cursorRef = ref(db, `cursors/${DEFAULT_BOARD_ID}/${user.uid}`);
      await Promise.all([remove(presenceRef), remove(cursorRef)]).catch(() => {});
    }
    await signOut();
    router.push("/");
  };

  const displayName = user.displayName || user.email || "You";

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        height: "100vh",
        minHeight: 0,
      }}
    >
      <header className="board_header">
        <span className="board_header_logo">ColabBoard</span>
        <span className="board_header_title">Board</span>
        <div className="board_header_spacer" />
        {otherUsers.length > 0 && (
          <div className="board_header_online_wrap" ref={onlineRef}>
            <button
              type="button"
              className="board_header_online_trigger"
              onClick={() => setOnlineOpen((v) => !v)}
              title={`${otherUsers.length} online`}
              aria-expanded={onlineOpen}
              aria-haspopup="true"
            >
              <span className="board_header_online_dot" aria-hidden />
              <span className="board_header_online_count">{otherUsers.length} online</span>
            </button>
            {onlineOpen && (
              <div className="board_header_online_dropdown" role="menu">
                <div className="board_header_online_dropdown_title">Online on this board</div>
                <ul className="board_header_online_list">
                  {otherUsers.map((u) => (
                    <li key={u.id} className="board_header_online_item" role="none">
                      <span
                        className="board_header_online_avatar"
                        style={{ backgroundColor: u.color }}
                        title={u.displayName}
                      >
                        {getInitial(u.displayName)}
                      </span>
                      <span className="board_header_online_name">{u.displayName}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}
        <span className="board_header_user" title={displayName}>
          {displayName}
        </span>
        <button type="button" className="btn_ghost" onClick={handleSignOut}>
          Sign out
        </button>
      </header>
      <main
        style={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          minHeight: 0,
          padding: 0,
        }}
      >
        {boardError && (
          <div style={{ padding: "var(--space-2)", background: "#fef2f2", color: "#b91c1c", fontSize: "0.875rem" }}>
            Sync error: {boardError.message}. Check .env.local (NEXT_PUBLIC_FIREBASE_*), Firestore rules, and that Firestore is enabled in your Firebase project.
          </div>
        )}
        {presenceError && (
          <div style={{ padding: "var(--space-2)", background: "#fef3c7", color: "#92400e", fontSize: "0.875rem" }}>
            Can&apos;t load other users&apos; cursors. Check Realtime Database rules and connection.
          </div>
        )}
        {boardLoading ? (
          <div className="loading_root">Loading board…</div>
        ) : (
          <div style={{ flex: 1, minHeight: 0 }}>
            <BoardCanvas
              boardId={DEFAULT_BOARD_ID}
              user={user}
              objects={objects}
              onObjectsChange={setObjects}
              onOtherUsersChange={setOtherUsers}
              onPresenceError={setPresenceError}
            />
          </div>
        )}
      </main>
    </div>
  );
}
