"use client";

import Link from "next/link";
import { useState } from "react";
import { FolderKanban, Loader2, Plus, Trash2, Wallet } from "lucide-react";
import { ComingSoon } from "@/components/ui/ComingSoon";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { CreateProjectModal } from "@/components/editor/CreateProjectModal";
import { useAuthStore } from "@/store/auth-store";
import { useProjectStore, type ApiProject } from "@/store/project-store";
import { Button } from "@/components/ui/Button";

export default function HistoryPage() {
  const authStatus = useAuthStore((s) => s.status);
  const setActiveProjectId = useProjectStore((s) => s.setActiveProjectId);
  const projects = useProjectStore((s) => s.projects);
  const projectsStatus = useProjectStore((s) => s.projectsStatus);
  const deleteProject = useProjectStore((s) => s.deleteProject);
  const deleteStatus = useProjectStore((s) => s.deleteStatus);
  const deleteError = useProjectStore((s) => s.deleteError);
  const [modalOpen, setModalOpen] = useState(false);
  const [pendingDelete, setPendingDelete] = useState<ApiProject | null>(null);

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
            <Link
              key={project.id}
              href={`/contract/${project.id}/summary`}
              onClick={() => setActiveProjectId(project.id)}
              className="group flex flex-col gap-3 rounded-xl border border-border bg-surface p-4 transition-colors hover:border-accent"
            >
              <div className="flex items-center gap-2">
                <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-accent-soft">
                  <FolderKanban className="size-4 text-accent" />
                </span>
                <span className="truncate text-sm font-semibold text-ink">
                  {project.name}
                </span>
                <button
                  type="button"
                  aria-label={`Delete ${project.name}`}
                  onClick={(event) => {
                    event.preventDefault();
                    event.stopPropagation();
                    setPendingDelete(project);
                  }}
                  className="ml-auto shrink-0 rounded-md p-1 text-muted opacity-0 transition-colors hover:text-danger group-hover:opacity-100"
                >
                  <Trash2 className="size-3.5" />
                </button>
              </div>
              <span className="text-xs text-muted">
                Created {new Date(project.createdAt).toLocaleDateString()}
              </span>
            </Link>
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
