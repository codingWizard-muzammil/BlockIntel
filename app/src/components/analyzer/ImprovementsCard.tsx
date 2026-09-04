"use client";

import { useState } from "react";
import { ArrowRight, Check, CircleAlert, Lightbulb, Loader2, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Card, CardHeading } from "@/components/ui/Card";
import { SeverityCardItem } from "@/components/ui/SeverityCardItem";
import { useEditorStore } from "@/store/editor-store";
import { useProjectStore } from "@/store/project-store";
import type { Improvement } from "@/types/analysis";

type ApplyState = "idle" | "applying" | "error";

function ImprovementItem({ improvement }: { improvement: Improvement }) {
  // Not compileStatus.contractId — that's null until the contract has been
  // compiled at least once, but an improvement can be applied to a contract
  // that's only ever been analyzed.
  const contractId = useEditorStore((s) => s.analysisContractId);
  // Persisted server-side — survives a reload, unlike `state` below.
  const applied = useEditorStore((s) => s.appliedImprovements.includes(improvement.title));
  const applyImprovement = useProjectStore((s) => s.applyImprovement);
  const [state, setState] = useState<ApplyState>("idle");

  const handleAdd = async () => {
    if (!contractId || applied || state === "applying") return;
    setState("applying");
    const ok = await applyImprovement(contractId, improvement);
    setState(ok ? "idle" : "error");
  };

  return (
    <SeverityCardItem title={improvement.title} severity={improvement.severity}>
      <div className="flex flex-col gap-1 text-xs leading-4">
        <p>
          <span className="font-medium text-ink">Reason:</span>{" "}
          <span className="text-muted">{improvement.reason}</span>
        </p>
        <p>
          <span className="font-medium text-ink">How:</span>{" "}
          <span className="text-muted">{improvement.how}</span>
        </p>
      </div>
      <Button
        variant={applied ? "ghost" : "secondary"}
        size="sm"
        className="mt-3"
        disabled={!contractId || state === "applying" || applied}
        onClick={handleAdd}
      >
        {state === "applying" ? (
          <>
            <Loader2 className="size-3.5 animate-spin" />
            Applying…
          </>
        ) : applied ? (
          <>
            <Check className="size-3.5" />
            Added to contract
          </>
        ) : (
          <>
            <Sparkles className="size-3.5" />
            Add this improvement
          </>
        )}
      </Button>
      {state === "error" && (
        <p className="mt-2 flex items-center gap-1.5 text-xs text-danger">
          <CircleAlert className="size-3.5" />
          Couldn&apos;t apply this improvement — try again.
        </p>
      )}
    </SeverityCardItem>
  );
}

export function ImprovementsCard({
  improvements,
  notAnalyzed = false,
}: {
  improvements: Improvement[];
  notAnalyzed?: boolean;
}) {
  return (
    <Card>
      <CardHeading icon={Lightbulb}>Improvements</CardHeading>
      {improvements.length ? (
        <>
          <div className="flex flex-col gap-4">
            {improvements.map((improvement) => (
              <ImprovementItem key={improvement.title} improvement={improvement} />
            ))}
          </div>
          <a
            href="#"
            className="mt-4 flex items-center gap-2 text-sm text-accent hover:underline"
          >
            View more suggestions
            <ArrowRight className="size-3" />
          </a>
        </>
      ) : (
        <p className="text-sm text-muted">
          {notAnalyzed
            ? "Not analyzed yet — click Analyze to get improvement suggestions."
            : "No improvement suggestions yet."}
        </p>
      )}
    </Card>
  );
}
