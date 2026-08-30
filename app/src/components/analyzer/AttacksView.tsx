"use client";

import { ShieldAlert } from "lucide-react";
import { PotentialAttacksCard } from "@/components/analyzer/PotentialAttacksCard";
import { ComingSoon } from "@/components/ui/ComingSoon";
import { useEditorStore } from "@/store/editor-store";

export function AttacksView() {
  const compiled = useEditorStore((s) => s.compileStatus.ok);

  if (!compiled) {
    return (
      <ComingSoon
        icon={ShieldAlert}
        title="No attack scenarios yet"
        description="Compile & analyze your contract to see potential attack vectors here."
      />
    );
  }

  return (
    <div className="mx-auto max-w-2xl">
      <PotentialAttacksCard attacks={[]} />
    </div>
  );
}
