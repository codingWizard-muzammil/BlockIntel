"use client";

import { useEffect } from "react";
import { CircleAlert, Loader2, Sparkles } from "lucide-react";
import { Card, CardHeading } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { ChainIcon } from "@/components/editor/chain-icons";
import { PrivateKeyRow } from "@/components/wallet/PrivateKeyRow";
import { useAuthStore } from "@/store/auth-store";
import { useWalletStore } from "@/store/wallet-store";
import { truncateAddress } from "@/helpers/address";

export function WalletSettings() {
  const { status: authStatus, chain: authChain } = useAuthStore();
  const { chain, wallet, status, error, minting, mintError, fetchWallet, mintWallet } =
    useWalletStore();

  useEffect(() => {
    if (authStatus === "connected" && authChain) fetchWallet(authChain);
  }, [authStatus, authChain, fetchWallet]);

  return (
    <Card>
      <CardHeading icon={Sparkles}>Your test wallet</CardHeading>

      {authChain === "solana" ? (
        <p className="text-sm text-muted">
          Test wallets aren&apos;t available for Solana yet — only EVM chains
          have a local deploy node wired up.
        </p>
      ) : status === "loading" && !wallet ? (
        <div className="flex items-center gap-2 text-sm text-muted">
          <Loader2 className="size-4 animate-spin" />
          Funding your wallet on the local node…
        </div>
      ) : status === "error" && !wallet ? (
        <div className="flex items-start gap-2 text-sm text-danger">
          <CircleAlert className="mt-0.5 size-4 shrink-0" />
          <span>{error ?? "Couldn't load your test wallet."}</span>
        </div>
      ) : wallet ? (
        <div className="flex flex-col gap-4">
          <div className="flex items-center justify-between gap-2 text-sm">
            <span className="flex items-center gap-2 text-muted">
              <ChainIcon chain={chain ?? ""} className="size-3.5" />
              {chain}
            </span>
            <span className="font-mono text-xs text-ink">
              {truncateAddress(wallet.address)}
            </span>
          </div>

          <div className="flex items-center justify-between gap-2 rounded-lg border border-border bg-surface-muted px-3 py-2.5">
            <div>
              <div className="text-[10px] uppercase tracking-wide text-muted">
                Balance
              </div>
              <div className="font-mono text-lg text-ink">{wallet.balance} ETH</div>
            </div>
            <Button
              size="sm"
              variant="secondary"
              disabled={minting}
              onClick={() => chain && mintWallet(chain)}
            >
              {minting ? (
                <Loader2 className="size-3 animate-spin" />
              ) : (
                <Sparkles className="size-3" />
              )}
              Mint +100 ETH
            </Button>
          </div>
          {mintError && <p className="text-xs text-danger">{mintError}</p>}

          <div>
            <div className="mb-1 text-[10px] uppercase tracking-wide text-muted">
              Address
            </div>
            <p className="break-all font-mono text-xs text-ink">{wallet.address}</p>
          </div>

          <PrivateKeyRow privateKey={wallet.privateKey} />

          <p className="text-xs text-muted">
            This wallet is deployer and signer for every contract you deploy
            or call in the Playground — it&apos;s derived from your connected
            wallet and only ever holds fake ETH on a local test node. Import
            the private key above into MetaMask or Phantom to interact with
            it directly; never send real funds to it.
          </p>
        </div>
      ) : null}
    </Card>
  );
}
