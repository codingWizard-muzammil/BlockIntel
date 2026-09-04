import { create } from "zustand";
import { formatSolidity } from "@/lib/format-solidity";
import type {
  ApiContract,
  AbiFragment,
  AnalysisResult,
  CompileDiagnostic,
  CompileResult,
  DeployedDependency,
  DeploymentResult,
} from "@/api/contracts";

export type Extension = "sol" | "vyper" | "move" | "";

type CompileStatus = {
  solidityVersion: string;
  ok: boolean;
  // True when the contract's language has no compiler wired up yet — lets
  // views show a "not supported yet" state instead of an error state.
  unsupported: boolean;
  gas: string;
  time: string;
  // Id of the contract this result belongs to — lets views tell whether the
  // active tab is the one that was actually compiled.
  contractId: string | null;
  contractName: string | null;
  abi: AbiFragment[] | null;
  errors: CompileDiagnostic[];
  warnings: CompileDiagnostic[];
  deployment: DeploymentResult | null;
};

// Chains with a running node under chains/ — keep in sync with that folder.
export const CHAINS = [
  { name: "ethereum", symbol: "ETH" },
  { name: "polygon", symbol: "POL" },
  { name: "bnb chain", symbol: "BNB" },
  { name: "arbitrum", symbol: "ARB" },
  { name: "optimism", symbol: "OP" },
  { name: "avalanche", symbol: "AVAX" },
];

// Languages each chain's toolchain supports.
export const CHAIN_LANGUAGES: Record<string, string[]> = {
  ethereum: ["solidity", "vyper"],
  polygon: ["solidity"],
  "bnb chain": ["solidity"],
  arbitrum: ["solidity"],
  optimism: ["solidity"],
  avalanche: ["solidity"],
};

export const EXTENSION_BY_LANGUAGE: Record<string, Extension> = {
  solidity: "sol",
  vyper: "vyper",
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
  // True while this file's first save (POST /contracts) is in flight. Lets
  // a rename/language-change committed before that request resolves queue
  // as an update instead of firing a second, duplicate create — see
  // `saveContract`/`updateContractMeta` in project-store.
  contractSaving: boolean;
  name: string;
  source: string;
  extension: Extension;
  language: string;
  address: string | null;
  projectId: string | null;
  ownerAddress: string | null;
  createdAt: string | null;
  // Cached result of this file's last successful compile (from the DB on
  // load, or written by setCompileResult after an in-session compile) — lets
  // a tab that's already been compiled show its playground/summary/etc.
  // immediately, without forcing a recompile just because the tab wasn't
  // active when the result came in.
  abi: AbiFragment[] | null;
  compilerVersion: string | null;
  gasEstimate: string | null;
  compiledAt: string | null;
  // Other contracts this one's constructor deployed itself (from the last
  // successful compile in this session) — not persisted server-side, so
  // it's lost on a full reload, but survives switching tabs and back (see
  // deriveCompileStatus).
  dependencies: DeployedDependency[] | null;
  // Cached result of this file's last AI analysis (from the DB on load, or
  // written by setAnalysisResult after an in-session analyze call).
  analysis: AnalysisResult | null;
  analyzedAt: string | null;
  // Titles of improvements already applied via "Add this improvement"
  // (from the DB on load, or written by setAppliedImprovements after an
  // in-session apply call) — survives a page reload.
  appliedImprovements: string[];
};

