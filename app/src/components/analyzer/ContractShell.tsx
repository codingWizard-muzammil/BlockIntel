"use client";

import { useEffect, type ReactNode } from "react";
import { EditorPanel } from "@/components/editor/EditorPanel";
import { AnalysisTabs } from "@/components/analyzer/AnalysisTabs";
import { ProjectStateGate } from "@/components/analyzer/ProjectStateGate";
import { useProjectStore } from "@/store/project-store";

export function ContractShell({ id, children }: { id: string; children: ReactNode }) {
  return (
    <ProjectStateGate projectId={id}>
      {() => <ContractWorkspace id={id}>{children}</ContractWorkspace>}
    </ProjectStateGate>
  );
}

function ContractWorkspace({ id, children }: { id: string; children: ReactNode }) {
  const setActiveProjectId = useProjectStore((s) => s.setActiveProjectId);

  useEffect(() => {
    setActiveProjectId(id);
  }, [id, setActiveProjectId]);

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
