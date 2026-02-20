import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { BoardListPage } from "./BoardListPage";
import { AuthProvider, type AuthContextValue } from "@/lib/auth/AuthContext";
import type { BoardMeta } from "@/lib/board/boardMetadata";

const mockPush = jest.fn();
jest.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockPush }),
}));

const mockCreateBoardMeta = jest.fn();
const mockUseBoards = jest.fn();
jest.mock("@/lib/board/useBoards", () => ({
  useBoards: () => mockUseBoards(),
}));
jest.mock("@/lib/board/boardMetadata", () => ({
  ...jest.requireActual("@/lib/board/boardMetadata"),
  createBoardMeta: (...args: unknown[]) => mockCreateBoardMeta(...args),
}));

jest.mock("@/lib/firebase/client", () => ({
  getDb: () => ({}),
  getRealtimeDb: () => null,
  auth: null,
  app: null,
}));

jest.mock("firebase/firestore", () => {
  const actual = jest.requireActual("firebase/firestore");
  return {
    ...actual,
    collection: () => ({}),
    doc: () => ({ id: "new-board-123" }),
  };
});

jest.mock("firebase/auth", () => ({
  onAuthStateChanged: jest.fn(() => jest.fn()),
  GoogleAuthProvider: class {},
  signInWithPopup: jest.fn(),
  signInWithEmailAndPassword: jest.fn(),
  createUserWithEmailAndPassword: jest.fn(),
  signOut: jest.fn(),
}));

function MockAuthProvider({
  value,
  children,
}: {
  value: AuthContextValue;
  children: React.ReactNode;
}) {
  return <AuthProvider value={value}>{children}</AuthProvider>;
}

const mockUser = { uid: "user-1", email: "test@example.com", displayName: "Test User" } as any;

describe("BoardListPage", () => {
  beforeEach(() => {
    mockPush.mockClear();
    mockCreateBoardMeta.mockClear();
    mockUseBoards.mockReturnValue({
      boards: [
        { id: "default", name: "Default board", createdBy: "", createdAt: {} as any },
        { id: "board-2", name: "Second board", createdBy: "u2", createdAt: {} as any },
      ] as BoardMeta[],
      loading: false,
      error: null,
    });
  });

  it("renders board list in card view with New board button when authenticated", () => {
    render(
      <MockAuthProvider
        value={{
          user: mockUser,
          loading: false,
          signInWithGoogle: jest.fn(),
          signInWithEmail: jest.fn(),
          signUpWithEmail: jest.fn(),
          signOut: jest.fn(),
        }}
      >
        <BoardListPage />
      </MockAuthProvider>
    );

    expect(screen.getByText("ColabBoard")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Sign out/ })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Create new board/ })).toBeInTheDocument();
    expect(screen.getByText("New board")).toBeInTheDocument();
    expect(screen.getByText("Default board")).toBeInTheDocument();
    expect(screen.getByText("Second board")).toBeInTheDocument();
  });

  it("opens create board modal when New board is clicked", async () => {
    const user = userEvent.setup();
    render(
      <MockAuthProvider
        value={{
          user: mockUser,
          loading: false,
          signInWithGoogle: jest.fn(),
          signInWithEmail: jest.fn(),
          signUpWithEmail: jest.fn(),
          signOut: jest.fn(),
        }}
      >
        <BoardListPage />
      </MockAuthProvider>
    );

    await user.click(screen.getByRole("button", { name: /Create new board/ }));
    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(screen.getByLabelText(/Board name/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Create board/ })).toBeInTheDocument();
  });

  it("create board with required name navigates to /board/[id]", async () => {
    mockCreateBoardMeta.mockResolvedValue(undefined);
    const user = userEvent.setup();

    render(
      <MockAuthProvider
        value={{
          user: mockUser,
          loading: false,
          signInWithGoogle: jest.fn(),
          signInWithEmail: jest.fn(),
          signUpWithEmail: jest.fn(),
          signOut: jest.fn(),
        }}
      >
        <BoardListPage />
      </MockAuthProvider>
    );

    await user.click(screen.getByRole("button", { name: /Create new board/ }));
    const input = screen.getByRole("textbox", { name: /Board name/i });
    await user.type(input, "My new board");
    await user.click(screen.getByRole("button", { name: /^Create board$/ }));

    await waitFor(() => {
      expect(mockCreateBoardMeta).toHaveBeenCalled();
    });
    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith(expect.stringMatching(/^\/board\/.+/));
    });
  });

  it("shows loading when boards are loading", () => {
    mockUseBoards.mockReturnValue({ boards: [], loading: true, error: null });

    render(
      <MockAuthProvider
        value={{
          user: mockUser,
          loading: false,
          signInWithGoogle: jest.fn(),
          signInWithEmail: jest.fn(),
          signUpWithEmail: jest.fn(),
          signOut: jest.fn(),
        }}
      >
        <BoardListPage />
      </MockAuthProvider>
    );

    expect(screen.getByText(/Loading/)).toBeInTheDocument();
  });
});
