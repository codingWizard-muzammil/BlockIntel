"use client";

import Image from "next/image";
import Link from "next/link";
import { Moon, Sun } from "lucide-react";
import { GithubIcon } from "@/components/icons/GithubIcon";
import { IconButton } from "@/components/ui/IconButton";
import { usePreferencesStore } from "@/store/preferences-store";
import { WalletControl } from "../wallet/WalletControl";

export function Header() {
  const { resolvedTheme, setTheme } = usePreferencesStore();

  return (
    <header className="flex h-16 shrink-0 items-center justify-between border-b border-border bg-canvas px-4">
      <div className="flex items-center gap-3">
        <Image
          src="/logo.svg"
          alt="BlockIntel"
          width={20}
          height={27}
          className="h-8 w-auto"
        />
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
        <IconButton
          icon={resolvedTheme === "dark" ? Sun : Moon}
          aria-label={
            resolvedTheme === "dark" ? "Switch to light theme" : "Switch to dark theme"
          }
          onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")}
        />
        <WalletControl />
      </div>
    </header>
  );
}
