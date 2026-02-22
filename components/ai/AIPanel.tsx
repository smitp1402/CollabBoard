"use client";

import { useState, useCallback, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import { getDb } from "@/lib/firebase/client";
import {
  collection,
  doc,
  limit,
  onSnapshot,
  orderBy,
  query,
  type DocumentData,
  type QuerySnapshot,
} from "firebase/firestore";
import type { AICommandResponse } from "@/types/ai-types";

const MAX_HISTORY = 10;
const API_PATH = "/api/ai/commands";

/** Shortcut suggestions shown in the chat panel (label = chip text, prompt = text inserted on click). */
const AI_SUGGESTION_COMMANDS: { label: string; prompt: string }[] = [
  { label: "Yellow sticky 'User Research'", prompt: "Add a yellow sticky note that says 'User Research'" },
  { label: "Blue rectangle at 100, 200", prompt: "Create a blue rectangle at position 100, 200" },
  { label: "Frame 'Sprint Planning'", prompt: "Add a frame called 'Sprint Planning'" },
  { label: "Move pink stickies right", prompt: "Move all the pink sticky notes to the right side" },
  { label: "Resize frame to fit", prompt: "Resize the frame to fit its contents" },
  { label: "Sticky color to green", prompt: "Change the sticky note color to green" },
  { label: "Arrange in a grid", prompt: "Arrange these sticky notes in a grid" },
  { label: "2×3 grid pros and cons", prompt: "Create a 2x3 grid of sticky notes for pros and cons" },
  { label: "Space evenly", prompt: "Space these elements evenly" },
  { label: "SWOT template", prompt: "Create a SWOT analysis template with four quadrants" },
  { label: "User journey 5 stages", prompt: "Build a user journey map with 5 stages" },
  { label: "Retro board", prompt: "Set up a retrospective board with What Went Well, What Didn't, and Action Items columns" },
];

/** UI-only status; maps from API status and network state. */
export type AICommandStatus = "idle" | "running" | "completed" | "failed";

export type HistoryEntry = {
  prompt: string;
  status: AICommandStatus;
  summary: string;
  commandId?: string;
  timestamp: number;
};

export type AIPanelProps = {
  boardId: string;
  className?: string;
  /** Notifies parent when the panel is opened or collapsed so layout (e.g. zoom controls) can adjust. */
  onOpenChange?: (open: boolean) => void;
};

export function AIPanel({ boardId, className, onOpenChange }: AIPanelProps) {
  const { user } = useAuth();
  const [prompt, setPrompt] = useState("");
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<AICommandStatus>("idle");
  const [lastResponse, setLastResponse] = useState("");
  const [lastError, setLastError] = useState("");
  const [lastSubmittedPrompt, setLastSubmittedPrompt] = useState("");
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [activeCommandId, setActiveCommandId] = useState<string | null>(null);
  const [isCollapsed, setIsCollapsed] = useState(false);

  useEffect(() => {
    onOpenChange?.(!isCollapsed);
  }, [isCollapsed, onOpenChange]);

  const mapApiStatusToUi = useCallback((apiStatus?: string): AICommandStatus => {
    if (apiStatus === "pending") return "running";
    if (apiStatus === "error") return "failed";
    if (apiStatus === "success") return "completed";
    return "completed";
  }, []);

  const mapCommandStatusToUi = useCallback((commandStatus?: string): AICommandStatus => {
    if (commandStatus === "running") return "running";
    if (commandStatus === "failed") return "failed";
    if (commandStatus === "completed") return "completed";
    return "idle";
  }, []);

  const pushHistoryFallback = useCallback((entry: HistoryEntry) => {
    setHistory((prev) => [entry, ...prev].slice(0, MAX_HISTORY));
  }, []);

  useEffect(() => {
    const db = getDb();
    if (!db || !boardId) return;
    const q = query(
      collection(db, "boards", boardId, "ai_commands"),
      orderBy("createdAt", "desc"),
      limit(MAX_HISTORY)
    );

    const unsubscribe = onSnapshot(q, (snapshot: QuerySnapshot<DocumentData>) => {
      const mapped: HistoryEntry[] = snapshot.docs.map((item) => {
        const data = item.data();
        return {
          prompt: String(data.prompt ?? ""),
          status: mapCommandStatusToUi(String(data.status ?? "")),
          summary: String(data.summary ?? ""),
          commandId: item.id,
          timestamp: Date.now(),
        };
      });
      setHistory(mapped);
    });
    return () => unsubscribe();
  }, [boardId, mapCommandStatusToUi]);

  useEffect(() => {
    const db = getDb();
    if (!db || !boardId || !activeCommandId) return;
    const commandRef = doc(db, "boards", boardId, "ai_commands", activeCommandId);
    const unsubscribe = onSnapshot(commandRef, (snapshot) => {
      if (!snapshot.exists()) return;
      const data = snapshot.data();
      const nextStatus = mapCommandStatusToUi(String(data?.status ?? ""));
      setStatus(nextStatus);
      if (nextStatus === "completed") {
        setLastResponse(String(data?.summary ?? "Done."));
        setLastError("");
        setLoading(false);
      } else if (nextStatus === "failed") {
        const err = String(data?.error ?? data?.summary ?? "Request failed.");
        setLastError(err);
        setLastResponse("");
        setLoading(false);
      }
    });
    return () => unsubscribe();
  }, [activeCommandId, boardId, mapCommandStatusToUi]);

  const submitToApi = useCallback(
    async (inputPrompt: string) => {
      if (!user) {
        setLastError("You must be signed in to run commands.");
        setStatus("failed");
        setLoading(false);
        return;
      }
      let token: string;
      try {
        token = await user.getIdToken();
      } catch {
        setLastError("Failed to get auth token.");
        setStatus("failed");
        setLoading(false);
        return;
      }
      const body = {
        boardId,
        prompt: inputPrompt,
        clientRequestId: crypto.randomUUID(),
        idempotencyKey: crypto.randomUUID(),
      };
      const res = await fetch(API_PATH, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(body),
      });
      const json = (await res.json().catch(() => ({}))) as AICommandResponse;

      if (!res.ok) {
        const message =
          json.error?.message ?? `Request failed (${res.status}).`;
        setLastError(message);
        setStatus("failed");
        setLoading(false);
        pushHistoryFallback({
          prompt: inputPrompt,
          status: "failed",
          summary: message,
          timestamp: Date.now(),
        });
        return;
      }

      const data = json.data;
      const summary = data?.summary ?? "Done.";
      const commandId = data?.commandId;
      const apiStatus = data?.status;
      if (commandId) {
        setActiveCommandId(commandId);
      }
      setStatus(mapApiStatusToUi(apiStatus));
      if (apiStatus === "error") {
        setLastError(json.error?.message ?? summary);
        setLastResponse("");
      } else {
        const displaySummary = commandId != null ? `${summary} (${commandId})` : summary;
        setLastResponse(displaySummary);
        setLastError("");
      }
      setLoading(false);
      if (!getDb()) {
        pushHistoryFallback({
          prompt: inputPrompt,
          status: mapApiStatusToUi(apiStatus),
          summary: summary,
          commandId,
          timestamp: Date.now(),
        });
      }
    },
    [boardId, mapApiStatusToUi, pushHistoryFallback, user]
  );

  const handleSubmit = useCallback(() => {
    const trimmed = prompt.trim();
    if (!trimmed || loading) return;
    setLastSubmittedPrompt(trimmed);
    setStatus("running");
    setLoading(true);
    setLastResponse("");
    setLastError("");
    setPrompt("");
    submitToApi(trimmed);
  }, [prompt, loading, submitToApi]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        const trimmed = prompt.trim();
        if (trimmed && !loading) {
          setLastSubmittedPrompt(trimmed);
          setStatus("running");
          setLoading(true);
          setLastResponse("");
          setLastError("");
          setPrompt("");
          submitToApi(trimmed);
        }
      }
    },
    [prompt, loading, submitToApi]
  );

  const handleRetry = useCallback(() => {
    if (status !== "failed" || !lastSubmittedPrompt || loading) return;
    setStatus("running");
    setLoading(true);
    setLastError("");
    submitToApi(lastSubmittedPrompt);
  }, [status, lastSubmittedPrompt, loading, submitToApi]);

  const isEmpty = !prompt.trim();
  const submitDisabled = isEmpty || loading;

  return (
    <div className="ai-panel-overlay" aria-hidden={isCollapsed}>
      <button
        type="button"
        className="ai-panel-open-trigger"
        onClick={() => setIsCollapsed(false)}
        aria-label="Open AI Assistant panel"
        style={{
          visibility: isCollapsed ? "visible" : "hidden",
          pointerEvents: isCollapsed ? "auto" : "none",
          opacity: isCollapsed ? 1 : 0,
        }}
      >
        AI ▶
      </button>
      <aside
        className={`ai-panel ai-panel_slide ${isCollapsed ? "ai-panel_slided" : ""} ${className ?? ""}`.trim()}
        aria-label="AI Assistant panel"
      >
        <div className="ai-panel-inner">
          <div className="ai-panel-header">
            <h2 className="ai-panel-title">AI Assistant</h2>
            <button
              type="button"
              className="ai-panel-collapse"
              onClick={() => setIsCollapsed((v) => !v)}
              aria-label={isCollapsed ? "Expand panel" : "Collapse panel"}
              aria-expanded={!isCollapsed}
            >
              {isCollapsed ? "▶" : "◀"}
            </button>
          </div>

        {!isCollapsed && (
          <>
            <div className="ai-panel-section">
              <label htmlFor="ai-panel-input" className="visually-hidden">
                Command prompt
              </label>
              <textarea
                id="ai-panel-input"
                className="ai-panel-input"
                placeholder="Ask AI to add sticky notes, shapes, or arrange the board… (Enter to run, Shift+Enter for new line)"
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                onKeyDown={handleKeyDown}
                aria-describedby="ai-panel-input-hint"
                rows={3}
                disabled={loading}
              />
              <span id="ai-panel-input-hint" className="visually-hidden">
                Type a natural language command and click Run.
              </span>
            </div>

            <div className="ai-panel-section ai-panel-suggestions-wrap">
              <h3 className="ai-panel-suggestions-title">Suggestions</h3>
              <ul className="ai-panel-suggestions" aria-label="Shortcut command suggestions">
                {AI_SUGGESTION_COMMANDS.map((item, i) => (
                  <li key={i} className="ai-panel-suggestion-item">
                    <button
                      type="button"
                      className="ai-panel-suggestion-chip"
                      onClick={() => setPrompt(item.prompt)}
                      disabled={loading}
                    >
                      {item.label}
                    </button>
                  </li>
                ))}
              </ul>
            </div>

            <div className="ai-panel-section">
              <button
                type="button"
                className="btn_primary ai-panel-submit"
                onClick={handleSubmit}
                disabled={submitDisabled}
                aria-busy={loading}
              >
                {loading ? "Running…" : "Run"}
              </button>
            </div>

            <div
              className="ai-panel-status"
              role="status"
              aria-live="polite"
              aria-label={`Status: ${status}`}
            >
              <span className={`ai-panel-status-dot ai-panel-status-dot_${status}`} aria-hidden />
              <span>{status === "idle" ? "Idle" : status === "running" ? "Running" : status === "completed" ? "Completed" : "Failed"}</span>
            </div>

            {(status === "completed" && lastResponse) || (status === "failed" && lastError) ? (
              <div className="ai-panel-section">
                {status === "completed" && (
                  <div className="ai-panel-response">{lastResponse}</div>
                )}
                {status === "failed" && (
                  <>
                    <div className="ai-panel-error">{lastError}</div>
                    <button
                      type="button"
                      className="btn_ghost ai-panel-retry"
                      onClick={handleRetry}
                      disabled={loading}
                    >
                      Retry
                    </button>
                  </>
                )}
              </div>
            ) : null}

            {history.length > 0 && (
              <div className="ai-panel-section ai-panel-history-wrap">
                <h3 className="ai-panel-history-title">History</h3>
                <ul className="ai-panel-history" aria-label="Command history">
                  {history.map((entry, i) => (
                    <li key={`${entry.timestamp}-${i}`} className="ai-panel-history-item">
                      <span className="ai-panel-history-prompt">{entry.prompt}</span>
                      <span className={`ai-panel-history-status ai-panel-history-status_${entry.status}`}>
                        {entry.status}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </>
        )}
      </div>
    </aside>
    </div>
  );
}
