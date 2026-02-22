"use client";

import { useRef, useState, useEffect, useCallback, useMemo } from "react";
import { Stage, Layer, Rect, Line, Group, Text, Circle } from "react-konva";
import type { KonvaEventObject, Node as KonvaNode } from "konva/lib/Node";
import type { User } from "firebase/auth";
import type { BoardObject } from "@/types/board-types";
import { isSticky, isRectangle, isText, isFrame, isConnector, hasBounds, getObjectBounds, rectsIntersect } from "@/lib/board/boardObjectUtils";
import { SelectionBox } from "@/components/selection/SelectionBox";
import { TransformHandles } from "@/components/selection/TransformHandles";
import { StickyObject } from "@/components/objects/StickyObject";
import { RectangleObject } from "@/components/objects/RectangleObject";
import { TextObject } from "@/components/objects/TextObject";
import { FrameObject } from "@/components/objects/FrameObject";
import { ConnectorLayer } from "@/components/objects/ConnectorLayer";
import { BoardToolbar, type BoardTool } from "@/components/canvas/BoardToolbar";
import { CanvasControlPanel } from "@/components/canvas/CanvasControlPanel";
import { ColorPalettePopup } from "@/components/popups/ColorPalettePopup";
import { ObjectContextMenu } from "@/components/popups/ObjectContextMenu";
import { usePresence, colorForUserId, type PresenceUser } from "@/hooks/usePresence";
import { duplicateObjects, copyObjects, pasteObjects } from "@/lib/board/boardOperations";
import {
  updateObjectPosition,
  updateObjectText,
  updateObjectColor,
  applyObjectUpdates,
} from "@/lib/board/objectUpdates";
import {
  DEFAULT_STICKY_COLOR,
  DEFAULT_RECT_COLOR,
  CANVAS_BG_FILL,
  GRID_STROKE,
  GRID_MAJOR_STROKE,
  TAP_PLACE_DEDUPE_MS,
} from "@/lib/board/canvasConstants";
import { computeViewport, computeGridLines } from "@/lib/board/viewportUtils";
import { AI_PANEL_WIDTH } from "@/constants/layout";

const FPS_REPORT_INTERVAL_MS = 500;
const FPS_SAMPLES = 10;

type BoardCanvasProps = {
  boardId?: string;
  user?: User | null;
  objects?: BoardObject[];
  onObjectsChange?: (objects: BoardObject[]) => void;
  onOtherUsersChange?: (users: PresenceUser[]) => void;
  onPresenceError?: (err: Error | null) => void;
  onFPSReport?: (fps: number) => void;
  onCursorSyncLatency?: (ms: number | null) => void;
  /** When true, the AI chat panel is open; control panel (zoom) shifts left so it stays visible. */
  chatPanelOpen?: boolean;
};

