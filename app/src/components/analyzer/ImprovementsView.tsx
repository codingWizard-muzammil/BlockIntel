"use client";

import { CircleAlert, Loader2, TrendingUp } from "lucide-react";
import { ImprovementsCard } from "@/components/analyzer/ImprovementsCard";
import { ComingSoon } from "@/components/ui/ComingSoon";
import { useEditorStore } from "@/store/editor-store";

export function ImprovementsView() {
  const compiled = useEditorStore((s) => s.compileStatus.ok);
  const analyzing = useEditorStore((s) => s.analyzing);
  const analysisError = useEditorStore((s) => s.analysisError);
  const analysis = useEditorStore((s) => s.analysis);

  if (!compiled && !analysis) {
    return (
      <ComingSoon
        icon={TrendingUp}
        title="No improvements yet"
        description="Compile & analyze your contract to see improvement suggestions here."
      />
    );
  }

  if (analyzing && !analysis) {
    return (
      <ComingSoon
        icon={Loader2}
        title="Analyzing your contract…"
        description="The AI model is looking for gas, style, and security improvements."
      />
    );
  }

  if (analysisError && !analysis) {
    return <ComingSoon icon={CircleAlert} title="Analysis failed" description={analysisError} />;
  }

  return (
    <div className="mx-auto max-w-2xl">
      <ImprovementsCard improvements={analysis?.improvements ?? []} notAnalyzed={!analysis} />
    </div>
  );
}
