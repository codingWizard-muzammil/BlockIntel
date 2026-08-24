"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, X } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { useProjectStore } from "@/store/project-store";

export function CreateProjectModal({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const router = useRouter();
  const setActiveProjectId = useProjectStore((s) => s.setActiveProjectId);
  const createProject = useProjectStore((s) => s.createProject);
  const createStatus = useProjectStore((s) => s.createStatus);
  const createError = useProjectStore((s) => s.createError);
  const [name, setName] = useState("");

  function handleClose() {
    setName("");
    onClose();
  }

  useEffect(() => {
    if (!open) return;
    function handleKey(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setName("");
        onClose();
      }
    }
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [open, onClose]);

  if (!open) return null;

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) return;
    const project = await createProject(trimmed);
    if (!project) return;
    setActiveProjectId(project.id);
    handleClose();
    router.push(`/contract/${project.id}/summary`);
  }

  const isPending = createStatus === "loading";

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
      onClick={handleClose}
    >
      <div
        className="w-80 overflow-hidden rounded-xl border border-border bg-surface shadow-2xl shadow-black/50"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-border px-4 py-3">
          <span className="text-sm font-semibold text-ink">New project</span>
          <button
            type="button"
            onClick={handleClose}
            aria-label="Close"
            className="text-muted transition-colors hover:text-ink"
          >
            <X className="size-4" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="flex flex-col gap-3 p-4">
          <input
            autoFocus
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="Project name"
            disabled={isPending}
            className="rounded-md border border-border bg-input px-3 py-2 text-sm text-ink outline-none placeholder:text-muted focus:border-accent disabled:opacity-60"
          />
          <Button type="submit" variant="primary" disabled={!name.trim() || isPending}>
            {isPending && <Loader2 className="size-3.5 animate-spin" />}
            Create project
          </Button>
          {createStatus === "error" && (
            <p className="text-xs text-danger">{createError}</p>
          )}
        </form>
      </div>
    </div>
  );
}
