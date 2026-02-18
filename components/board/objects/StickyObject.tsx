"use client";

import { Group, Rect, Text } from "react-konva";
import type { KonvaEventObject } from "konva/lib/Node";
import type { BoardObject } from "@/lib/board-types";
import { isSticky } from "@/lib/board-types";

const DEFAULT_STICKY_COLOR = "#fef08a";
const SELECTION_STROKE = "#2563eb";
const SELECTION_STROKE_WIDTH = 2;

type StickyObjectProps = {
  obj: Extract<BoardObject, { type: "sticky" }>;
  isSelected: boolean;
  onDragEnd: (e: KonvaEventObject<DragEvent>) => void;
  onSelect: () => void;
  onDblClick: () => void;
};

export function StickyObject({ obj, isSelected, onDragEnd, onSelect, onDblClick }: StickyObjectProps) {
  if (!isSticky(obj)) return null;
  return (
    <Group
      name={`obj-${obj.id}`}
      data-testid={`sticky-${obj.id}`}
      x={obj.x}
      y={obj.y}
      rotation={obj.rotation ?? 0}
      offsetX={0}
      offsetY={0}
      draggable
      onDragEnd={onDragEnd}
      onClick={onSelect}
      onTap={onSelect}
      onDblClick={onDblClick}
      onDblTap={onDblClick}
    >
      <Rect
        width={obj.width}
        height={obj.height}
        fill={obj.color ?? DEFAULT_STICKY_COLOR}
        cornerRadius={4}
        stroke={isSelected ? SELECTION_STROKE : "#e5e5e5"}
        strokeWidth={isSelected ? SELECTION_STROKE_WIDTH : 1}
      />
      <Text
        x={8}
        y={8}
        width={obj.width - 16}
        height={obj.height - 16}
        text={obj.text}
        fontSize={14}
        wrap="word"
        listening={false}
      />
    </Group>
  );
}
