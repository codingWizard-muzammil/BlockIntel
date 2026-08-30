import { create } from "zustand";
import { formatSolidity } from "@/lib/format-solidity";
import type { ApiContract } from "@/api/contracts";

export type extensions = "sol" | "vyper" | "rs" | "move" | "";

type CompileStatus = {
  solidityVersion: string;
  ok: boolean;
  gas: string;
  time: string;
};

// Chains with a running node under chains/ — keep in sync with that folder.
export const CHAINS = [
  { name: "ethereum", symbol: "ETH" },
  { name: "polygon", symbol: "POL" },
  { name: "bnb chain", symbol: "BNB" },
  { name: "arbitrum", symbol: "ARB" },
  { name: "optimism", symbol: "OP" },
  { name: "avalanche", symbol: "AVAX" },
  { name: "solana", symbol: "SOL" },
];

// Languages each chain's toolchain supports.
export const CHAIN_LANGUAGES: Record<string, string[]> = {
  ethereum: ["solidity", "vyper"],
  polygon: ["solidity"],
  "bnb chain": ["solidity"],
  arbitrum: ["solidity"],
  optimism: ["solidity"],
  avalanche: ["solidity"],
  solana: ["rust"],
};

export const EXTENSION_BY_LANGUAGE: Record<string, extensions> = {
  solidity: "sol",
  vyper: "vyper",
  rust: "rs",
  move: "move",
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

// Mirrors the fields on the `contracts` Prisma model so a saved file can
// carry its DB identity; `id` stays the local tab id, `contractId` is null
// until the file has actually been persisted as a contract.
export type EditorFile = {
  id: string;
  contractId: string | null;
  name: string;
  source: string;
  extension: extensions;
  language: string;
  address: string | null;
  projectId: string | null;
  ownerAddress: string | null;
  createdAt: string | null;
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
  fallbackName: string,
  language: string,
) {
  const extension = defaultExtension(language);
  const nextFiles = files.map((f) => ({
    ...f,
    name: renameFileExtension(f.name, extension),
    extension,
    language,
  }));
  const name =
    nextFiles.find((f) => f.id === activeFileId)?.name ?? fallbackName;
  return { files: nextFiles, name };
}

function emptyContractLinkage() {
  return {
    contractId: null,
    address: null,
    projectId: null,
    ownerAddress: null,
    createdAt: null,
  };
}

type EditorState = {
  files: EditorFile[];
  activeFileId: string;
  name: string;
  language: string;
  chain: string;
  lockedChain: string | null;
  panelWidth: number;
  source: string;
  compileStatus: CompileStatus;

  addFile: () => string;
  setActiveFile: (id: string) => void;
  closeFile: (id: string) => void;
  setFileName: (name: string) => void;
  setFileLanguage: (id: string, language: string) => void;
  setFileContract: (id: string, contract: ApiContract) => void;
  setFilesFromContracts: (contracts: ApiContract[]) => void;
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
  files: [],
  activeFileId: initialFileId,
  name: initialFileName,
  language: LANGUAGES[0],
  chain: CHAINS[0].name,
  lockedChain: null,
  panelWidth: getDefaultWidth(),
  source: "",
  compileStatus: { solidityVersion: "", ok: false, gas: "", time: "" },

  addFile: () => {
    const id = createFileId();
    set((state) => {
      const existingNames = new Set(state.files.map((f) => f.name));
      const language =
        state.files.find((f) => f.id === state.activeFileId)?.language ??
        state.language;
      const extension = defaultExtension(language);
      let index = state.files.length + 1;
      let name = `Untitled${index}.${extension}`;
      while (existingNames.has(name)) {
        index += 1;
        name = `Untitled${index}.${extension}`;
      }
      const file: EditorFile = {
        id,
        name,
        source: "",
        extension,
        language,
        ...emptyContractLinkage(),
      };
      return {
        files: [...state.files, file],
        activeFileId: id,
        name: file.name,
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
        name: file.name,
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
        name: nextActive.name,
        source: nextActive.source,
        language: nextActive.language,
      };
    }),

  setFileName: (name) =>
    set((state) => ({
      name,
      files: state.files.map((f) =>
        f.id === state.activeFileId ? { ...f, name } : f,
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
              name: renameFileExtension(f.name, extension),
            }
          : f,
      );

      if (id !== state.activeFileId) return { files };
      const name = files.find((f) => f.id === id)!.name;
      return { files, language, name };
    }),

  // Called once a file has been persisted via POST /v1/contracts, so the
  // tab carries the same identity as its row in the `contracts` table.
  setFileContract: (id, contract) =>
    set((state) => ({
      files: state.files.map((f) =>
        f.id === id
          ? {
              ...f,
              contractId: contract.id,
              address: contract.address,
              projectId: contract.projectId,
              ownerAddress: contract.ownerAddress,
              createdAt: contract.createdAt,
            }
          : f,
      ),
    })),

  // Replaces the open tabs with one per contract already saved to this
  // project (name/language/chain-linkage only — `source` isn't returned by
  // the backend yet, since `contracts.source` stores a filesystem path, not
  // the file's content).
  setFilesFromContracts: (contracts) =>
    set(() => {
      const files: EditorFile[] =
        contracts.length > 0
          ? contracts.map((c) => ({
              id: createFileId(),
              contractId: c.id,
              name: c.name,
              source: "",
              extension: defaultExtension(c.language),
              language: c.language,
              address: c.address,
              projectId: c.projectId,
              ownerAddress: c.ownerAddress,
              createdAt: c.createdAt,
            }))
          : [
              {
                id: createFileId(),
                name: initialFileName,
                source: "",
                extension: initialExtension,
                language: LANGUAGES[0],
                ...emptyContractLinkage(),
              },
            ];
      const active = files[0];
      return {
        files,
        activeFileId: active.id,
        name: active.name,
        source: active.source,
        language: active.language,
      };
    }),

  setLockedChain: (chain) =>
    set((state) => {
      if (!chain) return { lockedChain: null };
      const supported = CHAIN_LANGUAGES[chain] ?? [];
      const language = supported.includes(state.language)
        ? state.language
        : (supported[0] ?? state.language);
      const { files, name } = retargetFilesToLanguage(
        state.files,
        state.activeFileId,
        state.name,
        language,
      );
      return { lockedChain: chain, chain, language, files, name };
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
