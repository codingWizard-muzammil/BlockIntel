"use client";

import { TrendingUp } from "lucide-react";
import { ImprovementsCard } from "@/components/analyzer/ImprovementsCard";
import { ComingSoon } from "@/components/ui/ComingSoon";
import { useEditorStore } from "@/store/editor-store";

export function ImprovementsView() {
  const compiled = useEditorStore((s) => s.compileStatus.ok);

  if (!compiled) {
    return (
      <ComingSoon
        icon={TrendingUp}
        title="No improvements yet"
        description="Compile & analyze your contract to see improvement suggestions here."
      />
    );
  }

  return (
    <div className="mx-auto max-w-2xl">
      <ImprovementsCard improvements={[]} />
    </div>
  );
}
