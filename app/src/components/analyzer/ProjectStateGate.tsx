"use client";

import { useEffect, type ReactNode } from "react";
import { FolderX, Loader2, Wallet } from "lucide-react";
import { ComingSoon } from "@/components/ui/ComingSoon";
import { useAuthStore } from "@/store/auth-store";
import { useProjectStore, type ApiProject } from "@/store/project-store";

export function ProjectStateGate({
  projectId,
  children,
}: {
  projectId: string;
  children: (project: ApiProject) => ReactNode;
}) {
  const authStatus = useAuthStore((s) => s.status);
  const fetchProject = useProjectStore((s) => s.fetchProject);
  const project = useProjectStore((s) =>
    s.projects.find((p) => p.id === projectId),
  );
  const projectStatus = useProjectStore((s) => s.projectStatus);

  useEffect(() => {
    if (authStatus === "connected") fetchProject(projectId);
  }, [authStatus, projectId, fetchProject]);

  if (authStatus !== "connected") {
    return (
      <ComingSoon
        icon={Wallet}
        title="Connect a wallet"
        description="Connect your wallet to see this project's data."
      />
    );
  }

  if (!project && projectStatus === "loading") {
    return (
      <div className="flex flex-1 items-center justify-center gap-2 text-sm text-muted">
        <Loader2 className="size-4 animate-spin" />
        Loading project...
      </div>
    );
  }

  if (!project) {
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
