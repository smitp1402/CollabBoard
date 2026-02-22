"use client";

const CONTROL_ICON_SIZE = 18;

function IconZoomOut() {
  return (
    <svg width={CONTROL_ICON_SIZE} height={CONTROL_ICON_SIZE} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <circle cx="11" cy="11" r="8" />
      <line x1="21" y1="21" x2="16.65" y2="16.65" />
      <line x1="8" y1="11" x2="14" y2="11" />
    </svg>
  );
}
function IconZoomIn() {
  return (
    <svg width={CONTROL_ICON_SIZE} height={CONTROL_ICON_SIZE} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <circle cx="11" cy="11" r="8" />
      <line x1="21" y1="21" x2="16.65" y2="16.65" />
      <line x1="11" y1="8" x2="11" y2="14" />
      <line x1="8" y1="11" x2="14" y2="11" />
    </svg>
  );
}
function IconLockClosed() {
  return (
    <svg width={CONTROL_ICON_SIZE} height={CONTROL_ICON_SIZE} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
      <path d="M7 11V7a5 5 0 0 1 10 0v4" />
    </svg>
  );
}
function IconLockOpen() {
  return (
    <svg width={CONTROL_ICON_SIZE} height={CONTROL_ICON_SIZE} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
      <path d="M7 11V7a5 5 0 0 1 9.9-1" />
    </svg>
  );
}

export type CanvasControlPanelProps = {
  scale: number;
  onZoomIn: () => void;
  onZoomOut: () => void;
  canvasLocked: boolean;
  onLockToggle: () => void;
  /** Extra offset from the right edge (e.g. when chat panel is open). */
  rightOffset?: number;
};

const CONTROL_PANEL_MARGIN_RIGHT = 16;

export function CanvasControlPanel({
  scale,
  onZoomIn,
  onZoomOut,
  canvasLocked,
  onLockToggle,
  rightOffset = 0,
}: CanvasControlPanelProps) {
  return (
    <div
      data-testid="canvas-control-panel"
      style={{
        position: "absolute",
        left: "auto",
        right: CONTROL_PANEL_MARGIN_RIGHT + rightOffset,
        bottom: 16,
        display: "flex",
        flexDirection: "row",
        alignItems: "center",
        gap: "var(--space-1)",
        padding: "6px 10px",
        background: "var(--color-surface)",
        border: "1px solid var(--color-border)",
        borderRadius: "var(--radius-sm)",
        boxShadow: "var(--shadow-sm)",
        zIndex: 10,
        transition: "right 0.3s ease-out",
      }}
    >
      <button
        type="button"
        className="btn_ghost"
        onClick={onZoomOut}
        data-testid="zoom-out"
        title="Zoom out"
        aria-label="Zoom out"
        style={{ padding: "var(--space-1)" }}
      >
        <IconZoomOut />
      </button>
      <span style={{ fontSize: "0.8125rem", color: "var(--color-text-muted)", minWidth: 36, textAlign: "center" }}>
        {Math.round(scale * 100)}%
      </span>
      <button
        type="button"
        className="btn_ghost"
        onClick={onZoomIn}
        data-testid="zoom-in"
        title="Zoom in"
        aria-label="Zoom in"
        style={{ padding: "var(--space-1)" }}
      >
        <IconZoomIn />
      </button>
      <button
        type="button"
        className="btn_ghost"
        onClick={onLockToggle}
        data-testid="canvas-lock-toggle"
        title={canvasLocked ? "Unlock canvas" : "Lock canvas"}
        aria-label={canvasLocked ? "Unlock canvas" : "Lock canvas"}
        aria-pressed={canvasLocked}
        style={{ padding: "var(--space-1)", marginLeft: "var(--space-1)" }}
      >
        {canvasLocked ? <IconLockOpen /> : <IconLockClosed />}
      </button>
    </div>
  );
}
