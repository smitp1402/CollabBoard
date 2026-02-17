"use client";

import { useAuth } from "@/lib/auth/AuthContext";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

export default function Home() {
  const { user, loading, signInWithGoogle } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;
    if (user) {
      router.push("/board");
    }
  }, [user, loading, router]);

  if (loading) {
    return <div className="loading_root">Loading…</div>;
  }
  if (user) return null;

  return (
    <div className="home_root">
      <div className="home_card">
        <h1 className="home_title">ColabBoard</h1>
        <p className="home_subtitle">Sign in with Google to open the board.</p>
        <button type="button" className="btn_primary" onClick={() => signInWithGoogle()}>
          Sign in with Google
        </button>
      </div>
    </div>
  );
}
