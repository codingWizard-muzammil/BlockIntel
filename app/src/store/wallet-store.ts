"use client";

import { create } from "zustand";
import { queryClient } from "@/lib/query-client";
import { useAuthStore } from "@/store/auth-store";
import { fetchWalletRequest, mintWalletRequest } from "@/api/wallet";
import type { PlaygroundWallet } from "@/api/contracts";

type RequestStatus = "idle" | "loading" | "success" | "error";

// Solana has no EVM-style RPC/deploy path, so there's no test wallet to fund
// for a Solana-authenticated session.
const UNSUPPORTED_CHAINS = new Set(["solana"]);

type WalletState = {
  chain: string | null;
  wallet: PlaygroundWallet | null;
  status: RequestStatus;
  error: string | null;
  minting: boolean;
  mintError: string | null;

  fetchWallet: (chain: string) => Promise<void>;
  mintWallet: (chain: string) => Promise<void>;
};

export const useWalletStore = create<WalletState>((set) => ({
  chain: null,
  wallet: null,
  status: "idle",
  error: null,
  minting: false,
  mintError: null,

  fetchWallet: async (chain) => {
    if (UNSUPPORTED_CHAINS.has(chain)) return;
    set({ chain, status: "loading", error: null });
    try {
      const wallet = await queryClient.fetchQuery({
        queryKey: ["wallet", chain],
        queryFn: () => fetchWalletRequest(chain),
      });
      set({ wallet, status: "success" });
    } catch (error) {
      set({ status: "error", error: (error as Error).message });
    }
  },

  mintWallet: async (chain) => {
    set({ minting: true, mintError: null });
    try {
      const result = await mintWalletRequest(chain);
      set((state) => ({
        minting: false,
        wallet: state.wallet ? { ...state.wallet, balance: result.balance } : state.wallet,
      }));
    } catch (error) {
      set({ minting: false, mintError: (error as Error).message });
    }
  },
}));

// Fund/refresh the connected wallet's test balance as soon as a session is
// confirmed, and drop it when the session ends — same pattern project-store
// uses to load the project list on login.
useAuthStore.subscribe((state, prevState) => {
  if (state.status === prevState.status) return;

  if (state.status === "connected" && state.chain) {
    useWalletStore.getState().fetchWallet(state.chain);
  } else if (prevState.status === "connected") {
    useWalletStore.setState({ wallet: null, chain: null, status: "idle" });
  }
});
