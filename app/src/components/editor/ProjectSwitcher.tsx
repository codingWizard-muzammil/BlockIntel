"use client";

import { useRef, useState } from "react";
import { Check, ChevronDown, FolderKanban, Plus, Trash2 } from "lucide-react";
import { useProjectStore } from "@/store/project-store";
import { useDeleteProject, useProjects, type ApiProject } from "@/api/projects";
import { CreateProjectModal } from "@/components/editor/CreateProjectModal";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { useClickOutside } from "@/hooks/useClickOutside";

export function ProjectSwitcher() {
  const { data: projects = [] } = useProjects();
  const activeProjectId = useProjectStore((s) => s.activeProjectId);
  const setActiveProjectId = useProjectStore((s) => s.setActiveProjectId);
  const activeProject = projects.find((p) => p.id === activeProjectId);
  const deleteProject = useDeleteProject();

  const [open, setOpen] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [pendingDelete, setPendingDelete] = useState<ApiProject | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  useClickOutside(containerRef, () => setOpen(false));

  function handleConfirmDelete() {
    if (!pendingDelete) return;
    deleteProject.mutate(pendingDelete.id, {
      onSuccess: () => setPendingDelete(null),
    });
  }

  return (
    <div className="relative" ref={containerRef}>
      <span className="absolute -top-1.75 left-2.5 z-10 bg-canvas px-1 text-[10px] leading-none text-muted">
        Project
      </span>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className="flex max-w-40 items-center gap-2 rounded-md border border-border bg-input py-1.75 pl-3 pr-2.5 text-xs text-ink outline-none hover:border-muted"
      >
        <FolderKanban className="size-3 shrink-0 text-muted" />
        <span className="truncate">{activeProject?.name ?? "Select project"}</span>
        <ChevronDown
          className={`size-2.5 shrink-0 text-muted transition-transform ${open ? "rotate-180" : ""}`}
        />
      </button>
      {open && (
        <div className="absolute left-0 top-[calc(100%+6px)] z-20 min-w-48 overflow-hidden rounded-lg border border-border bg-surface p-1 shadow-xl shadow-black/40">
          {projects.map((project) => {
            const selected = project.id === activeProjectId;
            return (
              <div
                key={project.id}
                className={`group flex w-full items-center gap-1 rounded-md text-xs transition-colors ${
                  selected ? "bg-accent text-white" : "text-ink hover:bg-surface-muted"
                }`}
              >
                <button
                  type="button"
                  onClick={() => {
                    setActiveProjectId(project.id);
                    setOpen(false);
                  }}
                  className="flex min-w-0 flex-1 items-center gap-2 px-2.5 py-1.5 text-left"
                >
                  <span className="flex-1 truncate">{project.name}</span>
                  {selected && <Check className="size-3 shrink-0" />}
                </button>
                <button
                  type="button"
                  aria-label={`Delete ${project.name}`}
                  onClick={(event) => {
                    event.stopPropagation();
                    setOpen(false);
                    setPendingDelete(project);
                  }}
                  className={`mr-1 shrink-0 rounded p-1 opacity-0 transition-colors group-hover:opacity-100 ${
                    selected ? "hover:bg-white/20" : "hover:text-danger"
                  }`}
                >
                  <Trash2 className="size-3" />
                </button>
              </div>
            );
          })}
          <div className="my-1 h-px bg-border" />
          <button
            type="button"
            onClick={() => {
              setOpen(false);
              setModalOpen(true);
            }}
            className="flex w-full items-center gap-2 rounded-md px-2.5 py-1.5 text-left text-xs text-accent transition-colors hover:bg-surface-muted"
          >
            <Plus className="size-3 shrink-0" />
            New project
          </button>
        </div>
      )}
      <CreateProjectModal open={modalOpen} onClose={() => setModalOpen(false)} />
      <ConfirmDialog
        open={!!pendingDelete}
        title="Delete project"
        description={`This will permanently delete "${pendingDelete?.name}" and all of its contracts. This can't be undone.`}
        confirmLabel="Delete"
        isPending={deleteProject.isPending}
        errorMessage={deleteProject.isError ? (deleteProject.error as Error).message : null}
        onConfirm={handleConfirmDelete}
        onClose={() => setPendingDelete(null)}
      />
    </div>
  );
}
