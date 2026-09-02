"use client";

import { useEffect, useState } from "react";
import {
  Check,
  CircleAlert,
  Copy,
  FolderKanban,
  Loader2,
  Settings as SettingsIcon,
  Sparkles,
  Wallet,
} from "lucide-react";
import { ComingSoon } from "@/components/ui/ComingSoon";
import { Card, CardHeading } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { IconButton } from "@/components/ui/IconButton";
import { ChainIcon } from "@/components/editor/chain-icons";
import { PrivateKeyRow } from "@/components/wallet/PrivateKeyRow";
import { useAuthStore } from "@/store/auth-store";
import { useProjectStore } from "@/store/project-store";
import { useWalletStore } from "@/store/wallet-store";
import { addressToHue, truncateAddress } from "@/helpers/address";
import { redirect } from "next/navigation";

const SECTIONS = [
  { id: "wallet", label: "Test wallet", icon: Sparkles },
  { id: "preferences", label: "Preferences", icon: SettingsIcon },
] as const;

type SectionId = (typeof SECTIONS)[number]["id"];

export default function SettingsPage() {
  const {
    status: authStatus,
    address: authAddress,
    chain: authChain,
  } = useAuthStore();
  const { projects, fetchProjects } = useProjectStore();
  const {
    chain,
    wallet,
    status,
    error,
    minting,
    mintError,
    fetchWallet,
    mintWallet,
  } = useWalletStore();
  const [addressCopied, setAddressCopied] = useState(false);
  const [activeSection, setActiveSection] = useState<SectionId>("wallet");

  async function handleCopyAddress() {
    if (!authAddress) return;
    try {
      await navigator.clipboard.writeText(authAddress);
      setAddressCopied(true);
      setTimeout(() => setAddressCopied(false), 1500);
    } catch {
      // Clipboard API unavailable (insecure context, permissions) — nothing
      // to fall back to, so just leave the button unresponsive.
    }
  }

  useEffect(() => {
    if (authStatus === "connected" && authChain) fetchWallet(authChain);
    if (!projects) fetchProjects();
  }, [authStatus, authChain, fetchWallet, fetchProjects]);

  if (authStatus !== "connected") {
    return (
      <ComingSoon
        icon={Wallet}
        title="Connect a wallet"
        description="Connect your wallet to see your test wallet and account settings."
      />
    );
  }

  const hue = authAddress ? addressToHue(authAddress) : 210;

  return (
    <div className="flex flex-1 flex-col gap-6 overflow-y-auto p-6">
      <h1 className="text-lg font-semibold text-ink">Settings</h1>

      <div className="flex flex-col gap-4 rounded-xl border border-border bg-surface p-6">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-4">
            <div
              className="flex size-14 shrink-0 items-center justify-center rounded-full text-white"
              style={{
                background: `linear-gradient(135deg, hsl(${hue} 70% 45%), hsl(${(hue + 45) % 360} 70% 35%))`,
              }}
            >
              <Wallet className="size-6" />
            </div>
            <div className="flex flex-col gap-1.5">
              <div className="flex items-center gap-1.5">
                <span className="font-mono text-sm font-semibold text-ink">
                  {truncateAddress(authAddress ?? "")}
                </span>
                <IconButton
                  icon={addressCopied ? Check : Copy}
                  size={26}
                  active={addressCopied}
                  aria-label="Copy address"
                  onClick={handleCopyAddress}
                />
              </div>
              <span className="flex items-center gap-1.5 text-xs text-muted">
                <ChainIcon chain={authChain ?? ""} className="size-3.5" />
                Signed in on {authChain}
              </span>
            </div>
          </div>

          <div
            className="flex items-center gap-2 self-start rounded-lg border border-border bg-surface-muted px-4 py-2.5 text-sm text-muted sm:self-auto cursor-pointer"
            onClick={() => redirect("/projects")}
          >
            <FolderKanban className="size-4" />
            <span className="font-semibold text-ink">{projects.length}</span>
            project{projects.length === 1 ? "" : "s"}
          </div>
        </div>

        <p className="border-t border-border pt-4 text-xs text-muted">
          This is the wallet you signed in with — it owns your projects and
          contracts.
        </p>
      </div>

      <div className="flex flex-1 flex-col gap-6 sm:flex-row">
        <nav className="flex shrink-0 gap-1 overflow-x-auto sm:w-48 sm:flex-col sm:overflow-visible">
          {SECTIONS.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setActiveSection(id)}
              className={`relative flex shrink-0 items-center gap-2.5 rounded-lg px-3 py-2 text-left text-sm transition-colors ${
                activeSection === id
                  ? "bg-accent-soft text-accent"
                  : "text-muted hover:bg-surface-muted hover:text-ink"
              }`}
            >
              <span
                className={`absolute inset-y-1 left-0 w-0.5 rounded-r-full bg-accent transition-opacity ${
                  activeSection === id ? "opacity-100" : "opacity-0"
                }`}
              />
              <Icon className="size-4" />
              {label}
            </button>
          ))}
        </nav>

        <div className="max-w-xl flex-1">
          {activeSection === "wallet" && (
            <Card>
              <CardHeading icon={Sparkles}>Your test wallet</CardHeading>

              {authChain === "solana" ? (
                <p className="text-sm text-muted">
                  Test wallets aren&apos;t available for Solana yet — only EVM
                  chains have a local deploy node wired up.
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
                      <div className="font-mono text-lg text-ink">
                        {wallet.balance} ETH
                      </div>
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
                  {mintError && (
                    <p className="text-xs text-danger">{mintError}</p>
                  )}

                  <div>
                    <div className="mb-1 text-[10px] uppercase tracking-wide text-muted">
                      Address
                    </div>
                    <p className="break-all font-mono text-xs text-ink">
                      {wallet.address}
                    </p>
                  </div>

                  <PrivateKeyRow privateKey={wallet.privateKey} />

                  <p className="text-xs text-muted">
                    This wallet is deployer and signer for every contract you
                    deploy or call in the Playground — it&apos;s derived from
                    your connected wallet and only ever holds fake ETH on a
                    local test node. Import the private key above into MetaMask
                    or Phantom to interact with it directly; never send real
                    funds to it.
                  </p>
                </div>
              ) : null}
            </Card>
          )}

          {activeSection === "preferences" && (
            <Card>
              <CardHeading icon={SettingsIcon}>Preferences</CardHeading>
              <p className="text-sm text-muted">
                Preferences for chains, compilers, and AI model choice will live
                here.
              </p>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
