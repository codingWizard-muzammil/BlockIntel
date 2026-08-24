"use client";

import { useEffect, useState } from "react";
import { Loader2, Wallet, X } from "lucide-react";
import { useAuthStore, useConnectWallet } from "@/store/auth-store";
import {
  CHAIN_LABELS,
  discoverWalletProviders,
  type ChainFamily,
  type WalletProviderDetail,
} from "@/lib/wallet";

type WalletGroup = {
  key: string;
  name: string;
  icon?: string;
  options: WalletProviderDetail[];
};

// Wallets that support multiple chains (e.g. MetaMask and Phantom now both
// support Ethereum and Solana) connect on this chain by default instead of
// prompting the user to pick one.
const DEFAULT_CHAIN_BY_WALLET_NAME: Record<string, ChainFamily> = {
  MetaMask: "ethereum",
  Phantom: "solana",
};

function groupWalletsByName(wallets: WalletProviderDetail[]): WalletGroup[] {
  const groups = new Map<string, WalletGroup>();
  for (const wallet of wallets) {
    const existing = groups.get(wallet.name);
    if (existing) {
      existing.options.push(wallet);
    } else {
      groups.set(wallet.name, { key: wallet.name, name: wallet.name, icon: wallet.icon, options: [wallet] });
    }
  }
  return Array.from(groups.values());
}

export function ConnectWalletModal({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const status = useAuthStore((s) => s.status);
  const error = useAuthStore((s) => s.error);
  const connectWallet = useConnectWallet();

  const [wallets, setWallets] = useState<WalletProviderDetail[] | null>(null);
  const [connectingId, setConnectingId] = useState<string | null>(null);
  const discovering = open && wallets === null;

  useEffect(() => {
    if (!open || wallets !== null) return;
    let cancelled = false;
    discoverWalletProviders().then((found) => {
      if (!cancelled) setWallets(found);
    });
    return () => {
      cancelled = true;
    };
  }, [open, wallets]);

  useEffect(() => {
    if (status === "connected") onClose();
  }, [status, onClose]);

  useEffect(() => {
    if (!open) return;
    function handleKey(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [open, onClose]);

  if (!open) return null;

  const groups = wallets ? groupWalletsByName(wallets) : null;

  async function handleSelect(wallet: WalletProviderDetail) {
    setConnectingId(wallet.id);
    await connectWallet.mutateAsync(wallet).catch(() => {});
    setConnectingId(null);
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="w-80 overflow-hidden rounded-xl border border-border bg-surface shadow-2xl shadow-black/50"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-border px-4 py-3">
          <span className="text-sm font-semibold text-ink">Connect a wallet</span>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="text-muted transition-colors hover:text-ink"
          >
            <X className="size-4" />
          </button>
        </div>

        <div className="max-h-80 overflow-y-auto p-2">
          {discovering && (
            <div className="flex items-center justify-center gap-2 py-6 text-xs text-muted">
              <Loader2 className="size-3.5 animate-spin" />
              Looking for wallets...
            </div>
          )}

          {!discovering && wallets?.length === 0 && (
            <div className="px-3 py-6 text-center text-xs text-muted">
              No wallet extension found. Install MetaMask or another browser wallet, then refresh
              this page.
            </div>
          )}

          {!discovering &&
            groups?.map((group) => {
              const icon = group.icon ? (
                // eslint-disable-next-line @next/next/no-img-element -- arbitrary wallet-supplied data: URI, not a static asset
                <img src={group.icon} alt="" className="size-5" />
              ) : (
                <Wallet className="size-4 text-muted" />
              );

              const defaultChain = DEFAULT_CHAIN_BY_WALLET_NAME[group.name];
              const defaultWallet =
                group.options.length === 1
                  ? group.options[0]
                  : group.options.find((option) => option.chain === defaultChain);

              if (defaultWallet) {
                const wallet = defaultWallet;
                const isConnecting = connectingId === wallet.id;
                return (
                  <button
                    key={wallet.id}
                    type="button"
                    disabled={connectingId !== null}
                    onClick={() => handleSelect(wallet)}
                    className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left transition-colors hover:bg-surface-muted disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    <span className="flex size-8 shrink-0 items-center justify-center overflow-hidden rounded-md bg-input">
                      {icon}
                    </span>
                    <span className="flex flex-1 flex-col">
                      <span className="text-sm text-ink">{wallet.name}</span>
                      <span className="text-[10px] uppercase tracking-wide text-muted">
                        {CHAIN_LABELS[wallet.chain]}
                      </span>
                    </span>
                    {isConnecting && (
                      <Loader2 className="size-3.5 shrink-0 animate-spin text-muted" />
                    )}
                  </button>
                );
              }

              return (
                <div
                  key={group.key}
                  className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5"
                >
                  <span className="flex size-8 shrink-0 items-center justify-center overflow-hidden rounded-md bg-input">
                    {icon}
                  </span>
                  <span className="flex-1 text-sm text-ink">{group.name}</span>
                  <div className="flex shrink-0 gap-1.5">
                    {group.options.map((wallet) => {
                      const isConnecting = connectingId === wallet.id;
                      return (
                        <button
                          key={wallet.id}
                          type="button"
                          disabled={connectingId !== null}
                          onClick={() => handleSelect(wallet)}
                          className="flex items-center gap-1 rounded-md border border-border px-2 py-1 text-[10px] font-medium uppercase tracking-wide text-muted transition-colors hover:border-accent hover:text-accent disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          {isConnecting ? (
                            <Loader2 className="size-3 animate-spin" />
                          ) : (
                            CHAIN_LABELS[wallet.chain]
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            })}
        </div>

        {error && (
          <div className="border-t border-border px-4 py-3 text-xs text-danger">{error}</div>
        )}
      </div>
    </div>
  );
}
