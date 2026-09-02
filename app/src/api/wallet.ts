import { apiClient } from "./client";
import type { PlaygroundWallet } from "./contracts";

export async function fetchWalletRequest(chain: string) {
  const { data } = await apiClient.get<PlaygroundWallet>("/wallet", { params: { chain } });
  return data;
}

export type MintWalletResult = { address: string; balance: string };

export async function mintWalletRequest(chain: string) {
  const { data } = await apiClient.post<MintWalletResult>("/wallet/mint", { chain });
  return data;
}
