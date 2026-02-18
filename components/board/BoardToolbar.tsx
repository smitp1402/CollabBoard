"use client";

const TOOL_ICON_SIZE = 22;

export type BoardTool = "sticky" | "rectangle" | "text" | "frame" | "connector" | null;

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
    <svg width={TOOL_ICON_SIZE} height={TOOL_ICON_SIZE} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <line x1="4" y1="6" x2="20" y2="6" />
      <line x1="4" y1="12" x2="14" y2="12" />
      <line x1="4" y1="18" x2="18" y2="18" />
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
      <circle cx="6" cy="8" r="3" />
      <circle cx="18" cy="16" r="3" />
      <path d="M9 9l6 7" />
    </svg>
  );
}
function IconTrash() {
  return (
    <svg width={TOOL_ICON_SIZE} height={TOOL_ICON_SIZE} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M3 6h18v14a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V6z" />
      <path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
      <line x1="3" y1="6" x2="21" y2="6" />
      <line x1="10" y1="11" x2="10" y2="17" />
      <line x1="14" y1="11" x2="14" y2="17" />
    </svg>
  );
}
function IconDuplicate() {
  return (
    <svg width={TOOL_ICON_SIZE} height={TOOL_ICON_SIZE} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <rect x="4" y="4" width="12" height="14" rx="1" />
      <rect x="8" y="8" width="12" height="14" rx="1" />
    </svg>
  );
}
function IconCopy() {
  return (
    <svg width={TOOL_ICON_SIZE} height={TOOL_ICON_SIZE} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
      <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
    </svg>
  );
}
function IconPaste() {
  return (
    <svg width={TOOL_ICON_SIZE} height={TOOL_ICON_SIZE} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" />
      <rect x="8" y="2" width="8" height="4" rx="1" ry="1" />
      <path d="M9 14h6" />
      <path d="M9 18h6" />
    </svg>
  );
}

export type BoardToolbarProps = {
  activeTool: BoardTool;
  setActiveTool: (updater: (t: BoardTool) => BoardTool) => void;
  selectedIds: string[];
  copiedObjectsCount: number;
  onConnectorToolChange?: () => void;
  onDuplicate: () => void;
  onCopy: () => void;
  onPaste: () => void;
  onDelete: () => void;
};

export function BoardToolbar({
  activeTool,
  setActiveTool,
  selectedIds,
  copiedObjectsCount,
  onConnectorToolChange,
  onDuplicate,
  onCopy,
  onPaste,
  onDelete,
}: BoardToolbarProps) {
  return (
    <div className="board-toolbar">
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
      <button
        type="button"
        className="board-toolbar__btn"
        onClick={onDuplicate}
        disabled={selectedIds.length === 0}
        data-testid="duplicate-object"
        title="Duplicate (Ctrl+D)"
        aria-label="Duplicate selected"
      >
        <IconDuplicate />
      </button>
      <button
        type="button"
        className="board-toolbar__btn"
        onClick={onCopy}
        disabled={selectedIds.length === 0}
        data-testid="copy-object"
        title="Copy (Ctrl+C)"
        aria-label="Copy selected"
      >
        <IconCopy />
      </button>
      <button
        type="button"
        className="board-toolbar__btn"
        onClick={onPaste}
        disabled={copiedObjectsCount === 0}
        data-testid="paste-object"
        title="Paste (Ctrl+V)"
        aria-label="Paste"
      >
        <IconPaste />
      </button>
      <button
        type="button"
        className="board-toolbar__btn"
        onClick={onDelete}
        disabled={selectedIds.length === 0}
        data-testid="delete-object"
        title="Delete"
        aria-label="Delete selected object"
      >
        <IconTrash />
      </button>
    </div>
  );
}
