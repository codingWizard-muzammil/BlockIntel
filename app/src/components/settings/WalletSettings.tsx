"use client";

import { useEffect, useState } from "react";
import { CircleAlert, Loader2, Sparkles } from "lucide-react";
import { Card, CardHeading } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { ChainIcon } from "@/components/editor/chain-icons";
import { PrivateKeyRow } from "@/components/wallet/PrivateKeyRow";
import { useAuthStore } from "@/store/auth-store";
import { useWalletStore, PLAYGROUND_CHAINS, CHAIN_SYMBOLS } from "@/store/wallet-store";
import { truncateAddress } from "@/helpers/address";

export function WalletSettings() {
  const { status: authStatus } = useAuthStore();
  const { wallets, fetchAllWallets, mintWallet } = useWalletStore();
  const [activeChain, setActiveChain] = useState(PLAYGROUND_CHAINS[0]);

  useEffect(() => {
    if (authStatus === "connected") fetchAllWallets();
  }, [authStatus, fetchAllWallets]);

  const active = wallets[activeChain];

  return (
    <Card>
      <CardHeading icon={Sparkles}>Your test wallets</CardHeading>

      <div className="mb-4 flex flex-wrap items-center gap-1 rounded-lg border border-border bg-input p-1">
        {PLAYGROUND_CHAINS.map((chainName) => (
          <button
            key={chainName}
            type="button"
            onClick={() => setActiveChain(chainName)}
            className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium capitalize transition-colors ${
              chainName === activeChain
                ? "bg-accent text-white"
                : "text-muted hover:bg-surface-muted hover:text-ink"
            }`}
          >
            <ChainIcon chain={chainName} className="size-3.5" />
            {chainName}
          </button>
        ))}
      </div>

      {!active || active.status === "loading" ? (
        <div className="flex items-center gap-2 text-sm text-muted">
          <Loader2 className="size-4 animate-spin" />
          Funding your wallet on the local node…
        </div>
      ) : active.status === "error" && !active.wallet ? (
        <div className="flex items-start gap-2 text-sm text-danger">
          <CircleAlert className="mt-0.5 size-4 shrink-0" />
          <span>{active.error ?? "Couldn't load your test wallet."}</span>
        </div>
      ) : active.wallet ? (
        <div className="flex flex-col gap-4">
          <div className="flex items-center justify-between gap-2 text-sm">
            <span className="flex items-center gap-2 capitalize text-muted">
              <ChainIcon chain={activeChain} className="size-3.5" />
              {activeChain}
            </span>
            <span className="font-mono text-xs text-ink">
              {truncateAddress(active.wallet.address)}
            </span>
          </div>

          <div className="flex items-center justify-between gap-2 rounded-lg border border-border bg-surface-muted px-3 py-2.5">
            <div>
              <div className="text-[10px] uppercase tracking-wide text-muted">
                Balance
              </div>
              <div className="font-mono text-lg text-ink">
                {active.wallet.balance} {CHAIN_SYMBOLS[activeChain]}
              </div>
            </div>
            <Button
              size="sm"
              variant="secondary"
              disabled={active.minting}
              onClick={() => mintWallet(activeChain)}
            >
              {active.minting ? (
                <Loader2 className="size-3 animate-spin" />
              ) : (
                <Sparkles className="size-3" />
              )}
              Mint +100 {CHAIN_SYMBOLS[activeChain]}
            </Button>
          </div>
          {active.mintError && <p className="text-xs text-danger">{active.mintError}</p>}

          <div>
            <div className="mb-1 text-[10px] uppercase tracking-wide text-muted">
              Address
            </div>
            <p className="break-all font-mono text-xs text-ink">{active.wallet.address}</p>
          </div>

          <PrivateKeyRow privateKey={active.wallet.privateKey} />

          <p className="text-xs text-muted">
            {`This wallet is deployer and signer for every contract you deploy or call on ${activeChain} in the Playground — it's derived from your connected wallet and only ever holds fake ${CHAIN_SYMBOLS[activeChain]} on a local test node. Import the private key above into MetaMask to interact with it directly; never send real funds to it.`}
          </p>
        </div>
      ) : null}
    </Card>
  );
}
