"use client";

const TOOL_ICON_SIZE = 22;

export type BoardTool = "selection" | "sticky" | "rectangle" | "text" | "frame" | "connector" | null;

/** Modern tools icon: 2x2 grid of rounded squares (toolbox / tool set). */
function IconTools() {
  return (
    <svg width={TOOL_ICON_SIZE} height={TOOL_ICON_SIZE} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <rect x="3" y="3" width="7" height="7" rx="1.5" />
      <rect x="14" y="3" width="7" height="7" rx="1.5" />
      <rect x="3" y="14" width="7" height="7" rx="1.5" />
      <rect x="14" y="14" width="7" height="7" rx="1.5" />
    </svg>
  );
}
/** Chevron to collapse toolbar (point left). */
function IconChevronCollapse() {
  return (
    <svg width={TOOL_ICON_SIZE} height={TOOL_ICON_SIZE} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.25" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M15 18l-6-6 6-6" />
    </svg>
  );
}
function IconSelection() {
  return (
    <svg width={TOOL_ICON_SIZE} height={TOOL_ICON_SIZE} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M4 4l7 16 2.5-6.5L20 14 4 4z" />
      <path d="M14 10l4 4" />
    </svg>
  );
}
function IconSticky() {
  return (
    <svg width={TOOL_ICON_SIZE} height={TOOL_ICON_SIZE} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M6 3h10l5 5v11a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1z" />
      <path d="M16 3v5h5" />
      <line x1="8" y1="10" x2="14" y2="10" />
      <line x1="8" y1="14" x2="12" y2="14" />
    </svg>
  );
}
function IconRectangle() {
  return (
    <svg width={TOOL_ICON_SIZE} height={TOOL_ICON_SIZE} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <rect x="4" y="5" width="16" height="14" rx="1" />
    </svg>
  );
}
function IconText() {
  return (
    <svg width={TOOL_ICON_SIZE} height={TOOL_ICON_SIZE} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M12 4v16M6 4h12" />
    </svg>
  );
}
function IconFrame() {
  return (
    <svg width={TOOL_ICON_SIZE} height={TOOL_ICON_SIZE} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <rect x="3" y="3" width="18" height="18" rx="1" strokeDasharray="4 2" />
      <line x1="3" y1="8" x2="21" y2="8" />
    </svg>
  );
}
function IconConnector() {
  return (
    <svg width={TOOL_ICON_SIZE} height={TOOL_ICON_SIZE} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <circle cx="6" cy="10" r="3" />
      <path d="M9 10h4l4-4" />
      <path d="M13 10l4 4" />
      <circle cx="18" cy="14" r="3" />
    </svg>
  );
}
export type BoardToolbarProps = {
  activeTool: BoardTool;
  setActiveTool: (updater: (t: BoardTool) => BoardTool) => void;
  onConnectorToolChange?: () => void;
  /** When false, show only expand icon; when true, show full toolbar. */
  expanded?: boolean;
  onToggleExpand?: () => void;
};

export function BoardToolbar({
  activeTool,
  setActiveTool,
  onConnectorToolChange,
  expanded = true,
  onToggleExpand,
}: BoardToolbarProps) {
  if (!expanded) {
    return (
      <div className="board-toolbar board-toolbar--collapsed">
        <button
          type="button"
          className="board-toolbar__btn board-toolbar__expand-btn"
          onClick={onToggleExpand}
          data-testid="toolbar-expand"
          title="Expand toolbar"
          aria-label="Expand toolbar"
        >
          <IconTools />
        </button>
      </div>
    );
  }

  return (
    <div className="board-toolbar">
      <button
        type="button"
        className={`board-toolbar__btn ${activeTool === "selection" ? "board-toolbar__btn--active" : ""}`}
        onClick={() => setActiveTool((t) => (t === "selection" ? null : "selection"))}
        data-testid="tool-selection"
        title="Selection (Shift+drag to select multiple)"
        aria-label="Selection tool"
      >
        <IconSelection />
      </button>
      <button
        type="button"
        className={`board-toolbar__btn ${activeTool === "sticky" ? "board-toolbar__btn--active" : ""}`}
        onClick={() => setActiveTool((t) => (t === "sticky" ? null : "sticky"))}
        data-testid="add-sticky"
        title="Add sticky"
        aria-label="Add sticky note"
      >
        <IconSticky />
      </button>
      <button
        type="button"
        className={`board-toolbar__btn ${activeTool === "rectangle" ? "board-toolbar__btn--active" : ""}`}
        onClick={() => setActiveTool((t) => (t === "rectangle" ? null : "rectangle"))}
        data-testid="add-rectangle"
        title="Add rectangle"
        aria-label="Add rectangle"
      >
        <IconRectangle />
      </button>
      <button
        type="button"
        className={`board-toolbar__btn ${activeTool === "text" ? "board-toolbar__btn--active" : ""}`}
        onClick={() => setActiveTool((t) => (t === "text" ? null : "text"))}
        data-testid="add-text"
        title="Add text"
        aria-label="Add text"
      >
        <IconText />
      </button>
      <button
        type="button"
        className={`board-toolbar__btn ${activeTool === "frame" ? "board-toolbar__btn--active" : ""}`}
        onClick={() => setActiveTool((t) => (t === "frame" ? null : "frame"))}
        data-testid="add-frame"
        title="Add frame"
        aria-label="Add frame"
      >
        <IconFrame />
      </button>
      <button
        type="button"
        className={`board-toolbar__btn ${activeTool === "connector" ? "board-toolbar__btn--active" : ""}`}
        onClick={() => {
          setActiveTool((t) => (t === "connector" ? null : "connector"));
          onConnectorToolChange?.();
        }}
        data-testid="add-connector"
        title="Connect two objects"
        aria-label="Add connector"
      >
        <IconConnector />
      </button>
      {onToggleExpand && (
        <button
          type="button"
          className="board-toolbar__btn board-toolbar__collapse-btn"
          onClick={onToggleExpand}
          data-testid="toolbar-collapse"
          title="Collapse toolbar"
          aria-label="Collapse toolbar"
        >
          <IconChevronCollapse />
        </button>
      )}
    </div>
  );
}
