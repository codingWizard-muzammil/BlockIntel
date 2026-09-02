import { useEffect, useRef } from "react";
import { useAuthStore } from "@/store/auth-store";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8080/v1";
const RECONNECT_DELAY_MS = 3000;

function socketUrl(contractId: string, token: string) {
  const url = new URL(`${API_BASE_URL}/ws/playground-wallet`);
  url.protocol = url.protocol === "https:" ? "wss:" : "ws:";
  url.searchParams.set("contractId", contractId);
  url.searchParams.set("token", token);
  return url.toString();
}

// Streams live native-balance updates for the connected user's playground
// wallet over WebSocket, so changes made outside this tab — an imported
// MetaMask/Phantom send, a faucet top-up — show up without a manual refetch.
// `onBalance` only ever needs to be current, not a render dependency, so it's
// read through a ref and left out of the effect's own deps.
export function usePlaygroundWalletBalance(
  contractId: string | null,
  onBalance: (balance: string) => void,
) {
  const token = useAuthStore((s) => s.accessToken);
  const onBalanceRef = useRef(onBalance);

  useEffect(() => {
    onBalanceRef.current = onBalance;
  }, [onBalance]);

  useEffect(() => {
    if (!contractId || !token) return;

    let cancelled = false;
    let socket: WebSocket | null = null;
    let retryTimer: ReturnType<typeof setTimeout> | null = null;

    function connect() {
      if (cancelled) return;
      socket = new WebSocket(socketUrl(contractId as string, token as string));

      socket.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data);
          if (message.type === "balance" && typeof message.balance === "string") {
            onBalanceRef.current(message.balance);
          }
        } catch {
          // Malformed frame — nothing to recover, just drop it.
        }
      };
      socket.onclose = () => {
        if (!cancelled) retryTimer = setTimeout(connect, RECONNECT_DELAY_MS);
      };
      socket.onerror = () => socket?.close();
    }

    connect();

    return () => {
      cancelled = true;
      if (retryTimer) clearTimeout(retryTimer);
      socket?.close();
    };
  }, [contractId, token]);
}
