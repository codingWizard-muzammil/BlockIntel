"use client";

import { useState } from "react";
import { ArrowRight, Check, CircleAlert, Lightbulb, Loader2, ShieldCheck, Sparkles } from "lucide-react";
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
  const { analysisContractId: contractId, appliedImprovements } =
    useEditorStore();
  // Persisted server-side — survives a reload, unlike `state` below.
  const applied = appliedImprovements.includes(improvement.title);
  const { applyImprovement } = useProjectStore();
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

// Shown when the analysis came back with nothing to fix — the prompt tells
// the model an empty list is the correct answer for a clean contract.
function SafeState() {
  return (
    <div className="flex flex-col items-center gap-3 py-6 text-center">
      <div className="flex size-14 items-center justify-center rounded-full bg-success/10">
        <ShieldCheck className="size-7 text-success" />
      </div>
      <h3 className="text-lg font-semibold text-ink">You&apos;re safe!</h3>
      <p className="max-w-sm text-sm text-muted">
        No bugs, vulnerabilities, or gas issues were found. This contract looks
        solid. Ship it with confidence.
      </p>
    </div>
  );
}

// Only low-severity polish came back — reassure that nothing is exploitable
// before listing the optional suggestions.
function NoVulnerabilitiesBanner() {
  return (
    <div className="mb-4 flex items-start gap-2.5 rounded-lg border border-success/30 bg-success/10 p-3">
      <ShieldCheck className="mt-0.5 size-4 shrink-0 text-success" />
      <p className="text-xs leading-4 text-ink">
        <span className="font-medium">No security vulnerabilities found.</span>{" "}
        <span className="text-muted">The suggestions below are optional polish.</span>
      </p>
    </div>
  );
}

export function ImprovementsCard({
  improvements,
  notAnalyzed = false,
}: {
  improvements: Improvement[];
  notAnalyzed?: boolean;
}) {
  const onlyLowSeverity =
    improvements.length > 0 && improvements.every((i) => i.severity === "low");

  return (
    <Card>
      <CardHeading icon={Lightbulb}>Improvements</CardHeading>
      {improvements.length ? (
        <>
          {onlyLowSeverity && <NoVulnerabilitiesBanner />}
          <div className="flex flex-col gap-4">
            {improvements.map((improvement) => (
              <ImprovementItem key={improvement.title} improvement={improvement} />
            ))}
          </div>
        </>
      ) : notAnalyzed ? (
        <p className="text-sm text-muted">
          Not analyzed yet — click Analyze to get improvement suggestions.
        </p>
      ) : (
        <SafeState />
      )}
    </Card>
  );
}
