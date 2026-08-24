"use client";

import { PotentialAttacksCard } from "@/components/analyzer/PotentialAttacksCard";
import { ProjectStateGate } from "@/components/analyzer/ProjectStateGate";

export function AttacksView({ projectId }: { projectId: string }) {
  return (
    <ProjectStateGate projectId={projectId}>
      {() => (
        <div className="mx-auto max-w-2xl">
          <PotentialAttacksCard attacks={[]} />
        </div>
      )}
    </ProjectStateGate>
  );
}
