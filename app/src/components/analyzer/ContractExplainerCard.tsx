import { Workflow } from "lucide-react";
import { Card, CardHeading } from "@/components/ui/Card";
import type { ContractExplainer, ExplainerFunction } from "@/types/analysis";

function FunctionItem({ fn }: { fn: ExplainerFunction }) {
  return (
    <div className="w-full rounded-lg border border-border-muted bg-surface-muted p-4.25">
      <div className="mb-2 flex items-start justify-between gap-2">
        <h3 className="font-mono text-sm font-semibold text-ink">
          {fn.signature ?? `${fn.name}()`}
        </h3>
        <span className="shrink-0 rounded border border-accent/30 px-2.25 py-0.75 text-xs leading-4 text-accent">
          {fn.access}
        </span>
      </div>
      <p className="text-xs leading-4 text-muted">{fn.description}</p>
    </div>
  );
}

export function ContractExplainerCard({
  explainer,
  notAnalyzed = false,
}: {
  explainer: ContractExplainer | null;
  notAnalyzed?: boolean;
}) {
  const functions = explainer?.functions ?? [];

  return (
    <Card>
      <CardHeading icon={Workflow}>Contract Explainer</CardHeading>
      {explainer?.flow ? (
        <p className="mb-4 text-sm leading-[22.75px] text-muted">{explainer.flow}</p>
      ) : null}
      {functions.length ? (
        <div className="flex flex-col gap-4">
          {functions.map((fn) => (
            <FunctionItem key={fn.name} fn={fn} />
          ))}
        </div>
      ) : (
        <p className="text-sm text-muted">
          {notAnalyzed
            ? "Not analyzed yet — click Analyze to generate a plain-English walkthrough of this contract."
            : "No functions to explain yet."}
        </p>
      )}
    </Card>
  );
}
