"use client";

import { useEffect, useState } from "react";
import {
  Check,
  Copy,
  FolderKanban,
  Settings as SettingsIcon,
  Sparkles,
  Wallet,
} from "lucide-react";
import { ComingSoon } from "@/components/ui/ComingSoon";
import { IconButton } from "@/components/ui/IconButton";
import { ChainIcon } from "@/components/editor/chain-icons";
import { WalletSettings } from "@/components/settings/WalletSettings";
import { PreferencesSettings } from "@/components/settings/PreferencesSettings";
import { useAuthStore } from "@/store/auth-store";
import { useProjectStore } from "@/store/project-store";
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
    if (!projects) fetchProjects();
  }, [fetchProjects]);

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
    <div className="flex flex-1 flex-col gap-6 overflow-y-auto p-6 scrollbar-editor">
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
          {activeSection === "wallet" && <WalletSettings />}
          {activeSection === "preferences" && <PreferencesSettings />}
        </div>
      </div>
    </div>
  );
}