function createFileId() {
  return typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `file-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function defaultExtension(language: string) {
  return EXTENSION_BY_LANGUAGE[language] ?? "txt";
}

function renameFileExtension(fileName: string, extension: Extension) {
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
    contractSaving: false,
    address: null,
    projectId: null,
    ownerAddress: null,
    createdAt: null,
    abi: null,
    compilerVersion: null,
    gasEstimate: null,
    compiledAt: null,
    dependencies: null,
    analysis: null,
    analyzedAt: null,
    appliedImprovements: [],
  };
}

function formatGasEstimate(raw: string | null | undefined) {
  if (!raw) return null;
  // solc reports "infinite" for gasEstimates.creation.totalCost when the
  // creation cost can't be statically bounded (e.g. loops/dynamic data in
  // the constructor) — show that plainly instead of the raw solc string.
  if (raw.toLowerCase() === "infinite") return "Unbounded";
  const num = Number(raw);
  return Number.isFinite(num) ? num.toLocaleString() : raw;
}

function relativeTimeFromNow(iso: string) {
  const minutes = Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

// Reconstructs a CompileStatus from a file's cached compile fields, so a tab
// that's already been compiled (this session or a previous one, via the DB)
// doesn't need a fresh "Compile & Analyze" click to unlock its gated views.
function deriveCompileStatus(file: EditorFile, chain: string): CompileStatus | null {
  if (!file.contractId || !file.abi || !file.compiledAt) return null;
  return {
    solidityVersion: file.compilerVersion ?? "",
    ok: true,
    unsupported: false,
    gas: file.gasEstimate ?? "",
    time: relativeTimeFromNow(file.compiledAt),
    contractId: file.contractId,
    contractName: file.name.replace(/\.[^.]+$/, ""),
    abi: file.abi,
    errors: [],
    warnings: [],
    deployment: file.address
      ? {
          ok: true,
          address: file.address,
          chain,
          rpcUrl: null,
          deployer: null,
          error: null,
          dependencies: file.dependencies ?? undefined,
        }
      : null,
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
  compiling: boolean;
  compileError: string | null;
  // Id of the contract the current `analysis` belongs to — mirrors
  // compileStatus.contractId so views can tell the active tab is the one
  // that was actually analyzed.
  analysisContractId: string | null;
  analysis: AnalysisResult | null;
  analyzedAt: string | null;
  analyzing: boolean;
  analysisError: string | null;
  // Bumped on every successful compile. An in-flight analyze request that
  // was fired before a compile completes carries compiler/gas figures baked
  // in from the pre-compile state — capturing this counter before the
  // request and checking it on response lets the caller drop that stale
  // result instead of clobbering the fresher post-compile state with it.
  compileGeneration: number;
  // Titles of improvements already applied to the active file's contract —
  // mirrors analysisContractId's file, kept in sync at the same points.
  appliedImprovements: string[];

  addFile: () => string;
  setActiveFile: (id: string) => void;
  closeFile: (id: string) => void;
  setFileName: (name: string) => void;
  setFileLanguage: (id: string, language: string) => void;
  setFileContract: (id: string, contract: ApiContract) => void;
  setFileContractSaving: (id: string, saving: boolean) => void;
  setFilesFromContracts: (contracts: ApiContract[]) => void;
  setLockedChain: (chain: string | null) => void;
  setPanelWidth: (width: number) => void;
  setSource: (source: string) => void;
  hydrateFileSource: (fileId: string, source: string) => void;
  setSourceForContract: (contractId: string, source: string) => void;
  clearSource: () => void;
  formatSource: () => void;
  setCompiling: () => void;
  setCompileResult: (contractId: string, result: CompileResult) => void;
  setCompileError: (message: string) => void;
  setAnalyzing: () => void;
  setAnalysisResult: (contractId: string, analysis: AnalysisResult) => void;
  setAnalysisError: (message: string) => void;
  setAppliedImprovements: (contractId: string, appliedImprovements: string[]) => void;
};

const initialCompileStatus: CompileStatus = {
  solidityVersion: "",
  ok: false,
  unsupported: false,
  gas: "",
  time: "",
  contractId: null,
  contractName: null,
  abi: null,
  errors: [],
  warnings: [],
  deployment: null,
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
  compileStatus: initialCompileStatus,
  compiling: false,
  compileError: null,
  analysisContractId: null,
  analysis: null,
  analyzedAt: null,
  analyzing: false,
  analysisError: null,
  compileGeneration: 0,
  appliedImprovements: [],

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
        compileStatus: deriveCompileStatus(file, state.chain) ?? initialCompileStatus,
        compileError: null,
        analysisContractId: file.contractId,
        analysis: file.analysis,
        analyzedAt: file.analyzedAt,
        analyzing: false,
        analysisError: null,
        appliedImprovements: file.appliedImprovements,
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
              contractSaving: false,
              address: contract.address,
              projectId: contract.projectId,
              ownerAddress: contract.ownerAddress,
              createdAt: contract.createdAt,
              abi: contract.abi,
              compilerVersion: contract.compilerVersion,
              gasEstimate: formatGasEstimate(contract.gasEstimate),
              compiledAt: contract.compiledAt,
              analysis: contract.analysis,
              analyzedAt: contract.analyzedAt,
              appliedImprovements: contract.appliedImprovements,
            }
          : f,
      ),
    })),

  setFileContractSaving: (id, saving) =>
    set((state) => ({
      files: state.files.map((f) => (f.id === id ? { ...f, contractSaving: saving } : f)),
    })),

  // Replaces the open tabs with one per contract already saved to this
  // project (name/language/chain-linkage only — `source` isn't returned by
  // the backend yet, since `contracts.source` stores a filesystem path, not
  // the file's content).
  setFilesFromContracts: (contracts) =>
    set((state) => {
      const files: EditorFile[] =
        contracts.length > 0
          ? contracts.map((c) => ({
              id: createFileId(),
              contractId: c.id,
              contractSaving: false,
              name: c.name,
              source: "",
              extension: defaultExtension(c.language),
              language: c.language,
              address: c.address,
              projectId: c.projectId,
              ownerAddress: c.ownerAddress,
              createdAt: c.createdAt,
              abi: c.abi,
              compilerVersion: c.compilerVersion,
              gasEstimate: formatGasEstimate(c.gasEstimate),
              compiledAt: c.compiledAt,
              dependencies: null,
              analysis: c.analysis,
              analyzedAt: c.analyzedAt,
              appliedImprovements: c.appliedImprovements,
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
        compileStatus: deriveCompileStatus(active, state.chain) ?? initialCompileStatus,
        compileError: null,
        analysisContractId: active.contractId,
        analysis: active.analysis,
        analyzedAt: active.analyzedAt,
        analyzing: false,
        analysisError: null,
        appliedImprovements: active.appliedImprovements,
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

  // Writes server-fetched content into a file that was hydrated with
  // `source: ""` (see setFilesFromContracts) — distinct from setSource so
  // it's clearly not a user edit and won't trigger autosave.
  hydrateFileSource: (fileId, source) =>
    set((state) => ({
      source: fileId === state.activeFileId ? source : state.source,
      files: state.files.map((f) => (f.id === fileId ? { ...f, source } : f)),
    })),

  clearSource: () =>
    set((state) => ({
      source: "",
      files: state.files.map((f) =>
        f.id === state.activeFileId ? { ...f, source: "" } : f,
      ),
    })),

  // Overwrites a contract's source after a server-side rewrite (e.g. the AI
  // applying an improvement) — distinct from setSource since it's not a
  // user edit made from the active tab, and the file it targets may not
  // even be the active one.
  setSourceForContract: (contractId, source) =>
    set((state) => ({
      source: state.files.find((f) => f.id === state.activeFileId)?.contractId === contractId
        ? source
        : state.source,
      files: state.files.map((f) =>
        f.contractId === contractId ? { ...f, source } : f,
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

  setCompiling: () => set({ compiling: true, compileError: null }),

  setCompileResult: (contractId, result) =>
    set((state) => ({
      compiling: false,
      compileError: null,
      files: result.ok
        ? state.files.map((f) => {
            if (f.contractId === contractId) {
              return {
                ...f,
                abi: result.abi ?? null,
                compilerVersion: result.solidityVersion,
                gasEstimate: result.gas ?? null,
                compiledAt: new Date().toISOString(),
                address: result.deployment?.ok
                  ? (result.deployment.address ?? f.address)
                  : f.address,
                // Kept on the file (not just compileStatus) so switching
                // away to another tab and back doesn't lose it — see
                // deriveCompileStatus.
                dependencies: result.deployment?.ok ? (result.deployment.dependencies ?? []) : f.dependencies,
                // Compile and Analyze are separate, user-initiated actions
                // (see compileContract in project-store) — no follow-up
                // analyze call fires on its own, so the last AI analysis is
                // left in place rather than blanked out here. It may now
                // describe a slightly older version of the source, but
                // that's better than losing the summary/attacks/improvements
                // views until the user reloads or re-analyzes; the
                // deterministic compiler/lines/gas fields are sourced live
                // from compileStatus regardless (see ContractSummaryCard).
              };
            }
            // A dependency the constructor deployed itself (e.g. Vault's
            // `new Strategy(...)`) may be another open tab — update its
            // playground state too, right away. Its own source didn't
            // change, so its analysis stays valid and is left alone.
            const dependency = result.deployment?.dependencies?.find(
              (d) => d.contractId && d.contractId === f.contractId,
            );
            if (dependency) {
              return {
                ...f,
                address: dependency.address,
                abi: dependency.abi ?? f.abi,
                compilerVersion: result.solidityVersion,
                compiledAt: new Date().toISOString(),
              };
            }
            return f;
          })
        : state.files,
      compileGeneration: result.ok ? state.compileGeneration + 1 : state.compileGeneration,
      compileStatus: {
        solidityVersion: result.solidityVersion,
        ok: result.ok,
        unsupported: result.unsupported ?? false,
        gas: result.gas ?? "",
        time: result.time,
        contractId,
        contractName: result.contractName ?? null,
        abi: result.abi ?? null,
        errors: result.errors ?? [],
        warnings: result.warnings ?? [],
        deployment: result.deployment,
      },
    })),

  setCompileError: (message) =>
    set((state) => ({
      compiling: false,
      compileError: message,
      compileStatus: { ...state.compileStatus, ok: false },
    })),

  setAnalyzing: () => set({ analyzing: true, analysisError: null }),

  setAnalysisResult: (contractId, analysis) =>
    set((state) => {
      const analyzedAt = new Date().toISOString();
      return {
        analyzing: false,
        analysisError: null,
        analysisContractId: contractId,
        analysis,
        analyzedAt,
        files: state.files.map((f) =>
          f.contractId === contractId ? { ...f, analysis, analyzedAt } : f,
        ),
      };
    }),

  setAnalysisError: (message) => set({ analyzing: false, analysisError: message }),

  setAppliedImprovements: (contractId, appliedImprovements) =>
    set((state) => ({
      appliedImprovements:
        state.files.find((f) => f.id === state.activeFileId)?.contractId === contractId
          ? appliedImprovements
          : state.appliedImprovements,
      files: state.files.map((f) =>
        f.contractId === contractId ? { ...f, appliedImprovements } : f,
      ),
    })),
}));
