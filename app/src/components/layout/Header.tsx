"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { Loader2, LogOut, Moon, Wallet } from "lucide-react";
import { GithubIcon } from "@/components/icons/GithubIcon";
import { IconButton } from "@/components/ui/IconButton";
import { Button } from "@/components/ui/Button";
import { ConnectWalletModal } from "@/components/wallet/ConnectWalletModal";
import { useAuthStore } from "@/store/auth-store";

function useClickOutside(ref: React.RefObject<HTMLElement | null>, onOutside: () => void) {
  useEffect(() => {
    function handlePointerDown(event: PointerEvent) {
      if (ref.current && !ref.current.contains(event.target as Node)) {
        onOutside();
      }
    }
    document.addEventListener("pointerdown", handlePointerDown);
    return () => document.removeEventListener("pointerdown", handlePointerDown);
  }, [ref, onOutside]);
}

function truncateAddress(address: string) {
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

function WalletControl() {
  const status = useAuthStore((s) => s.status);
  const address = useAuthStore((s) => s.address);
  const restore = useAuthStore((s) => s.restore);
  const disconnect = useAuthStore((s) => s.disconnect);

  const [menuOpen, setMenuOpen] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  useClickOutside(containerRef, () => setMenuOpen(false));

  useEffect(() => {
    restore();
  }, [restore]);

  if (status === "connected" && address) {
    return (
      <div className="relative" ref={containerRef}>
        <Button variant="secondary" onClick={() => setMenuOpen((o) => !o)}>
          <Wallet className="size-3.5" />
          {truncateAddress(address)}
        </Button>
        {menuOpen && (
          <div className="absolute right-0 top-[calc(100%+6px)] z-20 min-w-40 overflow-hidden rounded-lg border border-border bg-surface p-1 shadow-xl shadow-black/40">
            <button
              type="button"
              onClick={() => {
                disconnect();
                setMenuOpen(false);
              }}
              className="flex w-full items-center gap-2 rounded-md px-2.5 py-1.5 text-left text-xs text-ink transition-colors hover:bg-surface-muted"
            >
              <LogOut className="size-3" />
              Disconnect
            </button>
          </div>
        )}
      </div>
    );
  }

  return (
    <>
      <Button
        variant="primary"
        onClick={() => setModalOpen(true)}
        disabled={status === "connecting"}
        className="disabled:cursor-not-allowed disabled:opacity-60"
      >
        {status === "connecting" ? (
          <Loader2 className="size-3.5 animate-spin" />
        ) : (
          <Wallet className="size-3.5" />
        )}
        {status === "connecting" ? "Connecting..." : "Connect Wallet"}
      </Button>
      <ConnectWalletModal open={modalOpen} onClose={() => setModalOpen(false)} />
    </>
  );
}

export function Header() {
  return (
    <header className="flex h-16 shrink-0 items-center justify-between border-b border-border bg-canvas px-4">
      <div className="flex items-center gap-3">
        <Image src="/logo.svg" alt="BlockIntel" width={20} height={27} className="h-8 w-auto" />
        <span className="text-lg font-semibold text-ink">BlockIntel</span>
        <span className="rounded bg-input px-1.5 py-0.5 text-[10px] font-semibold uppercase text-muted">
          BETA
        </span>
      </div>
      <div className="flex items-center gap-4">
        <Link
          href="#"
          className="text-sm text-muted transition-colors hover:text-ink"
        >
          Docs
        </Link>
        <IconButton icon={GithubIcon} aria-label="GitHub" />
        <IconButton icon={Moon} aria-label="Toggle theme" />
        <WalletControl />
      </div>
    </header>
  );
}
