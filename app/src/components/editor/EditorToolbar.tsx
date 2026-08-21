"use client";

import { useEffect, useRef, useState } from "react";
import {
  Check,
  ChevronDown,
  Link2,
  Link2Off,
  SlidersHorizontal,
  Settings2,
} from "lucide-react";
import { CHAINS, LANGUAGES, useEditorStore } from "@/store/editor-store";

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

function SymbolBadge({ symbol, selected }: { symbol: string; selected?: boolean }) {
  return (
    <span
      className={`flex h-5 min-w-5 shrink-0 items-center justify-center rounded px-1 text-[9px] font-semibold uppercase leading-none tracking-tight ${
        selected
          ? "border border-white/30 bg-white/15 text-white"
          : "border border-border bg-surface-muted text-muted"
      }`}
    >
      {symbol}
    </span>
  );
}

function Dropdown<T>({
  label,
  value,
  options,
  getKey,
  onChange,
  trigger,
  renderOption,
}: {
  label: string;
  value: string;
  options: T[];
  getKey: (option: T) => string;
  onChange: (option: T) => void;
  trigger: React.ReactNode;
  renderOption: (option: T, selected: boolean) => React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  useClickOutside(containerRef, () => setOpen(false));

  return (
    <div className="relative" ref={containerRef}>
      <span className="absolute -top-1.75 left-2.5 z-10 bg-canvas px-1 text-[10px] leading-none text-muted">
        {label}
      </span>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className="flex items-center gap-2 rounded-md border border-border bg-input py-1.75 pl-3 pr-2.5 text-xs text-ink outline-none hover:border-muted"
      >
        {trigger}
        <ChevronDown
          className={`size-2.5 text-muted transition-transform ${open ? "rotate-180" : ""}`}
        />
      </button>
      {open && (
        <div className="absolute left-0 top-[calc(100%+6px)] z-20 min-w-43 overflow-hidden rounded-lg border border-border bg-surface p-1 shadow-xl shadow-black/40">
          {options.map((option) => {
            const key = getKey(option);
            const selected = key === value;
            return (
              <button
                key={key}
                type="button"
                onClick={() => {
                  onChange(option);
                  setOpen(false);
                }}
                className={`flex w-full items-center gap-2 rounded-md px-2.5 py-1.5 text-left text-xs transition-colors ${
                  selected ? "bg-accent text-white" : "text-ink hover:bg-surface-muted"
                }`}
              >
                {renderOption(option, selected)}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

export function EditorToolbar() {
  const language = useEditorStore((s) => s.language);
  const chain = useEditorStore((s) => s.chain);
  const autoSync = useEditorStore((s) => s.autoSync);
  const setLanguage = useEditorStore((s) => s.setLanguage);
  const setChain = useEditorStore((s) => s.setChain);
  const toggleAutoSync = useEditorStore((s) => s.toggleAutoSync);
  const activeChain = CHAINS.find((c) => c.name === chain) ?? CHAINS[0];

  return (
    <div className="flex h-14 shrink-0 items-center gap-4 border-b border-border px-4">
      <Dropdown
        label="Language"
        value={language}
        options={LANGUAGES}
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
            <SymbolBadge symbol={activeChain.symbol} />
            {chain}
          </>
        }
        renderOption={(c, selected) => (
          <>
            <SymbolBadge symbol={c.symbol} selected={selected} />
            <span className="flex-1">{c.name}</span>
            {selected && <Check className="size-3 shrink-0" />}
          </>
        )}
      />

      <button
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
        {autoSync ? <Link2 className="size-3" /> : <Link2Off className="size-3" />}
        Auto-sync
      </button>
    </div>
  );
}
