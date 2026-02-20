"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import type { User } from "firebase/auth";
import { onAuthStateChanged } from "firebase/auth";
import { GoogleAuthProvider, signInWithPopup, signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut as firebaseSignOut } from "firebase/auth";
import { auth } from "@/lib/firebase/client";

export type AuthContextValue = {
  user: User | null;
  loading: boolean;
  signInWithGoogle: () => Promise<void>;
  signInWithEmail: (email: string, password: string) => Promise<void>;
  signUpWithEmail: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}

type AuthProviderProps = {
  children: React.ReactNode;
  value?: AuthContextValue;
};

export function AuthProvider({ children, value: overrideValue }: AuthProviderProps) {
  const [user, setUser] = useState<User | null>(overrideValue?.user ?? null);
  const [loading, setLoading] = useState(overrideValue?.loading ?? true);

  useEffect(() => {
    if (overrideValue !== undefined) {
      setUser(overrideValue.user);
      setLoading(overrideValue.loading);
      return;
    }
    if (!auth) {
      setLoading(false);
      return;
    }
    const unsubscribe = onAuthStateChanged(auth, (u) => {
      setUser(u);
      setLoading(false);
    });
    return () => unsubscribe();
  }, [overrideValue]);

  const signInWithGoogle = async () => {
    if (overrideValue?.signInWithGoogle) {
      await overrideValue.signInWithGoogle();
      return;
    }
    if (!auth) return;
    const provider = new GoogleAuthProvider();
    try {
      await signInWithPopup(auth, provider);
    } catch (error: unknown) {
      const code = (error as { code?: string })?.code;
      if (code === "auth/popup-blocked" || code === "auth/popup-closed-by-user") {
        return;
      }
      throw error;
    }
  };

  const signInWithEmail = async (email: string, password: string) => {
    if (overrideValue?.signInWithEmail) {
      await overrideValue.signInWithEmail(email, password);
      return;
    }
    if (!auth) return;
    await signInWithEmailAndPassword(auth, email, password);
  };

  const signUpWithEmail = async (email: string, password: string) => {
    if (overrideValue?.signUpWithEmail) {
      await overrideValue.signUpWithEmail(email, password);
      return;
    }
    if (!auth) return;
    await createUserWithEmailAndPassword(auth, email, password);
  };

  const signOut = async () => {
    if (overrideValue?.signOut) {
      await overrideValue.signOut();
      return;
    }
    if (auth) await firebaseSignOut(auth);
  };

  const contextValue: AuthContextValue =
    overrideValue !== undefined
      ? overrideValue
      : { user, loading, signInWithGoogle, signInWithEmail, signUpWithEmail, signOut };

  return (
    <AuthContext.Provider value={contextValue}>{children}</AuthContext.Provider>
  );
}
