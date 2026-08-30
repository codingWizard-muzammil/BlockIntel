"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Check, Loader2, X } from "lucide-react";
import { Button } from "@/components/ui/Button";
import Dropdown from "@/components/ui/Dropdown";
import { ChainIcon } from "@/components/editor/chain-icons";
import { CHAINS } from "@/store/editor-store";
import { useProjectStore } from "@/store/project-store";

const initialChain = CHAINS[0].name;

export function CreateProjectModal({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const router = useRouter();
  const setActiveProjectId = useProjectStore((s) => s.setActiveProjectId);
  const createProject = useProjectStore((s) => s.createProject);
  const createStatus = useProjectStore((s) => s.createStatus);
  const createError = useProjectStore((s) => s.createError);
  const [name, setName] = useState("");
  const [chain, setChain] = useState(initialChain);
  const [purpose, setPurpose] = useState("");
  const [description, setDescription] = useState("");

  function reset() {
    setName("");
    setChain(initialChain);
    setPurpose("");
    setDescription("");
  }

  function handleClose() {
    reset();
    onClose();
  }

  useEffect(() => {
    if (!open) return;
    function handleKey(event: KeyboardEvent) {
      if (event.key === "Escape") {
        reset();
        onClose();
      }
    }
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [open, onClose]);

  if (!open) return null;

  const trimmedName = name.trim();
  const trimmedPurpose = purpose.trim();
  const canSubmit = Boolean(trimmedName && chain && trimmedPurpose);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!canSubmit) return;
    const project = await createProject({
      name: trimmedName,
      chain,
      purpose: trimmedPurpose,
      description: description.trim() || undefined,
    });
    if (!project) return;
    setActiveProjectId(project.id);
    handleClose();
    router.push(`/contract/${project.id}/summary`);
  }

  const isPending = createStatus === "loading";

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
      onClick={handleClose}
    >
      <div
        className="w-96 overflow-hidden rounded-xl border border-border bg-surface shadow-2xl shadow-black/50"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-border px-4 py-3">
          <span className="text-sm font-semibold text-ink">New project</span>
          <button
            type="button"
            onClick={handleClose}
            aria-label="Close"
            className="text-muted transition-colors hover:text-ink"
          >
            <X className="size-4" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="flex flex-col gap-3 p-4">
          <input
            autoFocus
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="Project name"
            disabled={isPending}
            className="rounded-md border border-border bg-input px-3 py-2 text-sm text-ink outline-none placeholder:text-muted focus:border-accent disabled:opacity-60"
          />

          <Dropdown
            label="Chain"
            value={chain}
            options={CHAINS}
            getKey={(c) => c.name}
            onChange={(next) => setChain(next.name)}
            className="w-full"
            triggerClassName="w-full justify-between"
            menuClassName="w-full"
            trigger={
              <span className="flex flex-1 items-center gap-2">
                <ChainIcon chain={chain} className="size-3.5" />
                {chain}
              </span>
            }
            renderOption={(c, selected) => (
              <>
                <ChainIcon chain={c.name} className="size-3.5" />
                <span className="flex-1">{c.name}</span>
                {selected && <Check className="size-3 shrink-0" />}
              </>
            )}
          />

          <input
            value={purpose}
            onChange={(event) => setPurpose(event.target.value)}
            placeholder="Purpose (e.g. NFT marketplace, DeFi vault...)"
            disabled={isPending}
            className="rounded-md border border-border bg-input px-3 py-2 text-sm text-ink outline-none placeholder:text-muted focus:border-accent disabled:opacity-60"
          />

          <textarea
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            placeholder="Description (optional)"
            disabled={isPending}
            rows={3}
            className="resize-none rounded-md border border-border bg-input px-3 py-2 text-sm text-ink outline-none placeholder:text-muted focus:border-accent disabled:opacity-60"
          />

          <Button type="submit" variant="primary" disabled={!canSubmit || isPending}>
            {isPending && <Loader2 className="size-3.5 animate-spin" />}
            Create project
          </Button>
          {createStatus === "error" && (
            <p className="text-xs text-danger">{createError}</p>
          )}
        </form>
      </div>
    </div>
  );
}
