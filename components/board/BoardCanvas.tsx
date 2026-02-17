"use client";

import { useRef, useState, useEffect, useCallback, useMemo } from "react";
import { Stage, Layer, Rect, Line, Group, Text, Circle } from "react-konva";
import type { KonvaEventObject, Node as KonvaNode } from "konva/lib/Node";
import type { User } from "firebase/auth";
import type { BoardObject } from "@/lib/board-types";
import { isSticky, isRectangle } from "@/lib/board-types";
import { usePresence, type PresenceUser } from "@/lib/board/usePresence";

const GRID_SPACING = 48;
const GRID_STROKE = "#e2e8f0";
const GRID_MAJOR_STROKE = "#cbd5e1";
const GRID_MAJOR_EVERY = 5; // every 5th line is slightly bolder
const VIEWPORT_MARGIN = 1.5; // draw grid/background 1.5x viewport beyond visible area
const DEFAULT_STICKY_COLOR = "#fef08a";
const DEFAULT_RECT_COLOR = "#e0e7ff";
const CANVAS_BG_FILL = "#f8fafc";
const SELECTION_STROKE = "#2563eb";
const SELECTION_STROKE_WIDTH = 2;

function updateObjectPosition(
  objects: BoardObject[],
  id: string,
  x: number,
  y: number
): BoardObject[] {
  return objects.map((obj) => (obj.id === id ? { ...obj, x, y } : obj));
}

function updateObjectText(
  objects: BoardObject[],
  id: string,
  text: string
): BoardObject[] {
  return objects.map((obj) =>
    obj.type === "sticky" && obj.id === id ? { ...obj, text } : obj
  );
}

type BoardCanvasProps = {
  boardId?: string;
  user?: User | null;
  objects?: BoardObject[];
  onObjectsChange?: (objects: BoardObject[]) => void;
  onOtherUsersChange?: (users: PresenceUser[]) => void;
  onPresenceError?: (err: Error | null) => void;
};

