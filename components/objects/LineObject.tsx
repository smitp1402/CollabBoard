"use client";

import { Group, Line } from "react-konva";
import type { KonvaEventObject } from "konva/lib/Node";
import type { BoardObject } from "@/types/board-types";
import { isLine } from "@/lib/board/boardObjectUtils";

const DEFAULT_LINE_COLOR = "#374151";
const SELECTION_STROKE = "#2563eb";
const SELECTION_STROKE_WIDTH = 2;
const MIN_LINE_DIM = 2;

type LineObjectProps = {
  obj: Extract<BoardObject, { type: "line" }>;
  isSelected: boolean;
  onDragEnd: (e: KonvaEventObject<DragEvent>) => void;
  onSelect: () => void;
};

export function LineObject({ obj, isSelected, onDragEnd, onSelect }: LineObjectProps) {
  if (!isLine(obj)) return null;
  const w = Math.max(obj.width, MIN_LINE_DIM);
  const h = Math.max(obj.height, MIN_LINE_DIM);
  const points = [0, 0, w, h];
  return (
    <Group
      name={"obj-" + obj.id}
      data-testid={"line-" + obj.id}
      x={obj.x}
      y={obj.y}
      rotation={obj.rotation ?? 0}
      offsetX={0}
      offsetY={0}
      draggable
      onDragEnd={onDragEnd}
      onClick={onSelect}
      onTap={onSelect}
    >
      <Line
        points={points}
        stroke={obj.color ?? DEFAULT_LINE_COLOR}
        strokeWidth={isSelected ? SELECTION_STROKE_WIDTH : 2}
        lineCap="round"
        lineJoin="round"
        hitStrokeWidth={12}
      />
      {isSelected && (
        <Line
          points={points}
          stroke={SELECTION_STROKE}
          strokeWidth={SELECTION_STROKE_WIDTH}
          lineCap="round"
          lineJoin="round"
          listening={false}
        />
      )}
    </Group>
  );
}
