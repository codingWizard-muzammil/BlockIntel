"use client";

import { useState } from "react";
import { useProjectStore, type ApiProject } from "@/store/project-store";

function describeDelete(project: ApiProject) {
  return `This will permanently delete "${project.name}" and all of its contracts. This can't be undone.`;
}

export function useDeleteProjectFlow() {
  const { deleteProject, deleteStatus, deleteError } = useProjectStore();
  const [pendingDelete, setPendingDelete] = useState<ApiProject | null>(null);

  const isPending = deleteStatus === "loading";

  function cancelDelete() {
    setPendingDelete(null);
  }

  async function confirmDelete() {
    if (!pendingDelete) return;
    const ok = await deleteProject(pendingDelete.id);
    if (ok) setPendingDelete(null);
  }

  return {
    pendingDelete,
    requestDelete: setPendingDelete,
    cancelDelete,
    confirmDelete,
    dialogProps: {
      open: !!pendingDelete,
      title: "Delete project",
      description: pendingDelete ? describeDelete(pendingDelete) : "",
      confirmLabel: "Delete",
      isPending,
      errorMessage: deleteStatus === "error" ? deleteError : null,
      onConfirm: confirmDelete,
      onClose: cancelDelete,
    },
  };
}
