"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "./client";
import { useAuthStore } from "@/store/auth-store";
import { useProjectStore } from "@/store/project-store";

export type ApiProject = {
  id: string;
  name: string;
  ownerAddress: string;
  createdAt: string;
};

export async function fetchProjects() {
  const { data } = await apiClient.get<{ projects: ApiProject[] }>("/projects");
  return data.projects;
}

export async function createProjectRequest(name: string) {
  const { data } = await apiClient.post<{ project: ApiProject }>("/projects", { name });
  return data.project;
}

export async function deleteProjectRequest(id: string) {
  await apiClient.delete(`/projects/${id}`);
  return id;
}

export function useProjects() {
  const status = useAuthStore((s) => s.status);

  return useQuery({
    queryKey: ["projects"],
    queryFn: fetchProjects,
    enabled: status === "connected",
  });
}

export function useCreateProject() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: createProjectRequest,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["projects"] });
    },
  });
}

export function useDeleteProject() {
  const queryClient = useQueryClient();
  const activeProjectId = useProjectStore((s) => s.activeProjectId);
  const setActiveProjectId = useProjectStore((s) => s.setActiveProjectId);

  return useMutation({
    mutationFn: deleteProjectRequest,
    onSuccess: (id) => {
      if (activeProjectId === id) setActiveProjectId(null);
      queryClient.invalidateQueries({ queryKey: ["projects"] });
    },
  });
}