export function BoardCanvas({ boardId, user, objects: propsObjects, onObjectsChange, onOtherUsersChange, onPresenceError, onFPSReport, onCursorSyncLatency, chatPanelOpen }: BoardCanvasProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [localObjects, setLocalObjects] = useState<BoardObject[]>([]);
  const objects = propsObjects ?? localObjects;
  const setObjects = onObjectsChange ?? setLocalObjects;

  const [size, setSize] = useState({ width: 800, height: 600 });
  const [scale, setScale] = useState(1);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [cursorWorld, setCursorWorld] = useState<{ x: number; y: number } | null>(null);
  const [editingStickyId, setEditingStickyId] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [marqueeRect, setMarqueeRect] = useState<{ startX: number; startY: number; endX: number; endY: number } | null>(null);
  const [copiedObjects, setCopiedObjects] = useState<BoardObject[] | null>(null);
  const [activeTool, setActiveTool] = useState<BoardTool>("selection");
  const [connectorFromId, setConnectorFromId] = useState<string | null>(null);
  const [editingTextId, setEditingTextId] = useState<string | null>(null);
  const [isPanning, setIsPanning] = useState(false);
  const [canvasLocked, setCanvasLocked] = useState(false);
  const [showColorFromContextMenu, setShowColorFromContextMenu] = useState(false);
  const [toolbarPosition, setToolbarPosition] = useState({ x: 8, y: 80 });
  const [toolbarExpanded, setToolbarExpanded] = useState(true);
  const [isDraggingToolbar, setIsDraggingToolbar] = useState(false);
  const toolbarFloatRef = useRef<HTMLDivElement>(null);
  const toolbarDragStartRef = useRef<{ x: number; y: number; clientX: number; clientY: number } | null>(null);
  const panStartRef = useRef({ x: 0, y: 0 });
  const didPanRef = useRef(false);
  const lastPinchRef = useRef<{ distance: number; centerX: number; centerY: number } | null>(null);
  const scaleRef = useRef(scale);
  const positionRef = useRef(position);
  const canvasLockedRef = useRef(canvasLocked);
  const lastPlaceTimeRef = useRef(0);
  const marqueeRectRef = useRef<{ startX: number; startY: number; endX: number; endY: number } | null>(null);
  const justFinishedMarqueeRef = useRef(false);

  const selectionBounds = useMemo(() => {
    if (selectedIds.length === 0) return null;
    const selected = objects.filter((o) => selectedIds.includes(o.id) && hasBounds(o));
    const boxes = selected.map((o) => getObjectBounds(o)).filter(Boolean) as Array<{ x: number; y: number; width: number; height: number }>;
    if (boxes.length === 0) return null;
    const xs = boxes.flatMap((b) => [b.x, b.x + b.width]);
    const ys = boxes.flatMap((b) => [b.y, b.y + b.height]);
    return {
      x: Math.min(...xs),
      y: Math.min(...ys),
      width: Math.max(...xs) - Math.min(...xs),
      height: Math.max(...ys) - Math.min(...ys),
    };
  }, [selectedIds, objects]);

  useEffect(() => {
    scaleRef.current = scale;
    positionRef.current = position;
  }, [scale, position]);

  useEffect(() => {
    canvasLockedRef.current = canvasLocked;
  }, [canvasLocked]);

  useEffect(() => {
    if (selectedIds.length !== 1) setShowColorFromContextMenu(false);
  }, [selectedIds.length]);

  useEffect(() => {
    marqueeRectRef.current = marqueeRect;
  }, [marqueeRect]);

  useEffect(() => {
    if (!marqueeRect) return;
    const onMouseMove = (e: MouseEvent) => {
      if (!containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const stageX = e.clientX - rect.left;
      const stageY = e.clientY - rect.top;
      const worldX = (stageX - positionRef.current.x) / scaleRef.current;
      const worldY = (stageY - positionRef.current.y) / scaleRef.current;
      setMarqueeRect((prev) => (prev ? { ...prev, endX: worldX, endY: worldY } : null));
    };
    const onMouseUp = () => {
      const current = marqueeRectRef.current;
      setMarqueeRect(null);
      if (!current) return;
      justFinishedMarqueeRef.current = true;
      const { startX, startY, endX, endY } = current;
      const minX = Math.min(startX, endX);
      const maxX = Math.max(startX, endX);
      const minY = Math.min(startY, endY);
      const maxY = Math.max(startY, endY);
      const marquee = { x: minX, y: minY, width: maxX - minX, height: maxY - minY };
      const ids = objects.filter((o) => {
        const b = getObjectBounds(o);
        return b && rectsIntersect(marquee, b);
      }).map((o) => o.id);
      setSelectedIds(ids);
    };
    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup", onMouseUp);
    return () => {
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup", onMouseUp);
    };
  }, [marqueeRect, objects]);

  useEffect(() => {
    if (!isDraggingToolbar) return;
    const onMouseMove = (e: MouseEvent) => {
      const start = toolbarDragStartRef.current;
      if (!start || !containerRef.current || !toolbarFloatRef.current) return;
      const containerRect = containerRef.current.getBoundingClientRect();
      const floatRect = toolbarFloatRef.current.getBoundingClientRect();
      const deltaX = e.clientX - start.clientX;
      const deltaY = e.clientY - start.clientY;
      let x = start.x + deltaX;
      let y = start.y + deltaY;
      x = Math.max(0, Math.min(x, containerRect.width - floatRect.width));
      y = Math.max(0, Math.min(y, containerRect.height - floatRect.height));
      setToolbarPosition({ x, y });
    };
    const onMouseUp = () => {
      setIsDraggingToolbar(false);
      toolbarDragStartRef.current = null;
    };
    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup", onMouseUp);
    return () => {
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup", onMouseUp);
    };
  }, [isDraggingToolbar]);

  const handleToolbarDragStart = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    toolbarDragStartRef.current = {
      x: toolbarPosition.x,
      y: toolbarPosition.y,
      clientX: e.clientX,
      clientY: e.clientY,
    };
    setIsDraggingToolbar(true);
  }, [toolbarPosition.x, toolbarPosition.y]);

  const { otherUsers, error: presenceError, lastCursorSyncLatencyMs } = usePresence(boardId ?? "", user ?? null, cursorWorld);

  useEffect(() => {
    onOtherUsersChange?.(otherUsers);
  }, [otherUsers, onOtherUsersChange]);

  useEffect(() => {
    onPresenceError?.(presenceError ?? null);
  }, [presenceError, onPresenceError]);

  useEffect(() => {
    onCursorSyncLatency?.(lastCursorSyncLatencyMs ?? null);
  }, [lastCursorSyncLatencyMs, onCursorSyncLatency]);

  const frameTimesRef = useRef<number[]>([]);
  const lastFrameTimeRef = useRef<number>(0);
  const lastReportTimeRef = useRef<number>(0);

  useEffect(() => {
    if (!onFPSReport) return;
    let rafId: number;
    const tick = (now: number) => {
      const prev = lastFrameTimeRef.current;
      if (prev > 0) {
        const delta = now - prev;
        const times = frameTimesRef.current;
        times.push(delta);
        if (times.length > FPS_SAMPLES) times.shift();
        const elapsed = now - lastReportTimeRef.current;
        if (elapsed >= FPS_REPORT_INTERVAL_MS && times.length > 0) {
          const avgDelta = times.reduce((a, b) => a + b, 0) / times.length;
          const fps = avgDelta > 0 ? Math.round(1000 / avgDelta) : 0;
          onFPSReport(fps);
          lastReportTimeRef.current = now;
        }
      } else {
        lastReportTimeRef.current = now;
      }
      lastFrameTimeRef.current = now;
      rafId = requestAnimationFrame(tick);
    };
    rafId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafId);
  }, [onFPSReport]);

  const updateSize = useCallback(() => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const w = Math.max(1, Math.floor(rect.width));
    const h = Math.max(1, Math.floor(rect.height));
    setSize((prev) => (prev.width === w && prev.height === h ? prev : { width: w, height: h }));
  }, []);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    updateSize();
    const ro = new ResizeObserver(() => updateSize());
    ro.observe(el);
    return () => ro.disconnect();
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
    const onTouchMove = (e: TouchEvent) => {
      if (e.touches.length >= 1) {
        const t = e.touches[0];
        const dx = t.clientX - panStartRef.current.x;
        const dy = t.clientY - panStartRef.current.y;
        setPosition((prev) => ({ x: prev.x + dx, y: prev.y + dy }));
        panStartRef.current = { x: t.clientX, y: t.clientY };
        didPanRef.current = true;
        e.preventDefault();
      }
    };
    const onTouchEnd = (e: TouchEvent) => {
      if (e.touches.length === 0) setIsPanning(false);
    };
    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup", onMouseUp);
    window.addEventListener("touchmove", onTouchMove, { passive: false });
    window.addEventListener("touchend", onTouchEnd);
    return () => {
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup", onMouseUp);
      window.removeEventListener("touchmove", onTouchMove);
      window.removeEventListener("touchend", onTouchEnd);
    };
  }, [isPanning]);

  useEffect(() => {
    const onTouchMove = (e: TouchEvent) => {
      if (e.touches.length !== 2 || !lastPinchRef.current || canvasLockedRef.current) return;
      e.preventDefault();
      const t0 = e.touches[0];
      const t1 = e.touches[1];
      const distance = Math.hypot(t1.clientX - t0.clientX, t1.clientY - t0.clientY);
      const centerX = (t0.clientX + t1.clientX) / 2;
      const centerY = (t0.clientY + t1.clientY) / 2;
      const prev = lastPinchRef.current;
      const scaleBy = distance / prev.distance;
      const currentScale = scaleRef.current;
      const currentPos = positionRef.current;
      const newScale = Math.min(Math.max(0.2, currentScale * scaleBy), 5);
      const pointToX = (centerX - currentPos.x) / currentScale;
      const pointToY = (centerY - currentPos.y) / currentScale;
      const newPos = {
        x: centerX - pointToX * newScale,
        y: centerY - pointToY * newScale,
      };
      scaleRef.current = newScale;
      positionRef.current = newPos;
      setScale(newScale);
      setPosition(newPos);
      lastPinchRef.current = { distance, centerX, centerY };
    };
    const onTouchEnd = () => {
      if (lastPinchRef.current) lastPinchRef.current = null;
    };
    window.addEventListener("touchmove", onTouchMove, { passive: false });
    window.addEventListener("touchend", onTouchEnd);
    window.addEventListener("touchcancel", onTouchEnd);
    return () => {
      window.removeEventListener("touchmove", onTouchMove);
      window.removeEventListener("touchend", onTouchEnd);
      window.removeEventListener("touchcancel", onTouchEnd);
    };
  }, []);

  const handleWheel = (e: KonvaEventObject<WheelEvent>) => {
    e.evt.preventDefault();
    if (canvasLocked) return;
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

  const handleZoomIn = useCallback(() => {
    const oldScale = scale;
    const scaleBy = 1.1;
    const newScale = Math.min(oldScale * scaleBy, 5);
    if (newScale === oldScale) return;
    const centerWorldX = (size.width / 2 - position.x) / oldScale;
    const centerWorldY = (size.height / 2 - position.y) / oldScale;
    setScale(newScale);
    setPosition({
      x: size.width / 2 - centerWorldX * newScale,
      y: size.height / 2 - centerWorldY * newScale,
    });
  }, [scale, position, size.width, size.height]);

  const handleZoomOut = useCallback(() => {
    const oldScale = scale;
    const scaleBy = 1.1;
    const newScale = Math.max(oldScale / scaleBy, 0.2);
    if (newScale === oldScale) return;
    const centerWorldX = (size.width / 2 - position.x) / oldScale;
    const centerWorldY = (size.height / 2 - position.y) / oldScale;
    setScale(newScale);
    setPosition({
      x: size.width / 2 - centerWorldX * newScale,
      y: size.height / 2 - centerWorldY * newScale,
    });
  }, [scale, position, size.width, size.height]);

  const viewport = useMemo(
    () => computeViewport(position, scale, size),
    [position, scale, size.width, size.height]
  );

  const gridLines = useMemo(() => computeGridLines(viewport), [viewport]);

  const stickies = objects.filter(isSticky);
  const rectangles = objects.filter(isRectangle);
  const textObjects = objects.filter(isText);
  const frameObjects = objects.filter(isFrame);
  const editingSticky = editingStickyId
    ? stickies.find((s) => s.id === editingStickyId)
    : null;
  const editingText = editingTextId
    ? textObjects.find((t) => t.id === editingTextId)
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
          color: DEFAULT_STICKY_COLOR,
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
          color: DEFAULT_RECT_COLOR,
        },
      ]);
    },
    [objects, setObjects]
  );

  const placeText = useCallback(
    (worldX: number, worldY: number) => {
      setObjects([
        ...objects,
        {
          id: crypto.randomUUID(),
          type: "text",
          x: worldX,
          y: worldY,
          width: 160,
          height: 32,
          text: "Text",
        },
      ]);
    },
    [objects, setObjects]
  );

  const placeFrame = useCallback(
    (worldX: number, worldY: number) => {
      setObjects([
        ...objects,
        {
          id: crypto.randomUUID(),
          type: "frame",
          x: worldX,
          y: worldY,
          width: 280,
          height: 180,
          title: "Frame",
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

  const handleTextObjectSave = (newText: string) => {
    if (!editingTextId) return;
    setObjects(updateObjectText(objects, editingTextId, newText));
    setEditingTextId(null);
  };

  const getPointerFromEvent = useCallback(
    (e: KonvaEventObject<MouseEvent | TouchEvent>, stage: ReturnType<KonvaNode["getStage"]>) => {
      if (!stage || !containerRef.current) return null;
      const ev = e.evt;
      if ("touches" in ev && ev.changedTouches?.length) {
        const t = ev.changedTouches[0];
        const rect = containerRef.current.getBoundingClientRect();
        return { x: t.clientX - rect.left, y: t.clientY - rect.top };
      }
      return stage.getPointerPosition();
    },
    []
  );

  const tryPlaceAtPointer = useCallback(
    (pointer: { x: number; y: number }) => {
      if (Date.now() - lastPlaceTimeRef.current < TAP_PLACE_DEDUPE_MS) return;
      if (activeTool !== "sticky" && activeTool !== "rectangle" && activeTool !== "text" && activeTool !== "frame") return;
      if (didPanRef.current) return;
      lastPlaceTimeRef.current = Date.now();
      const worldX = (pointer.x - position.x) / scale;
      const worldY = (pointer.y - position.y) / scale;
      if (activeTool === "sticky") placeSticky(worldX, worldY);
      else if (activeTool === "rectangle") placeRectangle(worldX, worldY);
      else if (activeTool === "text") placeText(worldX, worldY);
      else if (activeTool === "frame") placeFrame(worldX, worldY);
    },
    [activeTool, position, scale, placeSticky, placeRectangle, placeText, placeFrame]
  );

  const handleStageClick = (e: KonvaEventObject<MouseEvent>) => {
    const stage = e.target.getStage();
    if (!stage) return;
    const clickedOnEmpty = e.target === stage || e.target.name() === "stage-bg";
    if (clickedOnEmpty) {
      const pointer = getPointerFromEvent(e as KonvaEventObject<MouseEvent | TouchEvent>, stage);
      if (pointer && (activeTool === "sticky" || activeTool === "rectangle" || activeTool === "text" || activeTool === "frame") && !didPanRef.current) {
        tryPlaceAtPointer(pointer);
        return;
      }
      if (activeTool === "connector") setConnectorFromId(null);
      if (!marqueeRect && !justFinishedMarqueeRef.current) setSelectedIds([]);
      justFinishedMarqueeRef.current = false;
      return;
    }
    let node: KonvaNode | null = e.target;
    while (node) {
      const name = node.name();
      if (typeof name === "string" && name.startsWith("obj-")) {
        const id = name.slice(4);
        const targetObj = objects.find((o) => o.id === id);
        const canConnect = targetObj && !isConnector(targetObj);

        if (activeTool === "connector" && canConnect) {
          if (connectorFromId === null) {
            setConnectorFromId(id);
            setSelectedIds([id]);
            return;
          }
          if (id === connectorFromId) {
            setConnectorFromId(null);
            return;
          }
          setObjects([
            ...objects,
            { id: crypto.randomUUID(), type: "connector", fromId: connectorFromId, toId: id, style: "line" },
          ]);
          setConnectorFromId(null);
          setSelectedIds([id]);
          return;
        }

        if (e.evt.shiftKey) {
          setSelectedIds((prev) =>
            prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
          );
        } else {
          setSelectedIds([id]);
        }
        return;
      }
      node = node.getParent();
    }
    if (activeTool === "connector") setConnectorFromId(null);
    setSelectedIds([]);
  };

  const handleStageTap = (e: KonvaEventObject<MouseEvent | TouchEvent>) => {
    const stage = e.target.getStage();
    if (!stage) return;
    const clickedOnEmpty = e.target === stage || e.target.name() === "stage-bg";
    if (clickedOnEmpty) {
      const pointer = getPointerFromEvent(e, stage);
      if (pointer) tryPlaceAtPointer(pointer);
    }
  };

  const handleStageMouseDown = (e: KonvaEventObject<MouseEvent>) => {
    if (canvasLocked) return;
    const target = e.target;
    const stage = target.getStage();
    const clickedOnEmpty = target === stage || target.name() === "stage-bg";
    if (clickedOnEmpty) {
      didPanRef.current = false;
      const pointer = stage?.getPointerPosition();
      if (pointer && activeTool === "selection" && e.evt.shiftKey) {
        const worldX = (pointer.x - position.x) / scale;
        const worldY = (pointer.y - position.y) / scale;
        setMarqueeRect({ startX: worldX, startY: worldY, endX: worldX, endY: worldY });
      } else if (pointer) {
        panStartRef.current = { x: e.evt.clientX, y: e.evt.clientY };
        setIsPanning(true);
      }
    }
  };

  const handleStageTouchStart = (e: KonvaEventObject<TouchEvent>) => {
    const stage = e.target.getStage();
    if (!stage) return;
    const ev = e.evt;
    if (ev.touches.length === 2) {
      if (canvasLocked) return;
      const t0 = ev.touches[0];
      const t1 = ev.touches[1];
      lastPinchRef.current = {
        distance: Math.hypot(t1.clientX - t0.clientX, t1.clientY - t0.clientY),
        centerX: (t0.clientX + t1.clientX) / 2,
        centerY: (t0.clientY + t1.clientY) / 2,
      };
      ev.preventDefault();
      return;
    }
    if (ev.touches.length === 1 && !canvasLocked) {
      const target = e.target;
      const clickedOnEmpty = target === stage || target.name() === "stage-bg";
      if (clickedOnEmpty) {
        didPanRef.current = false;
        panStartRef.current = { x: ev.touches[0].clientX, y: ev.touches[0].clientY };
        setIsPanning(true);
      }
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

  const handleDuplicate = useCallback(() => {
    if (selectedIds.length === 0) return;
    const { nextObjects, newIds } = duplicateObjects(objects, selectedIds);
    setObjects(nextObjects);
    setSelectedIds(newIds);
  }, [objects, selectedIds, setObjects]);

  const handleCopy = useCallback(() => {
    if (selectedIds.length === 0) return;
    setCopiedObjects(copyObjects(objects, selectedIds));
  }, [objects, selectedIds]);

  const handlePaste = useCallback(() => {
    if (!copiedObjects || copiedObjects.length === 0) return;
    const pasted = pasteObjects(copiedObjects);
    setObjects([...objects, ...pasted]);
    setSelectedIds(pasted.map((o) => o.id));
  }, [copiedObjects, objects, setObjects]);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey) {
        if (e.key === "d") {
          e.preventDefault();
          handleDuplicate();
        }
        if (e.key === "c") {
          e.preventDefault();
          handleCopy();
        }
        if (e.key === "v") {
          e.preventDefault();
          handlePaste();
        }
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [handleDuplicate, handleCopy, handlePaste]);

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
      <div style={{ flex: 1, minHeight: 0, minWidth: 0, position: "relative" }}>
        <div
          ref={toolbarFloatRef}
          className="board-toolbar-float board-toolbar-float_movable"
          style={{
            left: toolbarPosition.x,
            top: toolbarPosition.y,
            bottom: "auto",
          }}
        >
          <BoardToolbar
            activeTool={activeTool}
            setActiveTool={setActiveTool}
            onConnectorToolChange={() => setConnectorFromId(null)}
            expanded={toolbarExpanded}
            onToggleExpand={() => setToolbarExpanded((e) => !e)}
          />
          <div
            className="board-toolbar-drag-handle"
            onMouseDown={handleToolbarDragStart}
            aria-label="Drag to move toolbar"
            title="Drag to move toolbar"
          />
        </div>
        <div style={{ position: "absolute", inset: 0 }} ref={containerRef}>
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
          onTouchStart={handleStageTouchStart}
          onWheel={handleWheel}
          onClick={handleStageClick}
          onTap={handleStageTap}
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
          {stickies.map((obj) => (
            <StickyObject
              key={obj.id}
              obj={obj}
              isSelected={selectedIds.includes(obj.id)}
              onDragEnd={(e) => {
                const node = e.target;
                setObjects(updateObjectPosition(objects, obj.id, node.x(), node.y()));
              }}
              onSelect={() => {}}
              onDblClick={() => setEditingStickyId(obj.id)}
            />
          ))}
          {rectangles.map((obj) => (
            <RectangleObject
              key={obj.id}
              obj={obj}
              isSelected={selectedIds.includes(obj.id)}
              onDragEnd={(e) => {
                const node = e.target;
                setObjects(updateObjectPosition(objects, obj.id, node.x(), node.y()));
              }}
              onSelect={() => {}}
            />
          ))}
          {textObjects.map((obj) => (
            <TextObject
              key={obj.id}
              obj={obj}
              isSelected={selectedIds.includes(obj.id)}
              onDragEnd={(e) => {
                const node = e.target;
                setObjects(updateObjectPosition(objects, obj.id, node.x(), node.y()));
              }}
              onSelect={() => {}}
              onDblClick={() => setEditingTextId(obj.id)}
            />
          ))}
          {frameObjects.map((obj) => (
            <FrameObject
              key={obj.id}
              obj={obj}
              isSelected={selectedIds.includes(obj.id)}
              onDragEnd={(e) => {
                const node = e.target;
                setObjects(updateObjectPosition(objects, obj.id, node.x(), node.y()));
              }}
              onSelect={() => {}}
            />
          ))}
        </Layer>
        <ConnectorLayer objects={objects} />
        {marqueeRect && (() => {
          const { startX, startY, endX, endY } = marqueeRect;
          const x = Math.min(startX, endX);
          const y = Math.min(startY, endY);
          const width = Math.abs(endX - startX);
          const height = Math.abs(endY - startY);
          return (
            <Layer listening={false}>
              <SelectionBox x={x} y={y} width={width} height={height} />
            </Layer>
          );
        })()}
        {selectedIds.length > 0 && (
          <TransformHandles
            selectedIds={selectedIds}
            objects={objects}
            scale={scale}
            position={position}
            onResize={(updates) => setObjects(applyObjectUpdates(objects, updates))}
            onRotate={(updates) => setObjects(applyObjectUpdates(objects, updates))}
          />
        )}
        <Layer listening={false} data-testid="other-user-cursors">
          {user && cursorWorld && (
            <Group x={cursorWorld.x} y={cursorWorld.y} data-testid="cursor-current-user">
              <Circle radius={8} fill={colorForUserId(user.uid)} stroke="#fff" strokeWidth={2} />
              <Text
                x={12}
                y={-6}
                text={user.displayName || user.email || "You"}
                fontSize={13}
                fill={colorForUserId(user.uid)}
                fontStyle="bold"
                listening={false}
              />
            </Group>
          )}
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
      {selectedIds.length > 0 && (() => {
        const MENU_EST_WIDTH = 180;
        const MENU_EST_HEIGHT = 320;
        const gap = 8;
        let menuLeft = selectionBounds
          ? position.x + selectionBounds.x * scale - MENU_EST_WIDTH - gap
          : position.x + 20;
        let menuTop = selectionBounds ? position.y + selectionBounds.y * scale : position.y + 20;
        menuLeft = Math.max(0, Math.min(menuLeft, size.width - MENU_EST_WIDTH));
        menuTop = Math.max(0, Math.min(menuTop, size.height - MENU_EST_HEIGHT));
        return (
          <ObjectContextMenu
            left={menuLeft}
            top={menuTop}
            selectedIds={selectedIds}
            objects={objects}
            onEdit={() => {
              if (selectedIds.length === 1) {
                const obj = objects.find((o) => o.id === selectedIds[0]);
                if (obj?.type === "sticky") setEditingStickyId(selectedIds[0]);
                if (obj?.type === "text") setEditingTextId(selectedIds[0]);
              }
            }}
            onColorClick={() => setShowColorFromContextMenu(true)}
            onDelete={() => {
              const idSet = new Set(selectedIds);
              setObjects(objects.filter((o) => !idSet.has(o.id)));
              setSelectedIds([]);
              setShowColorFromContextMenu(false);
            }}
            onCopy={handleCopy}
            onDuplicate={handleDuplicate}
          />
        );
      })()}
      {showColorFromContextMenu && selectedIds.length === 1 && (() => {
        const selectedObject = objects.find((o) => o.id === selectedIds[0]);
        const isStickyOrRect = selectedObject && (selectedObject.type === "sticky" || selectedObject.type === "rectangle");
        if (!isStickyOrRect || !selectedObject) return null;
        const effectiveColor =
          "color" in selectedObject
            ? selectedObject.color ?? (selectedObject.type === "sticky" ? DEFAULT_STICKY_COLOR : DEFAULT_RECT_COLOR)
            : "";
        const POPUP_EST_WIDTH = 280;
        const POPUP_EST_HEIGHT = 72;
        const gap = 8;
        let popupLeft = position.x + selectedObject.x * scale;
        let popupTop = position.y + selectedObject.y * scale + selectedObject.height * scale + gap;
        popupLeft = Math.max(0, Math.min(popupLeft, size.width - POPUP_EST_WIDTH));
        if (popupTop + POPUP_EST_HEIGHT > size.height) {
          popupTop = position.y + selectedObject.y * scale - POPUP_EST_HEIGHT - gap;
        }
        popupTop = Math.max(0, Math.min(popupTop, size.height - POPUP_EST_HEIGHT));
        return (
          <ColorPalettePopup
            left={popupLeft}
            top={popupTop}
            selectedId={selectedIds[0]}
            effectiveColor={effectiveColor}
            onColorSelect={(hex) => {
              setObjects(updateObjectColor(objects, selectedIds[0], hex));
              setShowColorFromContextMenu(false);
            }}
          />
        );
      })()}
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
      {editingText && (
        <textarea
          data-testid="text-edit-input"
          value={editingText.text}
          onChange={(e) => {
            const next = updateObjectText(objects, editingText.id, e.target.value);
            setObjects(next);
          }}
          onBlur={(e) => handleTextObjectSave(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Escape") setEditingTextId(null);
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              handleTextObjectSave((e.target as HTMLTextAreaElement).value);
            }
          }}
          autoFocus
          style={{
            position: "absolute",
            left: position.x + editingText.x * scale,
            top: position.y + editingText.y * scale,
            width: ((editingText.width ?? 160) * scale),
            height: ((editingText.height ?? 32) * scale),
            padding: 4,
            margin: 0,
            border: "1px solid var(--color-primary)",
            borderRadius: 4,
            fontSize: editingText.fontSize ?? 16,
            resize: "none",
            boxSizing: "border-box",
          }}
        />
      )}
      <CanvasControlPanel
        scale={scale}
        onZoomIn={handleZoomIn}
        onZoomOut={handleZoomOut}
        canvasLocked={canvasLocked}
        onLockToggle={() => setCanvasLocked((prev) => !prev)}
        rightOffset={chatPanelOpen ? AI_PANEL_WIDTH : 0}
      />
        </div>
      </div>
    </div>
  );
}
