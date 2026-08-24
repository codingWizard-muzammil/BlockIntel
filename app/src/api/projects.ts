import { apiClient } from "./client";

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

export async function fetchProject(id: string) {
  const { data } = await apiClient.get<{ project: ApiProject }>(`/projects/${id}`);
  return data.project;
}

export async function createProjectRequest(name: string) {
  const { data } = await apiClient.post<{ project: ApiProject }>("/projects", { name });
  return data.project;
}

export async function deleteProjectRequest(id: string) {
  await apiClient.delete(`/projects/${id}`);
  return id;
}
