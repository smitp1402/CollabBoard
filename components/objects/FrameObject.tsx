"use client";

import { Group, Rect, Text } from "react-konva";
import type { KonvaEventObject } from "konva/lib/Node";
import type { BoardObject } from "@/types/board-types";
import { isFrame } from "@/lib/board/boardObjectUtils";

const FRAME_STROKE = "#94a3b8";
const TITLE_BAR_HEIGHT = 24;
const SELECTION_STROKE = "#2563eb";
const SELECTION_STROKE_WIDTH = 2;

type FrameObjectProps = {
  obj: Extract<BoardObject, { type: "frame" }>;
  isSelected: boolean;
  onDragEnd: (e: KonvaEventObject<DragEvent>) => void;
  onSelect: () => void;
};

export function FrameObject({ obj, isSelected, onDragEnd, onSelect }: FrameObjectProps) {
  if (!isFrame(obj)) return null;
  const title = obj.title ?? "Frame";
  return (
    <Group
      name={`obj-${obj.id}`}
      data-testid={`frame-${obj.id}`}
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
        stroke={isSelected ? SELECTION_STROKE : FRAME_STROKE}
        strokeWidth={isSelected ? SELECTION_STROKE_WIDTH : 1.5}
        dash={[8, 4]}
        listening={true}
      />
      <Rect
        y={0}
        width={obj.width}
        height={TITLE_BAR_HEIGHT}
        fill="rgba(148, 163, 184, 0.2)"
        stroke={isSelected ? SELECTION_STROKE : FRAME_STROKE}
        strokeWidth={0}
        listening={false}
      />
      <Text
        x={8}
        y={4}
        width={obj.width - 16}
        height={TITLE_BAR_HEIGHT - 8}
        text={title}
        fontSize={12}
        fontStyle="bold"
        fill="#475569"
        listening={false}
      />
    </Group>
  );
}
