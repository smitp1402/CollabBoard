"use client";

import { Group, Rect } from "react-konva";
import type { KonvaEventObject } from "konva/lib/Node";
import type { BoardObject } from "@/lib/board-types";
import { isRectangle } from "@/lib/board-types";

const DEFAULT_RECT_COLOR = "#e0e7ff";
const SELECTION_STROKE = "#2563eb";
const SELECTION_STROKE_WIDTH = 2;

type RectangleObjectProps = {
  obj: Extract<BoardObject, { type: "rectangle" }>;
  isSelected: boolean;
  onDragEnd: (e: KonvaEventObject<DragEvent>) => void;
  onSelect: () => void;
};

export function RectangleObject({ obj, isSelected, onDragEnd, onSelect }: RectangleObjectProps) {
  if (!isRectangle(obj)) return null;
  return (
    <Group
      name={`obj-${obj.id}`}
      data-testid={`rect-${obj.id}`}
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
      <Rect
        width={obj.width}
        height={obj.height}
        fill={obj.color ?? DEFAULT_RECT_COLOR}
        stroke={isSelected ? SELECTION_STROKE : "#c7d2fe"}
        strokeWidth={isSelected ? SELECTION_STROKE_WIDTH : 1}
      />
    </Group>
  );
}
