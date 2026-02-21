"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { BoardListContent } from "./BoardListContent";

export default function BoardsPage() {
  const router = useRouter();
  const { user, loading } = useAuth();

  useEffect(() => {
    if (loading) return;
    if (!user) {
      router.replace("/");
    }
  }, [user, loading, router]);

  if (loading) {
    return (
      <div className="landing_loading">
        <div className="landing_loading_dot" />
        <span>Loading…</span>
      </div>
    );
  }
  if (!user) return null;

  return <BoardListContent />;
}
