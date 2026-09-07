"use client";

import { CircleAlert, Loader2, Workflow } from "lucide-react";
import { ContractExplainerCard } from "@/components/analyzer/ContractExplainerCard";
import { ComingSoon } from "@/components/ui/ComingSoon";
import { useEditorStore } from "@/store/editor-store";

export function ExplainerView() {
  const { compileStatus, analyzing, analysisError, analysis } =
    useEditorStore();
  const compiled = compileStatus.ok;

  if (!compiled && !analysis) {
    return (
      <ComingSoon
        icon={Workflow}
        title="No explainer yet"
        description="Compile & analyze your contract to see a plain-English walkthrough of its functions."
      />
    );
  }

  if (analyzing && !analysis) {
    return (
      <ComingSoon
        icon={Loader2}
        title="Analyzing your contract…"
        description="The AI model is mapping out what each function does and who can call it."
      />
    );
  }

  if (analysisError && !analysis) {
    return <ComingSoon icon={CircleAlert} title="Analysis failed" description={analysisError} />;
  }

  return (
    <div className="mx-auto max-w-2xl">
      <ContractExplainerCard explainer={analysis?.explainer ?? null} notAnalyzed={!analysis} />
    </div>
  );
}
