"use client";

import { useEffect } from "react";
import { Loader2, X } from "lucide-react";
import { Button } from "@/components/ui/Button";

export function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel = "Confirm",
  isPending = false,
  errorMessage,
  onConfirm,
  onClose,
}: {
  open: boolean;
  title: string;
  description: string;
  confirmLabel?: string;
  isPending?: boolean;
  errorMessage?: string | null;
  onConfirm: () => void;
  onClose: () => void;
}) {
  useEffect(() => {
    if (!open) return;
    function handleKey(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [open, onClose]);

  if (!open) return null;

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
          <span className="text-sm font-semibold text-ink">{title}</span>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="text-muted transition-colors hover:text-ink"
          >
            <X className="size-4" />
          </button>
        </div>
        <div className="flex flex-col gap-3 p-4">
          <p className="text-sm text-muted">{description}</p>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="secondary" size="sm" onClick={onClose} disabled={isPending}>
              Cancel
            </Button>
            <Button type="button" variant="danger" size="sm" onClick={onConfirm} disabled={isPending}>
              {isPending && <Loader2 className="size-3.5 animate-spin" />}
              {confirmLabel}
            </Button>
          </div>
          {errorMessage && <p className="text-xs text-danger">{errorMessage}</p>}
        </div>
      </div>
    </div>
  );
}
