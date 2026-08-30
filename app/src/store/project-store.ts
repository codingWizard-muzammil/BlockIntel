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
  type CreateContractInput,
} from "@/api/contracts";
import { useEditorStore } from "./editor-store";

export type { ApiProject };

type RequestStatus = "idle" | "loading" | "success" | "error";

const STORAGE_KEY = "blockintel-active-project";

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

  restore: () => void;
  setActiveProjectId: (id: string | null) => void;
  upsertProject: (project: ApiProject) => void;
  removeProject: (id: string) => void;

  fetchProjects: () => Promise<void>;
  fetchProject: (id: string) => Promise<ApiProject | null>;
  createProject: (input: CreateProjectInput) => Promise<ApiProject | null>;
  deleteProject: (id: string) => Promise<boolean>;
  saveContract: (fileId: string, input: CreateContractInput) => void;
  deleteContract: (contractId: string, projectId: string) => Promise<boolean>;
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

  // Fire-and-forget: persists a newly created contract without any loading
  // state for the UI to bind a spinner to.
  saveContract: (fileId, input) => {
    createContractRequest(input)
      .then((contract) => {
        useEditorStore.getState().setFileContract(fileId, contract);
        queryClient.invalidateQueries({ queryKey: ["projects", input.projectId] });
      })
      .catch((error) => {
        console.error("Failed to save contract in the background", error);
      });
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
