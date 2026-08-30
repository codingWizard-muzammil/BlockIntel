import Link from "next/link";
import { FolderKanban, Trash2 } from "lucide-react";
import type { ApiProject } from "@/store/project-store";

export function ProjectCard({
  project,
  onOpen,
  onDelete,
}: {
  project: ApiProject;
  onOpen: () => void;
  onDelete: () => void;
}) {
  return (
    <Link
      href={`/contract/${project.id}/summary`}
      onClick={onOpen}
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
            onDelete();
          }}
          className="ml-auto shrink-0 rounded-md p-1 text-muted opacity-0 transition-colors hover:text-danger group-hover:opacity-100"
        >
          <Trash2 className="size-3.5" />
        </button>
      </div>
      <div className="flex items-center gap-2">
        <span className="rounded-md bg-accent-soft px-2 py-0.5 text-xs font-medium text-accent">
          {project.chain}
        </span>
        <span className="truncate text-xs text-muted">{project.purpose}</span>
      </div>
      {project.description && (
        <p className="line-clamp-2 text-xs text-muted">
          {project.description}
        </p>
      )}
      <span className="mt-auto text-xs text-muted">
        Created {new Date(project.createdAt).toLocaleDateString()}
      </span>
    </Link>
  );
}
