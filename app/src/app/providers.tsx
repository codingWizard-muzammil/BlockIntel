"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import Image from "next/image";
import { useAuthStore } from "@/store/auth-store";

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: { retry: 1, staleTime: 30_000 },
        },
      }),
  );

  return (
    <QueryClientProvider client={queryClient}>
      <AuthGate>{children}</AuthGate>
    </QueryClientProvider>
  );
}

function AuthGate({ children }: { children: React.ReactNode }) {
  const status = useAuthStore((s) => s.status);
  const hydrate = useAuthStore((s) => s.hydrate);

  useEffect(() => {
    hydrate();
  }, [hydrate]);

  if (status === "restoring") return <AuthLoader />;

  return <>{children}</>;
}

function AuthLoader() {
  return (
    <div className="flex h-full w-full flex-1 flex-col items-center justify-center gap-5 bg-canvas">
      <div className="relative flex size-16 items-center justify-center">
        <span className="absolute inset-0 animate-spin rounded-full border-2 border-border border-t-accent" />
        <Image src="/logo.svg" alt="BlockIntel" width={20} height={27} className="h-6 w-auto animate-pulse" />
      </div>
      <p className="text-sm text-muted">Loading your session…</p>
    </div>
  );
}
