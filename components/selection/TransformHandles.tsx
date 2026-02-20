"use client";

import { useCallback, useState } from "react";
import { Layer, Group, Rect, Circle } from "react-konva";
import type { KonvaEventObject } from "konva/lib/Node";
import type { BoardObject } from "@/types/board-types";
import { getObjectBounds, hasBounds } from "@/lib/board/boardObjectUtils";

const HANDLE_RADIUS = 6;
const ROTATION_HANDLE_OFFSET = 24;
const MIN_SIZE = 20;
const SELECTION_STROKE = "#6366f1";
const HANDLE_FILL = "#fff";
const HANDLE_STROKE = "#6366f1";

type Bounds = { x: number; y: number; width: number; height: number };

function unionBounds(objects: BoardObject[]): Bounds | null {
  const boxes = objects.filter(hasBounds).map((o) => getObjectBounds(o)).filter(Boolean) as Bounds[];
  if (boxes.length === 0) return null;
  const xs = boxes.flatMap((b) => [b.x, b.x + b.width]);
  const ys = boxes.flatMap((b) => [b.y, b.y + b.height]);
  return {
    x: Math.min(...xs),
    y: Math.min(...ys),
    width: Math.max(...xs) - Math.min(...xs),
    height: Math.max(...ys) - Math.min(...ys),
  };
}

type TransformHandlesProps = {
  selectedIds: string[];
  objects: BoardObject[];
  scale: number;
  position: { x: number; y: number };
  onResize: (updates: Array<{ id: string; x: number; y: number; width: number; height: number }>) => void;
  onRotate: (updates: Array<{ id: string; rotation: number }>) => void;
};

