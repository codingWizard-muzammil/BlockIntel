"use client";

import { LayoutGrid } from "lucide-react";
import { ContractSummaryCard } from "@/components/analyzer/ContractSummaryCard";
import { KeyFeaturesCard } from "@/components/analyzer/KeyFeaturesCard";
import { ProjectDetailsCard } from "@/components/analyzer/ProjectDetailsCard";
import { PotentialAttacksCard } from "@/components/analyzer/PotentialAttacksCard";
import { ImprovementsCard } from "@/components/analyzer/ImprovementsCard";
import { ProjectStateGate } from "@/components/analyzer/ProjectStateGate";
import { ComingSoon } from "@/components/ui/ComingSoon";
import { useEditorStore } from "@/store/editor-store";

export function SummaryView({ projectId }: { projectId: string }) {
  const compiled = useEditorStore((s) => s.compileStatus.ok);

  return (
    <ProjectStateGate projectId={projectId}>
      {(project) =>
        compiled ? (
          <div className="flex flex-col gap-6">
            <div className="flex flex-col gap-6 lg:flex-row">
              <div className="flex-1">
                <ContractSummaryCard summary={null} />
              </div>
              <div className="flex shrink-0 flex-col gap-6 lg:w-75">
                <KeyFeaturesCard features={[]} />
                <ProjectDetailsCard project={project} />
              </div>
            </div>
            <div className="flex flex-col gap-6 lg:flex-row">
              <div className="flex-1">
                <PotentialAttacksCard attacks={[]} />
              </div>
              <div className="flex-1">
                <ImprovementsCard improvements={[]} />
              </div>
            </div>
          </div>
        ) : (
          <ComingSoon
            icon={LayoutGrid}
            title="Nothing to summarize yet"
            description="Compile & analyze your contract to see its summary here."
          />
        )
      }
    </ProjectStateGate>
  );
}
