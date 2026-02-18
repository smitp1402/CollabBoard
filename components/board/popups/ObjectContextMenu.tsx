"use client";

import type { BoardObject } from "@/lib/board-types";

const ICON_SIZE = 18;

function IconEdit() {
  return (
    <svg width={ICON_SIZE} height={ICON_SIZE} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z" />
    </svg>
  );
}
function IconResize() {
  return (
    <svg width={ICON_SIZE} height={ICON_SIZE} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M15 3h6v6" /><path d="M10 14L21 3" /><path d="M9 21H3v-6" /><path d="M14 10L3 21" />
    </svg>
  );
}
function IconColor() {
  return (
    <svg width={ICON_SIZE} height={ICON_SIZE} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M12 22c4 0 8-4 8-10a6 6 0 0 0-4-8" /><path d="M12 22c-4 0-8-4-8-10a6 6 0 0 1 4-8" /><path d="M12 2v20" />
    </svg>
  );
}
function IconShape() {
  return (
    <svg width={ICON_SIZE} height={ICON_SIZE} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <line x1="5" y1="8" x2="19" y2="8" /><line x1="8" y1="12" x2="16" y2="12" /><line x1="10" y1="16" x2="14" y2="16" />
    </svg>
  );
}
function IconCopy() {
  return (
    <svg width={ICON_SIZE} height={ICON_SIZE} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <rect x="9" y="9" width="13" height="13" rx="2" ry="2" /><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
    </svg>
  );
}
function IconDuplicate() {
  return (
    <svg width={ICON_SIZE} height={ICON_SIZE} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <rect x="4" y="4" width="12" height="14" rx="1" /><rect x="8" y="8" width="12" height="14" rx="1" />
    </svg>
  );
}
function IconDelete() {
  return (
    <svg width={ICON_SIZE} height={ICON_SIZE} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M3 6h18v14a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V6z" /><path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
      <line x1="3" y1="6" x2="21" y2="6" /><line x1="10" y1="11" x2="10" y2="17" /><line x1="14" y1="11" x2="14" y2="17" />
    </svg>
  );
}

export type ObjectContextMenuProps = {
  left: number;
  top: number;
  selectedIds: string[];
  objects: BoardObject[];
  onEdit: () => void;
  onColorClick: () => void;
  onDelete: () => void;
  onCopy: () => void;
  onDuplicate: () => void;
};

export function ObjectContextMenu({ left, top, selectedIds, objects, onEdit, onColorClick, onDelete, onCopy, onDuplicate }: ObjectContextMenuProps) {
  const selected = objects.filter((o) => selectedIds.includes(o.id));
  const single = selectedIds.length === 1;
  const singleObj = single ? selected[0] : null;
  const canEdit = single && singleObj && (singleObj.type === "sticky" || singleObj.type === "text");
  const canColor = single && singleObj && (singleObj.type === "sticky" || singleObj.type === "rectangle");
  const menuStyle = { position: "absolute" as const, left, top, zIndex: 20, minWidth: 160, padding: "6px 0", background: "var(--color-surface)", border: "1px solid var(--color-border)", borderRadius: 8, boxShadow: "0 4px 12px rgba(0,0,0,0.15)" };
  const itemStyle = { display: "flex", alignItems: "center", gap: 10, width: "100%", padding: "8px 14px", border: "none", background: "none", cursor: "pointer", fontSize: 14, color: "var(--color-text)", textAlign: "left" as const };
  return (
    <div data-testid="object-context-menu" role="menu" aria-label="Object actions" onClick={(e) => e.stopPropagation()} style={menuStyle}>
      {canEdit && (<button type="button" role="menuitem" data-testid="context-menu-edit" onClick={onEdit} style={itemStyle} aria-label="Edit"><IconEdit /><span>Edit</span></button>)}
      <button type="button" role="menuitem" data-testid="context-menu-resize" onClick={() => {}} style={itemStyle} aria-label="Resize"><IconResize /><span>Resize</span></button>
      {canColor && (<button type="button" role="menuitem" data-testid="context-menu-color" onClick={onColorClick} style={itemStyle} aria-label="Color"><IconColor /><span>Color</span></button>)}
      <button type="button" role="menuitem" data-testid="context-menu-shape" onClick={() => {}} style={itemStyle} aria-label="Shape"><IconShape /><span>Shape</span></button>
      <button type="button" role="menuitem" data-testid="context-menu-copy" onClick={onCopy} style={itemStyle} aria-label="Copy"><IconCopy /><span>Copy</span></button>
      <button type="button" role="menuitem" data-testid="context-menu-duplicate" onClick={onDuplicate} style={itemStyle} aria-label="Duplicate"><IconDuplicate /><span>Duplicate</span></button>
      <button type="button" role="menuitem" data-testid="context-menu-delete" onClick={onDelete} style={{ ...itemStyle, color: "var(--color-danger, #dc2626)" }} aria-label="Delete"><IconDelete /><span>Delete</span></button>
    </div>
  );
}
