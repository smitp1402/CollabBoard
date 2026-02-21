import React from "react";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { PerformancePanel } from "./PerformancePanel";
import { PERF_TARGET_FPS } from "@/constants/performanceTargets";

describe("PerformancePanel", () => {
  const defaultProps = {
    fps: 60,
    objectSyncLatencyMs: 50,
    cursorSyncLatencyMs: 25,
    objectCount: 600,
    concurrentUsers: 6,
    onClose: jest.fn(),
  };

  it("renders all five metrics with current value and target", () => {
    render(<PerformancePanel {...defaultProps} />);

    expect(screen.getByText("Frame rate")).toBeInTheDocument();
    expect(screen.getByText("Object sync latency")).toBeInTheDocument();
    expect(screen.getByText("Cursor sync latency")).toBeInTheDocument();
    expect(screen.getByText("Object capacity")).toBeInTheDocument();
    expect(screen.getByText("Concurrent users")).toBeInTheDocument();
    const panel = screen.getByRole("dialog", { name: /performance metrics/i });
    expect(panel).toHaveTextContent("60");
    expect(panel).toHaveTextContent(String(PERF_TARGET_FPS));
    expect(panel).toHaveTextContent("600");
    expect(panel).toHaveTextContent("6");
  });

  it("shows pass status when FPS meets target", () => {
    render(<PerformancePanel {...defaultProps} fps={60} />);
    const row = screen.getByText("Frame rate").closest("tr");
    expect(row).toBeInTheDocument();
    expect(row?.className).toMatch(/perf-ok/);
    expect(row).toHaveTextContent("Pass");
  });

  it("shows fail status when FPS is below target", () => {
    render(<PerformancePanel {...defaultProps} fps={30} />);
    const row = screen.getByText("Frame rate").closest("tr");
    expect(row).toBeInTheDocument();
    expect(row?.className).toMatch(/perf-fail/);
    expect(row).toHaveTextContent("Fail");
  });

  it("shows pass when object sync latency is under target", () => {
    render(<PerformancePanel {...defaultProps} objectSyncLatencyMs={80} />);
    expect(screen.getByText(/80/)).toBeInTheDocument();
    const row = screen.getByText("Object sync latency").closest("tr");
    expect(row?.className).toMatch(/perf-ok/);
  });

  it("shows fail when object sync latency exceeds target", () => {
    render(<PerformancePanel {...defaultProps} objectSyncLatencyMs={150} />);
    expect(screen.getByText(/150/)).toBeInTheDocument();
    const row = screen.getByText("Object sync latency").closest("tr");
    expect(row?.className).toMatch(/perf-fail/);
  });

  it("calls onClose when close button is clicked", async () => {
    const onClose = jest.fn();
    render(<PerformancePanel {...defaultProps} onClose={onClose} />);
    const closeButton = screen.getByRole("button", { name: /close/i });
    await userEvent.click(closeButton);
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("handles null fps and latencies", () => {
    render(
      <PerformancePanel
        fps={null}
        objectSyncLatencyMs={null}
        cursorSyncLatencyMs={null}
        objectCount={0}
        concurrentUsers={0}
        onClose={jest.fn()}
      />
    );
    const dashes = screen.getAllByText("—");
    expect(dashes.length).toBeGreaterThanOrEqual(1);
  });
});
