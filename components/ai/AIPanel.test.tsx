import React from "react";
import { act, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { AIPanel } from "./AIPanel";

const mockGetIdToken = jest.fn();
const mockFetch = jest.fn();
let collectionSnapshotCallback: ((snapshot: unknown) => void) | null = null;
let docSnapshotCallback: ((snapshot: unknown) => void) | null = null;

jest.mock("@/context/AuthContext", () => ({
  useAuth: () => ({
    user: {
      getIdToken: mockGetIdToken,
    },
  }),
}));

jest.mock("@/lib/firebase/client", () => ({
  getDb: () => ({}),
}));

jest.mock("firebase/firestore", () => ({
  collection: (...segments: unknown[]) => ({ type: "collection", segments }),
  doc: (...segments: unknown[]) => ({ type: "doc", segments }),
  orderBy: (...args: unknown[]) => ({ type: "orderBy", args }),
  limit: (...args: unknown[]) => ({ type: "limit", args }),
  query: (...args: unknown[]) => ({ type: "query", args }),
  onSnapshot: (ref: { type?: string }, callback: (snapshot: unknown) => void) => {
    if (ref?.type === "doc") {
      docSnapshotCallback = callback;
    } else {
      collectionSnapshotCallback = callback;
    }
    return () => {
      collectionSnapshotCallback = null;
      docSnapshotCallback = null;
    };
  },
}));

beforeEach(() => {
  jest.clearAllMocks();
  collectionSnapshotCallback = null;
  docSnapshotCallback = null;
  mockGetIdToken.mockResolvedValue("test-token");
  mockFetch.mockResolvedValue({
    ok: true,
    json: () =>
      Promise.resolve({
        data: {
          commandId: "cmd-123",
          status: "pending",
          summary: "Stub response.",
        },
      }),
  });
  global.fetch = mockFetch;
});

describe("AIPanel", () => {
  it("renders with boardId and shows header, input, and Run button", () => {
    render(<AIPanel boardId="board-1" />);

    expect(screen.getByText("AI Assistant")).toBeInTheDocument();
    expect(
      screen.getByPlaceholderText(/Ask AI to add sticky notes/i)
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /^Run$/i })).toBeInTheDocument();
  });

  it("disables Run when prompt is empty", () => {
    render(<AIPanel boardId="board-1" />);

    const submitButton = screen.getByRole("button", { name: /^Run$/i });
    expect(submitButton).toBeDisabled();
  });

  it("sends POST to /api/ai/commands with boardId, prompt, clientRequestId and Bearer token, and displays commandId and summary on success", async () => {
    const user = userEvent.setup();
    render(<AIPanel boardId="board-1" />);

    const textarea = screen.getByPlaceholderText(/Ask AI to add sticky notes/i);
    await user.type(textarea, "Add a sticky note");

    const submitButton = screen.getByRole("button", { name: /^Run$/i });
    await user.click(submitButton);

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledTimes(1);
    });
    const [url, opts] = mockFetch.mock.calls[0];
    expect(url).toBe("/api/ai/commands");
    expect(opts?.method).toBe("POST");
    expect(opts?.headers?.Authorization).toBe("Bearer test-token");
    const body = JSON.parse(opts?.body ?? "{}");
    expect(body.boardId).toBe("board-1");
    expect(body.prompt).toBe("Add a sticky note");
    expect(typeof body.clientRequestId).toBe("string");
    expect(body.clientRequestId.length).toBeGreaterThan(0);
    expect(typeof body.idempotencyKey).toBe("string");
    expect(body.idempotencyKey.length).toBeGreaterThan(0);

    expect(screen.getByText("Running")).toBeInTheDocument();

    await waitFor(() => {
      expect(docSnapshotCallback).toBeTruthy();
    });
    await act(async () => {
      docSnapshotCallback?.({
        exists: () => true,
        data: () => ({
          status: "completed",
          summary: "Realtime done.",
        }),
      });
    });

    await waitFor(() => {
      expect(screen.getByText(/Realtime done\./)).toBeInTheDocument();
    });
    expect(screen.getByText("Completed")).toBeInTheDocument();

    await act(async () => {
      collectionSnapshotCallback?.({
        docs: [
          {
            id: "cmd-123",
            data: () => ({
              prompt: "Add a sticky note",
              status: "completed",
              summary: "Realtime done.",
            }),
          },
        ],
      });
    });

    await waitFor(() => {
      const historyList = screen.getByRole("list", { name: /command history/i });
      expect(historyList).toHaveTextContent("Add a sticky note");
    });
  });

  it("shows status Running then Completed after successful response", async () => {
    const user = userEvent.setup();
    render(<AIPanel boardId="board-1" />);

    await user.type(
      screen.getByPlaceholderText(/Ask AI to add sticky notes/i),
      "Add a sticky"
    );
    await user.click(screen.getByRole("button", { name: /^Run$/i }));

    await waitFor(() => {
      expect(docSnapshotCallback).toBeTruthy();
    });
    await act(async () => {
      docSnapshotCallback?.({
        exists: () => true,
        data: () => ({
          status: "completed",
          summary: "Done from listener.",
        }),
      });
    });

    await waitFor(() => {
      expect(screen.getByRole("status")).toHaveTextContent("Completed");
    });
  });

  it("shows Failed and error message when API returns non-ok", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 403,
      json: () =>
        Promise.resolve({
          error: { message: "Board not found.", code: "FORBIDDEN" },
        }),
    });
    const user = userEvent.setup();
    render(<AIPanel boardId="board-1" />);

    await user.type(
      screen.getByPlaceholderText(/Ask AI to add sticky notes/i),
      "Add something"
    );
    await user.click(screen.getByRole("button", { name: /^Run$/i }));

    await waitFor(() => {
      expect(screen.getByText("Board not found.")).toBeInTheDocument();
    });
    expect(screen.getByText("Failed")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /retry/i })).toBeInTheDocument();
  });

  it("shows Retry when status is failed and retries last prompt on click", async () => {
    mockFetch
      .mockResolvedValueOnce({
        ok: false,
        status: 500,
        json: () => Promise.resolve({}),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            data: {
              commandId: "cmd-retry",
              status: "pending",
              summary: "Done.",
            },
          }),
      });
    const user = userEvent.setup();
    render(<AIPanel boardId="board-1" />);

    await user.type(
      screen.getByPlaceholderText(/Ask AI to add sticky notes/i),
      "Fail this one"
    );
    await user.click(screen.getByRole("button", { name: /^Run$/i }));

    await waitFor(() => {
      expect(screen.getByText("Failed")).toBeInTheDocument();
    });
    const retryButton = screen.getByRole("button", { name: /retry/i });
    await user.click(retryButton);

    await waitFor(() => {
      expect(docSnapshotCallback).toBeTruthy();
    });
    await act(async () => {
      docSnapshotCallback?.({
        exists: () => true,
        data: () => ({
          status: "completed",
          summary: "Done.",
        }),
      });
    });

    await waitFor(() => {
      expect(screen.getByText("Completed")).toBeInTheDocument();
    });
    expect(screen.getByText(/Done\./)).toBeInTheDocument();
    expect(mockFetch).toHaveBeenCalledTimes(2);

    const firstBody = JSON.parse(mockFetch.mock.calls[0][1]?.body ?? "{}");
    const secondBody = JSON.parse(mockFetch.mock.calls[1][1]?.body ?? "{}");
    expect(secondBody.clientRequestId).not.toBe(firstBody.clientRequestId);
  });

  it("renders failed status from realtime command document updates", async () => {
    const user = userEvent.setup();
    render(<AIPanel boardId="board-1" />);

    await user.type(screen.getByPlaceholderText(/Ask AI to add sticky notes/i), "Fail later");
    await user.click(screen.getByRole("button", { name: /^Run$/i }));

    await waitFor(() => {
      expect(docSnapshotCallback).toBeTruthy();
    });
    await act(async () => {
      docSnapshotCallback?.({
        exists: () => true,
        data: () => ({
          status: "failed",
          summary: "Could not execute.",
          error: "Tool execution failed",
        }),
      });
    });

    await waitFor(() => {
      expect(screen.getByText("Failed")).toBeInTheDocument();
    });
    expect(screen.getByText(/Tool execution failed/)).toBeInTheDocument();
  });
});
