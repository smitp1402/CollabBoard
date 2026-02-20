import React from "react";
import { render, screen, act } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { AIPanel } from "./AIPanel";

describe("AIPanel", () => {
  it("renders with boardId and shows header, input, and Submit button", () => {
    render(<AIPanel boardId="board-1" />);

    expect(screen.getByText("AI Assistant")).toBeInTheDocument();
    expect(
      screen.getByPlaceholderText(/Ask AI to add sticky notes/i)
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /^(Run|Submit)$/i })).toBeInTheDocument();
  });

  it("disables Submit when prompt is empty", () => {
    render(<AIPanel boardId="board-1" />);

    const submitButton = screen.getByRole("button", { name: /^(Run|Submit)$/i });
    expect(submitButton).toBeDisabled();
  });

  it("enables Submit when user types a prompt and shows status then result after mock delay", async () => {
    jest.useFakeTimers();
    const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });

    render(<AIPanel boardId="board-1" />);

    const textarea = screen.getByPlaceholderText(/Ask AI to add sticky notes/i);
    await user.type(textarea, "Add a sticky note");

    const submitButton = screen.getByRole("button", { name: /^(Run|Submit)$/i });
    expect(submitButton).not.toBeDisabled();

    await user.click(submitButton);

    expect(screen.getByRole("status")).toHaveTextContent("Running");

    await act(() => {
      jest.advanceTimersByTime(1500);
    });

    const statusCompletedOrFailed = screen.queryByText("Completed") ?? screen.queryByText("Failed");
    expect(statusCompletedOrFailed).toBeInTheDocument();

    const historyList = screen.getByRole("list", { name: /command history/i });
    expect(historyList).toHaveTextContent("Add a sticky note");

    jest.useRealTimers();
  });

  it("shows Retry when status is failed and retries last prompt on click", async () => {
    jest.useFakeTimers();
    const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });

    const randomSpy = jest.spyOn(Math, "random").mockReturnValue(0.1);

    render(<AIPanel boardId="board-1" />);

    const textarea = screen.getByPlaceholderText(/Ask AI to add sticky notes/i);
    await user.type(textarea, "Fail this one");

    await user.click(screen.getByRole("button", { name: /^(Run|Submit)$/i }));

    await act(() => {
      jest.advanceTimersByTime(1500);
    });

    expect(screen.getByText("Failed")).toBeInTheDocument();
    const retryButton = screen.getByRole("button", { name: /retry/i });
    expect(retryButton).toBeInTheDocument();

    randomSpy.mockReturnValue(0.9);

    await user.click(retryButton);

    await act(() => {
      jest.advanceTimersByTime(1500);
    });

    expect(screen.getByText("Completed")).toBeInTheDocument();
    const historyEntries = screen.getAllByText(/Fail this one/);
    expect(historyEntries.length).toBeGreaterThanOrEqual(2);

    randomSpy.mockRestore();
    jest.useRealTimers();
  });
});
