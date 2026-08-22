import { create } from "zustand";
import type { ContractAnalysis, extensions } from "@/lib/analyzer-data";
import { formatSolidity } from "@/lib/format-solidity";
import { ValueOf } from "next/dist/shared/lib/constants";

// Chains with a running node under chains/ — keep in sync with that folder.
export const CHAINS = [
  { name: "Ethereum", symbol: "ETH" },
  { name: "Polygon", symbol: "POL" },
  { name: "BNB Chain", symbol: "BNB" },
  { name: "Arbitrum", symbol: "ARB" },
  { name: "Optimism", symbol: "OP" },
  { name: "Avalanche", symbol: "AVAX" },
  { name: "Solana", symbol: "SOL" },
];

// Languages each chain's toolchain supports.
export const CHAIN_LANGUAGES: Record<string, string[]> = {
  Ethereum: ["Solidity", "Vyper"],
  Polygon: ["Solidity"],
  "BNB Chain": ["Solidity"],
  Arbitrum: ["Solidity"],
  Optimism: ["Solidity"],
  Avalanche: ["Solidity"],
  Solana: ["Rust"],
};

export const EXTENSION_BY_LANGUAGE: Record<string, extensions> = {
  Solidity: "sol",
  Vyper: "vyper",
  Rust: "rs",
  Move: "move",
};

// Union of every language a supported chain can compile.
export const LANGUAGES = Array.from(
  new Set(Object.values(CHAIN_LANGUAGES).flat()),
);

export function chainsSupporting(language: string) {
  return CHAINS.filter((c) => CHAIN_LANGUAGES[c.name].includes(language));
}

const MIN_PANEL_WIDTH = 380;
const MAX_PANEL_WIDTH = 800;
const DEFAULT_PANEL_WIDTH = 590;
const STORED_WIDTH =
  typeof window !== "undefined"
    ? Number(localStorage.getItem("editorWidth") ?? 0)
    : 0;

function getDefaultWidth() {
  if (!STORED_WIDTH) {
    clampPanelWidth(DEFAULT_PANEL_WIDTH);
    return DEFAULT_PANEL_WIDTH;
  }

  if (STORED_WIDTH > MAX_PANEL_WIDTH) {
    clampPanelWidth(MAX_PANEL_WIDTH);
    return MAX_PANEL_WIDTH;
  }

  if (STORED_WIDTH < MIN_PANEL_WIDTH) {
    clampPanelWidth(MIN_PANEL_WIDTH);
    return MIN_PANEL_WIDTH;
  }

  return DEFAULT_PANEL_WIDTH;
}

export function clampPanelWidth(width: number) {
  const newWidth = Math.min(MAX_PANEL_WIDTH, Math.max(MIN_PANEL_WIDTH, width));
  if (typeof window !== "undefined")
    localStorage.setItem("editorWidth", String(newWidth));

  return newWidth;
}

export type EditorFile = {
  id: string;
  fileName: string;
  source: string;
  extension: extensions;
};

