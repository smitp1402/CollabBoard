import React from "react";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { BoardPageContent } from "./BoardPageContent";
import { AuthProvider, type AuthContextValue } from "@/context/AuthContext";

const mockPush = jest.fn();
const mockUseBoardObjects = jest.fn();
jest.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockPush }),
}));

jest.mock("@/hooks/useBoardObjects", () => ({
  useBoardObjects: (boardId: string) => {
    mockUseBoardObjects(boardId);
    return { objects: [], setObjects: jest.fn(), loading: false, error: null, lastObjectSyncLatencyMs: null };
  },
}));

jest.mock("firebase/auth", () => ({
  onAuthStateChanged: jest.fn(() => jest.fn()),
  GoogleAuthProvider: class {},
  signInWithPopup: jest.fn(),
  signInWithEmailAndPassword: jest.fn(),
  createUserWithEmailAndPassword: jest.fn(),
  signOut: jest.fn(),
}));

jest.mock("@/lib/firebase/client", () => ({
  auth: null,
  getDb: () => null,
  getRealtimeDb: () => null,
  app: null,
}));

jest.mock("react-konva", () => {
  const React = require("react");
  return {
    Stage: ({ children }: { children?: React.ReactNode }) =>
      React.createElement("div", { "data-testid": "konva-stage" }, children),
    Layer: ({ children }: { children?: React.ReactNode }) =>
      React.createElement("div", null, children),
    Group: ({ children }: { children?: React.ReactNode }) =>
      React.createElement("div", null, children),
    Rect: () => React.createElement("div", null),
    Line: () => React.createElement("div", null),
    Text: () => React.createElement("div", null),
  };
});

function MockAuthProvider({
  value,
  children,
}: {
  value: AuthContextValue;
  children: React.ReactNode;
}) {
  return (
    <AuthProvider value={value}>{children}</AuthProvider>
  );
}

describe("BoardPage", () => {
  beforeEach(() => {
    mockPush.mockClear();
    mockUseBoardObjects.mockClear();
  });

  it("redirects unauthenticated user to /", () => {
    render(
      <MockAuthProvider
        value={{
          user: null,
          loading: false,
          signInWithGoogle: jest.fn(),
          signInWithEmail: jest.fn(),
          signUpWithEmail: jest.fn(),
          signOut: jest.fn(),
        }}
      >
        <BoardPageContent boardId="default" />
      </MockAuthProvider>
    );

    expect(mockPush).toHaveBeenCalledWith("/");
  });

  it("shows board content when authenticated", () => {
    const mockUser = { uid: "user-1", email: "test@example.com" } as any;
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
        <BoardPageContent boardId="default" />
      </MockAuthProvider>
    );

    expect(screen.getByText("ColabBoard")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Sign out/ })).toBeInTheDocument();
    expect(screen.getByRole("complementary", { name: /AI Assistant panel/i })).toBeInTheDocument();
    expect(mockPush).not.toHaveBeenCalled();
  });

  it("renders canvas with pan/zoom when authenticated", () => {
    const mockUser = { uid: "user-1", email: "test@example.com" } as any;
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
        <BoardPageContent boardId="default" />
      </MockAuthProvider>
    );

    expect(screen.getByTestId("board-canvas")).toBeInTheDocument();
  });

  it("uses boardId prop for useBoardObjects when authenticated", () => {
    const mockUser = { uid: "user-1", email: "test@example.com" } as any;
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
        <BoardPageContent boardId="default" />
      </MockAuthProvider>
    );

    expect(mockUseBoardObjects).toHaveBeenCalledWith("default");
  });

  it("uses dynamic boardId for useBoardObjects", () => {
    const mockUser = { uid: "user-1", email: "test@example.com" } as any;
    mockUseBoardObjects.mockClear();
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
        <BoardPageContent boardId="my-board-123" />
      </MockAuthProvider>
    );

    expect(mockUseBoardObjects).toHaveBeenCalledWith("my-board-123");
  });

  it("shows Performance button and toggles panel on click", async () => {
    const mockUser = { uid: "user-1", email: "test@example.com" } as any;
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
        <BoardPageContent boardId="default" />
      </MockAuthProvider>
    );

    const perfButton = screen.getByRole("button", { name: /toggle performance panel/i });
    expect(perfButton).toBeInTheDocument();

    expect(screen.queryByRole("dialog", { name: /performance metrics/i })).not.toBeInTheDocument();

    await user.click(perfButton);
    const dialog = screen.getByRole("dialog", { name: /performance metrics/i });
    expect(dialog).toBeInTheDocument();
    expect(dialog).toHaveTextContent("Performance");

    await user.click(perfButton);
    expect(screen.queryByRole("dialog", { name: /performance metrics/i })).not.toBeInTheDocument();
  });
});
