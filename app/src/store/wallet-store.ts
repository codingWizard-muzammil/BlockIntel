"use client";

import { create } from "zustand";
import { queryClient } from "@/lib/query-client";
import { useAuthStore } from "@/store/auth-store";
import { fetchWalletRequest, mintWalletRequest } from "@/api/wallet";
import { CHAINS } from "@/store/editor-store";
import type { PlaygroundWallet } from "@/api/contracts";

type RequestStatus = "idle" | "loading" | "success" | "error";

// Every chain BlockIntel runs a local node for (every EVM chain plus
// Solana) — a user gets a deterministic playground wallet on each of these,
// not just whichever chain they happened to log in with.
export const PLAYGROUND_CHAINS = CHAINS.map((c) => c.name);

// Local node balances are still denominated in each chain's own native gas
// token, not always ETH — Polygon's is POL, BNB Chain's is BNB, etc.
export const CHAIN_SYMBOLS: Record<string, string> = Object.fromEntries(
  CHAINS.map((c) => [c.name, c.symbol]),
);

type ChainWallet = {
  wallet: PlaygroundWallet | null;
  status: RequestStatus;
  error: string | null;
  minting: boolean;
  mintError: string | null;
};

const emptyChainWallet: ChainWallet = {
  wallet: null,
  status: "idle",
  error: null,
  minting: false,
  mintError: null,
};

type WalletState = {
  wallets: Record<string, ChainWallet>;

  fetchWallet: (chain: string) => Promise<void>;
  fetchAllWallets: () => Promise<void>;
  mintWallet: (chain: string) => Promise<void>;
};

function patchChain(
  wallets: Record<string, ChainWallet>,
  chain: string,
  patch: Partial<ChainWallet>,
): Record<string, ChainWallet> {
  return { ...wallets, [chain]: { ...(wallets[chain] ?? emptyChainWallet), ...patch } };
}

export const useWalletStore = create<WalletState>((set, get) => ({
  wallets: {},

  fetchWallet: async (chain) => {
    set((state) => ({ wallets: patchChain(state.wallets, chain, { status: "loading", error: null }) }));
    try {
      const wallet = await queryClient.fetchQuery({
        queryKey: ["wallet", chain],
        queryFn: () => fetchWalletRequest(chain),
      });
      set((state) => ({ wallets: patchChain(state.wallets, chain, { wallet, status: "success" }) }));
    } catch (error) {
      set((state) => ({
        wallets: patchChain(state.wallets, chain, { status: "error", error: (error as Error).message }),
      }));
    }
  },

  fetchAllWallets: async () => {
    await Promise.all(PLAYGROUND_CHAINS.map((chain) => get().fetchWallet(chain)));
  },

  mintWallet: async (chain) => {
    set((state) => ({ wallets: patchChain(state.wallets, chain, { minting: true, mintError: null }) }));
    try {
      const result = await mintWalletRequest(chain);
      set((state) => {
        const current = state.wallets[chain]?.wallet;
        return {
          wallets: patchChain(state.wallets, chain, {
            minting: false,
            wallet: current ? { ...current, balance: result.balance } : current ?? null,
          }),
        };
      });
    } catch (error) {
      set((state) => ({
        wallets: patchChain(state.wallets, chain, { minting: false, mintError: (error as Error).message }),
      }));
    }
  },
}));

// Fund/refresh every chain's test wallet as soon as a session is confirmed,
// and drop them when the session ends — same pattern project-store uses to
// load the project list on login. Every chain gets its own wallet regardless
// of which chain family the user logged in with (ethereum vs solana), since
// the playground wallet is a synthetic per-(address, chain) derivation, not
// the login wallet itself.
useAuthStore.subscribe((state, prevState) => {
  if (state.status === prevState.status) return;

  if (state.status === "connected") {
    useWalletStore.getState().fetchAllWallets();
  } else if (prevState.status === "connected") {
    useWalletStore.setState({ wallets: {} });
  }
});
