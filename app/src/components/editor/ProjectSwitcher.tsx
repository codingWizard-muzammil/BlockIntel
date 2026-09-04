"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Check, FolderKanban, Plus } from "lucide-react";
import { useProjectStore } from "@/store/project-store";
import { CreateProjectModal } from "@/components/editor/CreateProjectModal";
import { Dropdown } from "@/components/ui/Dropdown";

export function ProjectSwitcher() {
  const router = useRouter();
  const { id: activeProjectId } = useParams<{ id: string }>();
  const { projects, setActiveProjectId } = useProjectStore();
  const activeProject = projects.find((p) => p.id === activeProjectId);

  const [modalOpen, setModalOpen] = useState(false);

  return (
    <>
      <Dropdown
        label="Project"
        value={activeProjectId ?? ""}
        options={projects}
        getKey={(project) => project.id}
        onChange={(project) => {
          setActiveProjectId(project.id);
          router.replace(`/contract/${project.id}/summary`);
        }}
        trigger={
          <>
            <FolderKanban className="size-3 shrink-0 text-muted" />
            <span className="truncate">
              {activeProject?.name ?? "Select project"}
            </span>
          </>
        }
        renderOption={(project, selected) => (
          <>
            <span className="flex-1 truncate">{project.name}</span>
            {selected && <Check className="size-3 shrink-0" />}
          </>
        )}
        triggerClassName="max-w-40"
        menuClassName="min-w-48"
        footer={(close) => (
          <button
            type="button"
            onClick={() => {
              close();
              setModalOpen(true);
            }}
            className="flex w-full items-center gap-2 rounded-md px-2.5 py-1.5 text-left text-xs text-accent transition-colors hover:bg-surface-muted"
          >
            <Plus className="size-3 shrink-0" />
            New project
          </button>
        )}
      />
      <CreateProjectModal open={modalOpen} onClose={() => setModalOpen(false)} />
    </>
  );
}
