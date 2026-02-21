import React from "react";
import { act, render } from "@testing-library/react";
import { AuthProvider, useAuth, type AuthContextValue } from "@/context/AuthContext";
import { GoogleAuthProvider, signInWithPopup } from "firebase/auth";

jest.mock("firebase/auth", () => ({
  onAuthStateChanged: jest.fn((_auth: unknown, callback: (user: null) => void) => {
    callback(null);
    return jest.fn();
  }),
  GoogleAuthProvider: jest.fn(function MockGoogleAuthProvider(this: { provider: string }) {
    this.provider = "google";
  }),
  signInWithPopup: jest.fn(),
  signInWithEmailAndPassword: jest.fn(),
  createUserWithEmailAndPassword: jest.fn(),
  signOut: jest.fn(),
}));

jest.mock("@/lib/firebase/client", () => ({
  auth: { uid: "mock-auth" },
}));

let authContextValue: AuthContextValue | null = null;

function CaptureAuthValue() {
  authContextValue = useAuth();
  return null;
}

describe("AuthContext signInWithGoogle", () => {
  beforeEach(() => {
    authContextValue = null;
    jest.clearAllMocks();
  });

  it("calls signInWithPopup with Google provider", async () => {
    (signInWithPopup as jest.Mock).mockResolvedValueOnce({ user: { uid: "u1" } });

    render(
      <AuthProvider>
        <CaptureAuthValue />
      </AuthProvider>
    );

    await act(async () => {
      await authContextValue?.signInWithGoogle();
    });

    expect(signInWithPopup).toHaveBeenCalledTimes(1);
    expect(signInWithPopup).toHaveBeenCalledWith(
      expect.objectContaining({ uid: "mock-auth" }),
      expect.any((GoogleAuthProvider as unknown as jest.Mock))
    );
  });

  it("does not throw when popup is blocked", async () => {
    (signInWithPopup as jest.Mock).mockRejectedValueOnce({ code: "auth/popup-blocked" });

    render(
      <AuthProvider>
        <CaptureAuthValue />
      </AuthProvider>
    );

    await expect(authContextValue?.signInWithGoogle()).resolves.toBeUndefined();
  });

  it("does not throw when popup is closed by user", async () => {
    (signInWithPopup as jest.Mock).mockRejectedValueOnce({ code: "auth/popup-closed-by-user" });

    render(
      <AuthProvider>
        <CaptureAuthValue />
      </AuthProvider>
    );

    await expect(authContextValue?.signInWithGoogle()).resolves.toBeUndefined();
  });

  it("rethrows unknown popup errors", async () => {
    const error = { code: "auth/network-request-failed" };
    (signInWithPopup as jest.Mock).mockRejectedValueOnce(error);

    render(
      <AuthProvider>
        <CaptureAuthValue />
      </AuthProvider>
    );

    await expect(authContextValue?.signInWithGoogle()).rejects.toEqual(error);
  });
});
