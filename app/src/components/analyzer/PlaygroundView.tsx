"use client";

import { FlaskConical } from "lucide-react";
import { ComingSoon } from "@/components/ui/ComingSoon";
import { ProjectStateGate } from "@/components/analyzer/ProjectStateGate";

export function PlaygroundView({ projectId }: { projectId: string }) {
  return (
    <ProjectStateGate projectId={projectId}>
      {() => (
        <ComingSoon
          icon={FlaskConical}
          title="Playground"
          description="Simulate transactions against this contract and inspect the results here."
        />
      )}
    </ProjectStateGate>
  );
}
