import { apiClient } from "./client";
import { MeResponse, NonceResponse, VerifyResponse } from "@/types/auth";

export async function fetchNonce(address: string, chain: string) {
  const { data } = await apiClient.get<NonceResponse>("/auth/nonce", {
    params: { address, chain },
  });
  return data;
}

export async function verifySignature(nonce: string, signature: string) {
  const { data } = await apiClient.post<VerifyResponse>("/auth/verify", {
    nonce,
    signature,
  });
  return data;
}

export async function fetchMe() {
  const { data } = await apiClient.get<MeResponse>("/auth/me");
  return data;
}
