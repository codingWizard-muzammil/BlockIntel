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
  const {
    compileStatus,
    analyzing,
    analysisError,
    analysis,
    analyzedAt,
    files,
    activeFileId,
  } = useEditorStore();
  const compiled = compileStatus.ok;
  const activeSource = files.find((f) => f.id === activeFileId)?.source ?? "";
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
        <div className="min-w-0 flex-1">
          <ContractSummaryCard
            summary={analysis?.summary ?? null}
            analyzedAt={analyzedAt}
            basicInfo={
              compiled
                ? {
                    compiler: compileStatus.solidityVersion,
                    linesOfCode: countLinesOfCode(activeSource),
                    estimatedGasAvg: compileStatus.gas || "N/A",
                  }
                : null
            }
          />
        </div>
        <div className="flex min-w-0 shrink-0 flex-col gap-6 lg:w-75">
          <KeyFeaturesCard
            features={analysis?.keyFeatures ?? []}
            notAnalyzed={notAnalyzed}
          />
          <ProjectDetailsCard project={project} />
        </div>
      </div>
    </div>
  );
}
