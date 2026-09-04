"use client";

import { create } from "zustand";
import { queryClient } from "@/lib/query-client";
import { useAuthStore } from "@/store/auth-store";
import {
  createProjectRequest,
  deleteProjectRequest,
  fetchProject as fetchProjectRequest,
  fetchProjects as fetchProjectsRequest,
  type ApiProject,
  type CreateProjectInput,
} from "@/api/projects";
import {
  createContractRequest,
  deleteContractRequest,
  fetchContractSourceRequest,
  updateContractRequest,
  updateContractMetaRequest,
  compileContractRequest,
  analyzeContractRequest,
  applyImprovementRequest,
  callContractFunctionRequest,
  fetchPlaygroundWalletRequest,
  type ApiContract,
  type CreateContractInput,
  type UpdateContractMetaInput,
  type CallFunctionInput,
  type CallFunctionResult,
  type PlaygroundWallet,
} from "@/api/contracts";
import type { Improvement } from "@/types/analysis";
import { useEditorStore } from "./editor-store";

export type { ApiProject };

type RequestStatus = "idle" | "loading" | "success" | "error";
type AutosaveStatus = "idle" | "saving" | "saved" | "error";

const STORAGE_KEY = "blockintel-active-project";

// Last content known to be persisted per contract, so autosave can skip a
// PATCH when nothing actually changed. Intentionally outside the store —
// it's a write cache, not UI state, and shouldn't trigger re-renders.
const lastSavedSourceByContract = new Map<string, string>();

// A file's first save (POST /contracts), keyed by local file id, while it's
// in flight. If a rename/language-change commits before that request
// resolves, `updateContractMeta` chains onto this instead of firing a
// second create for the same file — see the comment on `saveContract`.
const pendingContractCreation = new Map<string, Promise<ApiContract>>();

type ProjectState = {
  activeProjectId: string | null;
  hydrated: boolean;
  projects: ApiProject[];

  projectsStatus: RequestStatus;
  projectsError: string | null;
  projectStatus: RequestStatus;
  projectError: string | null;
  createStatus: RequestStatus;
  createError: string | null;
  deleteStatus: RequestStatus;
  deleteError: string | null;
  deleteContractStatus: RequestStatus;
  deleteContractError: string | null;
  autosaveStatus: AutosaveStatus;

  restore: () => void;
  setActiveProjectId: (id: string | null) => void;
  upsertProject: (project: ApiProject) => void;
  removeProject: (id: string) => void;

  fetchProjects: () => Promise<void>;
  fetchProject: (id: string) => Promise<ApiProject | null>;
  createProject: (input: CreateProjectInput) => Promise<ApiProject | null>;
  deleteProject: (id: string) => Promise<boolean>;
  saveContract: (fileId: string, input: CreateContractInput) => Promise<ApiContract>;
  updateContract: (contractId: string, source: string) => void;
  updateContractMeta: (
    fileId: string,
    // Null when the file's first save is still in flight — see
    // `pendingContractCreation`.
    contractId: string | null,
    input: UpdateContractMetaInput,
  ) => void;
  fetchContractSource: (contractId: string) => Promise<string | null>;
  deleteContract: (contractId: string, projectId: string) => Promise<boolean>;
  compileContract: (contractId: string) => Promise<void>;
  analyzeContract: (contractId: string, force?: boolean) => Promise<void>;
  applyImprovement: (contractId: string, improvement: Improvement) => Promise<boolean>;
  callContractFunction: (
    contractId: string,
    input: CallFunctionInput,
  ) => Promise<CallFunctionResult>;
  fetchPlaygroundWallet: (contractId: string) => Promise<PlaygroundWallet | null>;
};

function readStored(): string | null {
  try {
    return localStorage.getItem(STORAGE_KEY);
  } catch {
    return null;
  }
}

function writeStored(id: string | null) {
  try {
    if (id) localStorage.setItem(STORAGE_KEY, id);
    else localStorage.removeItem(STORAGE_KEY);
  } catch {
    // storage unavailable (private mode, disabled cookies, etc.) - selection just won't persist
  }
}

