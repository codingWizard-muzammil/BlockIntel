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
