"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { EditorPanel } from "@/components/editor/EditorPanel";
import { AnalysisTabs } from "@/components/analyzer/AnalysisTabs";
import { ProjectStateGate } from "@/components/analyzer/ProjectStateGate";
import { useProjectStore, type ApiProject } from "@/store/project-store";
import { useEditorStore } from "@/store/editor-store";

export function ContractShell({ id, children }: { id: string; children: ReactNode }) {
  return (
    <ProjectStateGate projectId={id}>
      {(project) => (
        <ContractWorkspace id={id} project={project}>
          {children}
        </ContractWorkspace>
      )}
    </ProjectStateGate>
  );
}

function ContractWorkspace({
  id,
  project,
  children,
}: {
  id: string;
  project: ApiProject;
  children: ReactNode;
}) {
  const { setActiveProjectId, fetchContractSource } = useProjectStore();
  const {
    setLockedChain,
    setFilesFromContracts,
    hydrateFileSource,
    files,
    activeFileId,
  } = useEditorStore();
  const activeFile = files.find((f) => f.id === activeFileId);
  const activeContractId = activeFile?.contractId ?? null;
  const activeSourceEmpty = !activeFile?.source;
  const hydratedContractIds = useRef<Set<string>>(new Set());

  useEffect(() => {
    setActiveProjectId(id);
  }, [id, setActiveProjectId]);

  // Every contract written inside a project must target that project's
  // chain — lock the editor to it for as long as this project is open.
  useEffect(() => {
    setLockedChain(project.chain);
    return () => setLockedChain(null);
  }, [project.chain, setLockedChain]);

  // Open one tab per contract already saved to this project. Keyed on the
  // project id (not `project.contracts`) so a background refetch — e.g.
  // after saveContract invalidates the query — doesn't clobber unsaved edits.
  useEffect(() => {
    setFilesFromContracts(project.contracts ?? []);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- intentionally re-run only when the project changes, not on every contracts refetch
  }, [project.id, setFilesFromContracts]);

  // `contracts.source` (see setFilesFromContracts) never carries file
  // content, so the active tab's content is lazily fetched here the first
  // time it's viewed. Keyed off primitives, not `files`, so this doesn't
  // re-run on every keystroke (the files array gets a new identity on
  // every setSource call).
  useEffect(() => {
    if (!activeContractId || !activeSourceEmpty) return;
    if (hydratedContractIds.current.has(activeContractId)) return;
    hydratedContractIds.current.add(activeContractId);

    fetchContractSource(activeContractId).then((source) => {
      if (source == null) return;
      const file = useEditorStore
        .getState()
        .files.find((f) => f.contractId === activeContractId);
      if (file) hydrateFileSource(file.id, source);
    });
  }, [activeContractId, activeSourceEmpty, fetchContractSource, hydrateFileSource]);

  return (
    <div className="flex min-h-0 flex-1 overflow-hidden">
      <EditorPanel />
      <section className="flex min-h-0 flex-1 flex-col overflow-hidden">
        <AnalysisTabs id={id} />
        <div className="min-h-0 flex-1 overflow-auto p-6 scrollbar-editor overflow-x-auto">
          {children}
        </div>
      </section>
    </div>
  );
}
