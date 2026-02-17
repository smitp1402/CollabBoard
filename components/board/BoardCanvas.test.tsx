import React from "react";
import { render, screen } from "@testing-library/react";
import { BoardCanvas } from "./BoardCanvas";
import type { BoardObject } from "@/lib/board-types";

jest.mock("react-konva", () => {
  const React = require("react");
  return {
    Stage: ({ children }: { children?: React.ReactNode }) =>
      React.createElement("div", { "data-testid": "konva-stage" }, children),
    Layer: ({ children }: { children?: React.ReactNode }) =>
      React.createElement("div", null, children),
    Group: ({ children, "data-testid": testId }: { children?: React.ReactNode; "data-testid"?: string }) =>
      React.createElement("div", { "data-testid": testId }, children),
    Rect: () => React.createElement("div", null),
    Line: () => React.createElement("div", null),
    Text: () => React.createElement("div", null),
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
});
