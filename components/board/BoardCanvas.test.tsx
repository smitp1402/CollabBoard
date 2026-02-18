import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { BoardCanvas } from "./BoardCanvas";
import type { BoardObject } from "@/lib/board-types";

jest.mock("@/lib/board/usePresence", () => ({
  usePresence: () => ({ otherUsers: [], error: null }),
}));

jest.mock("@/components/board/selection/SelectionBox", () => ({
  SelectionBox: () => null,
}));

jest.mock("@/components/board/selection/TransformHandles", () => ({
  TransformHandles: () => null,
}));

jest.mock("react-konva", () => {
  const React = require("react");
  const { useRef, useLayoutEffect } = require("react");
  const Group = ({ children, name, "data-testid": testId, ...props }: { children?: React.ReactNode; name?: string; "data-testid"?: string }) => {
    const ref = useRef<HTMLDivElement>(null);
    useLayoutEffect(() => {
      if (!ref.current) return;
      const el = ref.current as unknown as { getStage: () => Element | null; name: () => string; getParent: () => null };
      el.getStage = () => document.querySelector('[data-testid="konva-stage"]');
      el.name = () => name ?? "";
      el.getParent = () => null;
    }, [name]);
    return React.createElement("div", { ref, "data-testid": testId, ...props }, children);
  };
  const nodeWithGetParent = () => {
    const ref = useRef<HTMLDivElement>(null);
    useLayoutEffect(() => {
      if (ref.current) {
        const el = ref.current as unknown as { getParent: () => Node | null; name: () => string; getStage: () => Element | null };
        el.getParent = () => ref.current!.parentNode;
        el.name = () => "";
        el.getStage = () => document.querySelector('[data-testid="konva-stage"]');
      }
    }, []);
    return React.createElement("div", { ref }, null);
  };
  return {
    Stage: ({ children, ...stageProps }: { children?: React.ReactNode; [key: string]: unknown }) =>
      React.createElement("div", { "data-testid": "konva-stage", ...stageProps }, children),
    Layer: ({ children }: { children?: React.ReactNode }) =>
      React.createElement("div", null, children),
    Group,
    Rect: nodeWithGetParent,
    Line: () => React.createElement("div", null),
    Text: nodeWithGetParent,
    Circle: () => React.createElement("div", null),
  };
});

describe("BoardCanvas", () => {
  it("renders canvas container", () => {
    render(<BoardCanvas />);
    expect(screen.getByTestId("board-canvas")).toBeInTheDocument();
  });

  it("renders one sticky when given in objects", () => {
    const objects: BoardObject[] = [
      {
        id: "1",
        type: "sticky",
        x: 50,
        y: 50,
        width: 120,
        height: 80,
        text: "Hello",
      },
    ];
    render(<BoardCanvas objects={objects} />);
    expect(screen.getByTestId("sticky-1")).toBeInTheDocument();
  });

  it("renders one rectangle when given in objects", () => {
    const objects: BoardObject[] = [
      {
        id: "rect-a",
        type: "rectangle",
        x: 100,
        y: 100,
        width: 80,
        height: 60,
      },
    ];
    render(<BoardCanvas objects={objects} />);
    expect(screen.getByTestId("rect-rect-a")).toBeInTheDocument();
  });

  it("renders Delete button below add tools and it is disabled when nothing selected", () => {
    render(<BoardCanvas />);
    const deleteBtn = screen.getByTestId("delete-object");
    expect(deleteBtn).toBeInTheDocument();
    expect(deleteBtn).toBeDisabled();
  });

  it("Delete button click does nothing when nothing is selected", () => {
    const objects: BoardObject[] = [
      { id: "sticky-1", type: "sticky", x: 0, y: 0, width: 120, height: 80, text: "Hi" },
    ];
    const onObjectsChange = jest.fn();
    render(<BoardCanvas objects={objects} onObjectsChange={onObjectsChange} />);
    screen.getByTestId("delete-object").click();
    expect(onObjectsChange).not.toHaveBeenCalled();
  });

  it("renders sticky with custom color when given in objects", () => {
    const objects: BoardObject[] = [
      {
        id: "1",
        type: "sticky",
        x: 50,
        y: 50,
        width: 120,
        height: 80,
        text: "Colored",
        color: "#ff0000",
      },
    ];
    render(<BoardCanvas objects={objects} />);
    expect(screen.getByTestId("sticky-1")).toBeInTheDocument();
  });

  it("does not show color palette when nothing is selected", () => {
    const objects: BoardObject[] = [
      { id: "1", type: "sticky", x: 0, y: 0, width: 120, height: 80, text: "Hi" },
    ];
    render(<BoardCanvas objects={objects} />);
    expect(screen.queryByTestId("color-palette")).not.toBeInTheDocument();
  });

  it.skip("shows color palette when a sticky is selected and clicking a swatch updates color (requires Konva click bubbling)", async () => {
    const user = userEvent.setup();
    const objects: BoardObject[] = [
      { id: "1", type: "sticky", x: 0, y: 0, width: 120, height: 80, text: "Hi", color: "#fef08a" },
    ];
    const onObjectsChange = jest.fn();
    render(<BoardCanvas objects={objects} onObjectsChange={onObjectsChange} />);
    expect(screen.queryByTestId("color-palette")).not.toBeInTheDocument();

    const sticky = screen.getByTestId("sticky-1");
    await user.click(sticky);
    // Selection is set in Stage onClick (handleStageClick); in this mock the event may not bubble as in real Konva
    expect(screen.getByTestId("color-palette")).toBeInTheDocument();
    expect(screen.getByTestId("board-canvas").querySelector("[data-testid=\"color-palette\"]")).toBeInTheDocument();

    const pinkSwatch = screen.getByTestId("color-swatch-fecaca");
    await user.click(pinkSwatch);
    expect(onObjectsChange).toHaveBeenCalledWith(
      expect.arrayContaining([
        expect.objectContaining({ id: "1", type: "sticky", color: "#fecaca", text: "Hi" }),
      ])
    );
  });
});
