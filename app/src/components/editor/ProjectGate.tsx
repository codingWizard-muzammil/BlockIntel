"use client";

import { useState } from "react";
import { FolderKanban, FolderPlus, Loader2, Wallet } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { ConnectWalletModal } from "@/components/wallet/ConnectWalletModal";
import { useAuthStore } from "@/store/auth-store";
import { useProjectStore } from "@/store/project-store";
import { useCreateProject, useProjects } from "@/api/projects";

export function ProjectGate() {
  const authStatus = useAuthStore((s) => s.status);
  const setActiveProjectId = useProjectStore((s) => s.setActiveProjectId);
  const { data: projects, isLoading } = useProjects();
  const createProject = useCreateProject();
  const [name, setName] = useState("");
  const [walletModalOpen, setWalletModalOpen] = useState(false);

  if (authStatus !== "connected") {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-4 p-6 text-center">
        <div className="flex size-12 items-center justify-center rounded-xl bg-accent-soft">
          <Wallet className="size-5 text-accent" />
        </div>
        <div className="space-y-1">
          <h1 className="text-lg font-semibold text-ink">Connect a wallet to get started</h1>
          <p className="max-w-sm text-sm text-muted">
            Projects are tied to your wallet. Connect one to create a project and start writing
            contracts.
          </p>
        </div>
        <Button variant="primary" onClick={() => setWalletModalOpen(true)}>
          <Wallet className="size-3.5" />
          Connect Wallet
        </Button>
        <ConnectWalletModal open={walletModalOpen} onClose={() => setWalletModalOpen(false)} />
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex flex-1 items-center justify-center gap-2 text-sm text-muted">
        <Loader2 className="size-4 animate-spin" />
        Loading your projects...
      </div>
    );
  }

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) return;
    createProject.mutate(trimmed, {
      onSuccess: (project) => {
        setActiveProjectId(project.id);
        setName("");
      },
    });
  }

  const hasProjects = !!projects && projects.length > 0;

  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-4 overflow-y-auto p-6 text-center">
      <div className="flex size-12 items-center justify-center rounded-xl bg-accent-soft">
        <FolderPlus className="size-5 text-accent" />
      </div>
      <div className="space-y-1">
        <h1 className="text-lg font-semibold text-ink">
          {hasProjects ? "Select or create a project" : "Create a project to get started"}
        </h1>
        <p className="max-w-sm text-sm text-muted">
          Contracts live inside a project.{" "}
          {hasProjects ? "Pick one below or start a new one." : "Give it a name to start writing code."}
        </p>
      </div>

      {hasProjects && (
        <div className="flex w-full max-w-xs flex-col gap-1.5">
          {projects.map((project) => (
            <button
              key={project.id}
              type="button"
              onClick={() => setActiveProjectId(project.id)}
              className="flex items-center gap-2 rounded-md border border-border bg-input px-3 py-2 text-left text-sm text-ink transition-colors hover:border-accent"
            >
              <FolderKanban className="size-3.5 shrink-0 text-muted" />
              <span className="truncate">{project.name}</span>
            </button>
          ))}
        </div>
      )}

      <form onSubmit={handleSubmit} className="flex w-full max-w-xs flex-col gap-2">
        <input
          autoFocus={!hasProjects}
          value={name}
          onChange={(event) => setName(event.target.value)}
          placeholder="e.g. My DeFi Protocol"
          className="rounded-md border border-border bg-input px-3 py-2 text-sm text-ink outline-none placeholder:text-muted focus:border-accent"
        />
        <Button
          type="submit"
          variant="primary"
          disabled={!name.trim() || createProject.isPending}
        >
          {createProject.isPending && <Loader2 className="size-3.5 animate-spin" />}
          Create project
        </Button>
        {createProject.isError && (
          <p className="text-xs text-danger">{(createProject.error as Error).message}</p>
        )}
      </form>
    </div>
  );
}
