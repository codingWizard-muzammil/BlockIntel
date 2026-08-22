"use client";

import { create } from "zustand";

const STORAGE_KEY = "blockintel-auth";

type AuthStatus = "disconnected" | "connecting" | "connected";

type StoredSession = {
  address: string;
  chain: string;
  accessToken: string;
  refreshToken: string;
};

type AuthState = {
  status: AuthStatus;
  address: string | null;
  chain: string | null;
  accessToken: string | null;
  refreshToken: string | null;
  error: string | null;
  restore: () => void;
  setConnecting: () => void;
  setSession: (session: StoredSession) => void;
  setError: (message: string) => void;
  disconnect: () => void;
};

function readStoredSession(): StoredSession | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as StoredSession) : null;
  } catch {
    return null;
  }
}

function writeStoredSession(session: StoredSession | null) {
  try {
    if (session) localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
    else localStorage.removeItem(STORAGE_KEY);
  } catch {
    // storage unavailable (private mode, disabled cookies, etc.) - session just won't persist
  }
}

export const useAuthStore = create<AuthState>((set) => ({
  status: "disconnected",
  address: null,
  chain: null,
  accessToken: null,
  refreshToken: null,
  error: null,

  restore: () => {
    const session = readStoredSession();
    if (session) set({ status: "connected", ...session, error: null });
  },

  setConnecting: () => {
    set({ status: "connecting", error: null });
  },

  setSession: (session) => {
    writeStoredSession(session);
    set({ status: "connected", ...session, error: null });
  },

  setError: (message) => {
    writeStoredSession(null);
    set({
      status: "disconnected",
      address: null,
      chain: null,
      accessToken: null,
      refreshToken: null,
      error: message,
    });
  },

  disconnect: () => {
    writeStoredSession(null);
    set({
      status: "disconnected",
      address: null,
      chain: null,
      accessToken: null,
      refreshToken: null,
      error: null,
    });
  },
}));
