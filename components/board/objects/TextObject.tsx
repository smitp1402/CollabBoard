"use client";

import { Group, Rect, Text } from "react-konva";
import type { KonvaEventObject } from "konva/lib/Node";
import type { BoardObject } from "@/lib/board-types";
import { isText } from "@/lib/board-types";

const DEFAULT_TEXT_COLOR = "#1f2937";
const SELECTION_STROKE = "#2563eb";
const SELECTION_STROKE_WIDTH = 2;
const DEFAULT_WIDTH = 160;
const DEFAULT_HEIGHT = 32;
const DEFAULT_FONT_SIZE = 16;

type TextObjectProps = {
  obj: Extract<BoardObject, { type: "text" }>;
  isSelected: boolean;
  onDragEnd: (e: KonvaEventObject<DragEvent>) => void;
  onSelect: () => void;
  onDblClick: () => void;
};

export function TextObject({ obj, isSelected, onDragEnd, onSelect, onDblClick }: TextObjectProps) {
  if (!isText(obj)) return null;
  const w = obj.width ?? DEFAULT_WIDTH;
  const h = obj.height ?? DEFAULT_HEIGHT;
  return (
    <Group
      name={`obj-${obj.id}`}
      data-testid={`text-${obj.id}`}
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
        width={w}
        height={h}
        fill="transparent"
        stroke={isSelected ? SELECTION_STROKE : "#e5e7eb"}
        strokeWidth={isSelected ? SELECTION_STROKE_WIDTH : 1}
      />
      <Text
        x={4}
        y={4}
        width={w - 8}
        height={h - 8}
        text={obj.text}
        fontSize={obj.fontSize ?? DEFAULT_FONT_SIZE}
        fill={obj.color ?? DEFAULT_TEXT_COLOR}
        wrap="word"
        listening={false}
      />
    </Group>
  );
}
