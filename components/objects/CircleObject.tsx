"use client";

import { Group, Ellipse } from "react-konva";
import type { KonvaEventObject } from "konva/lib/Node";
import type { BoardObject } from "@/types/board-types";
import { isCircle } from "@/lib/board/boardObjectUtils";

const DEFAULT_CIRCLE_COLOR = "#e0e7ff";
const SELECTION_STROKE = "#2563eb";
const SELECTION_STROKE_WIDTH = 2;

type CircleObjectProps = {
  obj: Extract<BoardObject, { type: "circle" }>;
  isSelected: boolean;
  onDragEnd: (e: KonvaEventObject<DragEvent>) => void;
  onSelect: () => void;
};

export function CircleObject({ obj, isSelected, onDragEnd, onSelect }: CircleObjectProps) {
  if (!isCircle(obj)) return null;
  const radiusX = obj.width / 2;
  const radiusY = obj.height / 2;
  return (
    <Group
      name={`obj-${obj.id}`}
      data-testid={`circle-${obj.id}`}
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
      <Ellipse
        radiusX={radiusX}
        radiusY={radiusY}
        fill={obj.color ?? DEFAULT_CIRCLE_COLOR}
        stroke={isSelected ? SELECTION_STROKE : "#c7d2fe"}
        strokeWidth={isSelected ? SELECTION_STROKE_WIDTH : 1}
      />
    </Group>
  );
}
