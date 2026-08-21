import Link from "next/link";
import { Moon, ShieldCheck, Wallet } from "lucide-react";
import { GithubIcon } from "@/components/icons/GithubIcon";
import { IconButton } from "@/components/ui/IconButton";
import { Button } from "@/components/ui/Button";

export function Header() {
  return (
    <header className="flex h-16 shrink-0 items-center justify-between border-b border-border bg-canvas px-4">
      <div className="flex items-center gap-3">
        <div className="flex size-8 items-center justify-center rounded-lg bg-accent-soft-strong">
          <ShieldCheck className="size-3.5 text-accent" />
        </div>
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
        <Button variant="primary">
          <Wallet className="size-3.5" />
          Connect Wallet
        </Button>
      </div>
    </header>
  );
}
