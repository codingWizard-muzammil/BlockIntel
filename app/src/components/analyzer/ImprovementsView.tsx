"use client";

import { ImprovementsCard } from "@/components/analyzer/ImprovementsCard";
import { ProjectStateGate } from "@/components/analyzer/ProjectStateGate";

export function ImprovementsView({ projectId }: { projectId: string }) {
  return (
    <ProjectStateGate projectId={projectId}>
      {() => (
        <div className="mx-auto max-w-2xl">
          <ImprovementsCard improvements={[]} />
        </div>
      )}
    </ProjectStateGate>
  );
}
