"use client";

import { CircleAlert, Loader2, ShieldAlert } from "lucide-react";
import { PotentialAttacksCard } from "@/components/analyzer/PotentialAttacksCard";
import { ComingSoon } from "@/components/ui/ComingSoon";
import { useEditorStore } from "@/store/editor-store";

export function AttacksView() {
  const compiled = useEditorStore((s) => s.compileStatus.ok);
  const analyzing = useEditorStore((s) => s.analyzing);
  const analysisError = useEditorStore((s) => s.analysisError);
  const analysis = useEditorStore((s) => s.analysis);

  if (!compiled) {
    return (
      <ComingSoon
        icon={ShieldAlert}
        title="No attack scenarios yet"
        description="Compile & analyze your contract to see potential attack vectors here."
      />
    );
  }

  if (analyzing && !analysis) {
    return (
      <ComingSoon
        icon={Loader2}
        title="Analyzing your contract…"
        description="The AI model is looking for exploitable attack vectors."
      />
    );
  }

  if (analysisError && !analysis) {
    return <ComingSoon icon={CircleAlert} title="Analysis failed" description={analysisError} />;
  }

  return (
    <div className="mx-auto max-w-2xl">
      <PotentialAttacksCard attacks={analysis?.attacks ?? []} />
    </div>
  );
}
