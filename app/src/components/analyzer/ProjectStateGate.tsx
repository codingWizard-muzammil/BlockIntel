"use client";

import type { ReactNode } from "react";
import { FolderX, Loader2, Wallet } from "lucide-react";
import { ComingSoon } from "@/components/ui/ComingSoon";
import { useAuthStore } from "@/store/auth-store";
import { useProject, type ApiProject } from "@/store/project-store";

export function ProjectStateGate({
  projectId,
  children,
}: {
  projectId: string;
  children: (project: ApiProject) => ReactNode;
}) {
  const authStatus = useAuthStore((s) => s.status);
  const { data: project, isLoading, isError } = useProject(projectId);

  if (authStatus !== "connected") {
    return (
      <ComingSoon
        icon={Wallet}
        title="Connect a wallet"
        description="Connect your wallet to see this project's data."
      />
    );
  }

  if (isLoading) {
    return (
      <div className="flex flex-1 items-center justify-center gap-2 text-sm text-muted">
        <Loader2 className="size-4 animate-spin" />
        Loading project...
      </div>
    );
  }

  if (isError || !project) {
    return (
      <ComingSoon
        icon={FolderX}
        title="Project not found"
        description="This project doesn't exist or you don't have access to it."
      />
    );
  }

  return <>{children(project)}</>;
}
