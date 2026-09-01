import { apiClient } from "./client";

export type ApiContract = {
  id: string;
  address: string | null;
  name: string;
  projectId: string;
  ownerAddress: string;
  language: string;
  source: string;
  createdAt: string;
};

export type CreateContractInput = {
  projectId: string;
  name: string;
  language: string;
  source?: string;
};

export async function createContractRequest(input: CreateContractInput) {
  const { data } = await apiClient.post<{ contract: ApiContract }>("/contracts", input);
  return data.contract;
}

export async function deleteContractRequest(id: string) {
  await apiClient.delete(`/contracts/${id}`);
  return id;
}

export async function updateContractRequest(id: string, source: string) {
  const { data } = await apiClient.patch<{ contract: ApiContract }>(`/contracts/${id}`, {
    source,
  });
  return data.contract;
}

export type UpdateContractMetaInput = {
  name?: string;
  language?: string;
};

export async function updateContractMetaRequest(
  id: string,
  input: UpdateContractMetaInput,
) {
  const { data } = await apiClient.patch<{ contract: ApiContract }>(
    `/contracts/${id}`,
    input,
  );
  return data.contract;
}

export async function fetchContractSourceRequest(id: string) {
  const { data } = await apiClient.get<{ source: string }>(`/contracts/${id}/source`);
  return data.source;
}
