"use client";

import { useRef, useState } from "react";
import {
  Check,
  ChevronDown,
  Link2,
  Link2Off,
  SlidersHorizontal,
  Settings2,
} from "lucide-react";
import { CHAIN_LANGUAGES, CHAINS, useEditorStore } from "@/store/editor-store";
import { ChainIcon } from "@/components/editor/chain-icons";
import { ProjectSwitcher } from "@/components/editor/ProjectSwitcher";
import { useClickOutside } from "@/hooks/useClickOutside";
import Dropdown from "../ui/Dropdown";

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

export function EditorToolbar() {
  const { language, chain, autoSync, setLanguage, setChain, toggleAutoSync } =
    useEditorStore();

  const activeChain = CHAINS.find((c) => c.name === chain) ?? CHAINS[0];

  return (
    <div className="flex h-14 shrink-0 items-center gap-4 border-b border-border px-4">
      <ProjectSwitcher />

      <Dropdown
        label="Language"
        value={language}
        options={CHAIN_LANGUAGES[chain]}
        getKey={(lang) => lang}
        onChange={setLanguage}
        trigger={language}
        renderOption={(lang, selected) => (
          <>
            <span className="flex-1">{lang}</span>
            {selected && <Check className="size-3 shrink-0" />}
          </>
        )}
      />

      <Dropdown
        label="Chain"
        value={chain}
        options={CHAINS}
        getKey={(c) => c.name}
        onChange={(next) => setChain(next.name)}
        trigger={
          <>
            <ChainBadge chain={activeChain.name} />
            {chain}
          </>
        }
        renderOption={(c, selected) => (
          <>
            <ChainBadge chain={c.name} selected={selected} />
            <span className="flex-1">{c.name}</span>
            {selected && <Check className="size-3 shrink-0" />}
          </>
        )}
      />

      {/* <button
        type="button"
        onClick={toggleAutoSync}
        aria-pressed={autoSync}
        title="Auto-sync chain & language"
        className={`flex items-center gap-1.5 rounded-md border px-2.5 py-1 text-xs transition-colors ${
          autoSync
            ? "border-accent/40 bg-accent-soft text-accent"
            : "border-border bg-input text-muted hover:text-ink"
        }`}
      >
        {autoSync ? (
          <Link2 className="size-3" />
        ) : (
          <Link2Off className="size-3" />
        )}
        Auto-sync
      </button> */}
    </div>
  );
}
