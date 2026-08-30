import { create } from "zustand";
import { formatSolidity } from "@/lib/format-solidity";
import { ValueOf } from "next/dist/shared/lib/constants";

export type extensions = "sol" | "vyper" | "rs" | "move" | "";

type CompileStatus = {
  solidityVersion: string;
  ok: boolean;
  gas: string;
  time: string;
};

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
  language: string;
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
    language,
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
  lockedChain: string | null;
  panelWidth: number;
  source: string;
  compileStatus: CompileStatus;

  addFile: () => string;
  setActiveFile: (id: string) => void;
  closeFile: (id: string) => void;
  setFileName: (fileName: string) => void;
  setFileLanguage: (id: string, language: string) => void;
  setLockedChain: (chain: string | null) => void;
  setPanelWidth: (width: number) => void;
  setSource: (source: string) => void;
  clearSource: () => void;
  formatSource: () => void;
};

const initialFileId = createFileId();
const initialExtension = defaultExtension(LANGUAGES[0]);
const initialFileName = `Untitled1.${initialExtension}`;

export const useEditorStore = create<EditorState>((set) => ({
  files: [
    {
      id: initialFileId,
      fileName: initialFileName,
      source: "",
      extension: initialExtension,
      language: LANGUAGES[0],
    },
  ],
  activeFileId: initialFileId,
  fileName: initialFileName,
  language: LANGUAGES[0],
  chain: CHAINS[0].name,
  lockedChain: null,
  panelWidth: getDefaultWidth(),
  source: "",
  compileStatus: { solidityVersion: "", ok: false, gas: "", time: "" },

  addFile: () => {
    const id = createFileId();
    set((state) => {
      const existingNames = new Set(state.files.map((f) => f.fileName));
      const language =
        state.files.find((f) => f.id === state.activeFileId)?.language ??
        state.language;
      const extension = defaultExtension(language);
      let index = state.files.length + 1;
      let fileName = `Untitled${index}.${extension}`;
      while (existingNames.has(fileName)) {
        index += 1;
        fileName = `Untitled${index}.${extension}`;
      }
      const file: EditorFile = { id, fileName, source: "", extension, language };
      return {
        files: [...state.files, file],
        activeFileId: id,
        fileName: file.fileName,
        source: file.source,
        language,
      };
    });
    return id;
  },

  setActiveFile: (id) =>
    set((state) => {
      const file = state.files.find((f) => f.id === id);
      if (!file) return {};
      return {
        activeFileId: id,
        fileName: file.fileName,
        source: file.source,
        language: file.language,
      };
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
        language: nextActive.language,
      };
    }),

  setFileName: (fileName) =>
    set((state) => ({
      fileName,
      files: state.files.map((f) =>
        f.id === state.activeFileId ? { ...f, fileName } : f,
      ),
    })),

  // Each open file carries its own language — a chain whose toolchain
  // supports more than one language (e.g. Ethereum: Solidity + Vyper) can
  // have files in different languages open side by side.
  setFileLanguage: (id, language) =>
    set((state) => {
      const supported = state.lockedChain
        ? CHAIN_LANGUAGES[state.lockedChain]
        : LANGUAGES;
      if (!supported.includes(language)) return {};

      const extension = defaultExtension(language);
      const files = state.files.map((f) =>
        f.id === id
          ? {
              ...f,
              language,
              extension,
              fileName: renameFileExtension(f.fileName, extension),
            }
          : f,
      );

      if (id !== state.activeFileId) return { files };
      const fileName = files.find((f) => f.id === id)!.fileName;
      return { files, language, fileName };
    }),

  setLockedChain: (chain) =>
    set((state) => {
      if (!chain) return { lockedChain: null };
      const supported = CHAIN_LANGUAGES[chain] ?? [];
      const language = supported.includes(state.language)
        ? state.language
        : (supported[0] ?? state.language);
      const { files, fileName } = retargetFilesToLanguage(
        state.files,
        state.activeFileId,
        state.fileName,
        language,
      );
      return { lockedChain: chain, chain, language, files, fileName };
    }),

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
