const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8080/v1";

async function apiRequest<T>(path: string, options: RequestInit = {}): Promise<T> {
  const res = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers: { "Content-Type": "application/json", ...options.headers },
  });
  const data = await res.json().catch(() => null);

  if (!res.ok) {
    const message = (data && (data.message || data.error)) || "Request failed";
    throw new Error(message);
  }

  return data as T;
}

export type NonceResponse = { nonce: string; message: string };

export type VerifyResponse = {
  message: string;
  accessToken: string;
  refreshToken: string;
  user: { walletAddress: string; chain: string };
};

export function fetchNonce(address: string, chain: string) {
  return apiRequest<NonceResponse>(
    `/auth/nonce?address=${encodeURIComponent(address)}&chain=${encodeURIComponent(chain)}`,
  );
}

export function verifySignature(nonce: string, signature: string) {
  return apiRequest<VerifyResponse>("/auth/verify", {
    method: "POST",
    body: JSON.stringify({ nonce, signature }),
  });
}
