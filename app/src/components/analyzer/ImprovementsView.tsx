"use client";

import { TrendingUp } from "lucide-react";
import { ImprovementsCard } from "@/components/analyzer/ImprovementsCard";
import { ProjectStateGate } from "@/components/analyzer/ProjectStateGate";
import { ComingSoon } from "@/components/ui/ComingSoon";
import { useEditorStore } from "@/store/editor-store";

export function ImprovementsView({ projectId }: { projectId: string }) {
  const compiled = useEditorStore((s) => s.compileStatus.ok);

  return (
    <ProjectStateGate projectId={projectId}>
      {() =>
        compiled ? (
          <div className="mx-auto max-w-2xl">
            <ImprovementsCard improvements={[]} />
          </div>
        ) : (
          <ComingSoon
            icon={TrendingUp}
            title="No improvements yet"
            description="Compile & analyze your contract to see improvement suggestions here."
          />
        )
      }
    </ProjectStateGate>
  );
}
