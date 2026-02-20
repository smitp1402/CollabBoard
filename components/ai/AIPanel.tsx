"use client";

import { useState, useCallback } from "react";

const MOCK_DELAY_MS = 1200;
const MOCK_FAIL_RATE = 0.2;
const MAX_HISTORY = 10;
const MOCK_SUCCESS_MESSAGE = "Command completed.";
const MOCK_ERROR_MESSAGE = "Something went wrong (mock).";

export type AICommandStatus = "idle" | "running" | "completed" | "failed";

export type HistoryEntry = {
  prompt: string;
  status: AICommandStatus;
  summary: string;
  timestamp: number;
};

export type AIPanelProps = {
  boardId: string;
  className?: string;
};

export function AIPanel({ boardId, className }: AIPanelProps) {
  const [prompt, setPrompt] = useState("");
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<AICommandStatus>("idle");
  const [lastResponse, setLastResponse] = useState("");
  const [lastError, setLastError] = useState("");
  const [lastSubmittedPrompt, setLastSubmittedPrompt] = useState("");
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [isCollapsed, setIsCollapsed] = useState(false);

  const runMock = useCallback(
    (inputPrompt: string) => {
      setLastSubmittedPrompt(inputPrompt);
      setStatus("running");
      setLoading(true);
      setLastResponse("");
      setLastError("");

      setTimeout(() => {
        const failed = Math.random() < MOCK_FAIL_RATE;
        const newStatus: AICommandStatus = failed ? "failed" : "completed";

        setStatus(newStatus);
        if (failed) {
          setLastError(MOCK_ERROR_MESSAGE);
        } else {
          setLastResponse(MOCK_SUCCESS_MESSAGE);
        }
        setLoading(false);

        setHistory((prev) => {
          const entry: HistoryEntry = {
            prompt: inputPrompt,
            status: newStatus,
            summary: failed ? MOCK_ERROR_MESSAGE : MOCK_SUCCESS_MESSAGE,
            timestamp: Date.now(),
          };
          return [entry, ...prev].slice(0, MAX_HISTORY);
        });
      }, MOCK_DELAY_MS);
    },
    []
  );

  const handleSubmit = useCallback(() => {
    const trimmed = prompt.trim();
    if (!trimmed || loading) return;
    runMock(trimmed);
    setPrompt("");
  }, [prompt, loading, runMock]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        const trimmed = prompt.trim();
        if (trimmed && !loading) {
          runMock(trimmed);
          setPrompt("");
        }
      }
    },
    [prompt, loading, runMock]
  );

  const handleRetry = useCallback(() => {
    if (status !== "failed" || !lastSubmittedPrompt || loading) return;
    runMock(lastSubmittedPrompt);
  }, [status, lastSubmittedPrompt, loading, runMock]);

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
