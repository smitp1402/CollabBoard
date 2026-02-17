"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth/AuthContext";
import { DEFAULT_BOARD_ID } from "@/lib/board-constants";

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
    <>
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
      <main style={{ padding: "var(--space-3)" }}>
        <p style={{ color: "var(--color-text-muted)", fontSize: "0.9375rem" }}>
          Board "{DEFAULT_BOARD_ID}" — canvas and tools will go here (Phase 2).
        </p>
      </main>
    </>
  );
}