export function BoardCanvas({ boardId, user, objects: propsObjects, onObjectsChange, onOtherUsersChange, onPresenceError }: BoardCanvasProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [localObjects, setLocalObjects] = useState<BoardObject[]>([]);
  const objects = propsObjects ?? localObjects;
  const setObjects = onObjectsChange ?? setLocalObjects;

  const [size, setSize] = useState({ width: 800, height: 600 });
  const [scale, setScale] = useState(1);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [cursorWorld, setCursorWorld] = useState<{ x: number; y: number } | null>(null);
  const [editingStickyId, setEditingStickyId] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [activeTool, setActiveTool] = useState<"sticky" | "rectangle" | null>(null);
  const [isPanning, setIsPanning] = useState(false);
  const panStartRef = useRef({ x: 0, y: 0 });
  const didPanRef = useRef(false);

  const { otherUsers, error: presenceError } = usePresence(boardId ?? "", user ?? null, cursorWorld);

  useEffect(() => {
    onOtherUsersChange?.(otherUsers);
  }, [otherUsers, onOtherUsersChange]);

  useEffect(() => {
    onPresenceError?.(presenceError ?? null);
  }, [presenceError, onPresenceError]);

  const updateSize = useCallback(() => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    setSize({ width: rect.width, height: rect.height });
  }, []);

  useEffect(() => {
    updateSize();
    window.addEventListener("resize", updateSize);
    return () => window.removeEventListener("resize", updateSize);
  }, [updateSize]);

  useEffect(() => {
    if (!isPanning) return;
    const onMouseMove = (e: MouseEvent) => {
      const dx = e.clientX - panStartRef.current.x;
      const dy = e.clientY - panStartRef.current.y;
      setPosition((prev) => ({ x: prev.x + dx, y: prev.y + dy }));
      panStartRef.current = { x: e.clientX, y: e.clientY };
      didPanRef.current = true;
    };
    const onMouseUp = () => setIsPanning(false);
    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup", onMouseUp);
    return () => {
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup", onMouseUp);
    };
  }, [isPanning]);

  const handleWheel = (e: KonvaEventObject<WheelEvent>) => {
    e.evt.preventDefault();
    const stage = e.target.getStage();
    if (!stage) return;
    const oldScale = scale;
    const pointer = stage.getPointerPosition();
    if (!pointer) return;
    const scaleBy = 1.1;
    const newScale = e.evt.deltaY < 0 ? oldScale * scaleBy : oldScale / scaleBy;
    const clampedScale = Math.min(Math.max(0.2, newScale), 5);
    setScale(clampedScale);
    const mousePointTo = {
      x: (pointer.x - position.x) / oldScale,
      y: (pointer.y - position.y) / oldScale,
    };
    setPosition({
      x: pointer.x - mousePointTo.x * clampedScale,
      y: pointer.y - mousePointTo.y * clampedScale,
    });
  };

  // Infinite canvas: visible area in stage (world) coordinates
  const viewport = useMemo(() => {
    const left = -position.x / scale;
    const top = -position.y / scale;
    const right = (-position.x + size.width) / scale;
    const bottom = (-position.y + size.height) / scale;
    const marginX = (size.width / scale) * VIEWPORT_MARGIN;
    const marginY = (size.height / scale) * VIEWPORT_MARGIN;
    return {
      left: left - marginX,
      top: top - marginY,
      right: right + marginX,
      bottom: bottom + marginY,
      width: right - left + 2 * marginX,
      height: bottom - top + 2 * marginY,
    };
  }, [position, scale, size.width, size.height]);

  const gridLines = useMemo(() => {
    const vertical: { x: number; major: boolean }[] = [];
    const horizontal: { y: number; major: boolean }[] = [];
    const startX = Math.floor(viewport.left / GRID_SPACING) * GRID_SPACING;
    const endX = Math.ceil(viewport.right / GRID_SPACING) * GRID_SPACING;
    const startY = Math.floor(viewport.top / GRID_SPACING) * GRID_SPACING;
    const endY = Math.ceil(viewport.bottom / GRID_SPACING) * GRID_SPACING;
    for (let x = startX; x <= endX; x += GRID_SPACING) {
      const index = Math.round(x / GRID_SPACING);
      vertical.push({ x, major: index % GRID_MAJOR_EVERY === 0 });
    }
    for (let y = startY; y <= endY; y += GRID_SPACING) {
      const index = Math.round(y / GRID_SPACING);
      horizontal.push({ y, major: index % GRID_MAJOR_EVERY === 0 });
    }
    return { vertical, horizontal };
  }, [viewport]);

  const stickies = objects.filter(isSticky);
  const rectangles = objects.filter(isRectangle);
  const editingSticky = editingStickyId
    ? stickies.find((s) => s.id === editingStickyId)
    : null;

  const placeSticky = useCallback(
    (worldX: number, worldY: number) => {
      setObjects([
        ...objects,
        {
          id: crypto.randomUUID(),
          type: "sticky",
          x: worldX,
          y: worldY,
          width: 120,
          height: 80,
          text: "New note",
        },
      ]);
    },
    [objects, setObjects]
  );

  const placeRectangle = useCallback(
    (worldX: number, worldY: number) => {
      setObjects([
        ...objects,
        {
          id: crypto.randomUUID(),
          type: "rectangle",
          x: worldX,
          y: worldY,
          width: 100,
          height: 80,
        },
      ]);
    },
    [objects, setObjects]
  );

  const handleStickyTextSave = (newText: string) => {
    if (!editingStickyId) return;
    setObjects(updateObjectText(objects, editingStickyId, newText));
    setEditingStickyId(null);
  };

  const handleStageClick = (e: KonvaEventObject<MouseEvent>) => {
    const stage = e.target.getStage();
    if (!stage) return;
    const clickedOnEmpty = e.target === stage || e.target.name() === "stage-bg";
    if (clickedOnEmpty) {
      if ((activeTool === "sticky" || activeTool === "rectangle") && !didPanRef.current) {
        const pointer = stage.getPointerPosition();
        if (pointer) {
          const worldX = (pointer.x - position.x) / scale;
          const worldY = (pointer.y - position.y) / scale;
          if (activeTool === "sticky") placeSticky(worldX, worldY);
          else placeRectangle(worldX, worldY);
        }
        return;
      }
      setSelectedId(null);
      return;
    }
    let node: KonvaNode | null = e.target;
    while (node) {
      const name = node.name();
      if (typeof name === "string" && name.startsWith("obj-")) {
        setSelectedId(name.slice(4));
        return;
      }
      node = node.getParent();
    }
    setSelectedId(null);
  };

  const handleStageMouseDown = (e: KonvaEventObject<MouseEvent>) => {
    const target = e.target;
    const clickedOnEmpty = target === target.getStage() || target.name() === "stage-bg";
    if (clickedOnEmpty) {
      didPanRef.current = false;
      panStartRef.current = { x: e.evt.clientX, y: e.evt.clientY };
      setIsPanning(true);
    }
  };

  const handleStageMouseMove = (e: KonvaEventObject<MouseEvent>) => {
    const stage = e.target.getStage();
    if (!stage) return;
    const pointer = stage.getPointerPosition();
    if (!pointer) return;
    const worldX = (pointer.x - position.x) / scale;
    const worldY = (pointer.y - position.y) / scale;
    setCursorWorld({ x: worldX, y: worldY });
  };

  const handleStageMouseLeave = () => {
    setCursorWorld(null);
  };

  return (
    <div
      data-testid="board-canvas"
      style={{
        width: "100%",
        height: "100%",
        overflow: "hidden",
        display: "flex",
        flexDirection: "column",
        position: "relative",
      }}
    >
      <div style={{ flex: 1, minHeight: 0, position: "relative" }} ref={containerRef}>
        <Stage
          width={size.width}
          height={size.height}
          scaleX={scale}
          scaleY={scale}
          x={position.x}
          y={position.y}
          draggable={false}
          onMouseDown={handleStageMouseDown}
          onMouseMove={handleStageMouseMove}
          onMouseLeave={handleStageMouseLeave}
          onWheel={handleWheel}
          onClick={handleStageClick}
        >
        <Layer>
          <Rect
            name="stage-bg"
            x={viewport.left}
            y={viewport.top}
            width={viewport.width}
            height={viewport.height}
            fill={CANVAS_BG_FILL}
            listening
          />
          {gridLines.vertical.map(({ x, major }, i) => (
            <Line
              key={`v-${x}-${i}`}
              points={[x, viewport.top, x, viewport.bottom]}
              stroke={major ? GRID_MAJOR_STROKE : GRID_STROKE}
              strokeWidth={major ? 1.5 : 1}
              listening={false}
            />
          ))}
          {gridLines.horizontal.map(({ y, major }, i) => (
            <Line
              key={`h-${y}-${i}`}
              points={[viewport.left, y, viewport.right, y]}
              stroke={major ? GRID_MAJOR_STROKE : GRID_STROKE}
              strokeWidth={major ? 1.5 : 1}
              listening={false}
            />
          ))}
          {stickies.map((obj) => {
            const isSelected = selectedId === obj.id;
            return (
            <Group
              key={obj.id}
              name={`obj-${obj.id}`}
              data-testid={`sticky-${obj.id}`}
              x={obj.x}
              y={obj.y}
              draggable
              onDragEnd={(e) => {
                const node = e.target;
                setObjects(updateObjectPosition(objects, obj.id, node.x(), node.y()));
              }}
              onDblClick={() => setEditingStickyId(obj.id)}
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
          );})}
          {rectangles.map((obj) => {
            const isSelected = selectedId === obj.id;
            return (
            <Group
              key={obj.id}
              name={`obj-${obj.id}`}
              data-testid={`rect-${obj.id}`}
              x={obj.x}
              y={obj.y}
              draggable
              onDragEnd={(e) => {
                const node = e.target;
                setObjects(updateObjectPosition(objects, obj.id, node.x(), node.y()));
              }}
            >
              <Rect
                width={obj.width}
                height={obj.height}
                fill={obj.color ?? DEFAULT_RECT_COLOR}
                stroke={isSelected ? SELECTION_STROKE : "#c7d2fe"}
                strokeWidth={isSelected ? SELECTION_STROKE_WIDTH : 1}
              />
            </Group>
          );})}
        </Layer>
        <Layer listening={false} data-testid="other-user-cursors">
          {otherUsers.map((other) => {
            const pos = other.cursor ?? { x: 0, y: 0 };
            return (
              <Group key={other.id} x={pos.x} y={pos.y} data-testid={`cursor-${other.id}`}>
                <Circle radius={8} fill={other.color} stroke="#fff" strokeWidth={2} />
                <Text
                  x={12}
                  y={-6}
                  text={other.displayName}
                  fontSize={13}
                  fill={other.color}
                  fontStyle="bold"
                  listening={false}
                />
              </Group>
            );
          })}
        </Layer>
      </Stage>
      {editingSticky && (
        <textarea
          data-testid="sticky-edit-input"
          value={editingSticky.text}
          onChange={(e) => {
            const next = updateObjectText(objects, editingSticky.id, e.target.value);
            setObjects(next);
          }}
          onBlur={(e) => handleStickyTextSave(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Escape") {
              setEditingStickyId(null);
            }
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              handleStickyTextSave((e.target as HTMLTextAreaElement).value);
            }
          }}
          autoFocus
          style={{
            position: "absolute",
            left: position.x + editingSticky.x * scale,
            top: position.y + editingSticky.y * scale,
            width: editingSticky.width * scale,
            height: editingSticky.height * scale,
            padding: 8,
            margin: 0,
            border: "1px solid var(--color-primary)",
            borderRadius: 4,
            fontSize: 14,
            resize: "none",
            boxSizing: "border-box",
          }}
        />
      )}
      </div>
      <div
        style={{
          flex: "0 0 auto",
          padding: "var(--space-1) var(--space-2)",
          borderTop: "1px solid var(--color-border)",
          background: "var(--color-surface)",
          display: "flex",
          justifyContent: "center",
          gap: "var(--space-1)",
          alignItems: "center",
        }}
      >
        <button
          type="button"
          className="btn_ghost"
          onClick={() => setActiveTool((t) => (t === "sticky" ? null : "sticky"))}
          data-testid="add-sticky"
          style={{
            flex: "0 0 auto",
            ...(activeTool === "sticky" && {
              borderColor: "var(--color-primary)",
              color: "var(--color-primary)",
              backgroundColor: "var(--color-canvas)",
            }),
          }}
        >
          Add sticky
        </button>
        <button
          type="button"
          className="btn_ghost"
          onClick={() => setActiveTool((t) => (t === "rectangle" ? null : "rectangle"))}
          data-testid="add-rectangle"
          style={{
            flex: "0 0 auto",
            ...(activeTool === "rectangle" && {
              borderColor: "var(--color-primary)",
              color: "var(--color-primary)",
              backgroundColor: "var(--color-canvas)",
            }),
          }}
        >
          Add rectangle
        </button>
      </div>
    </div>
  );
}
