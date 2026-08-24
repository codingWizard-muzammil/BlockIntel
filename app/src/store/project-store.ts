"use client";

import { create } from "zustand";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuthStore } from "@/store/auth-store";
import {
  createProjectRequest,
  deleteProjectRequest,
  fetchProject,
  fetchProjects,
  type ApiProject,
} from "@/api/projects";

export type { ApiProject };

const STORAGE_KEY = "blockintel-active-project";

type ProjectState = {
  activeProjectId: string | null;
  hydrated: boolean;
  projects: ApiProject[];
  restore: () => void;
  setActiveProjectId: (id: string | null) => void;
  setProjects: (projects: ApiProject[]) => void;
  upsertProject: (project: ApiProject) => void;
  removeProject: (id: string) => void;
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

  restore: () => {
    if (get().hydrated) return;
    set({ activeProjectId: readStored(), hydrated: true });
  },

  setActiveProjectId: (id) => {
    writeStored(id);
    set({ activeProjectId: id });
  },

  setProjects: (projects) => set({ projects }),

  upsertProject: (project) =>
    set((state) => ({
      projects: [project, ...state.projects.filter((p) => p.id !== project.id)],
    })),

  removeProject: (id) =>
    set((state) => ({ projects: state.projects.filter((p) => p.id !== id) })),
}));

export function useProjects() {
  const status = useAuthStore((s) => s.status);
  const setProjects = useProjectStore((s) => s.setProjects);

  return useQuery({
    queryKey: ["projects"],
    queryFn: async () => {
      const projects = await fetchProjects();
      setProjects(projects);
      return projects;
    },
    enabled: status === "connected",
  });
}

export function useProject(id: string | null) {
  const status = useAuthStore((s) => s.status);
  const upsertProject = useProjectStore((s) => s.upsertProject);

  return useQuery({
    queryKey: ["projects", id],
    queryFn: async () => {
      const project = await fetchProject(id as string);
      upsertProject(project);
      return project;
    },
    enabled: status === "connected" && !!id,
  });
}

export function useCreateProject() {
  const queryClient = useQueryClient();
  const upsertProject = useProjectStore((s) => s.upsertProject);

  return useMutation({
    mutationFn: createProjectRequest,
    onSuccess: (project) => {
      upsertProject(project);
      queryClient.invalidateQueries({ queryKey: ["projects"] });
    },
  });
}

export function useDeleteProject() {
  const queryClient = useQueryClient();
  const activeProjectId = useProjectStore((s) => s.activeProjectId);
  const setActiveProjectId = useProjectStore((s) => s.setActiveProjectId);
  const removeProject = useProjectStore((s) => s.removeProject);

  return useMutation({
    mutationFn: deleteProjectRequest,
    onSuccess: (id) => {
      removeProject(id);
      if (activeProjectId === id) setActiveProjectId(null);
      queryClient.invalidateQueries({ queryKey: ["projects"] });
    },
  });
}
