"use client";

import { create } from "zustand";
import { fetchNonce, verifySignature } from "@/lib/api";
import type { WalletProviderDetail } from "@/lib/wallet";

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
  connect: (wallet: WalletProviderDetail) => Promise<void>;
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

  connect: async (wallet) => {
    set({ status: "connecting", error: null });
    try {
      const { address } = await wallet.connect();
      const { nonce, message } = await fetchNonce(address, wallet.chain);
      const signature = await wallet.sign(address, message);
      const { accessToken, refreshToken, user } = await verifySignature(nonce, signature);

      const session: StoredSession = {
        address: user.walletAddress,
        chain: user.chain,
        accessToken,
        refreshToken,
      };
      writeStoredSession(session);
      set({ status: "connected", ...session, error: null });
    } catch (error) {
      set({
        status: "disconnected",
        address: null,
        chain: null,
        accessToken: null,
        refreshToken: null,
        error: error instanceof Error ? error.message : "Failed to connect wallet",
      });
    }
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
