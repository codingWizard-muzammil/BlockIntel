"use client";

import { CHAINS, useEditorStore } from "@/store/editor-store";
import { useProjectStore } from "@/store/project-store";
import { ChainIcon } from "@/components/editor/chain-icons";
import { ProjectSwitcher } from "@/components/editor/ProjectSwitcher";

function ChainBadge({
  chain,
  selected,
}: {
  chain: string;
  selected?: boolean;
}) {
  return (
    <span
      className={`flex size-5 shrink-0 items-center justify-center rounded ${
        selected
          ? "border border-white/30 bg-white/15 text-white"
          : "border border-border bg-surface-muted text-muted"
      }`}
    >
      <ChainIcon chain={chain} className="size-3" />
    </span>
  );
}

function AutosaveIndicator() {
  const { autosaveStatus: status } = useProjectStore();

  if (status === "idle") return null;

  return (
    <span
      className={`ml-auto text-xs ${status === "error" ? "text-danger" : "text-muted"}`}
    >
      {status === "saving" && "Saving…"}
      {status === "saved" && "Saved"}
      {status === "error" && "Save failed"}
    </span>
  );
}

export function EditorToolbar() {
  const { chain, lockedChain } = useEditorStore();

  const activeChainName = lockedChain ?? chain;
  const activeChain =
    CHAINS.find((c) => c.name === activeChainName) ?? CHAINS[0];

  return (
    <div className="flex h-14 shrink-0 items-center gap-4 border-b border-border px-4">
      <ProjectSwitcher />

      <span
        title="This project's chain is fixed — create a new project to target a different chain"
        className="relative flex items-center gap-2 rounded-md border border-border bg-input py-1.75 pl-3 pr-2.5 text-xs text-ink"
      >
        <span className="absolute -top-1.75 left-2.5 z-10 bg-canvas px-1 text-[10px] leading-none text-muted">
          Chain
        </span>
        <ChainBadge chain={activeChain.name} />
        {activeChain.name}
      </span>

      <AutosaveIndicator />
    </div>
  );
}