function createFileId() {
  return typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `file-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function defaultExtension(language: string) {
  return EXTENSION_BY_LANGUAGE[language] ?? "txt";
}

function renameFileExtension(fileName: string, extension: extensions) {
  if (!fileName) return fileName;
  const dotIndex = fileName.lastIndexOf(".");
  const baseName = dotIndex > 0 ? fileName.slice(0, dotIndex) : fileName;
  return extension ? `${baseName}.${extension}` : baseName;
}

function retargetFilesToLanguage(
  files: EditorFile[],
  activeFileId: string,
  fallbackFileName: string,
  language: string,
) {
  const extension = defaultExtension(language);
  const nextFiles = files.map((f) => ({
    ...f,
    fileName: renameFileExtension(f.fileName, extension),
    extension,
  }));
  const fileName =
    nextFiles.find((f) => f.id === activeFileId)?.fileName ?? fallbackFileName;
  return { files: nextFiles, fileName };
}

type EditorState = {
  files: EditorFile[];
  activeFileId: string;
  fileName: string;
  language: string;
  chain: string;
  autoSync: boolean;
  panelWidth: number;
  source: string;
  compileStatus: ContractAnalysis["compileStatus"];

  loadAnalysis: (analysis: ContractAnalysis) => void;
  addFile: () => void;
  setActiveFile: (id: string) => void;
  closeFile: (id: string) => void;
  setFileName: (fileName: string) => void;
  setLanguage: (language: string) => void;
  setChain: (chain: string) => void;
  toggleAutoSync: () => void;
  setPanelWidth: (width: number) => void;
  setSource: (source: string) => void;
  clearSource: () => void;
  formatSource: () => void;
};

const initialFileId = createFileId();

export const useEditorStore = create<EditorState>((set) => ({
  files: [{ id: initialFileId, fileName: "", source: "", extension: "" }],
  activeFileId: initialFileId,
  fileName: "",
  language: LANGUAGES[0],
  chain: CHAINS[0].name,
  autoSync: true,
  panelWidth: getDefaultWidth(),
  source: "",
  compileStatus: { solidityVersion: "", ok: false, gas: "", time: "" },

  loadAnalysis: (analysis) =>
    set(() => {
      const id = createFileId();
      return {
        files: [
          {
            id,
            fileName: analysis.fileName,
            source: analysis.sourceCode,
            extension: analysis.extension,
          },
        ],
        activeFileId: id,
        fileName: analysis.fileName,
        language: analysis.language,
        chain: analysis.chain,
        source: analysis.sourceCode,
        compileStatus: analysis.compileStatus,
      };
    }),

  addFile: () =>
    set((state) => {
      const existingNames = new Set(state.files.map((f) => f.fileName));
      const extension = defaultExtension(state.language);
      let index = state.files.length + 1;
      let fileName = `Untitled${index}.${extension}`;
      while (existingNames.has(fileName)) {
        index += 1;
        fileName = `Untitled${index}.${extension}`;
      }
      const id = createFileId();
      const file: EditorFile = { id, fileName, source: "", extension };
      return {
        files: [...state.files, file],
        activeFileId: id,
        fileName: file.fileName,
        source: file.source,
      };
    }),

  setActiveFile: (id) =>
    set((state) => {
      const file = state.files.find((f) => f.id === id);
      if (!file) return {};
      return { activeFileId: id, fileName: file.fileName, source: file.source };
    }),

  closeFile: (id) =>
    set((state) => {
      if (state.files.length <= 1) return {};
      const files = state.files.filter((f) => f.id !== id);
      if (state.activeFileId !== id) return { files };
      const nextActive = files[files.length - 1];
      return {
        files,
        activeFileId: nextActive.id,
        fileName: nextActive.fileName,
        source: nextActive.source,
      };
    }),

  setFileName: (fileName) =>
    set((state) => ({
      fileName,
      files: state.files.map((f) =>
        f.id === state.activeFileId ? { ...f, fileName } : f,
      ),
    })),

  setLanguage: (language) =>
    set((state) => {
      const { files, fileName } = retargetFilesToLanguage(
        state.files,
        state.activeFileId,
        state.fileName,
        language,
      );

      if (!state.autoSync) return { language, files, fileName };
      const supportedChains = chainsSupporting(language);
      const chain = supportedChains.some((c) => c.name === state.chain)
        ? state.chain
        : supportedChains[0].name;
      return { language, chain, files, fileName };
    }),

  setChain: (chain) =>
    set((state) => {
      if (!state.autoSync) return { chain };
      const supported = CHAIN_LANGUAGES[chain];
      const language = supported.includes(state.language)
        ? state.language
        : supported[0];
      const { files, fileName } = retargetFilesToLanguage(
        state.files,
        state.activeFileId,
        state.fileName,
        language,
      );
      return { chain, language, files, fileName };
    }),

  toggleAutoSync: () => set((state) => ({ autoSync: !state.autoSync })),

  setPanelWidth: (width) => set({ panelWidth: clampPanelWidth(width) }),

  setSource: (source) =>
    set((state) => ({
      source,
      files: state.files.map((f) =>
        f.id === state.activeFileId ? { ...f, source } : f,
      ),
    })),

  clearSource: () =>
    set((state) => ({
      source: "",
      files: state.files.map((f) =>
        f.id === state.activeFileId ? { ...f, source: "" } : f,
      ),
    })),

  formatSource: () =>
    set((state) => {
      const source = formatSolidity(state.source);
      return {
        source,
        files: state.files.map((f) =>
          f.id === state.activeFileId ? { ...f, source } : f,
        ),
      };
    }),
}));
