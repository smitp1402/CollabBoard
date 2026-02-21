"use client";

import { Rect } from "react-konva";

const MARQUEE_STROKE = "#2563eb";
const MARQUEE_STROKE_WIDTH = 1.5;
const MARQUEE_FILL = "rgba(37, 99, 235, 0.08)";

type SelectionBoxProps = {
  x: number;
  y: number;
  width: number;
  height: number;
};

/** Marquee selection rectangle in world coordinates (drawn on a Konva Layer). */
export function SelectionBox({ x, y, width, height }: SelectionBoxProps) {
  const w = width < 0 ? -width : width;
  const h = height < 0 ? -height : height;
  const px = width < 0 ? x + width : x;
  const py = height < 0 ? y + height : y;
  return (
    <Rect
      x={px}
      y={py}
      width={w}
      height={h}
      stroke={MARQUEE_STROKE}
      strokeWidth={MARQUEE_STROKE_WIDTH}
      fill={MARQUEE_FILL}
      listening={false}
    />
  );
}
