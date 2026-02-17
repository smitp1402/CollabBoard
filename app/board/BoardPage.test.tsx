import React from "react";
import { render, screen } from "@testing-library/react";
import { BoardPageContent } from "./BoardPageContent";
import { AuthProvider, type AuthContextValue } from "@/lib/auth/AuthContext";

const mockPush = jest.fn();
jest.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockPush }),
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
        <BoardPageContent />
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
        <BoardPageContent />
      </MockAuthProvider>
    );

    expect(screen.getByText("ColabBoard")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Sign out/ })).toBeInTheDocument();
    expect(mockPush).not.toHaveBeenCalled();
  });
});
