"use client";

import { useState, useEffect, useRef } from "react";
import { ref, onValue, set, onDisconnect, remove } from "firebase/database";
import type { User } from "firebase/auth";
import { getRealtimeDb } from "@/lib/firebase/client";

const CURSOR_THROTTLE_MS = 100;
const PRESENCE_COLORS = [
  "#ef4444",
  "#f97316",
  "#eab308",
  "#22c55e",
  "#14b8a6",
  "#3b82f6",
  "#8b5cf6",
  "#ec4899",
];

export function colorForUserId(userId: string): string {
  let n = 0;
  for (let i = 0; i < userId.length; i++) n += userId.charCodeAt(i);
  return PRESENCE_COLORS[Math.abs(n) % PRESENCE_COLORS.length];
}

export type PresenceUser = {
  id: string;
  displayName: string;
  color: string;
  cursor: { x: number; y: number } | null;
};

export function usePresence(
  boardId: string,
  user: User | null,
  cursor: { x: number; y: number } | null
): { otherUsers: PresenceUser[]; error: Error | null; lastCursorSyncLatencyMs: number | null } {
  const [otherUsers, setOtherUsers] = useState<PresenceUser[]>([]);
  const [error, setError] = useState<Error | null>(null);
  const [lastCursorSyncLatencyMs, setLastCursorSyncLatencyMs] = useState<number | null>(null);
  const presenceDataRef = useRef<Record<string, { displayName: string; color: string }>>({});
  const cursorsDataRef = useRef<Record<string, { x: number; y: number }>>({});
  const lastCursorWriteRef = useRef<number>(0);
  const latestCursorRef = useRef<{ x: number; y: number } | null>(null);
  const throttleTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const db = getRealtimeDb();
    if (!boardId || !user || !db) {
      setOtherUsers([]);
      return;
    }

    setError(null);
    const uid = user.uid;
    const displayName = user.displayName || user.email || "Anonymous";
    const color = colorForUserId(uid);

    const presencePath = `presence/${boardId}/${uid}`;
    const presenceRef = ref(db, presencePath);
    const cursorRef = ref(db, `cursors/${boardId}/${uid}`);
    const presenceValue = { displayName, color };
    set(presenceRef, presenceValue).catch((e) =>
      setError(e instanceof Error ? e : new Error(String(e)))
    );
    onDisconnect(presenceRef).remove().catch((e) =>
      setError(e instanceof Error ? e : new Error(String(e)))
    );
    onDisconnect(cursorRef).remove().catch((e) =>
      setError(e instanceof Error ? e : new Error(String(e)))
    );

    const presenceRootRef = ref(db, `presence/${boardId}`);
    const cursorsRootRef = ref(db, `cursors/${boardId}`);

    const unsubPresence = onValue(
      presenceRootRef,
      (snapshot) => {
        setError(null);
        const val = snapshot.val();
        presenceDataRef.current = (val && typeof val === "object") ? val : {};
        mergeAndSet();
      },
      (err) => setError(err instanceof Error ? err : new Error(String(err)))
    );

    const unsubCursors = onValue(
      cursorsRootRef,
      (snapshot) => {
        setError(null);
        const val = snapshot.val();
        cursorsDataRef.current = (val && typeof val === "object") ? val : {};
        const writeTime = lastCursorWriteRef.current;
        if (writeTime > 0 && val && typeof val === "object" && uid in val) {
          setLastCursorSyncLatencyMs(() => Math.round(Date.now() - writeTime));
        }
        mergeAndSet();
      },
      (err) => setError(err instanceof Error ? err : new Error(String(err)))
    );

    function mergeAndSet() {
      const presence = presenceDataRef.current;
      const cursors = cursorsDataRef.current;
      const next: PresenceUser[] = [];
      for (const id of Object.keys(presence)) {
        if (id === uid) continue;
        const p = presence[id];
        if (!p || typeof p.displayName !== "string") continue;
        const cursorVal = cursors[id];
        const x = cursorVal != null ? Number(cursorVal.x) : NaN;
        const y = cursorVal != null ? Number(cursorVal.y) : NaN;
        const cursorPoint =
          Number.isFinite(x) && Number.isFinite(y) ? { x, y } : null;
        next.push({
          id,
          displayName: p.displayName,
          color: typeof p.color === "string" ? p.color : colorForUserId(id),
          cursor: cursorPoint,
        });
      }
      if (process.env.NODE_ENV === "development") {
        const presenceKeys = Object.keys(presence).length;
        const cursorKeys = Object.keys(cursors).length;
        console.debug("[usePresence] presence/cursors received:", { presenceKeys, cursorKeys, otherUsersCount: next.length });
      }
      setOtherUsers(next);
    }

    return () => {
      remove(presenceRef).catch((e) =>
        setError(e instanceof Error ? e : new Error(String(e)))
      );
      remove(cursorRef).catch((e) =>
        setError(e instanceof Error ? e : new Error(String(e)))
      );
      unsubPresence();
      unsubCursors();
      if (throttleTimerRef.current) {
        clearTimeout(throttleTimerRef.current);
        throttleTimerRef.current = null;
      }
    };
  }, [boardId, user?.uid ?? ""]);

  latestCursorRef.current = cursor;

  useEffect(() => {
    const db = getRealtimeDb();
    if (!boardId || !user || !db || cursor === null) return;

    const uid = user.uid;
    const cursorsPath = `cursors/${boardId}/${uid}`;
    const cursorRef = ref(db, cursorsPath);

    const flush = () => {
      const toWrite = latestCursorRef.current;
      if (toWrite === null) return;
      lastCursorWriteRef.current = Date.now();
      set(cursorRef, { x: toWrite.x, y: toWrite.y }).catch((e) =>
        setError(e instanceof Error ? e : new Error(String(e)))
      );
    };

    const now = Date.now();
    if (now - lastCursorWriteRef.current >= CURSOR_THROTTLE_MS) {
      flush();
    } else if (!throttleTimerRef.current) {
      throttleTimerRef.current = setTimeout(() => {
        throttleTimerRef.current = null;
        flush();
      }, CURSOR_THROTTLE_MS - (now - lastCursorWriteRef.current));
    }

    return () => {
      if (throttleTimerRef.current) {
        clearTimeout(throttleTimerRef.current);
        throttleTimerRef.current = null;
      }
    };
  }, [boardId, user?.uid ?? "", cursor?.x, cursor?.y]);

  return { otherUsers, error, lastCursorSyncLatencyMs };
}
