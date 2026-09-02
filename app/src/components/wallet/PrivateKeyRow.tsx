"use client";

import { useState } from "react";
import { Check, Copy, Eye, EyeOff } from "lucide-react";
import { Button } from "@/components/ui/Button";

export function PrivateKeyRow({ privateKey }: { privateKey: string }) {
  const [revealed, setRevealed] = useState(false);
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(privateKey);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // Clipboard API unavailable (insecure context, permissions) — nothing
      // to fall back to, so just leave the button unresponsive.
    }
  }

  return (
    <div className="flex items-center justify-between gap-2 border-t border-border pt-3">
      <span className="font-mono text-xs text-ink overflow-x-auto scrollbar-editor">
        {revealed ? privateKey : "•".repeat(privateKey.length)}
      </span>
      <div className="flex shrink-0 items-center gap-1">
        <Button
          size="sm"
          variant="secondary"
          onClick={() => setRevealed((r) => !r)}
        >
          {revealed ? (
            <EyeOff className="size-3" />
          ) : (
            <Eye className="size-3" />
          )}
          {revealed ? "Hide" : "Show"} key
        </Button>
        <Button size="sm" variant="secondary" onClick={handleCopy}>
          {copied ? <Check className="size-3" /> : <Copy className="size-3" />}
          {copied ? "Copied" : "Copy"}
        </Button>
      </div>
    </div>
  );
}
