import { apiClient } from "./client";

export type ApiProject = {
  id: string;
  name: string;
  description: string | null;
  chain: string;
  purpose: string;
  ownerAddress: string;
  createdAt: string;
};

export type CreateProjectInput = {
  name: string;
  chain: string;
  purpose: string;
  description?: string;
};

export async function fetchProjects() {
  const { data } = await apiClient.get<{ projects: ApiProject[] }>("/projects");
  return data.projects;
}

export async function fetchProject(id: string) {
  const { data } = await apiClient.get<{ project: ApiProject }>(`/projects/${id}`);
  return data.project;
}

export async function createProjectRequest(input: CreateProjectInput) {
  const { data } = await apiClient.post<{ project: ApiProject }>("/projects", input);
  return data.project;
}

export async function deleteProjectRequest(id: string) {
  await apiClient.delete(`/projects/${id}`);
  return id;
}
