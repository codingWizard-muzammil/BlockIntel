"use client";

import { QueryClientProvider } from "@tanstack/react-query";
import { useEffect } from "react";
import Image from "next/image";
import { useAuthStore } from "@/store/auth-store";
import { queryClient } from "@/lib/query-client";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthGate>{children}</AuthGate>
    </QueryClientProvider>
  );
}

function AuthGate({ children }: { children: React.ReactNode }) {
  const { status, checkAuth } = useAuthStore();

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

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