export function TransformHandles({ selectedIds, objects, scale, position, onResize, onRotate }: TransformHandlesProps) {
  const selected = objects.filter((o) => selectedIds.includes(o.id) && hasBounds(o));
  const bounds = unionBounds(selected);
  const [dragStart, setDragStart] = useState<{ bounds: Bounds; cursorAngle?: number; objectRotations?: Map<string, number> } | null>(null);

  const handleResizeDragMove = useCallback(
    (e: KonvaEventObject<DragEvent>, handle: "nw" | "n" | "ne" | "e" | "se" | "s" | "sw" | "w") => {
      if (!bounds || selected.length === 0) return;
      const start = dragStart?.bounds ?? bounds;
      const stage = e.target.getStage();
      if (!stage) return;
      const pos = e.target.position();
      const worldX = pos.x;
      const worldY = pos.y;

      let newX = start.x;
      let newY = start.y;
      let newW = start.width;
      let newH = start.height;

      switch (handle) {
        case "se":
          newW = Math.max(MIN_SIZE, worldX - start.x);
          newH = Math.max(MIN_SIZE, worldY - start.y);
          break;
        case "sw":
          newX = worldX;
          newW = Math.max(MIN_SIZE, start.x + start.width - worldX);
          newH = Math.max(MIN_SIZE, worldY - start.y);
          newY = start.y;
          break;
        case "ne":
          newY = worldY;
          newW = Math.max(MIN_SIZE, worldX - start.x);
          newH = Math.max(MIN_SIZE, start.y + start.height - worldY);
          break;
        case "nw":
          newX = worldX;
          newY = worldY;
          newW = Math.max(MIN_SIZE, start.x + start.width - worldX);
          newH = Math.max(MIN_SIZE, start.y + start.height - worldY);
          break;
        case "e":
          newW = Math.max(MIN_SIZE, worldX - start.x);
          break;
        case "w":
          newX = worldX;
          newW = Math.max(MIN_SIZE, start.x + start.width - worldX);
          break;
        case "s":
          newH = Math.max(MIN_SIZE, worldY - start.y);
          break;
        case "n":
          newY = worldY;
          newH = Math.max(MIN_SIZE, start.y + start.height - worldY);
          break;
      }

      if (selected.length === 1) {
        const obj = selected[0];
        const w = "width" in obj ? obj.width : 100;
        const h = "height" in obj ? obj.height : 40;
        onResize([{ id: obj.id, x: newX, y: newY, width: newW, height: newH }]);
      } else {
        const cx = start.x + start.width / 2;
        const cy = start.y + start.height / 2;
        const sx = newW / start.width;
        const sy = newH / start.height;
        const updates = selected.map((obj) => {
          const b = getObjectBounds(obj)!;
          const objCx = b.x + b.width / 2;
          const objCy = b.y + b.height / 2;
          const nw = Math.max(MIN_SIZE, b.width * sx);
          const nh = Math.max(MIN_SIZE, b.height * sy);
          const nx = cx + (objCx - cx) * sx - nw / 2;
          const ny = cy + (objCy - cy) * sy - nh / 2;
          return { id: obj.id, x: nx, y: ny, width: nw, height: nh };
        });
        onResize(updates);
      }
    },
    [bounds, selected, dragStart, onResize]
  );

  const handleResizeDragStart = useCallback(() => {
    if (bounds) setDragStart({ bounds });
  }, [bounds]);

  const handleResizeDragEnd = useCallback(() => {
    setDragStart(null);
  }, []);

  const handleRotateDragMove = useCallback(
    (e: KonvaEventObject<DragEvent>) => {
      if (!bounds || selected.length === 0) return;
      const stage = e.target.getStage();
      if (!stage) return;
      const pos = e.target.position();
      const cx = bounds.x + bounds.width / 2;
      const cy = bounds.y + bounds.height / 2;
      const angle = (Math.atan2(pos.y - cy, pos.x - cx) * 180) / Math.PI;
      const startAngle = dragStart?.cursorAngle ?? angle;
      const delta = angle - startAngle;
      const objectRotations = dragStart?.objectRotations ?? new Map(selected.map((o) => [o.id, (o as { rotation?: number }).rotation ?? 0]));
      const updates = selected.map((obj) => ({
        id: obj.id,
        rotation: ((objectRotations.get(obj.id) ?? 0) + delta + 360) % 360,
      }));
      onRotate(updates);
    },
    [bounds, selected, dragStart, onRotate]
  );

  const handleRotateDragStart = useCallback(
    (e: KonvaEventObject<DragEvent>) => {
      if (!bounds) return;
      const stage = e.target.getStage();
      const pointer = stage?.getPointerPosition();
      let cursorAngle = -90;
      if (pointer) {
        const worldX = (pointer.x - position.x) / scale;
        const worldY = (pointer.y - position.y) / scale;
        const cx = bounds.x + bounds.width / 2;
        const cy = bounds.y + bounds.height / 2;
        cursorAngle = (Math.atan2(worldY - cy, worldX - cx) * 180) / Math.PI;
      }
      setDragStart({
        bounds,
        cursorAngle,
        objectRotations: new Map(selected.map((o) => [o.id, (o as { rotation?: number }).rotation ?? 0])),
      });
    },
    [bounds, selected, scale, position]
  );

  const handleRotateDragEnd = useCallback(() => {
    setDragStart(null);
  }, []);

  if (!bounds || selected.length === 0) return null;

  const { x, y, width, height } = bounds;
  const rotY = y - ROTATION_HANDLE_OFFSET;

  return (
    <Layer>
      <Group>
        <Rect
          x={x}
          y={y}
          width={width}
          height={height}
          stroke={SELECTION_STROKE}
          strokeWidth={2}
          dash={[6, 4]}
          listening={false}
        />
        {(["nw", "n", "ne", "e", "se", "s", "sw", "w"] as const).map((handle) => {
          let hx = x;
          let hy = y;
          if (handle.includes("e")) hx = x + width;
          if (handle.includes("w")) hx = x;
          if (handle === "n" || handle === "s") hx = x + width / 2;
          if (handle.includes("s")) hy = y + height;
          if (handle.includes("n")) hy = y;
          if (handle === "e" || handle === "w") hy = y + height / 2;
          return (
            <Circle
              key={handle}
              x={hx}
              y={hy}
              radius={HANDLE_RADIUS}
              fill={HANDLE_FILL}
              stroke={HANDLE_STROKE}
              strokeWidth={2}
              draggable
              onDragStart={handleResizeDragStart}
              onDragMove={(e) => handleResizeDragMove(e, handle)}
              onDragEnd={handleResizeDragEnd}
              dragBoundFunc={(pos) => pos}
            />
          );
        })}
        <Circle
          x={x + width / 2}
          y={rotY}
          radius={HANDLE_RADIUS}
          fill={HANDLE_FILL}
          stroke={HANDLE_STROKE}
          strokeWidth={2}
          draggable
          onDragStart={handleRotateDragStart}
          onDragMove={handleRotateDragMove}
          onDragEnd={handleRotateDragEnd}
          dragBoundFunc={(pos) => pos}
        />
      </Group>
    </Layer>
  );
}
