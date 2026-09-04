"use client";

import { CircleAlert, LayoutGrid, Loader2 } from "lucide-react";
import { ContractSummaryCard } from "@/components/analyzer/ContractSummaryCard";
import { KeyFeaturesCard } from "@/components/analyzer/KeyFeaturesCard";
import { ProjectDetailsCard } from "@/components/analyzer/ProjectDetailsCard";
import { PotentialAttacksCard } from "@/components/analyzer/PotentialAttacksCard";
import { ImprovementsCard } from "@/components/analyzer/ImprovementsCard";
import { useGatedProject } from "@/components/analyzer/ProjectStateGate";
import { ComingSoon } from "@/components/ui/ComingSoon";
import { useEditorStore } from "@/store/editor-store";

// Mirrors api/src/services/analysis.service.js's countLinesOfCode so the
// compile-only "basic summary" reports the same line count the AI-generated
// one would once Analyze is run.
function countLinesOfCode(source: string) {
  return source.split("\n").filter((line) => line.trim().length > 0).length;
}

export function SummaryView() {
  const compiled = useEditorStore((s) => s.compileStatus.ok);
  const compileStatus = useEditorStore((s) => s.compileStatus);
  const activeSource = useEditorStore(
    (s) => s.files.find((f) => f.id === s.activeFileId)?.source ?? "",
  );
  const analyzing = useEditorStore((s) => s.analyzing);
  const analysisError = useEditorStore((s) => s.analysisError);
  const analysis = useEditorStore((s) => s.analysis);
  const analyzedAt = useEditorStore((s) => s.analyzedAt);
  const project = useGatedProject();

  if (!compiled && !analysis) {
    return (
      <ComingSoon
        icon={LayoutGrid}
        title="Nothing to summarize yet"
        description="Compile your contract to see its summary here."
      />
    );
  }

  if (analyzing && !analysis) {
    return (
      <ComingSoon
        icon={Loader2}
        title="Analyzing your contract…"
        description="The AI model is reviewing your code for a summary, attacks, and improvements."
      />
    );
  }

  if (analysisError && !analysis) {
    return (
      <ComingSoon
        icon={CircleAlert}
        title="Analysis failed"
        description={analysisError}
      />
    );
  }

  const notAnalyzed = !analysis;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-6 lg:flex-row">
        <div className="flex-1">
          <ContractSummaryCard
            summary={analysis?.summary ?? null}
            analyzedAt={analyzedAt}
            basicInfo={
              notAnalyzed
                ? {
                    compiler: compileStatus.solidityVersion,
                    linesOfCode: countLinesOfCode(activeSource),
                    estimatedGasAvg: compileStatus.gas || "N/A",
                  }
                : null
            }
          />
        </div>
        <div className="flex shrink-0 flex-col gap-6 lg:w-75">
          <KeyFeaturesCard features={analysis?.keyFeatures ?? []} notAnalyzed={notAnalyzed} />
          <ProjectDetailsCard project={project} />
        </div>
      </div>
      <div className="flex flex-col gap-6 lg:flex-row">
        <div className="flex-1">
          <PotentialAttacksCard attacks={analysis?.attacks ?? []} notAnalyzed={notAnalyzed} />
        </div>
        <div className="flex-1">
          <ImprovementsCard improvements={analysis?.improvements ?? []} notAnalyzed={notAnalyzed} />
        </div>
      </div>
    </div>
  );
}
