"use client";

import { useMutation } from "@tanstack/react-query";
import { apiClient } from "./client";
import { useAuthStore } from "@/store/auth-store";
import type { WalletProviderDetail } from "@/lib/wallet";
import { NonceResponse, VerifyResponse } from "@/types/auth";

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

export function useConnectWallet() {
  const { setConnecting, setSession, setError } = useAuthStore();

  return useMutation({
    mutationFn: async (wallet: WalletProviderDetail) => {
      const { address } = await wallet.connect();
      const { nonce, message } = await fetchNonce(address, wallet.chain);
      const signature = await wallet.sign(address, message);
      const { accessToken, refreshToken, user } = await verifySignature(
        nonce,
        signature,
      );

      return {
        address: user.walletAddress,
        chain: user.chain,
        accessToken,
        refreshToken,
      };
    },
    onMutate: () => {
      setConnecting();
    },
    onSuccess: (session) => {
      setSession(session);
    },
    onError: (error: Error) => {
      setError(error.message || "Failed to connect wallet");
    },
  });
}
