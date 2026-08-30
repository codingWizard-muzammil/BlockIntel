"use client";

import { useEffect, type ReactNode } from "react";
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
  const setActiveProjectId = useProjectStore((s) => s.setActiveProjectId);
  const setLockedChain = useEditorStore((s) => s.setLockedChain);

  useEffect(() => {
    setActiveProjectId(id);
  }, [id, setActiveProjectId]);

  // Every contract written inside a project must target that project's
  // chain — lock the editor to it for as long as this project is open.
  useEffect(() => {
    setLockedChain(project.chain);
    return () => setLockedChain(null);
  }, [project.chain, setLockedChain]);

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
