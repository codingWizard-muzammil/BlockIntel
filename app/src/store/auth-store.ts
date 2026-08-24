"use client";

import { create } from "zustand";
import { useMutation } from "@tanstack/react-query";
import { fetchMe, fetchNonce, verifySignature } from "@/api/auth";
import type { WalletProviderDetail } from "@/lib/wallet";

const STORAGE_KEY = "blockintel-auth";

type AuthStatus = "restoring" | "disconnected" | "connecting" | "connected";

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
  hydrate: () => Promise<void>;
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

export const useAuthStore = create<AuthState>((set, get) => ({
  status: "restoring",
  address: null,
  chain: null,
  accessToken: null,
  refreshToken: null,
  error: null,

  hydrate: async () => {
    if (get().status !== "restoring") return;

    const session = readStoredSession();
    if (!session) {
      set({ status: "disconnected" });
      return;
    }

    // Set the token first so the request interceptor picks it up, then
    // confirm the session against the backend before trusting it.
    set({ ...session, error: null });

    try {
      const { user } = await fetchMe();
      const confirmed: StoredSession = {
        address: user.walletAddress,
        chain: user.chain,
        accessToken: session.accessToken,
        refreshToken: session.refreshToken,
      };
      writeStoredSession(confirmed);
      set({ status: "connected", ...confirmed, error: null });
    } catch {
      writeStoredSession(null);
      set({
        status: "disconnected",
        address: null,
        chain: null,
        accessToken: null,
        refreshToken: null,
        error: null,
      });
    }
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

export function useConnectWallet() {
  const setConnecting = useAuthStore((s) => s.setConnecting);
  const setSession = useAuthStore((s) => s.setSession);
  const setError = useAuthStore((s) => s.setError);

  return useMutation({
    mutationFn: async (wallet: WalletProviderDetail) => {
      const { address } = await wallet.connect();
      const { nonce, message } = await fetchNonce(address, wallet.chain);
      const signature = await wallet.sign(address, message);
      const { accessToken, refreshToken, user } = await verifySignature(
        nonce,
        signature,
      );

      return {
        address: user.walletAddress,
        chain: user.chain,
        accessToken,
        refreshToken,
      };
    },
    onMutate: () => {
      setConnecting();
    },
    onSuccess: (session) => {
      setSession(session);
    },
    onError: (error: Error) => {
      setError(error.message || "Failed to connect wallet");
    },
  });
}
