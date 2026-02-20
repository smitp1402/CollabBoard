"use client";

import { Layer, Line } from "react-konva";
import type { BoardObject } from "@/types/board-types";
import { isConnector, getObjectBounds } from "@/lib/board/boardObjectUtils";

/** Return center point of an object by id, or null if not found / no bounds. */
function getCenter(objects: BoardObject[], id: string): { x: number; y: number } | null {
  const obj = objects.find((o) => o.id === id);
  if (!obj) return null;
  const b = getObjectBounds(obj);
  if (!b) return null;
  return { x: b.x + b.width / 2, y: b.y + b.height / 2 };
}

/** Short arrow head at the end of a line (from x1,y1 toward x2,y2). */
function arrowPoints(
  fromX: number,
  fromY: number,
  toX: number,
  toY: number,
  size: number = 10
): number[] {
  const angle = Math.atan2(toY - fromY, toX - fromX);
  const x1 = toX - size * Math.cos(angle - Math.PI / 6);
  const y1 = toY - size * Math.sin(angle - Math.PI / 6);
  const x2 = toX - size * Math.cos(angle + Math.PI / 6);
  const y2 = toY - size * Math.sin(angle + Math.PI / 6);
  return [toX, toY, x1, y1, x2, y2];
}

type ConnectorLayerProps = {
  objects: BoardObject[];
};

export function ConnectorLayer({ objects }: ConnectorLayerProps) {
  const connectors = objects.filter(isConnector);
  if (connectors.length === 0) return null;

  return (
    <Layer listening={false}>
      {connectors.map((conn) => {
        const from = getCenter(objects, conn.fromId);
        const to = getCenter(objects, conn.toId);
        if (!from || !to) return null;
        const isArrow = conn.style === "arrow";
        return (
          <Line
            key={conn.id}
            points={[from.x, from.y, to.x, to.y]}
            stroke="#64748b"
            strokeWidth={2}
            lineCap="round"
            lineJoin="round"
          />
        );
      })}
      {connectors.map((conn) => {
        if (conn.style !== "arrow") return null;
        const from = getCenter(objects, conn.fromId);
        const to = getCenter(objects, conn.toId);
        if (!from || !to) return null;
        const tri = arrowPoints(from.x, from.y, to.x, to.y);
        return (
          <Line
            key={`arrow-${conn.id}`}
            points={tri}
            fill="#64748b"
            closed
            listening={false}
          />
        );
      })}
    </Layer>
  );
}
