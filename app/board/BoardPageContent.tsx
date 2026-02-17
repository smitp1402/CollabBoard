"use client";

import { useEffect } from "react";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth/AuthContext";
import { BoardCanvas } from "@/components/board/BoardCanvas";

export function BoardPageContent() {
  const router = useRouter();
  const { user, loading, signOut } = useAuth();

  useEffect(() => {
    if (loading) return;
    if (!user) {
      router.push("/");
    }
  }, [user, loading, router]);

  if (loading) {
    return <div className="loading_root">Loading…</div>;
  }
  if (!user) return null;

  const handleSignOut = async () => {
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
        <div style={{ flex: 1, minHeight: 0 }}>
          <BoardCanvas />
        </div>
      </main>
    </div>
  );
}
