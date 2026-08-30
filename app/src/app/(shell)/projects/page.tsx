"use client";

import { useEffect, useState } from "react";
import { FolderKanban, Loader2, Plus, Wallet } from "lucide-react";
import { ComingSoon } from "@/components/ui/ComingSoon";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { CreateProjectModal } from "@/components/editor/CreateProjectModal";
import { ProjectCard } from "@/components/editor/ProjectCard";
import { useAuthStore } from "@/store/auth-store";
import { useProjectStore, type ApiProject } from "@/store/project-store";
import { Button } from "@/components/ui/Button";

export default function HistoryPage() {
  const authStatus = useAuthStore((s) => s.status);
  const setActiveProjectId = useProjectStore((s) => s.setActiveProjectId);
  const projects = useProjectStore((s) => s.projects);
  const projectsStatus = useProjectStore((s) => s.projectsStatus);
  const fetchProjects = useProjectStore((s) => s.fetchProjects);
  const deleteProject = useProjectStore((s) => s.deleteProject);
  const deleteStatus = useProjectStore((s) => s.deleteStatus);
  const deleteError = useProjectStore((s) => s.deleteError);
  const [modalOpen, setModalOpen] = useState(false);
  const [pendingDelete, setPendingDelete] = useState<ApiProject | null>(null);

  useEffect(() => {
    if (authStatus === "connected") fetchProjects();
  }, [authStatus, fetchProjects]);

  async function handleConfirmDelete() {
    if (!pendingDelete) return;
    const ok = await deleteProject(pendingDelete.id);
    if (ok) setPendingDelete(null);
  }

  if (authStatus !== "connected") {
    return (
      <ComingSoon
        icon={Wallet}
        title="Connect a wallet"
        description="Connect your wallet to see the projects you've created."
      />
    );
  }

  if (projectsStatus === "loading" && projects.length === 0) {
    return (
      <div className="flex flex-1 items-center justify-center gap-2 text-sm text-muted">
        <Loader2 className="size-4 animate-spin" />
        Loading your projects...
      </div>
    );
  }

  if (projectsStatus === "error" && projects.length === 0) {
    return (
      <ComingSoon
        icon={FolderKanban}
        title="Couldn't load projects"
        description="Something went wrong fetching your projects. Try refreshing the page."
      />
    );
  }

  return (
    <div className="flex flex-1 flex-col gap-4 overflow-y-auto p-6">
      <div className="flex justify-between">
        <h1 className="text-lg font-semibold text-ink">Your projects</h1>
        <Button variant="primary" size="md" onClick={() => setModalOpen(true)}>
          <Plus className="size-4" /> Add Project
        </Button>
      </div>
      {projects.length ? (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {projects.map((project) => (
            <ProjectCard
              key={project.id}
              project={project}
              onOpen={() => setActiveProjectId(project.id)}
              onDelete={() => setPendingDelete(project)}
            />
          ))}
        </div>
      ) : (
        <ComingSoon
          icon={FolderKanban}
          title="No projects yet"
          description="Create a project from the contract editor to see it here."
        />
      )}
      <CreateProjectModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
      />
      <ConfirmDialog
        open={!!pendingDelete}
        title="Delete project"
        description={`This will permanently delete "${pendingDelete?.name}" and all of its contracts. This can't be undone.`}
        confirmLabel="Delete"
        isPending={deleteStatus === "loading"}
        errorMessage={deleteStatus === "error" ? deleteError : null}
        onConfirm={handleConfirmDelete}
        onClose={() => setPendingDelete(null)}
      />
    </div>
  );
}
