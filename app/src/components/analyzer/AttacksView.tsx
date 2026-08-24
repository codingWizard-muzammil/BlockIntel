"use client";

import { ShieldAlert } from "lucide-react";
import { PotentialAttacksCard } from "@/components/analyzer/PotentialAttacksCard";
import { ProjectStateGate } from "@/components/analyzer/ProjectStateGate";
import { ComingSoon } from "@/components/ui/ComingSoon";
import { useEditorStore } from "@/store/editor-store";

export function AttacksView({ projectId }: { projectId: string }) {
  const compiled = useEditorStore((s) => s.compileStatus.ok);

  return (
    <ProjectStateGate projectId={projectId}>
      {() =>
        compiled ? (
          <div className="mx-auto max-w-2xl">
            <PotentialAttacksCard attacks={[]} />
          </div>
        ) : (
          <ComingSoon
            icon={ShieldAlert}
            title="No attack scenarios yet"
            description="Compile & analyze your contract to see potential attack vectors here."
          />
        )
      }
    </ProjectStateGate>
  );
}
