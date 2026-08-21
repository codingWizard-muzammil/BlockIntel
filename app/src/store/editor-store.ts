import { create } from "zustand";
import type { ContractAnalysis } from "@/lib/analyzer-data";
import { formatSolidity } from "@/lib/format-solidity";

export const LANGUAGES = ["Solidity", "Vyper", "Rust", "Move"];

export const CHAINS = [
  { name: "Ethereum", symbol: "ETH" },
  { name: "Polygon", symbol: "POL" },
  { name: "BNB Chain", symbol: "BNB" },
  { name: "Arbitrum", symbol: "ARB" },
  { name: "Optimism", symbol: "OP" },
  { name: "Base", symbol: "BASE" },
  { name: "Avalanche", symbol: "AVAX" },
  { name: "Solana", symbol: "SOL" },
  { name: "NEAR", symbol: "NEAR" },
  { name: "Aptos", symbol: "APT" },
];

// Languages each chain's toolchain supports.
export const CHAIN_LANGUAGES: Record<string, string[]> = {
  Ethereum: ["Solidity", "Vyper"],
  Polygon: ["Solidity"],
  "BNB Chain": ["Solidity"],
  Arbitrum: ["Solidity"],
  Optimism: ["Solidity"],
  Base: ["Solidity"],
  Avalanche: ["Solidity"],
  Solana: ["Rust"],
  NEAR: ["Rust"],
  Aptos: ["Move"],
};

export function chainsSupporting(language: string) {
  return CHAINS.filter((c) => CHAIN_LANGUAGES[c.name].includes(language));
}

const MIN_PANEL_WIDTH = 380;
const MAX_PANEL_WIDTH = 800;
const DEFAULT_PANEL_WIDTH = 500;

export function clampPanelWidth(width: number) {
  return Math.min(MAX_PANEL_WIDTH, Math.max(MIN_PANEL_WIDTH, width));
}

type EditorState = {
  fileName: string;
  language: string;
  chain: string;
  autoSync: boolean;
  panelWidth: number;
  source: string;
  compileStatus: ContractAnalysis["compileStatus"];

  loadAnalysis: (analysis: ContractAnalysis) => void;
  setLanguage: (language: string) => void;
  setChain: (chain: string) => void;
  toggleAutoSync: () => void;
  setPanelWidth: (width: number) => void;
  setSource: (source: string) => void;
  clearSource: () => void;
  formatSource: () => void;
};

export const useEditorStore = create<EditorState>((set) => ({
  fileName: "",
  language: LANGUAGES[0],
  chain: CHAINS[0].name,
  autoSync: true,
  panelWidth: DEFAULT_PANEL_WIDTH,
  source: "",
  compileStatus: { solidityVersion: "", ok: false, gas: "", time: "" },

  loadAnalysis: (analysis) =>
    set({
      fileName: analysis.fileName,
      language: analysis.language,
      chain: analysis.chain,
      source: analysis.sourceCode,
      compileStatus: analysis.compileStatus,
    }),

  setLanguage: (language) =>
    set((state) => {
      if (!state.autoSync) return { language };
      const supportedChains = chainsSupporting(language);
      const chain = supportedChains.some((c) => c.name === state.chain)
        ? state.chain
        : supportedChains[0].name;
      return { language, chain };
    }),

  setChain: (chain) =>
    set((state) => {
      if (!state.autoSync) return { chain };
      const supported = CHAIN_LANGUAGES[chain];
      const language = supported.includes(state.language) ? state.language : supported[0];
      return { chain, language };
    }),

  toggleAutoSync: () => set((state) => ({ autoSync: !state.autoSync })),

  setPanelWidth: (width) => set({ panelWidth: clampPanelWidth(width) }),

  setSource: (source) => set({ source }),

  clearSource: () => set({ source: "" }),

  formatSource: () => set((state) => ({ source: formatSolidity(state.source) })),
}));