export const useProjectStore = create<ProjectState>((set, get) => ({
  activeProjectId: null,
  hydrated: false,
  projects: [],

  projectsStatus: "idle",
  projectsError: null,
  projectStatus: "idle",
  projectError: null,
  createStatus: "idle",
  createError: null,
  deleteStatus: "idle",
  deleteError: null,
  deleteContractStatus: "idle",
  deleteContractError: null,
  autosaveStatus: "idle",

  restore: () => {
    if (get().hydrated) return;
    set({ activeProjectId: readStored(), hydrated: true });
  },

  setActiveProjectId: (id) => {
    writeStored(id);
    set({ activeProjectId: id });
  },

  upsertProject: (project) =>
    set((state) => ({
      projects: [project, ...state.projects.filter((p) => p.id !== project.id)],
    })),

  removeProject: (id) =>
    set((state) => ({ projects: state.projects.filter((p) => p.id !== id) })),

  fetchProjects: async () => {
    if (useAuthStore.getState().status !== "connected") return;
    set({ projectsStatus: "loading", projectsError: null });
    try {
      const projects = await queryClient.fetchQuery({
        queryKey: ["projects"],
        queryFn: fetchProjectsRequest,
      });
      set({ projects, projectsStatus: "success" });
    } catch (error) {
      set({ projectsStatus: "error", projectsError: (error as Error).message });
    }
  },

  fetchProject: async (id) => {
    set({ projectStatus: "loading", projectError: null });
    try {
      const project = await queryClient.fetchQuery({
        queryKey: ["projects", id],
        queryFn: () => fetchProjectRequest(id),
      });
      get().upsertProject(project);
      set({ projectStatus: "success" });
      return project;
    } catch (error) {
      set({ projectStatus: "error", projectError: (error as Error).message });
      return null;
    }
  },

  createProject: async (input) => {
    set({ createStatus: "loading", createError: null });
    try {
      const project = await createProjectRequest(input);
      get().upsertProject(project);
      queryClient.invalidateQueries({ queryKey: ["projects"] });
      set({ createStatus: "success" });
      return project;
    } catch (error) {
      set({ createStatus: "error", createError: (error as Error).message });
      return null;
    }
  },

  deleteProject: async (id) => {
    set({ deleteStatus: "loading", deleteError: null });
    try {
      await deleteProjectRequest(id);
      get().removeProject(id);
      if (get().activeProjectId === id) get().setActiveProjectId(null);
      queryClient.invalidateQueries({ queryKey: ["projects"] });
      set({ deleteStatus: "success" });
      return true;
    } catch (error) {
      set({ deleteStatus: "error", deleteError: (error as Error).message });
      return false;
    }
  },

  // Persists a newly created contract, deduped by `pendingContractCreation`
  // so a rename/language-change committed before it resolves (see
  // `updateContractMeta`) — or a second caller such as the Compile/Analyze
  // buttons racing an in-flight first save — chains onto the same request
  // instead of firing a duplicate create for the same file.
  saveContract: (fileId, input) => {
    const pending = pendingContractCreation.get(fileId);
    if (pending) return pending;

    useEditorStore.getState().setFileContractSaving(fileId, true);
    const request = createContractRequest(input)
      .then((contract) => {
        lastSavedSourceByContract.set(contract.id, input.source ?? "");
        useEditorStore.getState().setFileContract(fileId, contract);
        queryClient.invalidateQueries({ queryKey: ["projects", input.projectId] });
        return contract;
      })
      .catch((error) => {
        console.error("Failed to save contract in the background", error);
        useEditorStore.getState().setFileContractSaving(fileId, false);
        throw error;
      })
      .finally(() => {
        if (pendingContractCreation.get(fileId) === request) {
          pendingContractCreation.delete(fileId);
        }
      });
    pendingContractCreation.set(fileId, request);
    return request;
  },

  // Fire-and-forget: called (debounced) on every edit to an already-saved
  // file. Only tracks status for the small "Saving…/Saved" indicator.
  updateContract: (contractId, source) => {
    if (lastSavedSourceByContract.get(contractId) === source) {
      set({ autosaveStatus: "saved" });
      return;
    }
    set({ autosaveStatus: "saving" });
    updateContractRequest(contractId, source)
      .then(() => {
        lastSavedSourceByContract.set(contractId, source);
        set({ autosaveStatus: "saved" });
      })
      .catch((error) => {
        console.error("Failed to autosave contract", error);
        set({ autosaveStatus: "error" });
      });
  },

  // Fire-and-forget: persists a rename or language change for an
  // already-saved contract. When `contractId` is null, the file's first
  // save is still in flight (see `saveContract`) — wait for it and apply
  // this as an update to that same contract instead of racing a second
  // create for the same file.
  updateContractMeta: (fileId, contractId, input) => {
    const applyUpdate = (id: string) =>
      updateContractMetaRequest(id, input).then((contract) => {
        useEditorStore.getState().setFileContract(fileId, contract);
        queryClient.invalidateQueries({ queryKey: ["projects", contract.projectId] });
      });

    const pendingCreate = contractId ? null : pendingContractCreation.get(fileId);
    const run = contractId
      ? applyUpdate(contractId)
      : pendingCreate
        ? pendingCreate.then((contract) => applyUpdate(contract.id))
        : null;

    run?.catch((error) => {
      console.error("Failed to update contract in the background", error);
    });
  },

  fetchContractSource: async (contractId) => {
    try {
      const source = await queryClient.fetchQuery({
        queryKey: ["contracts", contractId, "source"],
        queryFn: () => fetchContractSourceRequest(contractId),
      });
      lastSavedSourceByContract.set(contractId, source);
      return source;
    } catch (error) {
      console.error("Failed to fetch contract source", error);
      return null;
    }
  },

  deleteContract: async (contractId, projectId) => {
    set({ deleteContractStatus: "loading", deleteContractError: null });
    try {
      await deleteContractRequest(contractId);
      queryClient.invalidateQueries({ queryKey: ["projects", projectId] });
      set({ deleteContractStatus: "success" });
      return true;
    } catch (error) {
      set({
        deleteContractStatus: "error",
        deleteContractError: (error as Error).message,
      });
      return false;
    }
  },

  // Compiles the contract and — for chains with a local node configured —
  // deploys it, then hands the result to editor-store so every gated view
  // (Summary/Attacks/Improvements/Playground) can react to it. Deliberately
  // does NOT also trigger AI analysis — Compile and Analyze are separate
  // user-initiated actions; Summary falls back to a compile-only "basic"
  // view (compiler/lines/gas) until Analyze is explicitly run.
  compileContract: async (contractId) => {
    useEditorStore.getState().setCompiling();
    try {
      const compile = await compileContractRequest(contractId);
      useEditorStore.getState().setCompileResult(contractId, compile);
      if (compile.deployment?.ok) {
        const projectId = get().activeProjectId;
        if (projectId) queryClient.invalidateQueries({ queryKey: ["projects", projectId] });
      }
    } catch (error) {
      useEditorStore.getState().setCompileError((error as Error).message);
    }
  },

  analyzeContract: async (contractId, force = false) => {
    useEditorStore.getState().setAnalyzing();
    try {
      const analysis = await analyzeContractRequest(contractId, force);
      useEditorStore.getState().setAnalysisResult(contractId, analysis);
    } catch (error) {
      useEditorStore.getState().setAnalysisError((error as Error).message);
    }
  },

  // Has the AI rewrite the contract's source to apply one improvement and
  // persist it server-side, then reflects the new source in the editor.
  // Returns whether it succeeded so the calling card can show its own
  // per-item loading/error state.
  applyImprovement: async (contractId, improvement) => {
    try {
      const { source, appliedImprovements } = await applyImprovementRequest(contractId, improvement);
      lastSavedSourceByContract.set(contractId, source);
      useEditorStore.getState().setSourceForContract(contractId, source);
      useEditorStore.getState().setAppliedImprovements(contractId, appliedImprovements);
      return true;
    } catch (error) {
      console.error("Failed to apply improvement", error);
      return false;
    }
  },

  callContractFunction: (contractId, input) => callContractFunctionRequest(contractId, input),

  fetchPlaygroundWallet: async (contractId) => {
    try {
      return await queryClient.fetchQuery({
        queryKey: ["contracts", contractId, "wallet"],
        queryFn: () => fetchPlaygroundWalletRequest(contractId),
      });
    } catch (error) {
      console.error("Failed to fetch playground wallet", error);
      return null;
    }
  },
}));

// Keep the project list in sync with auth: load it as soon as a wallet
// session is confirmed, and drop it when the session ends.
useAuthStore.subscribe((state, prevState) => {
  if (state.status === prevState.status) return;

  if (state.status === "connected") {
    useProjectStore.getState().fetchProjects();
  } else if (prevState.status === "connected") {
    useProjectStore.setState({ projects: [], projectsStatus: "idle" });
  }
});
