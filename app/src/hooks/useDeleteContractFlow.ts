"use client";

import { useState } from "react";
import { useProjectStore } from "@/store/project-store";
import { useEditorStore, type EditorFile } from "@/store/editor-store";

// FileTabs only renders a close/delete button once more than one file is
// open, so `closeFile`'s own last-tab guard never actually fires here.
export function useDeleteContractFlow() {
  const { deleteContract, deleteContractStatus, deleteContractError } =
    useProjectStore();
  const { closeFile } = useEditorStore();
  const [pendingDelete, setPendingDelete] = useState<EditorFile | null>(null);

  const isPending = deleteContractStatus === "loading";

  function cancelDelete() {
    setPendingDelete(null);
  }

  async function confirmDelete() {
    if (!pendingDelete) return;

    if (pendingDelete.contractId && pendingDelete.projectId) {
      const ok = await deleteContract(
        pendingDelete.contractId,
        pendingDelete.projectId,
      );
      if (!ok) return;
    }

    closeFile(pendingDelete.id);
    setPendingDelete(null);
  }

  return {
    pendingDelete,
    requestDelete: setPendingDelete,
    cancelDelete,
    confirmDelete,
    dialogProps: {
      open: !!pendingDelete,
      title: "Delete contract",
      description:
        "Do you want to delete this contract? This action is irreversible.",
      confirmLabel: "Delete",
      isPending,
      errorMessage: deleteContractStatus === "error" ? deleteContractError : null,
      onConfirm: confirmDelete,
      onClose: cancelDelete,
    },
  };
}
