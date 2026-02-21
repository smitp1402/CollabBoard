"use client";

export const STICKY_COLOR_PALETTE = [
  "#fef08a",
  "#fecaca",
  "#bfdbfe",
  "#bbf7d0",
  "#fed7aa",
  "#e9d5ff",
  "#fca5a5",
  "#e5e7eb",
  "#a7f3d0",
  "#ddd6fe",
];

export type ColorPalettePopupProps = {
  left: number;
  top: number;
  selectedId: string;
  effectiveColor: string;
  onColorSelect: (hex: string) => void;
};

export function ColorPalettePopup({ left, top, selectedId, effectiveColor, onColorSelect }: ColorPalettePopupProps) {
  return (
    <div
      data-testid="color-palette"
      role="group"
      aria-label="Color palette"
      onClick={(e) => e.stopPropagation()}
      style={{
        position: "absolute",
        left,
        top,
        zIndex: 10,
        padding: 8,
        background: "var(--color-surface)",
        border: "1px solid var(--color-border)",
        borderRadius: 8,
        boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
      }}
    >
      <div style={{ fontSize: 12, marginBottom: 6, color: "var(--color-text-secondary)" }}>Color</div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
        {STICKY_COLOR_PALETTE.map((hex) => (
          <button
            key={hex}
            type="button"
            onClick={() => selectedId && onColorSelect(hex)}
            title={hex}
            aria-label={`Color ${hex}`}
            aria-pressed={effectiveColor === hex}
            data-testid={`color-swatch-${hex.replace("#", "")}`}
            style={{
              width: 22,
              height: 22,
              padding: 0,
              borderRadius: 4,
              border: effectiveColor === hex ? "2px solid var(--color-primary)" : "1px solid var(--color-border)",
              backgroundColor: hex,
              cursor: "pointer",
            }}
          />
        ))}
      </div>
    </div>
  );
}
