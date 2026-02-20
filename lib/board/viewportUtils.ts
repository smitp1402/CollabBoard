import {
  GRID_SPACING,
  GRID_MAJOR_EVERY,
  VIEWPORT_MARGIN,
} from "./canvasConstants";

export type Viewport = {
  left: number;
  top: number;
  right: number;
  bottom: number;
  width: number;
  height: number;
};

export type GridLines = {
  vertical: { x: number; major: boolean }[];
  horizontal: { y: number; major: boolean }[];
};

/** Compute visible area in world coordinates (with margin for infinite canvas). */
export function computeViewport(
  position: { x: number; y: number },
  scale: number,
  size: { width: number; height: number }
): Viewport {
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
}

/** Compute grid line positions for a viewport. */
export function computeGridLines(viewport: Viewport): GridLines {
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
}
